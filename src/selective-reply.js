/**
 * src/selective-reply.js
 * "When do I actually speak?" — the bot's judgement layer.
 *
 * Before this module the bot spoke in a group only when it was @mentioned or
 * quoted. That is safe but robotic: in a real group the person behind the
 * account chips in on questions, greetings, running jokes and topics he cares
 * about, and stays quiet for the rest.
 *
 * The gate here is measured in two halves:
 *
 *   1. SIGNALS from the message itself — is it a question, a greeting, a topic
 *      the owner actually talks about, a bare sticker, a forwarded broadcast,
 *      a link dump?
 *   2. TEMPERAMENT from the owner's own history — how often he speaks relative
 *      to everyone else in that kind of chat, plus his burst size. A person who
 *      writes once per twenty messages should not answer every third message.
 *      `tools/wa_export/style_profile.py` writes that ratio to
 *      src/data/engagement_profile.json and we read it here.
 *
 * Direct address (@mention, quote-reply, "Virtue…") always wins — the gate only
 * governs *voluntary* participation.
 *
 * Everything is injectable (clock, rng, learned profile) so the behaviour is
 * unit-testable instead of a pile of tuned magic numbers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lagosHHmm } from './time-utils.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.join(HERE, 'data');

// ── Tunables ────────────────────────────────────────────────────────────────
export const DEFAULTS = {
  minGapMs: 75_000,          // never two voluntary replies in the same chat this close
  maxPerHour: 6,
  maxPerDay: 15,
  quietStart: '23:00',       // Lagos. Outside this window only direct address counts.
  quietEnd: '05:30',
  // Score at or above which the bot speaks. Moved by the learned participation
  // rate: a talkative owner lowers the bar, a quiet one raises it.
  baseThreshold: 0.62,
  thresholdSpread: 0.34,
  minThreshold: 0.34,
  maxThreshold: 0.74,
  // A voluntary reply must clear the threshold by this much, so borderline
  // messages stay silent instead of triggering on rounding noise.
  margin: 0.02,
};

// ── Learned temperament ─────────────────────────────────────────────────────

let cached = null;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Loads engagement_profile.json (optional). Missing file = neutral defaults. */
export function loadEngagementProfile({ dataDir = DEFAULT_DATA_DIR, force = false } = {}) {
  if (cached && !force && cached.dataDir === dataDir) return cached;
  const raw = readJson(path.join(dataDir, 'engagement_profile.json'));
  cached = {
    dataDir,
    profile: raw && typeof raw === 'object' ? raw : null,
  };
  return cached;
}

export function resetEngagementCache() {
  cached = null;
}

/**
 * The owner's measured share of the conversation, clamped to a sane band.
 * Falls back to 0.12 (roughly one message in eight) when untrained.
 */
export function participationRate(opts) {
  const { profile } = loadEngagementProfile(opts);
  const raw = Number(profile?.participation?.overall);
  if (!Number.isFinite(raw) || raw <= 0) return 0.12;
  return Math.min(0.45, Math.max(0.03, raw));
}

/** Threshold a message must clear before the bot volunteers a reply. */
export function replyThreshold(opts) {
  const p = participationRate(opts);
  // Map participation [0.03..0.45] onto a threshold that moves in the opposite
  // direction: talkative owner => lower bar.
  const span = 0.45 - 0.03;
  const normalized = (p - 0.03) / span;
  const raw = DEFAULTS.baseThreshold + DEFAULTS.thresholdSpread / 2 - normalized * DEFAULTS.thresholdSpread;
  return Math.min(DEFAULTS.maxThreshold, Math.max(DEFAULTS.minThreshold, raw));
}

// ── Cooldown bookkeeping ────────────────────────────────────────────────────

const chatState = new Map(); // jid -> { lastVoluntaryAt, recent: number[] }

function stateFor(jid) {
  let s = chatState.get(jid);
  if (!s) {
    s = { lastVoluntaryAt: 0, recent: [] };
    chatState.set(jid, s);
  }
  return s;
}

export function recordBotMessage(jid, { voluntary = true, now = Date.now() } = {}) {
  if (!jid) return;
  const s = stateFor(jid);
  s.recent.push(now);
  if (voluntary) s.lastVoluntaryAt = now;
}

export function resetReplyState() {
  chatState.clear();
}

function pruneRecent(times, now, windowMs) {
  return times.filter((t) => now - t < windowMs);
}

// ── Signal scoring ──────────────────────────────────────────────────────────

const GREETINGS = /^(hi|hello|hey|good\s+(morning|afternoon|evening|day)|morning|afternoon|evening|how\s+far|how\s+are\s+you|how\s+you\s+dey|wassup|what'?s\s+up|sup)\b/i;
const THANKS = /\b(thank\s*(you|u)|thanks|thx|well\s*done|God\s*bless|bless\s*(you|up))\b/i;
const APOLOGY = /\b(sorry|my\s+bad|apologies|no\s+vex)\b/i;
const CONDOLENCE = /\b(condolence|rest\s+in\s+peace|RIP|my\s+deepest)\b/i;
const CELEBRATION = /\b(congrats?|congratulations|happy\s+birthday|welcome|praise\s+God|glory)\b/i;

// Subjects the owner genuinely engages with in his own history.
const OWNER_TOPICS = [
  'school', 'school fees', 'course', 'registration', 'timetable', 'lecture', 'lecturer',
  'exam', 'test', 'assignment', 'project', 'deadline', 'department', 'faculty', 'faculty',
  'result', 'gpa', 'cgpa', 'admission', 'matriculation', 'siwes', 'it', 'internship',
  'fuoye', 'unilorin', 'university', 'polytechnic', 'student', 'class rep', '200 level',
  '100 level', '300 level', 'semester', 'harmattan', 'rain semester', 'course form',
  'bible', 'prayer', 'church', 'pastor', 'bishop', 'worship', 'sermon', 'faith',
  'jesus', 'God', 'scripture', 'bible study', 'choir', 'ministry', 'testimony',
  'laundry', 'price', 'how much', 'cost', 'order', 'delivery', 'design', 'logo',
];

const BROADCAST_MARKERS = /^(forwarded\s+many\s+times|forwarded)$/i;
const LINK_ONLY = /^(https?:\/\/\S+\s*)+$/i;

function hasQuestion(text) {
  if (text.includes('?')) return true;
  // Nigerian register often drops the question mark: "How far", "Wetin dey happen"
  return /^(how|what|when|where|who|which|why|can|could|will|would|should|is|are|do|does|did|have|has)\b/i.test(text.trim());
}

function topicHits(text) {
  const low = text.toLowerCase();
  let hits = 0;
  for (const topic of OWNER_TOPICS) {
    if (low.includes(topic)) hits += 1;
    if (hits >= 3) break;
  }
  return hits;
}

function mentionsAnotherMember(text) {
  // "@2348012345678" style mentions other than the bot are handled upstream
  // (isAddressedToBot already returns true when the bot itself is tagged), so a
  // leftover @handle here means the message is aimed at somebody else.
  return /@\d{7,}/.test(text) || /(^|\s)@[a-z0-9._]{3,}/i.test(text);
}

/**
 * Scores a message in [0, 1]. Pure: no clock, no state, no I/O.
 *
 * @param {object} input
 * @param {string} input.text          message body (may be empty for media)
 * @param {boolean} [input.isGroup]
 * @param {boolean} [input.isAddressedToBot]  @mention / quote-reply / name call-out
 * @param {string|null} [input.mediaType]     'image' | 'sticker' | 'video' | 'audio' | 'document'
 * @param {string} [input.senderJid]
 * @returns {{ score: number, signals: string[] }}
 */
export function scoreMessage({
  text = '',
  isGroup = true,
  isAddressedToBot = false,
  mediaType = null,
  senderJid = '',
} = {}) {
  const signals = [];
  const body = String(text || '').trim();

  if (isAddressedToBot) {
    return { score: 1, signals: ['addressed'] };
  }

  let score = 0.18; // resting interest: most group chatter is not for the bot

  if (!isGroup) {
    // DMs are conversational by nature; the caller separately decides whether
    // DM auto-replies are switched on.
    return { score: 0.95, signals: ['dm'] };
  }

  if (BROADCAST_MARKERS.test(body)) {
    return { score: 0.02, signals: ['broadcast'] };
  }

  if (mediaType === 'sticker') {
    score -= 0.12;
    signals.push('sticker-only');
  } else if (mediaType && !body) {
    score -= 0.08;
    signals.push(`media:${mediaType}`);
  }

  if (!body && !mediaType) {
    return { score: 0, signals: ['empty'] };
  }

  if (body) {
    if (LINK_ONLY.test(body)) {
      score -= 0.2;
      signals.push('link-only');
    }

    if (hasQuestion(body)) {
      score += 0.32;
      signals.push('question');
    }

    if (GREETINGS.test(body)) {
      score += 0.26;
      signals.push('greeting');
    }

    if (THANKS.test(body)) {
      score += 0.14;
      signals.push('thanks');
    }

    if (APOLOGY.test(body)) {
      score += 0.1;
      signals.push('apology');
    }

    if (CONDOLENCE.test(body)) {
      score -= 0.05;
      signals.push('condolence-hold');
    }

    if (CELEBRATION.test(body)) {
      score += 0.2;
      signals.push('celebration');
    }

    const hits = topicHits(body);
    if (hits > 0) {
      score += Math.min(0.3, 0.16 * hits);
      signals.push(`topic:${hits}`);
    }

    if (mentionsAnotherMember(body)) {
      score -= 0.24;
      signals.push('aimed-elsewhere');
    }

    // A wall of text pasted into a group is usually news or a broadcast, not a
    // prompt. Answering it makes the bot look like a bot.
    if (body.length > 600) {
      score -= 0.22;
      signals.push('long-paste');
    }

    if (body.length > 0 && body.length <= 3 && !/\d/.test(body)) {
      score -= 0.05;
      signals.push('too-short');
    }
  }

  // Slightly favour people the bot has already been talking to.
  if (senderJid && chatState.get(senderJid)?.lastVoluntaryAt) {
    score += 0.03;
  }

  return { score: Math.max(0, Math.min(1, score)), signals };
}

/**
 * Full decision: signals + temperament + cooldowns + quiet hours.
 *
 * @param {object} input
 * @param {string} input.chatJid
 * @param {string} [input.text]
 * @param {boolean} [input.isGroup=true]
 * @param {boolean} [input.isAddressedToBot=false]
 * @param {string|null} [input.mediaType]
 * @param {string} [input.senderJid]
 * @param {boolean} [input.mentionOnly=false]   hard override from bot config
 * @param {boolean} [input.isDmAllowed=true]
 * @param {boolean} [input.isAdminSender=false]
 * @param {number}  [input.now=Date.now()]
 * @param {() => number} [input.rng=Math.random]
 * @param {object}  [input.config]              DEFAULTS overrides
 * @param {object}  [input.profileOpts]         passed to loadEngagementProfile
 * @returns {{ respond: boolean, score: number, threshold: number, reason: string, signals: string[] }}
 */
export function decideReply({
  chatJid = 'unknown',
  text = '',
  isGroup = true,
  isAddressedToBot = false,
  mediaType = null,
  senderJid = '',
  mentionOnly = false,
  isDmAllowed = true,
  isAdminSender = false,
  now = Date.now(),
  rng = Math.random,
  config = {},
  profileOpts = {},
} = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const { score, signals } = scoreMessage({ text, isGroup, isAddressedToBot, mediaType, senderJid });

  // ── Hard gates ────────────────────────────────────────────────────────────
  if (!isGroup) {
    if (isAdminSender) return { respond: true, score: 1, threshold: 0, reason: 'owner-dm', signals };
    if (!isDmAllowed) return { respond: false, score, threshold: 1, reason: 'dm-replies-off', signals };
    return { respond: true, score: 0.95, threshold: 0, reason: 'dm', signals };
  }

  if (isAddressedToBot) {
    return { respond: true, score: 1, threshold: 0, reason: 'addressed', signals };
  }

  if (mentionOnly) {
    return { respond: false, score, threshold: 1, reason: 'mention-only-mode', signals };
  }

  // ── Quiet hours: free chatter is off, but a direct address above still wins ─
  const hhmm = lagosHHmm(new Date(now));
  const quiet = cfg.quietStart <= cfg.quietEnd
    ? hhmm >= cfg.quietStart && hhmm <= cfg.quietEnd
    : hhmm >= cfg.quietStart || hhmm <= cfg.quietEnd;
  if (quiet) {
    return { respond: false, score, threshold: 1, reason: 'quiet-hours', signals };
  }

  // ── Cooldowns ─────────────────────────────────────────────────────────────
  const s = stateFor(chatJid);
  if (s.lastVoluntaryAt && now - s.lastVoluntaryAt < cfg.minGapMs) {
    return { respond: false, score, threshold: 1, reason: 'min-gap', signals };
  }
  s.recent = pruneRecent(s.recent, now, 24 * 60 * 60 * 1000);
  const lastHour = s.recent.filter((t) => now - t < 60 * 60 * 1000).length;
  if (lastHour >= cfg.maxPerHour) {
    return { respond: false, score, threshold: 1, reason: 'hourly-cap', signals };
  }
  if (s.recent.length >= cfg.maxPerDay) {
    return { respond: false, score, threshold: 1, reason: 'daily-cap', signals };
  }

  // ── Temperament ───────────────────────────────────────────────────────────
  const threshold = replyThreshold(profileOpts);
  // A ±0.04 wobble keeps the bot from answering on a perfectly regular rhythm.
  const jitter = (rng() - 0.5) * 0.08;
  const effective = score + jitter;

  if (effective >= threshold + cfg.margin) {
    return { respond: true, score: effective, threshold, reason: 'voluntary', signals };
  }
  return { respond: false, score: effective, threshold, reason: 'below-threshold', signals };
}

/** Compact diagnostics for the health endpoint / startup log. */
export function getReplyPolicyStats(profileOpts) {
  const { profile } = loadEngagementProfile(profileOpts);
  return {
    trained: Boolean(profile),
    participation: participationRate(profileOpts),
    threshold: Number(replyThreshold(profileOpts).toFixed(3)),
    trackedChats: chatState.size,
  };
}
