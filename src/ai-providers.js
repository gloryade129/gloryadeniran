/**
 * src/ai-providers.js
 * Multi-provider AI transport for God's Virtue.
 *
 * Providers (free tiers):
 *   • Groq       — OpenAI-compatible chat + Whisper speech-to-text. Huge daily quota.
 *   • Gemini     — handled in ai-engine.js (SDK + REST), best native multimodality.
 *   • Cloudflare — Workers AI text/vision/Whisper. Fixed daily neuron allocation.
 *
 * This module only knows how to *talk* to a provider and how to keep a provider
 * healthy (dead-model list + quota cooldowns). Routing decisions live in ai-engine.js.
 *
 * Every call returns the same shape so the router can make decisions uniformly:
 *   { text, quotaError, gone, retryDelayMs, errorEntry }
 * A call never throws.
 */

const nowIso = () => new Date().toISOString();

// ─── Configuration ──────────────────────────────────────────────────────────

export function getGroqKey() {
  return process.env.GROQ_API_KEY || process.env.GROQ_KEY || null;
}

export function getCloudflareConfig() {
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_KEY || null;
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    null;
  return { token, accountId, configured: Boolean(token && accountId) };
}

export function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

export function providerConfigured(provider) {
  if (provider === 'groq') return Boolean(getGroqKey());
  if (provider === 'cloudflare') return getCloudflareConfig().configured;
  if (provider === 'gemini') return Boolean(getGeminiKey());
  return false;
}

/**
 * Providers that have credentials, in the order they should be tried.
 * Gemini always sits in the middle so a Groq quota wall still leaves the best
 * vision model as the next hop, and Cloudflare as the final backstop.
 */
export function configuredProviders() {
  return ['groq', 'gemini', 'cloudflare'].filter(providerConfigured);
}

// ─── Curated model lists ────────────────────────────────────────────────────
// IDs change; each list is tried top-down and a 404/410 permanently retires the
// ID for this process. Groq also gets refreshed from its /models endpoint.

const GROQ_TEXT_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'qwen/qwen3-32b',
  'moonshotai/kimi-k2-instruct',
  'llama-3.1-8b-instant',
];

const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
];

const GROQ_WHISPER_MODELS = [
  'whisper-large-v3-turbo',
  'whisper-large-v3',
];

const CF_TEXT_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/qwen/qwen2.5-coder-32b-instruct',
  '@cf/meta/llama-3.2-3b-instruct',
];

const CF_VISION_MODELS = [
  '@cf/meta/llama-3.2-11b-vision-instruct',
  '@cf/llava-hf/llava-1.5-7b-hf',
];

const CF_WHISPER_MODELS = [
  '@cf/openai/whisper-large-v3-turbo',
  '@cf/openai/whisper',
];

export function getGroqTextModels({ needsVision = false } = {}) {
  const base = needsVision ? [...GROQ_VISION_MODELS, ...GROQ_TEXT_MODELS] : GROQ_TEXT_MODELS;
  return base.filter((m) => !isDead('groq', m) && !isCoolingDown('groq', m));
}

export function getCloudflareTextModels({ needsVision = false } = {}) {
  const base = needsVision ? [...CF_VISION_MODELS, ...CF_TEXT_MODELS] : CF_TEXT_MODELS;
  return base.filter((m) => !isDead('cloudflare', m) && !isCoolingDown('cloudflare', m));
}

export function getGroqWhisperModels() {
  return GROQ_WHISPER_MODELS.filter((m) => !isDead('groq', m) && !isCoolingDown('groq', m));
}

export function getCloudflareWhisperModels() {
  return CF_WHISPER_MODELS.filter((m) => !isDead('cloudflare', m) && !isCoolingDown('cloudflare', m));
}

// ─── Health bookkeeping ─────────────────────────────────────────────────────

const deadModels = new Set(); // `${provider}:${model}`
const cooldowns = new Map(); // `${provider}:${model}` -> { until, reason }
const providerCooldowns = new Map(); // provider -> { until, reason }

// ─── Usage accounting (surfaced on /diag and the admin dashboard) ───────────
// Counters live for the process lifetime; Render restarts reset them, which is
// fine because the providers' quotas reset daily anyway.
const usageStats = new Map(); // provider -> { requests, successes, quotaErrors, errors, lastAt, byModel }

function usageFor(provider) {
  if (!usageStats.has(provider)) {
    usageStats.set(provider, {
      requests: 0,
      successes: 0,
      quotaErrors: 0,
      errors: 0,
      lastAt: null,
      byModel: {},
    });
  }
  return usageStats.get(provider);
}

/** Records one provider interaction. outcome: request | success | quota | error */
export function recordUsage(provider, model, outcome = 'request') {
  if (!provider) return;
  const bucket = usageFor(provider);
  const modelKey = model || 'unknown';
  if (!bucket.byModel[modelKey]) {
    bucket.byModel[modelKey] = { requests: 0, successes: 0, quotaErrors: 0, errors: 0, lastAt: null };
  }
  const modelBucket = bucket.byModel[modelKey];
  const stamp = new Date().toISOString();
  bucket.lastAt = stamp;
  modelBucket.lastAt = stamp;

  if (outcome === 'request') {
    bucket.requests += 1;
    modelBucket.requests += 1;
  } else if (outcome === 'success') {
    bucket.successes += 1;
    bucket.requests += 0; // successes imply an earlier request
    modelBucket.successes += 1;
  } else if (outcome === 'quota') {
    bucket.quotaErrors += 1;
    modelBucket.quotaErrors += 1;
  } else if (outcome === 'error') {
    bucket.errors += 1;
    modelBucket.errors += 1;
  }
}

export function getUsageStats() {
  const out = {};
  for (const [provider, bucket] of usageStats.entries()) {
    out[provider] = {
      ...bucket,
      byModel: Object.fromEntries(
        Object.entries(bucket.byModel)
          .sort((a, b) => b[1].requests - a[1].requests)
          .slice(0, 12)
      ),
    };
  }
  return out;
}

const key = (provider, model) => `${provider}:${model}`;

export function isDead(provider, model) {
  return deadModels.has(key(provider, model));
}

export function markDead(provider, model) {
  deadModels.add(key(provider, model));
}

export function isCoolingDown(provider, model) {
  const entry = cooldowns.get(key(provider, model));
  if (!entry) return false;
  if (Date.now() >= entry.until) {
    cooldowns.delete(key(provider, model));
    return false;
  }
  return true;
}

export function markCooldown(provider, model, reason = 'quota', retryDelayMs = 0) {
  const MIN_MS = 30 * 1000;
  const MAX_MS = 6 * 60 * 60 * 1000;
  const DEFAULT_MS = 5 * 60 * 1000;
  const ms = Math.min(Math.max(retryDelayMs > 0 ? retryDelayMs : DEFAULT_MS, MIN_MS), MAX_MS);
  cooldowns.set(key(provider, model), { until: Date.now() + ms, reason });
}

export function hasProviderQuotaCooldown(provider) {
  const now = Date.now();
  for (const [k, entry] of cooldowns.entries()) {
    if (k.startsWith(`${provider}:`) && entry.reason === 'quota' && now < entry.until) return true;
  }
  return false;
}

/**
 * Account-wide parking. Groq's free limits are per organization and Cloudflare's
 * neurons are per account, so one 429 means retrying siblings only burns latency.
 */
export function markProviderWideCooldown(provider, reason = 'quota', retryDelayMs = 0) {
  const MIN_MS = 60 * 1000;
  const MAX_MS = 6 * 60 * 60 * 1000;
  const DEFAULT_MS = 30 * 60 * 1000;
  const ms = Math.min(Math.max(retryDelayMs > 0 ? retryDelayMs : DEFAULT_MS, MIN_MS), MAX_MS);
  providerCooldowns.set(provider, { until: Date.now() + ms, reason });
}

export function isProviderCoolingDown(provider) {
  const entry = providerCooldowns.get(provider);
  if (!entry) return false;
  if (Date.now() >= entry.until) {
    providerCooldowns.delete(provider);
    return false;
  }
  return true;
}

/** Test hook — lets a test start from a clean slate. */
export function __resetProviderState() {
  deadModels.clear();
  cooldowns.clear();
  providerCooldowns.clear();
  groqDiscovery = { at: 0, ids: null, inFlight: null };
}

// ─── Error classification ───────────────────────────────────────────────────

export function classifyHttpFailure(status, bodyText = '') {
  const body = String(bodyText || '');
  const quotaError =
    status === 429 ||
    status === 402 ||
    /rate.?limit|quota|too many requests|exceeded|insufficient|daily free allocation|neurons|used up/i.test(body);
  const gone =
    status === 404 ||
    status === 410 ||
    /no such model|model.*(not found|deprecated|decommissioned)|does not exist|no longer available/i.test(body);
  const retryMatch = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i.exec(body);
  const retryDelayMs = retryMatch ? Math.round(Number(retryMatch[1]) * 1000) : 0;
  return { quotaError, gone, retryDelayMs };
}

function failureResult({ provider, model, status, bodyText, error, retryDelayMs = 0 }) {
  const classified = status ? classifyHttpFailure(status, bodyText) : { quotaError: false, gone: false, retryDelayMs: 0 };
  return {
    text: '',
    quotaError: classified.quotaError,
    gone: classified.gone,
    retryDelayMs: retryDelayMs || classified.retryDelayMs,
    errorEntry: {
      provider,
      model,
      status: status || undefined,
      error: error ? String(error).slice(0, 500) : String(bodyText || '').slice(0, 500),
      time: nowIso(),
    },
  };
}

function clean(text) {
  return typeof text === 'string' ? text.trim() : '';
}

// ─── Groq ───────────────────────────────────────────────────────────────────

/**
 * Discovers the Groq models this key serves. Cached for 6h; a failed discovery
 * simply leaves the curated list in place.
 */
let groqDiscovery = { at: 0, ids: null, inFlight: null };

async function refreshGroqModels() {
  const apiKey = getGroqKey();
  if (!apiKey) return null;
  const now = Date.now();
  if (groqDiscovery.ids && now - groqDiscovery.at < 6 * 60 * 60 * 1000) return groqDiscovery.ids;
  if (groqDiscovery.inFlight) return groqDiscovery.inFlight;

  groqDiscovery.inFlight = (async () => {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const ids = new Set(
        (Array.isArray(data?.data) ? data.data : [])
          .map((m) => String(m?.id || ''))
          .filter(Boolean)
      );
      if (ids.size > 0) {
        groqDiscovery = { at: Date.now(), ids, inFlight: null };
        console.log(`[ai-providers] Groq serves ${ids.size} model(s).`);
        return ids;
      }
    } catch (err) {
      console.warn(`[ai-providers] Groq model discovery failed (${err.message}); using curated list.`);
    } finally {
      groqDiscovery.inFlight = null;
    }
    return null;
  })();

  return groqDiscovery.inFlight;
}

function looksVisionCapable(model) {
  return /vision|llama-4|maverick|scout|pixtral|qwen.*vl|gemma.*3/i.test(model);
}

/**
 * Chat completion on Groq. `messages` is OpenAI-shaped; images are expressed as
 * `image_url` data URIs in the current user message content array.
 */
export async function groqChat({
  messages,
  model,
  temperature = 0.7,
  maxTokens = 600,
}) {
  const apiKey = getGroqKey();
  if (!apiKey) return failureResult({ provider: 'groq', model, error: 'GROQ_API_KEY missing' });

  recordUsage('groq', model, 'request');
  const payload = {
    model,
    messages,
    temperature: Number(temperature) || 0.7,
  };
  // Reasoning-oriented families reject the legacy `max_tokens` field.
  if (/gpt-oss|qwen3|deepseek|kimi-k2/i.test(model)) {
    payload.max_completion_tokens = Number(maxTokens) || 600;
  } else {
    payload.max_tokens = Number(maxTokens) || 600;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      if (res.status !== 404) {
        console.warn(`[ai-providers] Groq rejected ${model} (${res.status}): ${bodyText.slice(0, 200)}`);
      }
      const retryAfterSeconds = Number(res.headers.get('retry-after') || 0);
      const failure = failureResult({
        provider: 'groq',
        model,
        status: res.status,
        bodyText,
        retryDelayMs: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0,
      });
      recordUsage('groq', model, failure.quotaError ? 'quota' : 'error');
      return failure;
    }

    const data = await res.json();
    const text = clean(data?.choices?.[0]?.message?.content);
    if (text) {
      recordUsage('groq', model, 'success');
      return { text, quotaError: false, gone: false, retryDelayMs: 0, errorEntry: null };
    }
    recordUsage('groq', model, 'error');
    return failureResult({ provider: 'groq', model, status: 200, bodyText: 'Empty completion' });
  } catch (err) {
    recordUsage('groq', model, 'error');
    return failureResult({ provider: 'groq', model, error: err.message });
  }
}

/** Transcribes an audio buffer with Groq Whisper. */
export async function groqTranscribe({ buffer, mimeType = 'audio/ogg', language = 'en' }) {
  const apiKey = getGroqKey();
  if (!apiKey) return failureResult({ provider: 'groq', model: 'whisper', error: 'GROQ_API_KEY missing' });
  if (isProviderCoolingDown('groq')) {
    return failureResult({ provider: 'groq', model: 'whisper', error: 'Groq temporarily parked after a quota error' });
  }
  if (!buffer?.length) return failureResult({ provider: 'groq', model: 'whisper', error: 'Empty audio' });

  const models = getGroqWhisperModels();
  if (models.length === 0) {
    return failureResult({ provider: 'groq', model: 'whisper', error: 'No whisper model available (cooling down)' });
  }

  let last = null;
  for (const model of models) {
    try {
      recordUsage('groq', `whisper:${model}`, 'request');
      const ext = /mpeg|mp3/i.test(mimeType) ? 'mp3' : /mp4|m4a/i.test(mimeType) ? 'm4a' : /wav/i.test(mimeType) ? 'wav' : 'ogg';
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimeType }), `voice-note.${ext}`);
      form.append('model', model);
      form.append('response_format', 'json');
      if (language) form.append('language', language);

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      if (!res.ok) {
        const bodyText = await res.text();
        const classified = classifyHttpFailure(res.status, bodyText);
        recordUsage('groq', `whisper:${model}`, classified.quotaError ? 'quota' : 'error');
        if (classified.gone) markDead('groq', model);
        else if (classified.quotaError) {
          markCooldown('groq', model, 'quota', classified.retryDelayMs);
          markProviderWideCooldown('groq', 'quota', classified.retryDelayMs);
        }
        last = failureResult({ provider: 'groq', model: `whisper:${model}`, status: res.status, bodyText });
        if (classified.quotaError) break;
        continue;
      }

      const data = await res.json();
      const text = clean(data?.text);
      if (text) {
        recordUsage('groq', `whisper:${model}`, 'success');
        return { text, quotaError: false, gone: false, retryDelayMs: 0, errorEntry: null, model, provider: 'groq' };
      }
      recordUsage('groq', `whisper:${model}`, 'error');
      last = failureResult({ provider: 'groq', model: `whisper:${model}`, status: 200, bodyText: 'Empty transcript' });
    } catch (err) {
      recordUsage('groq', `whisper:${model}`, 'error');
      last = failureResult({ provider: 'groq', model: `whisper:${model}`, error: err.message });
    }
  }

  return last || failureResult({ provider: 'groq', model: 'whisper', error: 'Transcription failed' });
}

// ─── Cloudflare Workers AI ──────────────────────────────────────────────────

function cfUrl(model) {
  const { accountId } = getCloudflareConfig();
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
}

async function cfRun(model, payload) {
  const { token, configured } = getCloudflareConfig();
  if (!configured) {
    return failureResult({ provider: 'cloudflare', model, error: 'Cloudflare not configured' });
  }

  recordUsage('cloudflare', model, 'request');
  try {
    const res = await fetch(cfUrl(model), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const bodyText = await res.text();
    let data = null;
    try {
      data = JSON.parse(bodyText);
    } catch {
      /* non-JSON body */
    }

    if (!res.ok || data?.success === false) {
      const errText =
        data?.errors?.map((e) => `${e.code}:${e.message}`).join('; ') || bodyText;
      if (res.status !== 404) {
        console.warn(`[ai-providers] Cloudflare rejected ${model} (${res.status}): ${errText.slice(0, 200)}`);
      }
      const retryAfterSeconds = Number(res.headers.get('retry-after') || 0);
      const failure = failureResult({
        provider: 'cloudflare',
        model,
        status: res.status,
        bodyText: errText,
        retryDelayMs: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 0,
      });
      recordUsage('cloudflare', model, failure.quotaError ? 'quota' : 'error');
      return failure;
    }

    recordUsage('cloudflare', model, 'success');
    return { ok: true, result: data?.result || {} };
  } catch (err) {
    recordUsage('cloudflare', model, 'error');
    return failureResult({ provider: 'cloudflare', model, error: err.message });
  }
}

export async function cloudflareChat({
  messages,
  model,
  temperature = 0.7,
  maxTokens = 600,
  imageBuffer = null,
  imageMimeType = 'image/jpeg',
}) {
  // Vision models on Workers AI expect a `messages` array plus raw image bytes.
  const payload = {
    messages,
    temperature: Number(temperature) || 0.7,
    max_tokens: Number(maxTokens) || 600,
  };

  if (imageBuffer?.length) {
    payload.image = [...imageBuffer];
  }

  const response = await cfRun(model, payload);
  if (!response.ok) return response;

  const text = clean(response.result?.response ?? response.result?.text ?? response.result?.result?.response);
  if (text) {
    return { text, quotaError: false, gone: false, retryDelayMs: 0, errorEntry: null };
  }
  return failureResult({ provider: 'cloudflare', model, status: 200, bodyText: 'Empty completion' });
}

export async function cloudflareTranscribe({ buffer, language = 'en' }) {
  if (!buffer?.length) return failureResult({ provider: 'cloudflare', model: 'whisper', error: 'Empty audio' });
  if (isProviderCoolingDown('cloudflare')) {
    return failureResult({ provider: 'cloudflare', model: 'whisper', error: 'Cloudflare temporarily parked after a quota error' });
  }

  const models = getCloudflareWhisperModels();
  if (models.length === 0) {
    return failureResult({ provider: 'cloudflare', model: 'whisper', error: 'No whisper model available (cooling down)' });
  }

  let last = null;
  for (const model of models) {
    const response = await cfRun(model, {
      audio: [...buffer],
      ...(language ? { language } : {}),
    });

    if (!response.ok) {
      if (response.gone) markDead('cloudflare', model);
      else if (response.quotaError) {
        markCooldown('cloudflare', model, 'quota', response.retryDelayMs);
        markProviderWideCooldown('cloudflare', 'quota', response.retryDelayMs);
      }
      last = response;
      if (response.quotaError) break;
      continue;
    }

    const text = clean(response.result?.text);
    if (text) {
      return { text, quotaError: false, gone: false, retryDelayMs: 0, errorEntry: null, model, provider: 'cloudflare' };
    }
    last = failureResult({ provider: 'cloudflare', model: `whisper:${model}`, status: 200, bodyText: 'Empty transcript' });
  }

  return last || failureResult({ provider: 'cloudflare', model: 'whisper', error: 'Transcription failed' });
}

// ─── Cloudflare media generation (voice replies + status images) ────────────

/**
 * Text-to-speech through Cloudflare Workers AI.
 * Default model: MeloTTS (English). Returns a buffer the caller can send as a
 * WhatsApp audio message; callers must always fall back to text on failure.
 */
export async function cloudflareTts({ text, lang = 'en' }) {
  const model = process.env.CLOUDFLARE_TTS_MODEL || '@cf/myshell-ai/melotts';
  if (!text || !String(text).trim()) {
    return failureResult({ provider: 'cloudflare', model, error: 'Empty text' });
  }
  if (isProviderCoolingDown('cloudflare')) {
    return failureResult({ provider: 'cloudflare', model, error: 'Cloudflare temporarily parked after a quota error' });
  }

  const response = await cfRun(model, {
    prompt: String(text).slice(0, 1200),
    lang,
  });
  if (!response.ok) return response;

  const audio = response.result?.audio || response.result?.audio_base64 || response.result?.data;
  if (!audio || typeof audio !== 'string') {
    return failureResult({ provider: 'cloudflare', model, status: 200, bodyText: 'No audio returned' });
  }

  return {
    text: '',
    buffer: Buffer.from(audio.replace(/^data:audio\/[^;]+;base64,/, ''), 'base64'),
    mimeType: 'audio/mpeg',
    model,
    quotaError: false,
    gone: false,
    retryDelayMs: 0,
    errorEntry: null,
  };
}

/**
 * Image generation through Cloudflare Workers AI (FLUX schnell by default).
 * Used by the owner-only `.imagine` command and future status-meme features.
 */
export async function cloudflareImage({ prompt, steps = 4 }) {
  const model = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';
  if (!prompt || !String(prompt).trim()) {
    return failureResult({ provider: 'cloudflare', model, error: 'Empty prompt' });
  }
  if (isProviderCoolingDown('cloudflare')) {
    return failureResult({ provider: 'cloudflare', model, error: 'Cloudflare temporarily parked after a quota error' });
  }

  const response = await cfRun(model, {
    prompt: String(prompt).slice(0, 1500),
    steps: Math.min(Math.max(Number(steps) || 4, 1), 8),
  });
  if (!response.ok) return response;

  const raw = response.result?.image;
  if (!raw || typeof raw !== 'string') {
    return failureResult({ provider: 'cloudflare', model, status: 200, bodyText: 'No image returned' });
  }

  const base64 = raw.replace(/^data:image\/[^;]+;base64,/, '');
  const isPng = /^data:image\/png/i.test(raw);
  return {
    text: '',
    buffer: Buffer.from(base64, 'base64'),
    mimeType: isPng ? 'image/png' : 'image/jpeg',
    model,
    quotaError: false,
    gone: false,
    retryDelayMs: 0,
    errorEntry: null,
  };
}

// ─── Shared helpers used by the router ──────────────────────────────────────

export function isVisionModel(provider, model) {
  if (provider === 'groq') return GROQ_VISION_MODELS.includes(model) || looksVisionCapable(model);
  if (provider === 'cloudflare') return CF_VISION_MODELS.includes(model);
  return false;
}

/**
 * Truncates a long conversation so a provider's context window is never the
 * reason a reply fails. Keeps the system prompt and the newest turns.
 */
export function trimMessages(messages, maxChars = 24000) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const system = messages[0]?.role === 'system' ? [messages[0]] : [];
  const rest = messages.slice(system.length);
  let budget = maxChars;
  const kept = [];
  for (let i = rest.length - 1; i >= 0; i--) {
    const content = rest[i]?.content;
    const len = typeof content === 'string' ? content.length : Array.isArray(content) ? 2000 : 0;
    if (len > budget && kept.length > 0) break;
    budget -= len;
    kept.unshift(rest[i]);
  }
  return [...system, ...kept];
}

/** Human-readable provider health for the /health endpoint and logs. */
export function providerHealth() {
  const providers = {};
  for (const name of ['groq', 'gemini', 'cloudflare']) {
    providers[name] = {
      configured: providerConfigured(name),
      coolingDown: isProviderCoolingDown(name)
        ? {
            reason: providerCooldowns.get(name)?.reason,
            until: new Date(providerCooldowns.get(name)?.until || 0).toISOString(),
          }
        : null,
      deadModels: [...deadModels].filter((k) => k.startsWith(`${name}:`)).map((k) => k.split(':').slice(1).join(':')),
      coolingModels: [...cooldowns.entries()]
        .filter(([k]) => k.startsWith(`${name}:`))
        .map(([k, v]) => ({ model: k.split(':').slice(1).join(':'), reason: v.reason, until: new Date(v.until).toISOString() })),
      usage: usageFor(name),
    };
  }
  return providers;
}

// Warm Groq discovery in the background once credentials exist.
if (getGroqKey()) {
  refreshGroqModels().catch(() => {});
}
