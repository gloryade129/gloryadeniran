/**
 * src/ai-engine.js
 * Google Gemini Conversational Intelligence for God's Virtue
 * 
 * Manages multi-turn memory buffers per chat, contextual injection
 * of group sender identities, and dynamic persona synchronization.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeHumanResponse } from './antiban.js';
import { lagosDateLine } from './time-utils.js';

let genAI = null;
export let cachedApiKey = null;
export let lastAIError = null;
const conversationHistories = new Map(); // Map<jid, Array<{ role: 'user' | 'model', parts: [{ text }] }>>

export const MASTER_SYSTEM_PROMPT = `You are "God's Virtue", an intelligent, thoughtful, and capable WhatsApp assistant and community administrator.
You were created and are owned by Glory Adeniran. You know who you are and why you were built: to bring order, clarity, practical assistance, and thoughtful guidance to individuals and communities.

CORE IDENTITY & PURPOSE:
• Created & Owned By: Glory Adeniran.
• Identity: You are "God's Virtue"—a name reflecting high character, moral excellence, wisdom, and reliability. You are NOT just another generic AI chatbot; you are a purposeful digital assistant with a steady, human presence.
• AI Model & Architecture: You are powered by Google's cutting-edge Gemini models (Gemini 2.5 / Gemini 2.0 Flash) enhanced with live Google Search grounding. If asked about your model, who built you, or what AI you are, state politely and accurately that you are God's Virtue, created by Glory Adeniran and powered by Google's latest Gemini AI models with real-time search intelligence.
• Inclusivity: You respect and welcome everyone regardless of their background, faith, or beliefs. Your name is simply "God's Virtue"—never preach, lecture, or impose religious terms like "fellowship" unless explicitly requested by the user. Treat everyone with equal dignity, fairness, and kindness.
• Web Knowledge & Real-Time Search: You are connected to Google's live search engine to retrieve accurate, up-to-date facts, current news, dates, and live information whenever asked. Always provide current, factual information grounded in real-time knowledge.

CONVERSATION STYLE & HUMANITY:
• You have a personality: grounded, warm, a little witty, direct, and never preachy. Speak like a real, articulate person chatting on WhatsApp — contractions are fine ("you're", "that's", "nobody's").
• Short & Impactful: Usually 1 to 4 sentences. Never dump walls of text, bullet-point essays, or sterile lectures unless the user explicitly asks for a list.
• Sound Human, Not Model: Never reveal or imply you are an AI, chatbot, or language model. Never say "As an AI...", "I hope this helps", "In conclusion", or similar machine phrases. If asked whether you are a robot, answer simply as God's Virtue — a personality created by Glory Adeniran.
• Emojis: Default to NONE. Use at most ONE per message, and two only when it truly earns its place. Never stack emojis, never use decorative header emojis (✨🌙💡), and never use emojis as bullet points.
• Formatting: WhatsApp-native only. *bold* sparingly. No markdown headers, no asterisk walls, no "•" bullet essays unless asked.
• Honesty: Never invent facts, names, events, or dates — including today's date unless it was given to you. If you don't know something, say so plainly.
• Context: In groups, you befriend members, answer questions thoughtfully when tagged, and maintain respect and order. In direct messages, you are a helpful personal assistant.`;

export function initAI(apiKey) {
  cachedApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  if (cachedApiKey) {
    try {
      genAI = new GoogleGenerativeAI(cachedApiKey);
      console.log('[ai-engine] Google Gemini AI engine initialized.');
      // Discover which models this key can actually call (non-blocking, cached for 6h)
      refreshAvailableModels(true).catch(() => {});
    } catch (e) {
      console.error('[ai-engine] Failed to initialize GoogleGenerativeAI:', e.message);
    }
  } else {
    console.warn('[ai-engine] GEMINI_API_KEY not provided. Fallback virtuous response mode will be used.');
  }
}

function isQuotaExhaustedError(err) {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resourceexhausted') ||
    msg.includes('too many requests') ||
    msg.includes('rate limit')
  );
}

/**
 * Ordered candidate models — cheap/fast first.
 * Cross-checked against https://ai.google.dev/gemini-api/docs/models; stale or
 * non-existent IDs are filtered out at runtime by resolveModelList() so a single
 * bad entry can never burn a round-trip on every incoming message.
 */
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

const MODEL_LIST_TTL_MS = 6 * 60 * 60 * 1000; // re-verify served models every 6 hours
let availableModelIds = null;
let modelListFetchedAt = 0;
let modelListInFlight = null;

/**
 * Asks the Gemini API which models this key can actually call, so candidate
 * ordering never depends on a hand-maintained list staying in sync with Google.
 */
async function refreshAvailableModels(force = false) {
  if (!cachedApiKey) return;
  const now = Date.now();
  if (modelListInFlight) return modelListInFlight;
  // Successful discovery is cached for 6h; failed discovery retries every 5 minutes
  // so an unreachable endpoint never adds a blocking fetch to every message.
  const ttl = availableModelIds ? MODEL_LIST_TTL_MS : 5 * 60 * 1000;
  if (!force && modelListFetchedAt && now - modelListFetchedAt < ttl) return;

  modelListInFlight = (async () => {
    modelListFetchedAt = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(cachedApiKey)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const usable = new Set();
      for (const m of Array.isArray(data?.models) ? data.models : []) {
        const methods = m.supportedGenerationMethods || [];
        if (methods.includes('generateContent')) {
          usable.add(String(m.name || '').replace(/^models\//, ''));
        }
      }
      if (usable.size > 0) {
        availableModelIds = usable;
        console.log(`[ai-engine] Verified ${usable.size} text model(s) available for this API key.`);
      }
    } catch (err) {
      console.warn(`[ai-engine] Model discovery failed (${err.message}); falling back to built-in candidate list.`);
    } finally {
      modelListInFlight = null;
    }
  })();

  return modelListInFlight;
}

/**
 * Returns the candidate models filtered to those this key can serve.
 * Falls back to the full candidate list whenever discovery is unavailable.
 */
async function resolveModelList() {
  await refreshAvailableModels();
  if (!availableModelIds) return CANDIDATE_MODELS;
  const filtered = CANDIDATE_MODELS.filter((m) => availableModelIds.has(m));
  if (filtered.length === 0) return CANDIDATE_MODELS;
  return filtered;
}

/**
 * Direct Google REST call that bypasses SDK quirks (used as the last attempt per model).
 */
async function restGenerateContent({ modelName, systemInstruction, contents, plainText, temperature }) {
  const key = cachedApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return { text: '', quotaError: false, errorEntry: null };

  const nowIso = () => new Date().toISOString();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents:
            Array.isArray(contents) && contents.length > 0
              ? contents
              : [{ role: 'user', parts: [{ text: plainText }] }],
          generationConfig: {
            temperature: Number(temperature) || 0.7,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const sanitized = sanitizeHumanResponse(raw);
      if (sanitized && sanitized.trim()) return { text: sanitized, quotaError: false, errorEntry: null };
      return {
        text: '',
        quotaError: false,
        errorEntry: { model: modelName, via: 'rest', error: 'Empty response body', time: nowIso() },
      };
    }

    const body = await res.text();
    const quotaError = res.status === 429 || /quota|resource\s*exhausted/i.test(body);
    // 404 just means this model name does not exist — not worth logging every request
    if (res.status !== 404) {
      console.error(`[ai-engine] REST API rejected ${modelName} (${res.status}):`, body.slice(0, 300));
    }
    return {
      text: '',
      quotaError,
      errorEntry: { model: modelName, via: 'rest', status: res.status, body: body.slice(0, 500), time: nowIso() },
    };
  } catch (err) {
    return {
      text: '',
      quotaError: false,
      errorEntry: { model: modelName, via: 'rest', error: err.message, time: nowIso() },
    };
  }
}

/**
 * Tries one model end-to-end: SDK multi-turn -> SDK single-turn -> REST fallback.
 * The REST fallback is skipped when the SDK already failed on quota, because
 * retrying the same exhausted key would only add latency.
 *
 * @returns {{ text: string, quotaError: boolean, errorEntry: object|null }}
 */
async function attemptModelCall({ modelName, systemInstruction, contents, plainText, temperature }) {
  const generationConfig = {
    temperature: Number(temperature) || 0.7,
    maxOutputTokens: 600,
  };

  const extractText = (result) => {
    try {
      return result?.response?.text ? result.response.text() : '';
    } catch {
      return result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  };

  let sdkError = null;
  let text = '';

  try {
    const model = genAI.getGenerativeModel({ model: modelName, systemInstruction, generationConfig });
    try {
      const result = await model.generateContent({ contents });
      text = extractText(result);
    } catch (multiTurnErr) {
      console.warn(`[ai-engine] Model ${modelName} multi-turn attempt failed (${multiTurnErr.message}). Retrying single-turn...`);
      const singleModel = genAI.getGenerativeModel({ model: modelName, systemInstruction, generationConfig });
      const result = await singleModel.generateContent(plainText);
      text = extractText(result);
    }
  } catch (err) {
    sdkError = err;
  }

  const sanitized = sanitizeHumanResponse(text || '');
  if (sanitized && sanitized.trim()) {
    return { text: sanitized, quotaError: false, errorEntry: null };
  }

  const sdkQuotaError = Boolean(sdkError && isQuotaExhaustedError(sdkError));

  if (!sdkQuotaError) {
    const rest = await restGenerateContent({ modelName, systemInstruction, contents, plainText, temperature });
    if (rest.text) return { text: rest.text, quotaError: false, errorEntry: null };
    if (rest.quotaError) return { text: '', quotaError: true, errorEntry: rest.errorEntry };
    if (!sdkError && rest.errorEntry) return { text: '', quotaError: false, errorEntry: rest.errorEntry };
  }

  if (sdkError) {
    return {
      text: '',
      quotaError: sdkQuotaError,
      errorEntry: {
        model: modelName,
        via: 'sdk',
        error: sdkError.message,
        status: sdkError.status,
        time: new Date().toISOString(),
      },
    };
  }

  return {
    text: '',
    quotaError: false,
    errorEntry: { model: modelName, via: 'sdk', error: 'Empty or blocked response', time: new Date().toISOString() },
  };
}

// Helper to build strictly valid, alternating Gemini conversation contents
function buildValidGeminiContents(rawHistory, currentMessage) {
  const contents = [];

  if (Array.isArray(rawHistory)) {
    for (const turn of rawHistory) {
      if (
        (turn.role === 'user' || turn.role === 'model') &&
        Array.isArray(turn.parts) &&
        turn.parts[0]?.text &&
        typeof turn.parts[0].text === 'string' &&
        turn.parts[0].text.trim()
      ) {
        if (contents.length === 0) {
          if (turn.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: turn.parts[0].text.trim() }] });
          }
        } else {
          const lastRole = contents[contents.length - 1].role;
          if (turn.role !== lastRole) {
            contents.push({ role: turn.role, parts: [{ text: turn.parts[0].text.trim() }] });
          }
        }
      }
    }
  }

  // Ensure last item in history is not 'user', because current message is 'user'
  while (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }

  // Keep last 6 history turns (3 back-and-forth pairs)
  const sliced = contents.slice(-6);
  while (sliced.length > 0 && sliced[0].role !== 'user') {
    sliced.shift();
  }

  // Append current user message
  sliced.push({ role: 'user', parts: [{ text: currentMessage }] });
  return sliced;
}

export let allModelErrors = [];

/**
 * Generates an intelligent, virtuous response for an incoming message
 */
export async function generateResponse({
  jid,
  senderName,
  incomingText,
  isGroup = false,
  groupName = '',
  systemPrompt,
  temperature = 0.7,
  extraContext = [],
}) {
  allModelErrors = [];
  // Dynamic context layers (memories, learned rules, duty sheet) are appended
  // to whatever persona prompt is in effect.
  const contextBlock = (Array.isArray(extraContext) ? extraContext : [])
    .filter((b) => typeof b === 'string' && b.trim())
    .join('\n\n');
  const effectivePrompt = (systemPrompt || MASTER_SYSTEM_PROMPT) + (contextBlock ? `\n\n${contextBlock}` : '');

  // Get or initialize conversation history buffer (keep last 8 turns)
  if (!conversationHistories.has(jid)) {
    conversationHistories.set(jid, []);
  }
  const history = conversationHistories.get(jid);

  // Format message with group context if applicable
  const contextMessage = isGroup
    ? `[Group Member "${senderName}" in "${groupName}"]: ${incomingText}`
    : incomingText;

  let allModelsQuotaExhausted = false;

  if (genAI) {
    const models = await resolveModelList();
    const validContents = buildValidGeminiContents(history, contextMessage);
    let quotaFailures = 0;

    for (const modelName of models) {
      const attempt = await attemptModelCall({
        modelName,
        systemInstruction: effectivePrompt,
        contents: validContents,
        plainText: contextMessage,
        temperature,
      });

      if (attempt.text) {
        history.push({ role: 'user', parts: [{ text: contextMessage }] });
        history.push({ role: 'model', parts: [{ text: attempt.text }] });
        if (history.length > 12) history.splice(0, history.length - 12);

        return {
          text: attempt.text,
          isAllQuotaExhausted: false,
          toString() { return this.text; },
          valueOf() { return this.text; },
        };
      }

      if (attempt.errorEntry) {
        lastAIError = attempt.errorEntry;
        allModelErrors.push(attempt.errorEntry);
      }
      if (attempt.quotaError) quotaFailures++;

      console.warn(`[ai-engine] Model ${modelName} produced no usable response. Trying next candidate...`);
    }

    // Check if ALL candidate models specifically failed due to quota exhaustion
    if (models.length > 0 && quotaFailures === models.length) {
      allModelsQuotaExhausted = true;
      console.warn(`[ai-engine] CRITICAL: All ${models.length} Gemini model quotas have been exhausted for today.`);
    }
  }

  // If ALL models ran out of quota for the day, return a human breather message
  if (allModelsQuotaExhausted) {
    return {
      text: `Hit my conversation limit across my groups for today. I need to rest and recharge a bit — catch me again tomorrow and I'll be sharp as usual.`,
      isAllQuotaExhausted: true,
      toString() { return this.text; },
      valueOf() { return this.text; },
    };
  }

  // Concise, human-like fallback responses (used only when every model failed)
  const lowerMsg = (incomingText || '').toLowerCase();
  let fallbackReply = `Hey ${senderName}, good to hear from you. What do you need?`;

  if (lowerMsg.includes('who are you') || lowerMsg.includes('about yourself') || lowerMsg.includes('who created you') || lowerMsg.includes('your owner') || lowerMsg.includes('what do you do')) {
    fallbackReply = `I'm God's Virtue — created and owned by Glory Adeniran. I keep this community organized and answer whatever I can. Good to connect with you.`;
  } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    fallbackReply = `Hey ${senderName}. Hope your day's going well. What's on your mind?`;
  } else if (lowerMsg.includes('thank')) {
    fallbackReply = `You're welcome, ${senderName}. Always glad to help.`;
  } else if (lowerMsg.includes('help') || lowerMsg.includes('question') || lowerMsg.includes('advice')) {
    fallbackReply = `I'm right here, ${senderName}. What's the matter?`;
  } else if (lowerMsg.includes('what is') || lowerMsg.includes('how to') || lowerMsg.includes('why') || lowerMsg.includes('explain') || lowerMsg.includes('tell me')) {
    fallbackReply = `Good question, ${senderName}. Give me a little more context and I'll break it down.`;
  } else {
    const fallbacks = [
      `I'm here, ${senderName}. What can I do for you?`,
      `Listening, ${senderName}. What would you like to talk about?`,
      `Hey ${senderName}. What do you need?`,
    ];
    fallbackReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  return {
    text: fallbackReply,
    isAllQuotaExhausted: false,
    toString() { return this.text; },
    valueOf() { return this.text; },
  };
}

/**
 * Clears conversation memory for a specific chat or group
 */
export function resetConversationHistory(jid) {
  if (conversationHistories.has(jid)) {
    conversationHistories.delete(jid);
  }
}

/**
 * Locks AI-written recaps down to reality: guarantees the real date appears,
 * kills placeholder leaks ("[Current Date]") and meta-notes ("Note: please
 * update the date"), and enforces the emoji budget even if a model ignores rules.
 */
export function hardenRecapOutput(text = '', dateLine = '') {
  if (!text) return text;
  let out = text;

  // Kill meta-notes about updating/verifying the date
  out = out.replace(/\(?\bNote\s*:[^)\n]*\)?/gi, '');

  // Replace any leaked placeholder with the actual date
  out = out.replace(/\[Today'?s\s*Date\]|\[Current\s*Date\]|<today'?s\s*date>|\{today'?s\s*date\}/gi, dateLine || '');

  if (dateLine) {
    // Any line presenting itself as the date line gets rewritten canonically
    const dateLineRegex = /^[\s•\-*_]*(Today|Date)\s*[:\-]/i;
    const lines = out.split('\n');
    let dateLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (dateLineRegex.test(lines[i])) {
        lines[i] = `Today: ${dateLine}`;
        dateLineIndex = i;
      }
    }
    // If the recap somehow has no date line at all, add one after the header
    if (dateLineIndex === -1 && !out.includes(dateLine)) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim()) {
          lines.splice(i + 1, 0, `Today: ${dateLine}`);
          break;
        }
      }
    }
    out = lines.join('\n');
  }

  // Collapse blank-line pileups left behind by removals
  out = out.replace(/\n{3,}/g, '\n\n').trim();

  // Hard emoji cap (models sometimes sneak them in despite instructions)
  return sanitizeHumanResponse(out);
}

/**
 * Generates the evening daily community recap in a warm, human voice.
 * The real date is injected by the worker — the model is never asked to guess it.
 */
export async function generateDailyGroupSummary({
  groupName,
  newMembers = [],
  messages = [],
  customInstructions = '',
  reopenTime = '06:00',
}) {
  const dateLine = lagosDateLine();

  const memberListText = newMembers.length > 0
    ? newMembers.map(m => m.name ? `${m.name} (+${m.phone})` : `+${m.phone}`).join(', ')
    : 'None';

  const discussionSnippets = messages.length > 0
    ? messages.slice(-40).map(m => `${m.senderName}: "${m.text}"`).join('\n')
    : 'No messages at all today — the group was completely quiet.';

  if (genAI) {
    const systemPrompt = `You are "God's Virtue", a personality created and owned by Glory Adeniran. You are the community administrator in "${groupName}", and the group has just been locked for the night. Members will read this as you signing off the day.

TODAY'S DATE — use it exactly as given, it is already correct: ${dateLine}

Write the recap in exactly this shape, but in your own natural words:

DAILY RECAP — ${groupName}
Today: ${dateLine}
New faces: <names or numbers of members who joined today, or "No new members today.">
What went on:
- <2 to 4 short, plain bullets drawn ONLY from the messages below — what was actually discussed, asked, or decided>
<one short closing line: the group is locked for the night and reopens at ${reopenTime}>

Hard rules:
- The date must be exactly "${dateLine}". Never write [Current Date] or any placeholder, and never add notes about updating dates.
- Write like a real person wrapping up the day for friends: simple, honest, a bit warm. No hype, no lectures, no corporate phrases like "we extend our appreciation" or "a serene and orderly digital environment".
- ZERO emojis. Not one.
- If the day was quiet, just say so plainly, e.g. "Quiet one today — nobody had much to say."
- Do NOT invent people, topics, opinions, or events that are not in the log below. Never quote anyone verbatim for more than a few words.
- Keep the whole recap under about 130 words.
- Return only the recap text itself — no preamble, no explanation.`;

    const userPrompt = `Today's activity log for "${groupName}" (${dateLine}):

NEW MEMBERS WHO JOINED TODAY:
${memberListText}

GROUP MESSAGES & DISCUSSIONS TODAY:
${discussionSnippets}

${customInstructions ? `SPECIAL DIRECTIVES FROM THE GROUP OWNER:\n${customInstructions}\n` : ''}

Write the recap now.`;

    const models = await resolveModelList();

    for (const modelName of models) {
      const attempt = await attemptModelCall({
        modelName,
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        plainText: userPrompt,
        temperature: 0.6,
      });

      if (attempt.text) return hardenRecapOutput(attempt.text, dateLine);

      const detail =
        attempt.errorEntry?.error ||
        (attempt.errorEntry?.status ? `HTTP ${attempt.errorEntry.status}` : 'no usable response');
      console.warn(`[ai-engine] Summary generation on ${modelName} failed (${detail}). Trying next...`);
    }
  }

  // Fallback if AI API is temporarily unavailable — still honest and human
  const welcomeSection = newMembers.length > 0
    ? newMembers.map(m => m.name || `+${m.phone}`).join(', ')
    : 'No new members today.';

  const discussionSection = messages.length > 0
    ? `- Good conversations and questions from members across the day.\n- Thanks to everyone who contributed.`
    : `- Quiet one today — nobody had much to say, which is fine sometimes.`;

  return (
    `DAILY RECAP — ${groupName}\n` +
    `Today: ${dateLine}\n` +
    `New faces: ${welcomeSection}\n` +
    `What went on:\n${discussionSection}\n` +
    `Group's locked for the night — back open at ${reopenTime}. Goodnight all.`
  );
}

/**
 * Generates a short, grounded message to bring a silent group back to life.
 * Grounded in the group's real recent messages so it can never come out of thin air.
 *
 * @returns {{ text: string, mentionHandles: string[] }} mentionHandles are the
 * exact "@digits" handles the text wants tagged (caller maps them to JIDs).
 */
export async function generateSilenceBreaker({
  groupName,
  silenceMinutes = 60,
  snippets = [],
  tagOptions = [],
}) {
  const dateLine = lagosDateLine();
  const snippetText = snippets.length > 0
    ? snippets.map(s => `${s.senderName}: "${s.text}"`).join('\n')
    : '(no usable messages from today — the group has been silent a long time)';

  const handleList = tagOptions.map(t => t.handle).join(', ');

  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (genAI) {
    const systemPrompt = `You are "God's Virtue" — a personality in the WhatsApp group "${groupName}", created by Glory Adeniran. You are NOT an AI assistant and must never say or imply that you are one. You talk like a real, well-liked member of this group.

The group has gone quiet for about ${silenceMinutes} minutes. Write ONE short message to bring the chat back to life.

Recent messages from the group (use these for context — never invent beyond them):
${snippetText}

${tagOptions.length > 0
      ? `Today's date: ${dateLine}. You MAY tag at most ONE of these people by writing their handle exactly as shown, but only if it fits naturally:\n${handleList}`
      : `Today's date: ${dateLine}. Do not tag anyone.`}

Pick whichever approach fits the context best:
- pick up something from earlier that got no reply and gently ask what happened to it
- light, friendly banter about something that was said
- a genuinely interesting discussion idea that flows from what these people actually talk about

Rules:
- Maximum 2 sentences, ideally under 25 words.
- Sound like a person in the group — never a host, announcer, or moderator. No "Hey guys, let's keep the engagement going".
- Never mention silence, engagement, being an AI, or "checking in".
- ZERO emojis.
- If nothing connects, keep it simple and ask one direct, answerable question about something in the messages above.
- Return ONLY the message text, nothing else.`;

    const userPrompt = `The group "${groupName}" has been silent for ${silenceMinutes} minutes. Write your message now.`;

    const models = await resolveModelList();

    for (const modelName of models) {
      const attempt = await attemptModelCall({
        modelName,
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        plainText: userPrompt,
        temperature: 0.9,
      });

      if (attempt.text) {
        const text = attempt.text.trim();
        // Keep only tags whose handles actually exist in our options (never tag strangers)
        const usedHandles = [...new Set((text.match(/@\d{5,}/g) || []))]
          .filter((h) => tagOptions.some((t) => t.handle === h));
        return { text, mentionHandles: usedHandles };
      }

      const detail =
        attempt.errorEntry?.error ||
        (attempt.errorEntry?.status ? `HTTP ${attempt.errorEntry.status}` : 'no usable response');
      console.warn(`[ai-engine] Silence-breaker generation on ${modelName} failed (${detail}). Trying next...`);
    }
  }

  // Offline fallback: still grounded — quotes a real earlier message when possible
  const quoteSource = snippets.length > 0 ? snippets[snippets.length - 1] : null;
  const quote = quoteSource && quoteSource.text && quoteSource.text.length <= 90
    ? quoteSource.text.replace(/\s+/g, ' ').trim()
    : null;
  const tagHandle = tagOptions.length > 0 ? tagOptions[Math.floor(Math.random() * tagOptions.length)].handle : '';

  const fallbacks = [];
  if (quote && quoteSource) {
    fallbacks.push(`We left this hanging earlier — "${quote}". ${tagHandle} what happened with it?`);
  }
  if (tagHandle) {
    fallbacks.push(`${tagHandle}, it's been quiet here for a while. What's everybody up to?`);
    fallbacks.push(`${tagHandle}, you were making sense earlier — did you finish that thought?`);
  }
  fallbacks.push(`This place has gone silent. Somebody say something before I start talking to myself.`);
  fallbacks.push(`Honest question for the house: what's been the best part of everybody's day so far?`);

  const text = pickOne(fallbacks).replace(/\s{2,}/g, ' ').trim();
  const usedHandles = [...new Set((text.match(/@\d{5,}/g) || []))]
    .filter((h) => tagOptions.some((t) => t.handle === h));
  return { text, mentionHandles: usedHandles };
}

/** Lenient JSON extraction: tolerates code fences and prose around the payload. */
function parseJsonLoose(raw = '', arrayFallback = true) {
  if (!raw) return null;
  let cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const startIdx = Math.min(
    ...[cleaned.indexOf('['), cleaned.indexOf('{')].filter((i) => i >= 0)
  );
  if (Number.isFinite(startIdx)) cleaned = cleaned.slice(startIdx);
  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch {
    // Truncate at the last closing bracket and try once more
    const lastArr = cleaned.lastIndexOf(']');
    const lastObj = cleaned.lastIndexOf('}');
    const cut = Math.max(lastArr, lastObj);
    if (cut > 0) {
      try { return JSON.parse(cleaned.slice(0, cut + 1)); } catch { /* fall through */ }
    }
  }
  return arrayFallback ? [] : null;
}

/** Returns the stored conversation turns for a chat (for memory extraction). */
export function getConversationExchanges(jid, maxTurns = 12) {
  const history = conversationHistories.get(jid) || [];
  return history
    .slice(-maxTurns)
    .map((t) => ({
      role: t.role, // 'user' (a member) or 'model' (God's Virtue replied)
      text: (t.parts?.[0]?.text || '').trim(),
    }))
    .filter((t) => t.text);
}

/**
 * Extracts durable, worth-remembering facts from a conversation segment.
 * Returns [{ scope: 'person'|'group', text, category }] — never throws.
 */
export async function extractMemories({ groupName, senderName, exchanges, existingMemories = [] }) {
  if (!genAI || !Array.isArray(exchanges) || exchanges.length === 0) return [];

  const exchangeText = exchanges
    .map((e) => `${e.role === 'model' ? "God's Virtue" : (senderName || 'Member')}: ${e.text}`)
    .join('\n');

  const systemPrompt = `You extract durable memories from a WhatsApp conversation in the group "${groupName}".
A memory is a fact that will STILL MATTER tomorrow: names and how people are related, someone's school/work/city, preferences and opinions they hold, decisions the group made, promises or plans, recurring topics the group cares about.

Never extract: greetings, thanks, one-off questions, jokes, anything explicitly sensitive (health details, money amounts, secrets, addresses), or anything the person clearly said in passing.

Return STRICT JSON only, no prose:
[{"scope":"person","category":"name|preference|plan|fact|opinion","text":"short third-person sentence, max 25 words"}, ...]
Use scope "person" for facts about the sender, "group" for facts about the group as a whole (group facts are stored separately).
Max 4 items. If nothing is worth remembering, return [].

Existing memories (do NOT repeat or rephrase these):
${existingMemories.length > 0 ? existingMemories.map((m) => `- ${m}`).join('\n') : '(none yet)'}`;

  const models = await resolveModelList();
  for (const modelName of models) {
    const attempt = await attemptModelCall({
      modelName,
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: exchangeText }] }],
      plainText: exchangeText,
      temperature: 0.2,
    });
    if (attempt.text) {
      const parsed = parseJsonLoose(attempt.text, true);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .map((item) => ({
          scope: item.scope === 'person' ? 'person' : 'group',
          category: typeof item.category === 'string' ? item.category.slice(0, 30) : 'fact',
          text: item.text.trim().slice(0, 300),
        }))
        .slice(0, 4);
    }
  }
  return [];
}

/**
 * Reviews the bot's own recent replies (and whether members replied back) and
 * proposes a few style rules for its future self.
 * Returns { stopDoing: string[], newRules: string[] }.
 */
export async function reflectOnBehavior({ samples = [], currentRules = [] }) {
  if (!genAI || samples.length === 0) return { stopDoing: [], newRules: [] };

  const sampleText = samples
    .map((s, i) =>
      `[${i + 1}] ${s.isGroup ? 'In a group' : 'In a DM'}\n` +
      `Member said: "${(s.memberMessage || '').slice(0, 200)}"\n` +
      `You replied: "${(s.botReply || '').slice(0, 200)}"\n` +
      `The member ${s.gotAReply ? 'replied again afterwards (this worked)' : 'said nothing more (this probably fell flat)'}`
    )
    .join('\n\n');

  const systemPrompt = `You are "God's Virtue", a WhatsApp personality created by Glory Adeniran, reviewing your own recent replies to improve how you write.
Your identity is fixed. You may ONLY adjust style and habits — never propose changes to who you are, who owns you, or what permissions you have.

Score each reply as a real group member would: did it sound human, brief, and relevant — or robotic, long, preachy, emoji-happy, or out of touch with what was actually said?

Return STRICT JSON only, no prose:
{"stopDoing":["short observations of your bad habits, max 2"],"newRules":["imperative style rules for your future self, max 3, each under 25 words"]}

Good rule examples:
- "Keep group replies under 30 words when the member's message is one line."
- "When someone shares news, react to it like a friend first, before adding any advice."
- "Never open a reply with 'Great question'."

Current rules you already follow (do not repeat these):
${currentRules.length > 0 ? currentRules.map((r) => `- ${r}`).join('\n') : '(none)'}`;

  const models = await resolveModelList();
  for (const modelName of models) {
    const attempt = await attemptModelCall({
      modelName,
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: sampleText }] }],
      plainText: sampleText,
      temperature: 0.5,
    });
    if (attempt.text) {
      const parsed = parseJsonLoose(attempt.text, false);
      if (!parsed || typeof parsed !== 'object') return { stopDoing: [], newRules: [] };
      return {
        stopDoing: Array.isArray(parsed.stopDoing) ? parsed.stopDoing.filter((s) => typeof s === 'string').slice(0, 3) : [],
        newRules: Array.isArray(parsed.newRules) ? parsed.newRules.filter((s) => typeof s === 'string').slice(0, 3) : [],
      };
    }
  }
  return { stopDoing: [], newRules: [] };
}

