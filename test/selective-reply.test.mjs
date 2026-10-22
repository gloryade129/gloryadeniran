/**
 * Tests for the "when to speak" policy (src/selective-reply.js).
 *
 * The point of this module is that the bot stops behaving like a mention-only
 * responder, without turning into a chat-spammer. Both failure modes are locked
 * down here:
 *
 *   • too quiet  — questions/greetings in a group must be able to earn a reply
 *   • too loud   — cooldowns, caps, quiet hours and broadcasts must stay silent
 *   • temperament — a quiet owner's measured participation must raise the bar
 */

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  scoreMessage,
  decideReply,
  replyThreshold,
  participationRate,
  recordBotMessage,
  resetReplyState,
  resetEngagementCache,
  loadEngagementProfile,
  getReplyPolicyStats,
  DEFAULTS,
} from '../src/selective-reply.js';

// A fixed midday Lagos instant (UTC+1) so quiet-hours logic never interferes.
const NOON = Date.UTC(2026, 9, 22, 11, 0, 0);
// 23:30 Lagos = 22:30 UTC
const LATE_NIGHT = Date.UTC(2026, 9, 22, 22, 30, 0);

function makeDataDir(profile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-engagement-'));
  fs.writeFileSync(path.join(dir, 'engagement_profile.json'), JSON.stringify(profile), 'utf8');
  return dir;
}

/** An empty data dir = "never trained", regardless of what is committed. */
const UNTRAINED = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-untrained-'));

function fixedRng(value = 0.5) {
  return () => value;
}

beforeEach(() => {
  resetReplyState();
  resetEngagementCache();
});

// ── Signal scoring ──────────────────────────────────────────────────────────

test('a direct mention always wins, whatever the temperament', () => {
  const { score } = scoreMessage({ text: 'hello there', isAddressedToBot: true });
  assert.equal(score, 1);

  const d = decideReply({
    chatJid: 'g1@g.us',
    text: 'hello there',
    isAddressedToBot: true,
    mentionOnly: true,
    now: LATE_NIGHT,
    rng: fixedRng(0),
  });
  assert.equal(d.respond, true);
  assert.equal(d.reason, 'addressed');
});

test('a question scores above a plain statement', () => {
  const q = scoreMessage({ text: 'When is the test?', isGroup: true });
  const s = scoreMessage({ text: 'The test is on Monday.', isGroup: true });
  assert.ok(q.score > s.score, `question ${q.score} should outrank statement ${s.score}`);
  assert.ok(q.signals.includes('question'));
});

test('Nigerian register without a question mark still counts as a question', () => {
  const { signals } = scoreMessage({ text: 'How far now', isGroup: true });
  assert.ok(signals.includes('question'));
});

test('topic keywords lift a message, broadcasts sink it', () => {
  const topic = scoreMessage({ text: 'Any update on the timetable for 200 level?', isGroup: true });
  assert.ok(topic.signals.some((s) => s.startsWith('topic:')), 'expected a topic signal');

  const broadcast = scoreMessage({ text: 'Forwarded many times', isGroup: true });
  assert.ok(broadcast.score < 0.1);
  assert.ok(broadcast.signals.includes('broadcast'));
});

test('a bare sticker is low interest, not zero', () => {
  const { score, signals } = scoreMessage({ text: '', isGroup: true, mediaType: 'sticker' });
  assert.ok(score > 0);
  assert.ok(score < 0.3);
  assert.ok(signals.includes('sticker-only'));
});

test('a message aimed at another member is suppressed', () => {
  const aimed = scoreMessage({ text: '@2348012345678 please send the PDF', isGroup: true });
  assert.ok(aimed.signals.includes('aimed-elsewhere'));
  assert.ok(aimed.score < 0.35);
});

test('a wall of pasted text is not treated as a prompt', () => {
  const paste = scoreMessage({ text: 'word '.repeat(200), isGroup: true });
  assert.ok(paste.signals.includes('long-paste'));
});

// ── Temperament ─────────────────────────────────────────────────────────────

test('without a trained profile the threshold is neutral', () => {
  resetEngagementCache();
  const opts = { dataDir: UNTRAINED };
  const p = participationRate(opts);
  assert.equal(p, 0.12);
  const t = replyThreshold(opts);
  assert.ok(t > DEFAULTS.minThreshold && t < DEFAULTS.maxThreshold);
  assert.equal(getReplyPolicyStats(opts).trained, false);
});

test('a quiet owner raises the bar, a talkative owner lowers it', () => {
  const quietDir = makeDataDir({ participation: { overall: 0.04 } });
  const chattyDir = makeDataDir({ participation: { overall: 0.4 } });

  resetEngagementCache();
  const quiet = replyThreshold({ dataDir: quietDir });

  resetEngagementCache();
  const chatty = replyThreshold({ dataDir: chattyDir });

  assert.ok(quiet > chatty, `quiet threshold ${quiet} should exceed chatty ${chatty}`);
});

test('the learned participation rate is clamped to a sane band', () => {
  const absurd = makeDataDir({ participation: { overall: 0.99 } });
  resetEngagementCache();
  assert.equal(participationRate({ dataDir: absurd }), 0.45);

  const zero = makeDataDir({ participation: { overall: 0 } });
  resetEngagementCache();
  assert.equal(participationRate({ dataDir: zero }), 0.12, 'invalid values fall back to the default');
});

test('a talkative profile actually produces more voluntary replies', () => {
  const chattyDir = makeDataDir({ participation: { overall: 0.4 } });
  const quietDir = makeDataDir({ participation: { overall: 0.04 } });

  const message = { chatJid: 'g1@g.us', text: 'Which course is this?', isGroup: true, now: NOON };

  resetReplyState();
  resetEngagementCache();
  const chatty = decideReply({ ...message, profileOpts: { dataDir: chattyDir }, rng: fixedRng(0.5) });

  resetReplyState();
  resetEngagementCache();
  const quiet = decideReply({ ...message, profileOpts: { dataDir: quietDir }, rng: fixedRng(0.5) });

  assert.equal(chatty.respond, true);
  assert.equal(quiet.respond, false);
});

// ── Cooldowns and guards ────────────────────────────────────────────────────

test('quiet hours silence voluntary chatter but never a direct mention', () => {
  const base = { chatJid: 'g1@g.us', text: 'When is the test?', isGroup: true, now: LATE_NIGHT };

  const voluntary = decideReply({ ...base, rng: fixedRng(0.5) });
  assert.equal(voluntary.respond, false);
  assert.equal(voluntary.reason, 'quiet-hours');

  const addressed = decideReply({ ...base, isAddressedToBot: true, rng: fixedRng(0.5) });
  assert.equal(addressed.respond, true);
});

test('mention-only mode never volunteers', () => {
  const d = decideReply({
    chatJid: 'g1@g.us',
    text: 'When is the test?',
    isGroup: true,
    mentionOnly: true,
    now: NOON,
    config: { minThreshold: 0, maxThreshold: 0 },
    rng: fixedRng(0.5),
  });
  assert.equal(d.respond, false);
  assert.equal(d.reason, 'mention-only-mode');
});

test('the minimum gap blocks two voluntary replies in quick succession', () => {
  const opts = {
    chatJid: 'g1@g.us',
    text: 'When is the test?',
    isGroup: true,
    now: NOON,
    config: { minThreshold: 0, maxThreshold: 0 },
    rng: fixedRng(0.5),
  };

  const first = decideReply(opts);
  assert.equal(first.respond, true);

  recordBotMessage('g1@g.us', { voluntary: true, now: NOON });

  const second = decideReply({ ...opts, now: NOON + 30_000 });
  assert.equal(second.respond, false);
  assert.equal(second.reason, 'min-gap');

  const third = decideReply({ ...opts, now: NOON + DEFAULTS.minGapMs + 1 });
  assert.equal(third.respond, true);
});

test('the hourly cap stops a runaway conversation', () => {
  const opts = {
    chatJid: 'g1@g.us',
    text: 'When is the test?',
    isGroup: true,
    config: { minThreshold: 0, maxThreshold: 0, minGapMs: 0 },
    rng: fixedRng(0.5),
  };

  let now = NOON;
  for (let i = 0; i < DEFAULTS.maxPerHour; i++) {
    const d = decideReply({ ...opts, now });
    assert.equal(d.respond, true, `reply ${i + 1} should be allowed`);
    recordBotMessage('g1@g.us', { voluntary: true, now });
    now += 1000;
  }

  const blocked = decideReply({ ...opts, now });
  assert.equal(blocked.respond, false);
  assert.equal(blocked.reason, 'hourly-cap');
});

test('a direct answer is not counted as a voluntary interjection', () => {
  const opts = {
    chatJid: 'g2@g.us',
    text: 'When is the test?',
    isGroup: true,
    now: NOON,
    config: { minThreshold: 0, maxThreshold: 0 },
    rng: fixedRng(0.5),
  };

  recordBotMessage('g2@g.us', { voluntary: false, now: NOON });
  const d = decideReply(opts);
  assert.equal(d.respond, true, 'answering a mention must not start the voluntary cooldown');
});

// ── DM handling ─────────────────────────────────────────────────────────────

test('DMs respect the auto-reply switch but always answer the owner', () => {
  const off = decideReply({ chatJid: 'dm@s.whatsapp.net', isGroup: false, isDmAllowed: false, now: NOON });
  assert.equal(off.respond, false);
  assert.equal(off.reason, 'dm-replies-off');

  const owner = decideReply({
    chatJid: 'dm@s.whatsapp.net',
    isGroup: false,
    isDmAllowed: false,
    isAdminSender: true,
    now: NOON,
  });
  assert.equal(owner.respond, true);
  assert.equal(owner.reason, 'owner-dm');

  const on = decideReply({ chatJid: 'dm@s.whatsapp.net', isGroup: false, isDmAllowed: true, now: NOON });
  assert.equal(on.respond, true);
});

// ── Loading ─────────────────────────────────────────────────────────────────

test('a missing or corrupt engagement profile degrades to defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-missing-'));
  resetEngagementCache();
  const { profile } = loadEngagementProfile({ dataDir: dir });
  assert.equal(profile, null);
  assert.equal(participationRate({ dataDir: dir }), 0.12);

  const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-bad-'));
  fs.writeFileSync(path.join(badDir, 'engagement_profile.json'), '{not json', 'utf8');
  resetEngagementCache();
  assert.equal(loadEngagementProfile({ dataDir: badDir }).profile, null);
});
