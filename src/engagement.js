/**
 * src/engagement.js
 * "Conversation Starter" — the silence breaker for God's Virtue.
 *
 * Watches every monitored group's real activity. When a group has gone quiet
 * for ~an hour during friendly hours (08:00–22:00 Lagos) and isn't locked for
 * the night, it drafts ONE short, grounded message (callback to an earlier
 * discussion, light banter, or a fresh discussion idea that flows from the
 * group's own talk) and drops it in — sometimes tagging 1–2 people.
 *
 * Tagging policy: mostly recent active members (they'll answer), occasionally
 * a lapsed regular to draw them back; never more than 2 tags; never the same
 * person twice within 6 hours; and a third of posts carry no tags at all, so
 * it never feels like a broadcast.
 */

import { generateSilenceBreaker } from './ai-engine.js';
import { simulateHumanPresence, checkRateLimit, sleep } from './antiban.js';
import { isWithinLagosHours } from './time-utils.js';

const SILENCE_THRESHOLD_MS = (parseInt(process.env.SILENCE_MINUTES, 10) || 60) * 60 * 1000;
const NUDGE_COOLDOWN_MS = (parseInt(process.env.SILENCE_NUDGE_COOLDOWN_MIN, 10) || 90) * 60 * 1000;
const TAG_REPEAT_GUARD_MS = 6 * 60 * 60 * 1000; // never tag the same person twice within 6h
const FRIENDLY_HOURS = { start: '08:00', end: '22:00' };
const MAX_TRACKED_MEMBERS_PER_GROUP = 60;
const MAX_SNIPPETS = 12;

// groupJid -> {
//   lastMessageAt: number,        // any non-bot member message (even stickers)
//   lastSubstantiveAt: number,    // last message with real text
//   lastNudgeAt: number,
//   members: Map<jid, { name, lastActiveAt, count, lastTaggedAt }>,
//   snippets: Array<{ senderName, text, at }>,
// }
const activityState = new Map();

function ensureState(groupJid) {
  if (!activityState.has(groupJid)) {
    activityState.set(groupJid, {
      lastMessageAt: 0,
      lastSubstantiveAt: 0,
      lastNudgeAt: 0,
      members: new Map(),
      snippets: [],
    });
  }
  return activityState.get(groupJid);
}

/**
 * Records member activity for a group. Called for EVERY non-bot message in
 * monitored groups — including images/stickers the bot chooses not to reply to.
 */
export function trackGroupActivity(groupJid, senderJid, senderName, { hasText = false, text = '' } = {}) {
  if (!groupJid || !senderJid) return;
  const state = ensureState(groupJid);
  const now = Date.now();

  state.lastMessageAt = now;
  if (hasText) state.lastSubstantiveAt = now;

  let member = state.members.get(senderJid);
  if (!member) {
    if (state.members.size >= MAX_TRACKED_MEMBERS_PER_GROUP) {
      // Evict the least-recently-active member to bound memory
      let oldestJid = null;
      let oldestAt = Infinity;
      for (const [jid, m] of state.members.entries()) {
        if (m.lastActiveAt < oldestAt) { oldestAt = m.lastActiveAt; oldestJid = jid; }
      }
      if (oldestJid) state.members.delete(oldestJid);
    }
    member = { name: senderName || 'Member', lastActiveAt: now, count: 0, lastTaggedAt: 0 };
    state.members.set(senderJid, member);
  }
  member.lastActiveAt = now;
  member.count++;
  if (senderName && senderName !== 'Friend') member.name = senderName;

  if (hasText && text && text.trim().length >= 12) {
    state.snippets.push({ senderName: member.name, text: text.trim().slice(0, 160), at: now });
    if (state.snippets.length > MAX_SNIPPETS) state.snippets.shift();
  }
}

/** A member left or was removed — stop considering them for tags. */
export function forgetEngagementMember(groupJid, memberJid) {
  activityState.get(groupJid)?.members.delete(memberJid);
}

/** The bot was removed from a group — drop its state entirely. */
export function forgetEngagementGroup(groupJid) {
  activityState.delete(groupJid);
}

/** Small read-only accessor for diagnostics. */
export function getEngagementSnapshot(groupJid) {
  const s = activityState.get(groupJid);
  if (!s) return null;
  return {
    lastMessageAt: s.lastMessageAt ? new Date(s.lastMessageAt).toISOString() : null,
    lastNudgeAt: s.lastNudgeAt ? new Date(s.lastNudgeAt).toISOString() : null,
    trackedMembers: s.members.size,
    snippetsBuffered: s.snippets.length,
  };
}

function pickTags(state, isBotJid) {
  const now = Date.now();
  const candidates = [];
  for (const [jid, m] of state.members.entries()) {
    if (isBotJid(jid)) continue;
    if (now - m.lastTaggedAt < TAG_REPEAT_GUARD_MS) continue;
    if (!jid || !jid.split('@')[0]) continue;
    candidates.push({ jid, member: m });
  }
  if (candidates.length === 0) return [];

  // Variety: a third of the time, no tags at all
  if (Math.random() < 0.33) return [];

  const active = candidates
    .filter((c) => now - c.member.lastActiveAt < 24 * 60 * 60 * 1000)
    .sort((a, b) => b.member.lastActiveAt - a.member.lastActiveAt);
  const pool = active.length > 0 ? active.slice(0, 8) : candidates;

  const chosen = [];
  const first = pool[Math.floor(Math.random() * pool.length)];
  chosen.push(first);

  // Sometimes drag in a second person — but only if they were active today too
  if (active.length >= 3 && Math.random() < 0.35) {
    const secondPool = pool.filter((c) => c.jid !== first.jid && now - c.member.lastActiveAt < 24 * 60 * 60 * 1000);
    if (secondPool.length > 0) {
      chosen.push(secondPool[Math.floor(Math.random() * secondPool.length)]);
    }
  }

  return chosen.map((c) => ({
    jid: c.jid,
    handle: `@${c.jid.split('@')[0].split(':')[0]}`,
    name: c.member.name,
  }));
}

/**
 * Runs one silence check across all cached groups. Called about once a minute.
 * Safe to call regardless of socket state.
 */
export async function checkSilenceEngagement({ sock, groupSettingsCache, botConfig, supabase, isBotJid }) {
  if (!sock?.user || !groupSettingsCache) return;
  if (process.env.SILENCE_ENGAGEMENT === 'off') return;
  if (botConfig && botConfig.is_active === false) return;
  // Nudges are meaningless before friendly hours, and never during the night
  if (!isWithinLagosHours(FRIENDLY_HOURS.start, FRIENDLY_HOURS.end)) return;

  const now = Date.now();

  for (const [groupJid, settings] of groupSettingsCache.entries()) {
    try {
      if (!settings?.is_monitored) continue;
      if (settings.is_locked) continue; // locked for the night — never nudge
      if (settings.silence_engagement_enabled === false || settings.silence_engagement_enabled === 'false') continue;

      const state = activityState.get(groupJid);
      if (!state) continue; // never observed a message here (or bot just started) — stay quiet
      if (!state.lastMessageAt) continue;
      if (now - state.lastMessageAt < SILENCE_THRESHOLD_MS) continue;
      if (state.lastNudgeAt && now - state.lastNudgeAt < NUDGE_COOLDOWN_MS) continue;

      // Anti-ban rate limit for this chat
      const rateCheck = checkRateLimit(groupJid, 3);
      if (!rateCheck.allowed) continue;

      const tagOptions = pickTags(state, isBotJid);
      const silenceMinutes = Math.round((now - state.lastMessageAt) / 60000);
      const groupName = settings.group_name || 'this group';

      // Recent talking points, oldest first — grounds the message in reality
      const recentSnippets = state.snippets.slice(-8).map((s) => ({ senderName: s.senderName, text: s.text }));

      const { text, mentionHandles } = await generateSilenceBreaker({
        groupName,
        silenceMinutes,
        snippets: recentSnippets,
        tagOptions,
      });

      if (!text || !text.trim()) continue;

      // Map the handles the drafter actually used back to JIDs
      const mentionJids = mentionHandles
        .map((h) => tagOptions.find((t) => t.handle === h)?.jid)
        .filter(Boolean);
      mentionJids.forEach((jid) => {
        const m = state.members.get(jid);
        if (m) m.lastTaggedAt = Date.now();
      });

      // Human presence: pause, "typing...", then send
      await simulateHumanPresence(sock, groupJid, null, text, botConfig);
      await sock.sendMessage(groupJid, {
        text: text.trim(),
        mentions: mentionJids.length > 0 ? mentionJids : undefined,
      });

      state.lastNudgeAt = Date.now();
      console.log(`[engagement] Conversation starter posted in "${groupName}" after ${silenceMinutes}m of silence (tagged: ${mentionJids.length}).`);

      // Audit trail so the dashboard log shows the bot's own initiative
      if (supabase) {
        supabase.from('gods_virtue_logs').insert({
          chat_jid: groupJid,
          chat_name: groupName,
          is_group: true,
          sender_jid: sock.user?.id || 'bot',
          sender_name: "God's Virtue",
          incoming_text: `[silence-breaker after ${silenceMinutes}m]`,
          reply_text: text.trim(),
          status: 'engagement_nudge',
        }).then(() => {}).catch((e) => console.warn('[engagement] Log insert warning:', e.message));
      }

      await sleep(1500 + Math.floor(Math.random() * 1500)); // gentle pacing if several groups qualify
    } catch (err) {
      console.warn(`[engagement] Silence check failed for ${groupJid}:`, err.message);
    }
  }
}
