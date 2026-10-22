/**
 * src/voice-profile.js
 * Loads the voice profile distilled from a real WhatsApp history by
 * tools/wa_export/style_profile.py and turns it into prompt context.
 *
 * Why this exists: the bot shares a provider model with every other assistant,
 * so left alone it answers in the provider's default register ("Certainly! Here's
 * a breakdown..."). Measuring the owner's actual typing habits and feeding those
 * measurements in as hard rules keeps replies anchored to a real human voice
 * instead of a distilled, generic one.
 *
 * Everything here is optional: if the data files are missing (fresh deploy, no
 * training run yet) every function returns null/[] and the bot behaves as before.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.join(HERE, 'data');

let cache = null;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Loads (and memoises) style_profile.json + fewshot.json.
 * @returns {{ profile: object|null, fewshot: object|null, dataDir: string }}
 */
export function loadVoiceProfile({ dataDir = DEFAULT_DATA_DIR, force = false } = {}) {
  if (cache && !force && cache.dataDir === dataDir) return cache;

  const profile = readJson(path.join(dataDir, 'style_profile.json'));
  const fewshot = readJson(path.join(dataDir, 'fewshot.json'));

  cache = {
    dataDir,
    profile: profile && typeof profile === 'object' ? profile : null,
    fewshot: fewshot && Array.isArray(fewshot.examples) ? fewshot : null,
  };
  return cache;
}

export function resetVoiceProfileCache() {
  cache = null;
}

/** True when a trained profile is present and non-trivial. */
export function hasVoiceProfile(opts) {
  const { profile } = loadVoiceProfile(opts);
  return Boolean(profile && profile.source && Number(profile.source.my_turns) > 0);
}

/**
 * Real exchange pairs to use as in-context exemplars. The model copies register
 * from these far more reliably than it follows a list of adjectives.
 */
export function getFewshotExamples(limit = 6, opts) {
  const { fewshot } = loadVoiceProfile(opts);
  if (!fewshot) return [];
  return fewshot.examples
    .filter((ex) => ex && typeof ex.user === 'string' && typeof ex.model === 'string')
    .slice(0, Math.max(0, limit));
}

/**
 * Builds the context block injected into extraContext on every reply.
 *
 * @param {object} [opts]
 * @param {number} [opts.exemplars=4]  how many real exchanges to attach
 * @param {boolean} [opts.includeExemplars=true]
 * @returns {string|null} prompt block, or null when no profile exists
 */
export function buildVoiceProfileContext({ exemplars = 4, includeExemplars = true, ...loadOpts } = {}) {
  if (!hasVoiceProfile(loadOpts)) return null;

  const { profile } = loadVoiceProfile(loadOpts);
  const lines = [];

  lines.push('HOW YOU ACTUALLY TYPE (measured from your own real WhatsApp history — follow it):');
  if (profile.voice_brief) lines.push(profile.voice_brief);

  const len = profile.length || {};
  if (len.p90) {
    lines.push(
      `- Hard length ceiling for a normal reply: about ${Math.max(40, Math.round(len.p90))} characters. ` +
        'If you are about to write more than that, cut it, not explain it.'
    );
  }

  if (includeExemplars) {
    const examples = getFewshotExamples(exemplars, loadOpts);
    if (examples.length > 0) {
      lines.push('');
      lines.push('REAL EXCHANGES FROM THAT HISTORY (match this register — do not copy the words):');
      for (const ex of examples) {
        lines.push(`Them: ${ex.user}\nYou: ${ex.model}`);
      }
    }
  }

  lines.push('');
  lines.push(
    'Before you answer, ask yourself: could a generic assistant have written this exact sentence? ' +
      'If yes, rewrite it the way the person above would actually text it.'
  );

  return lines.join('\n');
}

/**
 * Compact style signature for logging/health output, so a deploy can be checked
 * at a glance without dumping the whole profile.
 */
export function voiceProfileSummary(opts) {
  const { profile } = loadVoiceProfile(opts);
  if (!profile) return null;
  return {
    generated_at: profile.generated_at || null,
    my_turns: profile.source?.my_turns ?? 0,
    median_length: profile.length?.median ?? null,
    p90_length: profile.length?.p90 ?? null,
    emoji_rate: profile.emoji?.messages_with_emoji_rate ?? null,
    ends_unpunctuated_rate: profile.punctuation?.ends_unpunctuated_rate ?? null,
  };
}
