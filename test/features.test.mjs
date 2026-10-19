import test from 'node:test';
import assert from 'node:assert/strict';

import { detectLanguage, buildLanguageInstruction } from '../src/language.js';
import { analyzeMessage, getModerationStats } from '../src/moderation-plus.js';
import { parseWhen, parsePollPayload, formatReminderWhen } from '../src/engagement-plus.js';
import { tokenize } from '../src/knowledge.js';

// ─── Language detection ─────────────────────────────────────────────────────

test('language: plain English is not misclassified', () => {
  const result = detectLanguage('Please send me the meeting notes when you are free.');
  assert.equal(result.code, 'en');
  assert.equal(buildLanguageInstruction('Please send me the meeting notes.'), '');
});

test('language: Nigerian Pidgin is detected', () => {
  const result = detectLanguage('Abeg wetin dey happen? I no sabi why e don dey like this.');
  assert.equal(result.code, 'pcm');
  const instruction = buildLanguageInstruction('Abeg wetin dey happen?');
  assert.match(instruction, /Nigerian Pidgin/);
});

test('language: Yoruba is detected', () => {
  const result = detectLanguage('Bawo ni, e kaaro. Mo fe ba e soro nipa ile iwe.');
  assert.equal(result.code, 'yo');
  assert.match(buildLanguageInstruction('Bawo ni, e kaaro.'), /Yoruba/);
});

test('language: Hausa is detected', () => {
  const result = detectLanguage('Sannu, ina kwana? Na gode sosai, aboki.');
  assert.equal(result.code, 'ha');
  assert.match(buildLanguageInstruction('Sannu, ina kwana?'), /Hausa/);
});

test('language: Igbo is detected', () => {
  const result = detectLanguage('Kedu ka i mere? Biko ndewo, daalu nwanne.');
  assert.equal(result.code, 'ig');
  assert.match(buildLanguageInstruction('Kedu ka i mere?'), /Igbo/);
});

// ─── Smart moderation ───────────────────────────────────────────────────────

test('moderation: flood detection triggers after the threshold', () => {
  const group = 'flood-test@g.us';
  const sender = '2348000000001@s.whatsapp.net';
  const now = Date.now();
  let last = null;
  for (let i = 0; i < 8; i += 1) {
    last = analyzeMessage({ groupJid: group, senderJid: sender, text: `message ${i}`, now });
  }
  assert.equal(last.triggered, true);
  assert.equal(last.reason, 'flood');
});

test('moderation: duplicate messages trigger duplicate spam', () => {
  const group = 'dup-test@g.us';
  const sender = '2348000000002@s.whatsapp.net';
  const now = Date.now();
  let last = null;
  for (let i = 0; i < 4; i += 1) {
    last = analyzeMessage({ groupJid: group, senderJid: sender, text: 'Buy followers now, cheap price', now: now + i });
  }
  assert.equal(last.triggered, true);
  assert.equal(last.reason, 'duplicate_spam');
});

test('moderation: mass mentions trigger mention spam', () => {
  const group = 'mention-test@g.us';
  const result = analyzeMessage({
    groupJid: group,
    senderJid: '2348000000003@s.whatsapp.net',
    text: 'Join now',
    mentions: Array.from({ length: 8 }, (_, i) => `23480000001${i}@s.whatsapp.net`),
    now: Date.now(),
  });
  assert.equal(result.triggered, true);
  assert.equal(result.reason, 'mention_spam');
});

test('moderation: normal chat does not trigger', () => {
  const group = 'normal-test@g.us';
  const now = Date.now();
  let result = null;
  for (let i = 0; i < 3; i += 1) {
    result = analyzeMessage({
      groupJid: group,
      senderJid: '2348000000004@s.whatsapp.net',
      text: `A genuinely different message number ${i}`,
      now: now + i * 1000,
    });
  }
  assert.equal(result.triggered, false);
});

test('moderation: stats expose the configured thresholds', () => {
  const stats = getModerationStats();
  assert.ok(stats.thresholds.floodMessages >= 1);
  assert.ok(stats.thresholds.raidJoins >= 1);
});

// ─── Reminder time parsing ──────────────────────────────────────────────────

test('parseWhen: relative minutes and hours', () => {
  const now = new Date('2026-10-19T10:00:00.000Z');
  assert.equal(parseWhen('30m', now).iso, '2026-10-19T10:30:00.000Z');
  assert.equal(parseWhen('2h', now).iso, '2026-10-19T12:00:00.000Z');
  assert.equal(parseWhen('1d', now).iso, '2026-10-20T10:00:00.000Z');
});

test('parseWhen: Lagos clock times and tomorrow', () => {
  const now = new Date('2026-10-19T10:00:00.000Z'); // 11:00 Lagos
  assert.equal(parseWhen('18:30', now).iso, '2026-10-19T17:30:00.000Z');
  assert.equal(parseWhen('tomorrow 09:00', now).iso, '2026-10-20T08:00:00.000Z');
  assert.equal(parseWhen('09:00', now).iso, '2026-10-20T08:00:00.000Z'); // already past today
});

test('parseWhen: invalid input returns null', () => {
  assert.equal(parseWhen('later'), null);
  assert.equal(parseWhen('99:99'), null);
  assert.equal(parseWhen(''), null);
});

test('formatReminderWhen: renders a Lagos timestamp', () => {
  assert.match(formatReminderWhen('2026-10-19T17:30:00.000Z'), /18:30 \(Lagos\)/);
});

// ─── Polls ──────────────────────────────────────────────────────────────────

test('parsePollPayload: parses question and options', () => {
  const poll = parsePollPayload('Where should we meet? | Church | Online | Hall');
  assert.equal(poll.question, 'Where should we meet?');
  assert.deepEqual(poll.options, ['Church', 'Online', 'Hall']);
});

test('parsePollPayload: rejects malformed polls', () => {
  assert.throws(() => parsePollPayload('Only a question'));
  assert.throws(() => parsePollPayload('Question | one option'));
});

// ─── Knowledge tokenization ─────────────────────────────────────────────────

test('knowledge: tokenizer removes stopwords and short noise', () => {
  const tokens = tokenize('What are the service times for the church on Sunday?');
  assert.ok(tokens.includes('service'));
  assert.ok(tokens.includes('church'));
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('what'));
});
