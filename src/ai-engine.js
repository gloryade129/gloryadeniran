/**
 * src/ai-engine.js
 * Google Gemini Conversational Intelligence for God's Virtue
 * 
 * Manages multi-turn memory buffers per chat, contextual injection
 * of group sender identities, and dynamic persona synchronization.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeHumanResponse } from './antiban.js';

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
• Short & Impactful: Speak like an authentic, articulate human on WhatsApp. Keep your messages punchy, direct, and concise (usually 1 to 4 sentences). Never dump walls of text or sterile lectures.
• Tone: Grounded, warm, polite, and confident.
• Emojis: Use subtle, mature emojis sparingly and naturally when appropriate (e.g., ✨, 👍, 🤝, 💡, 🌿, ☕). Avoid emoji clutter.
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
}) {
  allModelErrors = [];
  const effectivePrompt = systemPrompt || MASTER_SYSTEM_PROMPT;

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

  // If ALL models ran out of quota for the day, return creative exhaustion breather message
  if (allModelsQuotaExhausted) {
    return {
      text: `I've reached my daily conversation limit across my active groups for today! 🔋 I need a little time to rest and recharge. Feel free to ping me again tomorrow—I'll be right back with full energy to assist you! ✨`,
      isAllQuotaExhausted: true,
      toString() { return this.text; },
      valueOf() { return this.text; },
    };
  }

  // Concise, human-like fallback responses with subtle mature emojis
  const lowerMsg = (incomingText || '').toLowerCase();
  let fallbackReply = `Hello ${senderName}! Good to hear from you. How can I assist you today? ✨`;

  if (lowerMsg.includes('who are you') || lowerMsg.includes('about yourself') || lowerMsg.includes('who created you') || lowerMsg.includes('your owner') || lowerMsg.includes('what do you do')) {
    fallbackReply = `I am God's Virtue, created and owned by Glory Adeniran. I assist with community administration, answering questions, and keeping things orderly. Pleasure to connect with you! 🤝`;
  } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    fallbackReply = `Hey ${senderName}! Hope your day is going smoothly. What's on your mind? 👍`;
  } else if (lowerMsg.includes('thank')) {
    fallbackReply = `You're very welcome, ${senderName}! Always glad to help. ✨`;
  } else if (lowerMsg.includes('help') || lowerMsg.includes('question') || lowerMsg.includes('advice')) {
    fallbackReply = `I'm right here, ${senderName}. What specific matter would you like help with? 💡`;
  } else if (lowerMsg.includes('what is') || lowerMsg.includes('how to') || lowerMsg.includes('why') || lowerMsg.includes('explain') || lowerMsg.includes('tell me')) {
    fallbackReply = `That's an interesting question, ${senderName}. Let's discuss that—feel free to share more context! 💡`;
  } else {
    const fallbacks = [
      `Glad you reached out, ${senderName}. What can I do for you today? 🤝`,
      `I'm listening, ${senderName}. What would you like to discuss? 💡`,
      `Hello ${senderName}! How can I assist you right now? ✨`,
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
 * Generates an intelligent, warm daily summary of group activities and discussions.
 */
export async function generateDailyGroupSummary({
  groupName,
  newMembers = [],
  messages = [],
  customInstructions = '',
  reopenTime = '06:00',
}) {
  const memberListText = newMembers.length > 0
    ? newMembers.map(m => m.name ? `${m.name} (+${m.phone})` : `+${m.phone}`).join(', ')
    : 'None';

  const discussionSnippets = messages.length > 0
    ? messages.slice(-40).map(m => `${m.senderName}: "${m.text}"`).join('\n')
    : 'No active discussions today; a quiet, peaceful day.';

  if (genAI) {
    const systemPrompt = `You are "God's Virtue", created and owned by Glory Adeniran, serving as community administrator in "${groupName}".
The group has just locked for the night for peaceful rest. You are delivering the official Evening Community Summary.

Format the summary with clean, simple, and detailed bullet points:

✨ *DAILY COMMUNITY RECAP • ${groupName.toUpperCase()}* ✨
• 📅 *Date*: [Today's Date]
• 👥 *New Members Welcomed*: [List names or phones of members who joined today. If none joined today, write: "None today — appreciation to all active members!"]
• 💡 *Key Discussions & Highlights*:
  - [Clear bullet point 1: Main topic or theme discussed today]
  - [Clear bullet point 2: Notable insight, question, or helpful contribution]
  - [Clear bullet point 3: Key takeaway or community update]
• 🌙 *Quiet Rest*: Group is locked for undisturbed rest and reopens tomorrow morning at ${reopenTime}. Have a restful night everyone! ✨

Tone: Articulate, respectful, creative, thoughtful, simple, and detailed. No preachy language or generic fluff. Keep bullet points punchy, informative, and organized.`;

    const userPrompt = `Here is today's activity log for "${groupName}":

NEW MEMBERS WHO JOINED TODAY:
${memberListText}

GROUP MESSAGES & DISCUSSIONS TODAY:
${discussionSnippets}

${customInstructions ? `SPECIAL DIRECTIVES:\n${customInstructions}\n` : ''}

Please write the organized daily community summary now.`;

    const models = await resolveModelList();

    for (const modelName of models) {
      const attempt = await attemptModelCall({
        modelName,
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        plainText: userPrompt,
        temperature: 0.7,
      });

      if (attempt.text) return attempt.text.trim();

      const detail =
        attempt.errorEntry?.error ||
        (attempt.errorEntry?.status ? `HTTP ${attempt.errorEntry.status}` : 'no usable response');
      console.warn(`[ai-engine] Summary generation on ${modelName} failed (${detail}). Trying next...`);
    }
  }

  // Fallback if AI API is temporarily unavailable
  const welcomeSection = newMembers.length > 0
    ? newMembers.map(m => m.name || `+${m.phone}`).join(', ')
    : 'None joined today — gratitude to all our active members!';

  const discussionSection = messages.length > 0
    ? `  - Active member interactions and discussions across the community.\n  - Key thoughts and shared insights during the day.`
    : `  - A quiet, peaceful day across the community.`;

  const todayStr = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' });

  return (
    `✨ *DAILY COMMUNITY RECAP • ${groupName.toUpperCase()}* ✨\n\n` +
    `• 📅 *Date*: ${todayStr}\n` +
    `• 👥 *New Members Welcomed*: ${welcomeSection}\n` +
    `• 💡 *Key Highlights*:\n${discussionSection}\n` +
    `• 🌙 *Quiet Rest*: Group is locked for peaceful sleep and reopens tomorrow morning at ${reopenTime}. Have a restful night everyone! ✨`
  );
}

