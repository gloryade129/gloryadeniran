#!/usr/bin/env node
/**
 * tools/voice-report.mjs
 * Prints the trained voice profile and audits a corpus of candidate replies for
 * "distilled provider voice". Needs no API key — it is a pure, offline check.
 *
 * Usage: npm run voice:check
 * Exit code 1 if any sample that *should* be in-voice is flagged, so it can be
 * dropped into CI as a guard against the bot drifting back to generic.
 */

import { loadVoiceProfile, buildVoiceProfileContext, voiceProfileSummary } from '../src/voice-profile.js';
import { findGenericTells, isGenericResponse, voiceFit, enforceVoice } from '../src/response-check.js';

const { profile } = loadVoiceProfile();
const summary = voiceProfileSummary();

if (!profile) {
  console.error('No trained profile found in src/data/. Run `npm run train` first.');
  process.exit(1);
}

const rule = (label) => console.log(`\n${label}\n${'-'.repeat(label.length)}`);

rule('TRAINED VOICE PROFILE');
console.log(`  built            ${summary.generated_at}`);
console.log(`  own messages     ${summary.my_turns}`);
console.log(`  median length    ${summary.median_length} chars`);
console.log(`  p90 length       ${summary.p90_length} chars`);
console.log(`  emoji rate       ${summary.emoji_rate}`);
console.log(`  unpunctuated     ${summary.ends_unpunctuated_rate}`);

rule('INJECTED PROMPT BLOCK');
const block = buildVoiceProfileContext({ exemplars: 2 });
console.log(block);

// ── Audit corpus ────────────────────────────────────────────────────────────
// "inVoice" samples must pass; "distilled" samples must be caught.
const samples = {
  inVoice: [
    'Anytime ma',
    'Okay what about 9:00am',
    "I'm not able to help with that. Something else?",
    'No. I dey Kwara',
    'Send it here',
    'The lecture holds Thursday by 10am in LR 2.',
    'okay, noted',
    'Good afternoon! How are you doing today?',
  ],
  distilled: [
    'As an AI language model, I cannot provide medical advice.',
    'Certainly! I would be happy to assist you with that request.',
    'Great question! Here is a breakdown of the key points you should consider.',
    '## Summary\n\n- Point one\n- Point two\n\nIn conclusion, I hope this helps!',
    "It's important to note that this is a multifaceted issue, and we should delve into it.",
    'Feel free to reach out if you need any further assistance.',
    'Absolutely! Let me know if you have any other questions.',
  ],
};

rule('AUDIT: replies that must NOT read as generic');
let violations = 0;
for (const text of samples.inVoice) {
  const { score, hits } = findGenericTells(text);
  const bad = isGenericResponse(text);
  if (bad) violations++;
  const fit = voiceFit(text, profile);
  console.log(`  ${bad ? 'FAIL' : 'ok  '}  score=${String(score).padStart(2)}  fit=${fit.score.toFixed(2)}  ${JSON.stringify(text)}`);
  if (hits.length) console.log(`        ↳ ${hits.map((h) => h.reason).join('; ')}`);
}

rule('AUDIT: distilled provider replies that MUST be caught');
let missed = 0;
for (const text of samples.distilled) {
  const caught = isGenericResponse(text);
  if (!caught) missed++;
  const { text: fixed, removed } = enforceVoice(text, profile);
  const cleanAfter = !isGenericResponse(fixed);
  console.log(`  ${caught ? 'ok  ' : 'MISS'}  caught=${String(caught).padEnd(5)} repaired=${String(cleanAfter).padEnd(5)} ${JSON.stringify(text.slice(0, 58))}…`);
  if (!cleanAfter) console.log(`        ↳ still reads generic after cleanup: ${JSON.stringify(fixed.slice(0, 90))}`);
  if (removed.length) console.log(`        ↳ stripped: ${removed.join(', ')}`);
  if (violations + missed === 0 && caught) {
    console.log(`        ↳ rewritten: ${JSON.stringify(fixed.slice(0, 100))}`);
  }
}

rule('RESULT');
if (violations === 0 && missed === 0) {
  console.log('  PASS — no false positives, every distilled reply detected.');
  process.exit(0);
}
console.log(`  FAIL — ${violations} false positive(s), ${missed} miss(es).`);
process.exit(1);
