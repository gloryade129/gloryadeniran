/**
 * src/media-tools.js
 * Voice notes (TTS) and image generation, with safe feature flags.
 *
 * Both features use Cloudflare Workers AI. They are enabled by default only
 * when Cloudflare credentials exist; either can be disabled with
 * VOICE_REPLIES_ENABLED=false / IMAGE_GENERATION_ENABLED=false.
 * A generation failure must never lose the reply — callers fall back to text.
 */

import { cloudflareTts, cloudflareImage, providerConfigured } from './ai-providers.js';

export function voiceRepliesEnabled() {
  return process.env.VOICE_REPLIES_ENABLED !== 'false' && providerConfigured('cloudflare');
}

export function imageGenerationEnabled() {
  return process.env.IMAGE_GENERATION_ENABLED !== 'false' && providerConfigured('cloudflare');
}

/**
 * Converts reply text to a WhatsApp audio message.
 * @returns {Promise<{ buffer: Buffer, mimetype: string } | null>}
 */
export async function makeVoiceNote(text) {
  if (!voiceRepliesEnabled()) return null;
  const clean = String(text || '').trim();
  if (!clean) return null;

  const result = await cloudflareTts({ text: clean.slice(0, 1200), lang: 'en' });
  if (!result?.buffer?.length) {
    if (result?.quotaError) console.warn('[media] Voice reply skipped: Cloudflare quota/parked.');
    else console.warn('[media] Voice reply skipped:', result?.errorEntry?.error || 'no audio returned');
    return null;
  }
  return { buffer: result.buffer, mimetype: result.mimeType || 'audio/mpeg' };
}

/**
 * Generates an image from a prompt.
 * @returns {Promise<{ buffer: Buffer, mimetype: string } | null>}
 */
export async function makeImage(prompt) {
  if (!imageGenerationEnabled()) return null;
  const clean = String(prompt || '').trim();
  if (!clean) return null;

  const result = await cloudflareImage({ prompt: clean, steps: 4 });
  if (!result?.buffer?.length) {
    console.warn('[media] Image generation skipped:', result?.errorEntry?.error || 'no image returned');
    return null;
  }
  return { buffer: result.buffer, mimetype: result.mimeType || 'image/jpeg' };
}

export function getMediaToolStatus() {
  return {
    voiceReplies: voiceRepliesEnabled(),
    imageGeneration: imageGenerationEnabled(),
    cloudflareConfigured: providerConfigured('cloudflare'),
  };
}
