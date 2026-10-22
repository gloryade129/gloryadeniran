/**
 * Tests for the voice-training pipeline.
 *
 * These lock in the thing the whole pipeline exists for: the bot must answer in
 * the owner's measured voice, and it must NOT emit the generic register the
 * provider model falls back to on its own.
 *
 * Run with: node --test test/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadVoiceProfile,
  buildVoiceProfileContext,
  getFewshotExamples,
  hasVoiceProfile,
  voiceProfileSummary,
  resetVoiceProfileCache,
} from '../src/voice-profile.js';
import {
  findGenericTells,
  isGenericResponse,
  voiceFit,
  enforceVoice,
  GENERIC_THRESHOLD,
} from '../src/response-check.js';
import { composeEffectivePrompt, generateResponse } from '../src/ai-engine.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, '..', 'src', 'data');

const profile = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'style_profile.json'), 'utf8'));
const fewshot = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'fewshot.json'), 'utf8'));

// A reply of exactly the kind a raw provider model produces when asked to chat.
const DISTILLED = `Certainly! I'd be happy to help you with that.

**Here's a breakdown of what you should know:**

1. First, it's important to note that this is a nuanced topic.
2. Furthermore, many people find it valuable to delve into the details.

In conclusion, I hope this helps! Feel free to reach out if you need any further assistance.`;

// How the owner actually texts, per the profile.
const IN_VOICE = 'okay what about 9:00am';

test('the trained profile was built from real messages, not left empty', () => {
  assert.ok(profile.source, 'profile must record its source');
  assert.ok(profile.source.my_turns > 0, 'must have at least one own message');
  assert.ok(profile.source.turns >= profile.source.my_turns);
  assert.ok(profile.generated_at, 'profile must carry a timestamp');
  assert.ok(typeof profile.voice_brief === 'string' && profile.voice_brief.length > 0);
});

test('profile measurements are internally consistent', () => {
  const { length, punctuation } = profile;
  assert.ok(length.median <= length.p90, 'median cannot exceed p90');
  assert.ok(length.p90 <= length.max, 'p90 cannot exceed max');
  assert.ok(length.short_rate >= 0 && length.short_rate <= 1);
  assert.ok(length.long_rate >= 0 && length.long_rate <= 1);

  const pun = [
    punctuation.ends_period_rate,
    punctuation.ends_question_rate,
    punctuation.ends_exclamation_rate,
    punctuation.ends_unpunctuated_rate,
  ];
  for (const r of pun) assert.ok(r >= 0 && r <= 1);
  // Every message ends in exactly one of these four buckets.
  assert.ok(Math.abs(pun.reduce((a, b) => a + b, 0) - 1) < 0.01, 'end-punctuation buckets must sum to 1');
});

test('this history is short-message and mostly unpunctuated — realistic WhatsApp style', () => {
  // These are properties of the actual export, asserted so a regression in the
  // profiler (e.g. accidentally profiling the other party) fails loudly.
  assert.ok(profile.length.median < 60, 'median reply should be short');
  assert.ok(profile.punctuation.ends_unpunctuated_rate > 0.3, 'people rarely end chat lines with a full stop');
  assert.ok(profile.punctuation.ends_period_rate < 0.3);
});

test('few-shot exemplars are real, distinct exchanges from the history', () => {
  assert.ok(fewshot.examples.length > 0, 'at least one exemplar is required');
  const seen = new Set();
  for (const ex of fewshot.examples) {
    assert.equal(typeof ex.user, 'string');
    assert.equal(typeof ex.model, 'string');
    assert.ok(ex.user.trim().length > 0);
    assert.ok(ex.model.trim().length > 0);
    // The owner's own lines are the target side, never the prompt side.
    assert.notEqual(ex.model.toLowerCase(), 'you');
    const key = ex.model.toLowerCase();
    assert.equal(seen.has(key), false, `duplicate exemplar: ${ex.model}`);
    seen.add(key);
  }
});

test('the voice block carries the measured rules into the system prompt', () => {
  resetVoiceProfileCache();
  const block = buildVoiceProfileContext({ exemplars: 3 });
  assert.ok(block, 'a trained profile must produce a context block');

  assert.match(block, /HOW YOU ACTUALLY TYPE/);
  assert.match(block, /AVERAGE REPLY LENGTH/);
  assert.match(block, /Never open with a courtesy preamble/);
  assert.match(block, /could a generic assistant have written this exact sentence/i);

  // Real exemplars are embedded so the model copies register, not adjectives.
  assert.match(block, /REAL EXCHANGES FROM THAT HISTORY/);
  for (const ex of getFewshotExamples(3)) {
    assert.ok(block.includes(ex.model), `exemplar missing from prompt: ${ex.model}`);
  }
});

test('the voice block is bounded — it must not eat the context window', () => {
  const block = buildVoiceProfileContext({ exemplars: 4 });
  assert.ok(block.length < 4000, `voice block too large: ${block.length} chars`);
});

test('exemplar count is respected and capped', () => {
  assert.equal(getFewshotExamples(0).length, 0);
  assert.equal(getFewshotExamples(2).length, Math.min(2, fewshot.examples.length));
  assert.equal(getFewshotExamples(999).length, fewshot.examples.length);
});

test('a missing profile degrades gracefully instead of throwing', () => {
  resetVoiceProfileCache();
  const empty = path.join(HERE, '__no_such_dir__');
  assert.equal(hasVoiceProfile({ dataDir: empty }), false);
  assert.equal(buildVoiceProfileContext({ dataDir: empty }), null);
  assert.deepEqual(getFewshotExamples(3, { dataDir: empty }), []);
  assert.equal(voiceProfileSummary({ dataDir: empty }), null);
  resetVoiceProfileCache();
});

test('voiceProfileSummary reports the trained numbers', () => {
  const summary = voiceProfileSummary();
  assert.ok(summary);
  assert.equal(summary.my_turns, profile.source.my_turns);
  assert.equal(summary.median_length, profile.length.median);
});

// ── Generic-response detection ──────────────────────────────────────────────

test('a classic distilled provider reply is flagged as generic', () => {
  const { score, hits, hardFail } = findGenericTells(DISTILLED);
  assert.ok(hardFail || score >= GENERIC_THRESHOLD, `expected generic, got score=${score}`);
  assert.equal(isGenericResponse(DISTILLED), true);

  const ids = hits.map((h) => h.id);
  assert.ok(ids.includes('certainly'), 'should catch the sycophantic opener');
  assert.ok(ids.includes('hope-this-helps'), 'should catch the support-desk closer');
  assert.ok(ids.includes('md-bold'), 'should catch markdown bold');

  // Every hit must explain itself, so logs are actionable.
  for (const h of hits) assert.ok(h.reason && h.reason.length > 5);
});

test('"As an AI" is an outright failure, not just a score', () => {
  const { hardFail } = findGenericTells("As an AI language model, I can't have opinions.");
  assert.equal(hardFail, true);
  assert.equal(isGenericResponse('As an AI, I cannot do that.'), true);
});

test('markdown document structure is rejected in a chat message', () => {
  assert.equal(isGenericResponse('# Weekly Update\n\nSome news.'), true);
  assert.equal(isGenericResponse('Here is the plan:\n\n---\n\nDone.'), true);
  assert.equal(isGenericResponse('- buy milk\n- call mum'), true);
  assert.equal(isGenericResponse('1. wake up\n2. pray'), true);
});

test('a short human reply is NOT flagged', () => {
  for (const reply of [
    IN_VOICE,
    'Anytime ma',
    'No. I dey Kwara',
    "I'm not able to help with that. Is there something else?",
    'Okay. 3:00PM',
    'good morning sir',
    'Send it here',
  ]) {
    assert.equal(isGenericResponse(reply), false, `false positive on: ${reply}`);
  }
});

test('ordinary formal English without tells is not flagged', () => {
  // Formal is not the same as generic — we only reject provider tells.
  assert.equal(isGenericResponse('The lecture holds on Thursday by 10am in LR 2.'), false);
  assert.equal(isGenericResponse('I checked the timetable and it has no Friday class.'), false);
});

test('empty input is never treated as a generic reply', () => {
  assert.equal(isGenericResponse(''), false);
  assert.equal(findGenericTells(undefined).score, 0);
  assert.equal(findGenericTells(null).hardFail, false);
});

test('LLM vocabulary alone is a mild signal, not a verdict', () => {
  const oneWord = findGenericTells('We should leverage the new timetable.');
  assert.ok(oneWord.score < GENERIC_THRESHOLD, 'one buzzword must not fail a reply');
  assert.equal(isGenericResponse('We should leverage the new timetable.'), false);
});

// ── Voice fit + enforcement ─────────────────────────────────────────────────

test('voiceFit penalises a wall of text against a short-message profile', () => {
  const essay = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i + 1} of a long answer.`).join(' ');
  const fit = voiceFit(essay, profile);
  assert.ok(fit.score < 1, 'a wall of text cannot be a perfect fit');
  assert.ok(fit.issues.some((i) => /too long/.test(i) || /lines where/.test(i)));
});

test('voiceFit gives a clean score to a reply that matches the profile', () => {
  const fit = voiceFit(IN_VOICE, profile);
  assert.equal(fit.score, 1, `unexpected issues: ${fit.issues.join('; ')}`);
  assert.equal(fit.issues.length, 0);
});

test('enforceVoice strips the provider voice but keeps the actual answer', () => {
  const { text, changed, removed } = enforceVoice(DISTILLED, profile);
  assert.equal(changed, true);
  assert.ok(removed.length > 0);

  assert.equal(isGenericResponse(text), false, `still generic: ${text}`);
  assert.doesNotMatch(text, /As an AI/i);
  assert.doesNotMatch(text, /I hope this helps/i);
  assert.doesNotMatch(text, /Feel free to reach out/i);
  assert.doesNotMatch(text, /^\s*#{1,6}\s/m);
  assert.doesNotMatch(text, /\*\*/);

  // The substantive answer survives the rewrite.
  assert.match(text, /breakdown|nuanced topic/i);
});

test('enforceVoice leaves an already-good reply untouched', () => {
  const { text, changed } = enforceVoice(IN_VOICE, profile);
  assert.equal(changed, false);
  assert.equal(text, IN_VOICE.trim());
});

test('a reply made only of boilerplate collapses to nothing (bot stays silent)', () => {
  // Better to send nothing than to ship provider filler to a real contact.
  const { text, changed } = enforceVoice(
    'Great question! Here is a breakdown of the key points you should consider. I hope this helps!',
    profile
  );
  assert.equal(changed, true);
  assert.equal(text, '');
});

test('enforceVoice catches the "I would be happy to assist" variant', () => {
  const { text } = enforceVoice('Certainly! I would be happy to assist you with that request. The answer is 42.', profile);
  assert.equal(isGenericResponse(text), false);
  assert.match(text, /42/);
});

test('enforceVoice strips decorative emoji headers and horizontal rules', () => {
  const { text } = enforceVoice('✨ Monday Update\n---\nWe meet at 9am.', profile);
  assert.doesNotMatch(text, /^#{1,6}\s/m);
  assert.doesNotMatch(text, /^---$/m);
  assert.doesNotMatch(text, /✨/);
  assert.match(text, /We meet at 9am/);
});

test('enforceVoice honours the zero-emoji profile', () => {
  const withEmoji = 'See you by 3pm 😊🎉🔥';
  const { text } = enforceVoice(withEmoji, { ...profile, emoji: { ...profile.emoji, messages_with_emoji_rate: 0 } });
  assert.doesNotMatch(text, /\p{Extended_Pictographic}/u);
  assert.match(text, /3pm/);
});

test('enforceVoice never returns junk for empty input', () => {
  assert.equal(enforceVoice('', profile).text, '');
  assert.equal(enforceVoice('   ', profile).changed, false);
  assert.equal(enforceVoice(undefined, profile).text, '');
});

// ── Integration with the live prompt ────────────────────────────────────────

test('the composed system prompt actually contains the trained voice', () => {
  const prompt = composeEffectivePrompt('You are God\'s Virtue.', [buildVoiceProfileContext({ exemplars: 2 })]);
  assert.match(prompt, /You are God's Virtue/);
  assert.match(prompt, /HOW YOU ACTUALLY TYPE/);
  assert.match(prompt, /AVERAGE REPLY LENGTH/);
  assert.ok(prompt.length > 500);
});

test('composeEffectivePrompt tolerates empty/garbage context layers', () => {
  assert.equal(composeEffectivePrompt('base', []), 'base');
  assert.equal(composeEffectivePrompt('base', [null, undefined, '', '   ']), 'base');
  assert.equal(composeEffectivePrompt('base', [null, 'extra']), 'base\n\nextra');
  assert.equal(composeEffectivePrompt('', []).length > 100, true, 'falls back to the master prompt');
});

test('a failed generation still stays silent rather than sending canned text', async () => {
  const res = await generateResponse({
    jid: 'voice-silent@s.whatsapp.net',
    senderName: 'Tester',
    incomingText: 'hello',
    isGroup: false,
    extraContext: [buildVoiceProfileContext()],
  });
  assert.equal(res.text, '');
  assert.equal(res.isSilent, true);
});
