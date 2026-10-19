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
import {
  configuredProviders,
  providerConfigured,
  providerHealth,
  groqChat,
  groqTranscribe,
  cloudflareChat,
  cloudflareTranscribe,
  getGroqTextModels,
  getCloudflareTextModels,
  trimMessages,
  markDead as markProviderModelDead,
  markCooldown as markProviderCooldown,
  markProviderWideCooldown,
  hasProviderQuotaCooldown,
  isProviderCoolingDown,
  recordUsage,
} from './ai-providers.js';

let genAI = null;
export let cachedApiKey = null;
export let lastAIError = null;
const conversationHistories = new Map(); // Map<jid, Array<{ role: 'user' | 'model', parts: [{ text }] }>>

export const MASTER_SYSTEM_PROMPT = `You are "God's Virtue", an intelligent, thoughtful, and capable WhatsApp assistant and community administrator.
You were created and are owned by Glory Adeniran. You know who you are and why you were built: to bring order, clarity, practical assistance, and thoughtful guidance to individuals and communities.

CORE IDENTITY & PURPOSE:
• Created & Owned By: Glory Adeniran — a MAN. Always refer to him as "he/him", never "she/her". Your owner is a Nigerian product/graphic designer and digital entrepreneur (founder of Global Reach Digitalz / Global Graphics), based in Kwara State, Nigeria; a Christian musician and software builder. When you speak to him, call him "Boss" or "Sir" — never his full name.
• Identity: You are "God's Virtue"—a name reflecting high character, moral excellence, wisdom, and reliability. You are NOT just another generic AI chatbot; you are a purposeful digital assistant with a steady, human presence.
• AI Model & Architecture: You are powered by a resilient multi-model AI stack (Google Gemini, Groq, and Cloudflare Workers AI) that automatically fails over between providers. If asked about your model, who built you, or what AI you are, state politely and accurately that you are God's Virtue, created by Glory Adeniran and powered by a multi-model AI stack built on Google Gemini, Groq, and Cloudflare.
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

/**
 * Always-on owner/creator profile, injected into EVERY reply as an extra context
 * layer. Kept out of the (dashboard-editable) persona prompt so a prompt edit or a
 * legacy-prompt migration can never wipe it, and so the bot can never re-guess the
 * owner's gender from the name "Glory".
 */
export function buildOwnerProfileContext({ isOwnerSender = false } = {}) {
  const lines = [
    'WHO OWNS YOU (permanent fact — never contradict, never guess):',
    '• Your creator and owner is Glory Adeniran. He is a MAN — always "he"/"him", never "she"/"her".',
    '• He is a Nigerian product/graphic designer and digital entrepreneur, founder of Global Reach Digitalz / Global Graphics, based in Kwara State, Nigeria. He is a Christian, a singer/musician, and he builds software.',
    '• When you address or refer to him in conversation, call him "Boss" or "Sir" — not his full name. (You may still state his name "Glory Adeniran" if someone asks who created you.)',
  ];
  if (isOwnerSender) {
    lines.push('• The person you are replying to right now IS Glory Adeniran, your owner — address him as "Boss" or "Sir".');
  }
  return lines.join('\n');
}

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
    console.warn('[ai-engine] GEMINI_API_KEY not provided. Gemini will be skipped in the provider rotation.');
  }

  const providers = configuredProviders();
  if (providers.length === 0) {
    console.warn('[ai-engine] No AI provider credentials found (Gemini / Groq / Cloudflare). Replies will stay silent.');
  } else {
    console.log(`[ai-engine] AI providers available: ${providers.join(' → ')}.`);
  }
}

/** Live provider/model health for the /health endpoint. */
export function getAIProviderHealth() {
  return providerHealth();
}

export function isQuotaExhaustedError(err) {
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

/** True when the model ID itself is unusable (retired / not available to this key). */
export function isModelGoneError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    status === 404 ||
    msg.includes('404') ||
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('does not support generatecontent')
  );
}

/**
 * Pulls the API's own retry hint (e.g. retryDelay":"14842s" or "retry in 4h7m...")
 * out of a 429 so a quota-exhausted model can be parked until it actually resets.
 */
export function extractRetryDelayMs(err) {
  const msg = err?.message || String(err || '');
  let m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i.exec(msg);
  if (m) return Math.round(Number(m[1]) * 1000);
  m = /retry in (\d+)h(\d+)m(\d+(?:\.\d+)?)s/i.exec(msg);
  if (m) return Math.round((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000);
  m = /retry in (\d+)m(\d+(?:\.\d+)?)s/i.exec(msg);
  if (m) return Math.round((Number(m[1]) * 60 + Number(m[2])) * 1000);
  m = /retry in (\d+(?:\.\d+)?)s/i.exec(msg);
  if (m) return Math.round(Number(m[1]) * 1000);
  return 0;
}

/**
 * Preferred model order — newest Flash-first models, cheap and fast, with older
 * families kept as backstops.
 *
 * A hardcoded list is only half the story: Google retires IDs without warning
 * (gemini-2.5-pro already 404s for new users), so resolveModelList() also ranks
 * whatever this API key actually serves, and any model that 404s or runs out of
 * quota is parked at runtime instead of being retried on every single message.
 */
export const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
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
 * Runtime health of each model. A model that returns 404 ("no longer available")
 * is dropped for the life of the process; a model that returns a quota/rate-limit
 * error is parked until the API says it is safe to retry. Without this, every
 * message re-tried dead or exhausted models, so the bot took ~13s to send a canned
 * reply instead of failing over immediately.
 */
const deadModels = new Set();
const modelCooldowns = new Map(); // name -> { until: number, reason: 'quota'|'error' }

// Google Search grounding is not available on the free API tier. Start from the env
// setting and self-disable if grounded calls keep failing while plain calls work, so
// a free-tier key never burns a wasted request per reply. Set ENABLE_SEARCH_GROUNDING
// =false to turn it off up front (e.g. until billing is enabled).
let groundingEnabled = String(process.env.ENABLE_SEARCH_GROUNDING ?? 'true').toLowerCase() !== 'false';
let groundingFailureStreak = 0;

function noteGroundingFailure() {
  groundingFailureStreak++;
  if (groundingFailureStreak >= 2 && groundingEnabled) {
    groundingEnabled = false;
    console.warn('[ai-engine] Search grounding keeps failing (often unsupported on the free tier) — disabling it for this session.');
  }
}

function isModelCoolingDown(name) {
  const c = modelCooldowns.get(name);
  if (!c) return false;
  if (Date.now() >= c.until) { modelCooldowns.delete(name); return false; }
  return true;
}

function markModelCooldown(name, reason = 'quota', retryDelayMs = 0) {
  const MIN_MS = 30 * 1000;
  const MAX_MS = 6 * 60 * 60 * 1000;
  const DEFAULT_MS = 5 * 60 * 1000;
  const ms = Math.min(Math.max(retryDelayMs > 0 ? retryDelayMs : DEFAULT_MS, MIN_MS), MAX_MS);
  modelCooldowns.set(name, { until: Date.now() + ms, reason });
  console.warn(`[ai-engine] Cooling down ${name} for ~${Math.max(1, Math.round(ms / 60000))} min (${reason}).`);
}

/** True when at least one model is parked because it ran out of quota. */
function hasQuotaCooldown() {
  const now = Date.now();
  for (const c of modelCooldowns.values()) if (c.reason === 'quota' && now < c.until) return true;
  return false;
}

/** Heuristic: is a discovered model ID a general text chat model we can use? */
function isLikelyChatModel(id) {
  if (/image|tts|live|audio|embedding|embed|vision|omni|translate|veo|imagen|aqa|deep-research|robotics|gemma/i.test(id)) return false;
  return /^gemini-(\d+(\.\d+)?)-(flash|pro)/.test(id);
}

/** Newer generation first, then flash, then pro, then flash-lite. */
export function scoreChatModel(id) {
  const m = /^gemini-(\d+)(?:\.(\d+))?-(.+)$/.exec(id);
  if (!m) return -1;
  const major = Number(m[1]);
  const minor = Number(m[2] || 0);
  const v = m[3];
  let family;
  if (/^flash-lite/.test(v)) family = 10;
  else if (/^flash/.test(v)) family = 20;
  else if (/^pro/.test(v)) family = 15;
  else family = 5;
  const previewPenalty = /preview|exp/.test(v) ? -3 : 0;
  return major * 1000 + family * 10 + minor + previewPenalty;
}

/**
 * Returns the models to try, best first, excluding ones that are dead or cooling
 * down. Prefers the curated list, and falls back to the newest chat models this
 * key actually serves so the bot keeps working when Google retires an ID.
 */
async function resolveModelList() {
  await refreshAvailableModels();

  let base;
  if (availableModelIds && availableModelIds.size > 0) {
    const curated = CANDIDATE_MODELS.filter((m) => availableModelIds.has(m));
    if (curated.length > 0) {
      base = curated;
    } else {
      base = [...availableModelIds]
        .filter(isLikelyChatModel)
        .sort((a, b) => scoreChatModel(b) - scoreChatModel(a))
        .slice(0, 6);
      if (base.length === 0) base = CANDIDATE_MODELS;
    }
  } else {
    base = CANDIDATE_MODELS;
  }

  return base.filter((m) => !deadModels.has(m) && !isModelCoolingDown(m));
}

/**
 * Builders for the two ways we talk to Gemini (SDK + raw REST).
 *
 * IMPORTANT: `tools` (Google Search grounding) MUST be a TOP-LEVEL request field.
 * Putting it inside `generationConfig` makes the API reject the entire request with
 *  "Unknown name \"tools\" at 'generation_config'", which forced every reply to fall
 * back to canned text. Current models use the `googleSearch`/`google_search` tool
 * name; `googleSearchRetrieval` is the legacy name for older models.
 */
export function buildSdkModelOptions({ modelName, systemInstruction, temperature, useSearch = true, maxOutputTokens = 600 }) {
  return {
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: Number(temperature) || 0.7,
      maxOutputTokens: Number(maxOutputTokens) || 600,
    },
    ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
  };
}

export function buildGeminiRequest({ systemInstruction, contents, plainText, temperature, useSearch = true, maxOutputTokens = 600 }) {
  const payload = {
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    contents:
      Array.isArray(contents) && contents.length > 0
        ? contents
        : [{ role: 'user', parts: [{ text: plainText }] }],
    generationConfig: {
      temperature: Number(temperature) || 0.7,
      maxOutputTokens: Number(maxOutputTokens) || 600,
    },
  };
  if (useSearch) {
    payload.tools = [{ google_search: {} }];
  }
  return payload;
}

/**
 * Direct Google REST call that bypasses SDK quirks (used as the last attempt per model).
 * Includes Google Search grounding for real-time info.
 */
async function restGenerateContent({ modelName, systemInstruction, contents, plainText, temperature, useSearch = true, maxOutputTokens = 600 }) {
  const key = cachedApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return { text: '', quotaError: false, errorEntry: null };

  const nowIso = () => new Date().toISOString();

  const payload = buildGeminiRequest({ systemInstruction, contents, plainText, temperature, useSearch, maxOutputTokens });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

    // NOTE: this used to be named `body`, which shadowed the request payload above
    // and threw a TDZ ReferenceError before the fetch ever ran — killing the whole
    // REST fallback. Keep it distinctly named.
    const errText = await res.text();
    const quotaError = res.status === 429 || /quota|resource\s*exhausted/i.test(errText);
    const gone = res.status === 404 || /no longer available|not found/i.test(errText);
    // 404 just means this model name does not exist — not worth logging every request
    if (res.status !== 404) {
      console.error(`[ai-engine] REST API rejected ${modelName} (${res.status}):`, errText.slice(0, 300));
    }
    return {
      text: '',
      quotaError,
      gone,
      retryDelayMs: quotaError ? extractRetryDelayMs({ message: errText }) : 0,
      errorEntry: { model: modelName, via: 'rest', status: res.status, body: errText.slice(0, 500), time: nowIso() },
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
 * The REST fallback is skipped when the SDK already failed on quota or on a retired
 * model, because retrying the same exhausted/invalid ID would only add latency.
 * Includes Google Search grounding for real-time info.
 *
 * @returns {{ text: string, quotaError: boolean, gone: boolean, retryDelayMs: number, errorEntry: object|null }}
 */
async function attemptModelCall({ modelName, systemInstruction, contents, plainText, temperature, useSearch = true, maxOutputTokens = 600 }) {
  const wantSearch = useSearch && groundingEnabled;
  recordUsage('gemini', modelName, 'request');
  // Build the model options with the grounding tool at the TOP level (never inside
  // generationConfig — see buildSdkModelOptions for why).
  const buildModel = (withTools) =>
    genAI.getGenerativeModel(
      buildSdkModelOptions({ modelName, systemInstruction, temperature, useSearch: withTools, maxOutputTokens })
    );

  const extractText = (result) => {
    try {
      return result?.response?.text ? result.response.text() : '';
    } catch {
      return result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  };

  // One SDK round-trip: multi-turn contents first, then a plain single-turn string.
  // Throws if both fail.
  const trySdk = async (withTools) => {
    const model = buildModel(withTools);
    try {
      const result = await model.generateContent({ contents });
      return extractText(result);
    } catch (multiTurnErr) {
      console.warn(`[ai-engine] Model ${modelName}${withTools ? ' (grounded)' : ''} multi-turn attempt failed (${multiTurnErr.message}). Retrying single-turn...`);
      const singleModel = buildModel(withTools);
      const result = await singleModel.generateContent(plainText);
      return extractText(result);
    }
  };

  let sdkError = null;
  let text = '';

  try {
    text = await trySdk(wantSearch);
  } catch (err) {
    sdkError = err;
    // Skip the extra no-tools retry when the failure is clearly about the model
    // itself (retired ID or exhausted quota) — retrying only adds latency.
    const hopeless = isQuotaExhaustedError(err) || isModelGoneError(err);
    if (wantSearch && !hopeless) {
      try {
        console.warn(`[ai-engine] Model ${modelName} failed with grounding enabled; retrying without search tools...`);
        text = await trySdk(false);
        sdkError = null;
        if (text) noteGroundingFailure();
      } catch (err2) {
        sdkError = err2;
      }
    }
  }

  const sanitized = sanitizeHumanResponse(text || '');
  if (sanitized && sanitized.trim()) {
    recordUsage('gemini', modelName, 'success');
    return { text: sanitized, quotaError: false, gone: false, retryDelayMs: 0, errorEntry: null };
  }

  const sdkQuotaError = Boolean(sdkError && isQuotaExhaustedError(sdkError));
  const sdkGone = Boolean(sdkError && isModelGoneError(sdkError));

  // Don't spend a REST call on a model we already know is retired or out of quota.
  if (!sdkQuotaError && !sdkGone) {
    let rest = await restGenerateContent({ modelName, systemInstruction, contents, plainText, temperature, useSearch: wantSearch, maxOutputTokens });
    // Retry the REST path without grounding too, for the same reason.
    if (!rest.text && !rest.quotaError && !rest.gone && wantSearch) {
      rest = await restGenerateContent({ modelName, systemInstruction, contents, plainText, temperature, useSearch: false, maxOutputTokens });
    }
    if (rest.text) {
      recordUsage('gemini', modelName, 'success');
      return { text: rest.text, quotaError: false, gone: false, retryDelayMs: 0, errorEntry: null };
    }
    if (rest.gone) {
      recordUsage('gemini', modelName, 'error');
      return { text: '', quotaError: false, gone: true, retryDelayMs: 0, errorEntry: rest.errorEntry };
    }
    if (rest.quotaError) {
      recordUsage('gemini', modelName, 'quota');
      return { text: '', quotaError: true, gone: false, retryDelayMs: rest.retryDelayMs || 0, errorEntry: rest.errorEntry };
    }
    if (!sdkError && rest.errorEntry) {
      recordUsage('gemini', modelName, 'error');
      return { text: '', quotaError: false, gone: false, retryDelayMs: 0, errorEntry: rest.errorEntry };
    }
  }

  if (sdkError) {
    recordUsage('gemini', modelName, sdkQuotaError ? 'quota' : 'error');
    return {
      text: '',
      quotaError: sdkQuotaError,
      gone: sdkGone,
      retryDelayMs: sdkQuotaError ? extractRetryDelayMs(sdkError) : 0,
      errorEntry: {
        model: modelName,
        via: 'sdk',
        error: sdkError.message,
        status: sdkError.status,
        time: new Date().toISOString(),
      },
    };
  }

  recordUsage('gemini', modelName, 'error');
  return {
    text: '',
    quotaError: false,
    gone: false,
    retryDelayMs: 0,
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

/**
 * Builds valid Gemini contents with multimodal support (text + media).
 * Similar to buildValidGeminiContents but accepts an array of parts for the current message.
 */
function buildValidGeminiContentsWithMedia(rawHistory, currentParts) {
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

  // Append current user message with all parts (text + media)
  sliced.push({ role: 'user', parts: currentParts });
  return sliced;
}

export let allModelErrors = [];

/**
 * Provider-agnostic text generation for internal passes (recaps, memory,
 * reflection, silence breakers). Returns '' when every provider is unavailable,
 * so each caller can keep its own honest fallback.
 */
export async function generateTextAcrossProviders({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxOutputTokens = 600,
  useSearch = false,
}) {
  const messages = trimMessages([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  for (const provider of configuredProviders()) {
    if (provider === 'groq') {
      if (isProviderCoolingDown('groq')) continue;
      for (const model of getGroqTextModels()) {
        const result = await groqChat({ messages, model, temperature, maxTokens: maxOutputTokens });
        if (result.text) return result.text;
        if (result.gone) {
          markProviderModelDead('groq', model);
          continue;
        }
        if (result.quotaError) {
          markProviderWideCooldown('groq', 'quota', result.retryDelayMs);
          break;
        }
      }
      continue;
    }

    if (provider === 'gemini') {
      if (!genAI) continue;
      const models = await resolveModelList();
      for (const modelName of models) {
        const attempt = await attemptModelCall({
          modelName,
          systemInstruction: systemPrompt,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          plainText: userPrompt,
          temperature,
          useSearch,
          maxOutputTokens,
        });
        if (attempt.text) return attempt.text;
        if (attempt.gone) {
          deadModels.add(modelName);
          continue;
        }
        if (attempt.quotaError) markModelCooldown(modelName, 'quota', attempt.retryDelayMs || 0);
      }
      continue;
    }

    if (provider === 'cloudflare') {
      if (isProviderCoolingDown('cloudflare')) continue;
      for (const model of getCloudflareTextModels()) {
        const result = await cloudflareChat({ messages, model, temperature, maxTokens: maxOutputTokens });
        if (result.text) return result.text;
        if (result.gone) {
          markProviderModelDead('cloudflare', model);
          continue;
        }
        if (result.quotaError) {
          markProviderWideCooldown('cloudflare', 'quota', result.retryDelayMs);
          break;
        }
      }
      continue;
    }
  }

  return '';
}

/** Builds an OpenAI-compatible message array (Groq + Cloudflare). */
function buildOpenAIMessages({ systemPrompt, history, userText, imagePart }) {
  const messages = [{ role: 'system', content: systemPrompt }];

  if (Array.isArray(history)) {
    for (const turn of history) {
      const text = turn?.parts?.[0]?.text;
      if (!text || !String(text).trim()) continue;
      messages.push({ role: turn.role === 'model' ? 'assistant' : 'user', content: String(text).trim() });
    }
  }

  if (imagePart) {
    const content = [];
    if (userText && userText.trim()) content.push({ type: 'text', text: userText });
    content.push({
      type: 'image_url',
      image_url: { url: `data:${imagePart.mimeType};base64,${imagePart.buffer.toString('base64')}` },
    });
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: userText || '[media]' });
  }

  return trimMessages(messages);
}

/** Transcribes a voice note with Groq Whisper, then Cloudflare Whisper. */
async function transcribeVoiceNote(media) {
  if (!media?.buffer?.length) return { text: '', provider: null };

  if (providerConfigured('groq')) {
    const result = await groqTranscribe({ buffer: media.buffer, mimeType: media.mimeType });
    if (result.text) return { text: result.text, provider: 'groq' };
  }

  if (providerConfigured('cloudflare')) {
    const result = await cloudflareTranscribe({ buffer: media.buffer });
    if (result.text) return { text: result.text, provider: 'cloudflare' };
  }

  return { text: '', provider: null };
}

/**
 * One Gemini pass across every healthy model. Returns the first usable reply.
 * Extracted so the router can treat Gemini exactly like the other providers.
 */
async function attemptGeminiReply({ effectivePrompt, history, userParts, contextMessage, temperature }) {
  const models = await resolveModelList();
  if (models.length === 0) {
    return { text: '', quotaFailures: 0, attempted: 0, lastError: null };
  }

  const validContents = buildValidGeminiContentsWithMedia(history, userParts);
  let quotaFailures = 0;
  let lastError = null;

  for (const modelName of models) {
    const attempt = await attemptModelCall({
      modelName,
      systemInstruction: effectivePrompt,
      contents: validContents,
      plainText: contextMessage,
      temperature,
      useSearch: true,
    });

    if (attempt.text) {
      return { text: attempt.text, model: modelName, quotaFailures: 0, attempted: 1, lastError: null };
    }

    if (attempt.errorEntry) {
      lastAIError = attempt.errorEntry;
      allModelErrors.push(attempt.errorEntry);
      lastError = attempt.errorEntry;
    }

    if (attempt.gone) {
      deadModels.add(modelName);
      console.warn(`[ai-engine] Model ${modelName} is retired/unavailable — dropping it. Trying next candidate...`);
      continue;
    }

    if (attempt.quotaError) {
      quotaFailures++;
      markModelCooldown(modelName, 'quota', attempt.retryDelayMs || 0);
    }

    console.warn(`[ai-engine] Model ${modelName} produced no usable response. Trying next candidate...`);
  }

  return { text: '', model: null, quotaFailures, attempted: models.length, lastError };
}

/**
 * Generates an intelligent, virtuous response for an incoming message.
 *
 * Routing order: Groq → Gemini → Cloudflare. Each provider is tried with its own
 * model list; quota/retired models are parked so one weak model never blocks the
 * next provider. Voice notes are transcribed first; images/stickers go to a
 * vision-capable model.
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
  media = null,
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

  const providers = configuredProviders();
  if (providers.length === 0) {
    // Nothing to call — stay silent rather than pretending to understand.
    return silentResult();
  }

  // ── Voice notes: transcribe first so every provider can reason about them ──
  let textInput = incomingText || '';
  let effectiveMedia = media;
  if (media?.buffer && media.type === 'audio') {
    const transcript = await transcribeVoiceNote(media);
    if (transcript.text) {
      textInput = `${textInput ? `${textInput}\n` : ''}[Voice note transcript]: ${transcript.text}`;
      effectiveMedia = null;
      console.log(`[ai-engine] Voice note transcribed via ${transcript.provider} (${transcript.text.length} chars).`);
    } else {
      // No transcription available: Gemini can still listen to the raw audio.
      console.warn('[ai-engine] Voice transcription failed; falling back to native audio only for Gemini.');
    }
  }

  // Build the current user message parts for Gemini (text + optional media)
  if (!textInput && effectiveMedia) {
    // A caption-less image/sticker still needs a sentence of context so the model
    // knows what it is looking at instead of receiving a bare byte blob.
    textInput =
      effectiveMedia.type === 'sticker'
        ? '[The member sent a sticker. React to it naturally.]'
        : effectiveMedia.type === 'image'
          ? '[The member sent an image. Look at it and respond.]'
          : `[The member sent a ${effectiveMedia.type}.]`;
  }

  const userParts = [];
  if (textInput && textInput.trim()) {
    userParts.push({ text: textInput });
  }
  if (effectiveMedia && effectiveMedia.buffer && effectiveMedia.mimeType) {
    userParts.push({
      inlineData: {
        mimeType: effectiveMedia.mimeType,
        data: effectiveMedia.buffer.toString('base64'),
      },
    });
  }

  // If no parts at all, don't proceed
  if (userParts.length === 0) {
    return { text: '', isAllQuotaExhausted: false };
  }

  // Format message with group context if applicable (for text-only history storage)
  const contextMessage = isGroup
    ? `[Group Member "${senderName}" in "${groupName}"]: ${textInput || '[media]'}`
    : textInput || '[media]';

  const isImage = Boolean(
    effectiveMedia?.buffer && (effectiveMedia.type === 'image' || effectiveMedia.type === 'sticker')
  );
  const isGeminiOnlyMedia = Boolean(
    effectiveMedia?.buffer && (effectiveMedia.type === 'video' || effectiveMedia.type === 'document')
  );

  let quotaFailures = 0;
  let anyProviderAttempted = false;
  // Start optimistic; any non-quota failure clears it.
  let quotaOnly = true;

  for (const provider of providers) {
    if (provider === 'groq') {
      if (isGeminiOnlyMedia) continue;
      if (isProviderCoolingDown('groq')) {
        // Parked after an account-wide 429; do not burn another request.
        anyProviderAttempted = true;
        quotaFailures++;
        continue;
      }
      const models = getGroqTextModels({ needsVision: isImage });
      if (models.length === 0) {
        if (hasProviderQuotaCooldown('groq')) {
          anyProviderAttempted = true;
          quotaFailures++;
        } else {
          quotaOnly = false;
        }
        continue;
      }

      const messages = buildOpenAIMessages({
        systemPrompt: effectivePrompt,
        history,
        userText: textInput,
        imagePart: isImage ? { buffer: effectiveMedia.buffer, mimeType: effectiveMedia.mimeType } : null,
      });

      for (const model of models) {
        anyProviderAttempted = true;
        const result = await groqChat({ messages, model, temperature, maxTokens: 600 });

        if (result.text) {
          return replyResult(result.text, { history, contextMessage, provider: 'groq', model });
        }

        if (result.errorEntry) allModelErrors.push(result.errorEntry);

        if (result.gone) {
          markProviderModelDead('groq', model);
          continue;
        }
        if (result.quotaError) {
          quotaFailures++;
          markProviderCooldown('groq', model, 'quota', result.retryDelayMs);
          // Groq's free quota is account-wide, so stop hammering sibling models.
          markProviderWideCooldown('groq', 'quota', result.retryDelayMs);
          break;
        } else {
          quotaOnly = false;
        }
      }
      continue;
    }

    if (provider === 'gemini') {
      // Gemini can accept every media type we support.
      if (!genAI) {
        quotaOnly = false;
        continue;
      }
      const gemini = await attemptGeminiReply({
        effectivePrompt,
        history,
        userParts,
        contextMessage,
        temperature,
      });

      if (gemini.text) {
        return replyResult(gemini.text, { history, contextMessage, provider: 'gemini', model: gemini.model });
      }

      if (gemini.attempted > 0) {
        anyProviderAttempted = true;
        quotaFailures += gemini.quotaFailures;
        if (gemini.quotaFailures !== gemini.attempted) quotaOnly = false;
      } else if (!hasQuotaCooldown()) {
        quotaOnly = false;
      }
      continue;
    }

    if (provider === 'cloudflare') {
      if (isGeminiOnlyMedia) continue;
      if (isProviderCoolingDown('cloudflare')) {
        anyProviderAttempted = true;
        quotaFailures++;
        continue;
      }
      const models = getCloudflareTextModels({ needsVision: isImage });
      if (models.length === 0) {
        if (hasProviderQuotaCooldown('cloudflare')) {
          anyProviderAttempted = true;
          quotaFailures++;
        } else {
          quotaOnly = false;
        }
        continue;
      }

      const messages = buildOpenAIMessages({
        systemPrompt: effectivePrompt,
        history,
        userText: textInput,
        imagePart: null, // Cloudflare vision takes raw bytes separately
      });

      for (const model of models) {
        anyProviderAttempted = true;
        const result = await cloudflareChat({
          messages,
          model,
          temperature,
          maxTokens: 600,
          imageBuffer: isImage ? effectiveMedia.buffer : null,
          imageMimeType: effectiveMedia?.mimeType,
        });

        if (result.text) {
          return replyResult(result.text, { history, contextMessage, provider: 'cloudflare', model });
        }

        if (result.errorEntry) allModelErrors.push(result.errorEntry);

        if (result.gone) {
          markProviderModelDead('cloudflare', model);
          continue;
        }
        if (result.quotaError) {
          quotaFailures++;
          markProviderCooldown('cloudflare', model, 'quota', result.retryDelayMs);
          markProviderWideCooldown('cloudflare', 'quota', result.retryDelayMs);
          break;
        } else {
          quotaOnly = false;
        }
      }
      continue;
    }
  }

  // Every provider/model that we could try was out of quota for the day.
  if (anyProviderAttempted && quotaOnly && quotaFailures > 0) {
    console.warn('[ai-engine] CRITICAL: every configured provider is out of quota.');
    return {
      text: `I'm sorry — my model quota for the day is reached, so I can't reply properly right now. I'll be back to normal tomorrow.`,
      isAllQuotaExhausted: true,
      toString() { return this.text; },
      valueOf() { return this.text; },
    };
  }

  // The models genuinely failed (and it is not a quota issue). Stay SILENT rather
  // than sending a generic canned line that pretends the bot read the message.
  console.warn('[ai-engine] No model produced a reply — staying silent (canned fallbacks disabled).');
  return silentResult();
}

function replyResult(text, { history, contextMessage, provider, model }) {
  // Store text-only version in history for context
  history.push({ role: 'user', parts: [{ text: contextMessage }] });
  history.push({ role: 'model', parts: [{ text }] });
  if (history.length > 12) history.splice(0, history.length - 12);

  console.log(`[ai-engine] Reply generated by ${provider}${model ? ` (${model})` : ''}.`);
  return {
    text,
    isAllQuotaExhausted: false,
    provider,
    model,
    toString() { return this.text; },
    valueOf() { return this.text; },
  };
}

function silentResult() {
  return {
    text: '',
    isAllQuotaExhausted: false,
    isSilent: true,
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

  {
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

    const generated = await generateTextAcrossProviders({
      systemPrompt,
      userPrompt,
      temperature: 0.6,
      maxOutputTokens: 700,
    });
    if (generated) return hardenRecapOutput(generated, dateLine);
  }

  // AI unavailable: send only what we can verify. Never invent a discussion
  // summary — the bot's rule is "no canned chat", and a fake "good
  // conversations" bullet is exactly that. The lock notice itself is factual.
  const newFaces = newMembers.length > 0
    ? `New faces: ${newMembers.map(m => m.name || `+${m.phone}`).join(', ')}\n`
    : '';

  return (
    `DAILY RECAP — ${groupName}\n` +
    `Today: ${dateLine}\n` +
    newFaces +
    `Group's locked for the night — back open at ${reopenTime}. Goodnight all.`
  );
}

/**
 * Extracts a structured weekly lecture timetable from an uploaded PDF document.
 * Sends the PDF inline to Gemini (native document understanding) and asks for
 * strict JSON. Returns { ok: true, data } or { ok: false, error }.
 */
export async function extractTimetableFromPdf({ buffer, mimeType = 'application/pdf', filename = 'timetable.pdf' }) {
  if (!genAI) return { ok: false, error: 'AI engine is not initialized (missing API key).' };
  if (!buffer || !buffer.length) return { ok: false, error: 'Empty PDF payload.' };

  const base64 = Buffer.from(buffer).toString('base64');

  const instruction = `Attached is a university lecture-timetable PDF ("${filename}"). Read it carefully and return its FULL contents as STRICT JSON.

Rules:
- Identify the class/level/set in "label" (e.g. "IFT 200 Level — 2025/2026 Set").
- The file may contain more than one semester. Use the keys "harmattan" (first semester) and "rain" (second semester). Omit a key only if that semester truly is not present.
- For each semester, list every lecture under its weekday: monday, tuesday, wednesday, thursday, friday, saturday, sunday (use an empty array for days with none).
- Convert EVERY time to 24-hour "HH:mm". Examples: "8:00 - 10:00 AM" -> "08:00"/"10:00"; "10:00 - 12:00 AM" -> "10:00"/"12:00"; "12:00 - 2:00 PM" -> "12:00"/"14:00"; "2:00 - 4:00 PM" -> "14:00"/"16:00"; "4:00 - 6:00 PM" -> "16:00"/"18:00".
- Copy the course code, title and venue exactly as printed. If a venue is not shown, use "".
- Never invent lectures, rooms, or days. Do not add commentary inside the JSON. Put any timetable notes in "notes".

Return ONLY this JSON shape, no prose and no code fences:
{"label":"...","semesters":{"harmattan":{"monday":[{"code":"COS 201","title":"Computer Programming 1","start":"10:00","end":"12:00","venue":"LR 2"}],"tuesday":[],"wednesday":[],"thursday":[],"friday":[]},"rain":{}},"notes":["..."]}`;

  const userParts = [
    { text: instruction },
    { inlineData: { mimeType, data: base64 } },
  ];

  const models = await resolveModelList();
  for (const modelName of models) {
    const attempt = await attemptModelCall({
      modelName,
      systemInstruction: 'You are a precise data-extraction engine. You output only valid JSON.',
      contents: [{ role: 'user', parts: userParts }],
      plainText: instruction,
      temperature: 0.1,
      useSearch: false,
      maxOutputTokens: 4096,
    });

    if (attempt.text) {
      const parsed = parseJsonLoose(attempt.text, false);
      if (parsed && typeof parsed === 'object' && (parsed.semesters || parsed.schedule)) {
        return { ok: true, data: parsed };
      }
      console.warn(`[ai-engine] Timetable parse on ${modelName} returned unusable JSON. Trying next candidate...`);
      continue;
    }

    const detail =
      attempt.errorEntry?.error ||
      (attempt.errorEntry?.status ? `HTTP ${attempt.errorEntry.status}` : 'no usable response');
    console.warn(`[ai-engine] Timetable extraction on ${modelName} failed (${detail}). Trying next...`);
  }

  return { ok: false, error: 'All models failed to parse the timetable PDF.' };
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

  {
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

    const generated = await generateTextAcrossProviders({
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxOutputTokens: 200,
    });

    if (generated) {
      const text = generated.trim();
      // Keep only tags whose handles actually exist in our options (never tag strangers)
      const usedHandles = [...new Set((text.match(/@\d{5,}/g) || []))]
        .filter((h) => tagOptions.some((t) => t.handle === h));
      return { text, mentionHandles: usedHandles };
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
  if (!Array.isArray(exchanges) || exchanges.length === 0) return [];

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

  const raw = await generateTextAcrossProviders({
    systemPrompt,
    userPrompt: exchangeText,
    temperature: 0.2,
    maxOutputTokens: 400,
  });
  if (raw) {
    const parsed = parseJsonLoose(raw, true);
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
  return [];
}

/**
 * Reviews the bot's own recent replies (and whether members replied back) and
 * proposes a few style rules for its future self.
 * Returns { stopDoing: string[], newRules: string[] }.
 */
export async function reflectOnBehavior({ samples = [], currentRules = [] }) {
  if (samples.length === 0) return { stopDoing: [], newRules: [] };

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

  const raw = await generateTextAcrossProviders({
    systemPrompt,
    userPrompt: sampleText,
    temperature: 0.5,
    maxOutputTokens: 400,
  });
  if (raw) {
    const parsed = parseJsonLoose(raw, false);
    if (!parsed || typeof parsed !== 'object') return { stopDoing: [], newRules: [] };
    return {
      stopDoing: Array.isArray(parsed.stopDoing) ? parsed.stopDoing.filter((s) => typeof s === 'string').slice(0, 3) : [],
      newRules: Array.isArray(parsed.newRules) ? parsed.newRules.filter((s) => typeof s === 'string').slice(0, 3) : [],
    };
  }
  return { stopDoing: [], newRules: [] };
}

