/**
 * src/moderation-plus.js
 * Smart moderation 2.0 — beyond the anti-link shield.
 *
 * Detects the patterns that actually ruin WhatsApp groups:
 *   • flooding   — one member sending many messages in a short window
 *   • duplicate  — the same message repeated over and over
 *   • mention spam — mass-tagging the whole group
 *   • join raids — many accounts joining at once
 *
 * False positives are worse than a missed spam message, so every threshold is
 * deliberately conservative and only confirmed non-admins are actioned.
 * Admins are never punished, and an unverifiable admin status means "do nothing".
 */

const DEFAULTS = {
  floodMessages: 8,
  floodWindowMs: 20_000,
  duplicateCount: 4,
  duplicateWindowMs: 60_000,
  mentionLimit: 8,
  raidJoins: 10,
  raidWindowMs: 120_000,
  actionCooldownMs: 45_000,
  stateTtlMs: 10 * 60_000,
};

function envInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function thresholds() {
  return {
    floodMessages: envInt('MODERATION_FLOOD_MESSAGES', DEFAULTS.floodMessages),
    floodWindowMs: envInt('MODERATION_FLOOD_WINDOW_SECONDS', DEFAULTS.floodWindowMs / 1000) * 1000,
    duplicateCount: envInt('MODERATION_DUPLICATE_COUNT', DEFAULTS.duplicateCount),
    duplicateWindowMs: envInt('MODERATION_DUPLICATE_WINDOW_SECONDS', DEFAULTS.duplicateWindowMs / 1000) * 1000,
    mentionLimit: envInt('MODERATION_MENTION_LIMIT', DEFAULTS.mentionLimit),
    raidJoins: envInt('MODERATION_RAID_JOINS', DEFAULTS.raidJoins),
    raidWindowMs: envInt('MODERATION_RAID_WINDOW_SECONDS', DEFAULTS.raidWindowMs / 1000) * 1000,
    actionCooldownMs: envInt('MODERATION_ACTION_COOLDOWN_SECONDS', DEFAULTS.actionCooldownMs / 1000) * 1000,
    stateTtlMs: DEFAULTS.stateTtlMs,
  };
}

// groupJid -> Map<senderJid, { timestamps: number[], texts: Array<{ text, at }>, lastActionAt, offenses }>
const messageState = new Map();
// groupJid -> number[] (join timestamps)
const joinState = new Map();

function prune(arr, cutoff) {
  while (arr.length > 0 && arr[0] < cutoff) arr.shift();
}

function getUserState(groupJid, senderJid, now) {
  if (!messageState.has(groupJid)) messageState.set(groupJid, new Map());
  const group = messageState.get(groupJid);
  if (!group.has(senderJid)) {
    group.set(senderJid, { timestamps: [], texts: [], lastActionAt: 0, offenses: 0 });
  }
  const state = group.get(senderJid);
  const cutoff = now - thresholds().stateTtlMs;
  prune(state.timestamps, cutoff);
  state.texts = state.texts.filter((entry) => entry.at >= cutoff);
  return state;
}

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '<link>')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Records a message and returns a detection result.
 * @returns {{ triggered: boolean, reason?: string, detail?: string, count?: number }}
 */
export function analyzeMessage({ groupJid, senderJid, text = '', mentions = [], now = Date.now() }) {
  const config = thresholds();
  const state = getUserState(groupJid, senderJid, now);

  state.timestamps.push(now);
  prune(state.timestamps, now - config.floodWindowMs);

  const normalized = normalizeText(text);
  if (normalized.length >= 8) {
    state.texts.push({ text: normalized, at: now });
    state.texts = state.texts.filter((entry) => entry.at >= now - config.duplicateWindowMs);
  }

  if (Array.isArray(mentions) && mentions.length >= config.mentionLimit) {
    return {
      triggered: true,
      reason: 'mention_spam',
      detail: `tagged ${mentions.length} members in one message`,
      count: mentions.length,
    };
  }

  if (state.timestamps.length >= config.floodMessages) {
    return {
      triggered: true,
      reason: 'flood',
      detail: `${state.timestamps.length} messages in ${Math.round(config.floodWindowMs / 1000)}s`,
      count: state.timestamps.length,
    };
  }

  if (normalized.length >= 8) {
    const same = state.texts.filter((entry) => entry.text === normalized).length;
    if (same >= config.duplicateCount) {
      return {
        triggered: true,
        reason: 'duplicate_spam',
        detail: `same message ${same} times in ${Math.round(config.duplicateWindowMs / 1000)}s`,
        count: same,
      };
    }
  }

  return { triggered: false };
}

export function clearMessageState(groupJid, senderJid) {
  if (!messageState.has(groupJid)) return;
  if (senderJid) messageState.get(groupJid).delete(senderJid);
  else messageState.delete(groupJid);
}

/**
 * Records a join and reports whether the group is likely being raided.
 * @returns {{ count: number, raid: boolean }}
 */
export function recordGroupJoin(groupJid, now = Date.now()) {
  const config = thresholds();
  if (!joinState.has(groupJid)) joinState.set(groupJid, []);
  const arr = joinState.get(groupJid);
  arr.push(now);
  prune(arr, now - config.raidWindowMs);
  return { count: arr.length, raid: arr.length >= config.raidJoins };
}

export function resetGroupJoins(groupJid) {
  joinState.delete(groupJid);
}

/**
 * Enforces a smart-moderation detection: deletes the message, warns or removes
 * the member, and records the violation in Supabase (same table as anti-link,
 * so strikes are shared and consistent).
 *
 * `isAdmin` must be `false` (verified non-admin) for any action. `null`/`true`
 * short-circuits — we never punish on a guess or an admin.
 */
export async function processSmartModeration({
  sock,
  groupJid,
  senderJid,
  senderName,
  messageKey,
  rawText,
  detection,
  isAdmin,
  groupSettings = {},
  supabase = null,
  now = Date.now(),
}) {
  if (!detection?.triggered) return null;
  if (isAdmin !== false) return null;

  const config = thresholds();
  const state = getUserState(groupJid, senderJid, now);

  // Always delete the offending message (best effort).
  try {
    await sock.sendMessage(groupJid, { delete: messageKey });
  } catch (err) {
    console.warn('[moderation-plus] Delete warning (bot may not be admin):', err?.message || err);
  }

  // One warning/removal per member per cooldown, so a flood does not create a
  // wall of notices. Additional messages are still deleted silently.
  if (now - state.lastActionAt < config.actionCooldownMs) {
    return { action: 'deleted', reason: detection.reason, silent: true };
  }
  state.lastActionAt = now;
  state.offenses += 1;

  const maxStrikes = Number(groupSettings.max_strikes) || 3;
  const cleanUserTag = `@${String(senderJid).split('@')[0]}`;
  const label =
    detection.reason === 'flood'
      ? 'rapid-fire messaging'
      : detection.reason === 'duplicate_spam'
        ? 'repeating the same message'
        : 'mass-mentioning members';

  let strikes = state.offenses;

  if (supabase) {
    try {
      const { data: previous } = await supabase
        .from('gods_virtue_violations')
        .select('id')
        .eq('group_jid', groupJid)
        .eq('user_jid', senderJid);
      strikes = Math.max(strikes, (previous?.length || 0) + 1);

      await supabase.from('gods_virtue_violations').insert({
        group_jid: groupJid,
        user_jid: senderJid,
        user_name: senderName || null,
        violation_type: detection.reason,
        strike_count: strikes,
        action_taken: strikes >= maxStrikes ? 'member_removed' : 'warned',
        offending_content: String(rawText || '').slice(0, 500),
      });
    } catch (dbErr) {
      console.warn('[moderation-plus] DB record violation error:', dbErr?.message || dbErr);
    }
  }

  if (strikes >= maxStrikes) {
    try {
      await sock.groupParticipantsUpdate(groupJid, [senderJid], 'remove');
      await sock.sendMessage(groupJid, {
        text: `${cleanUserTag} has been removed after repeated ${label} (${maxStrikes} warnings reached).`,
        mentions: [senderJid],
      });
      return { action: 'removed', reason: detection.reason, strikes };
    } catch (kickErr) {
      await sock.sendMessage(groupJid, {
        text: `${cleanUserTag} has reached the warning limit for ${label} (${maxStrikes}/${maxStrikes}). Group admins, please review.`,
        mentions: [senderJid],
      });
      return { action: 'flagged', reason: detection.reason, strikes };
    }
  }

  await sock.sendMessage(groupJid, {
    text:
      `Notice to ${cleanUserTag}: please slow down — ${label} is not allowed here. ` +
      `Your message was removed. (Warning ${strikes}/${maxStrikes})`,
    mentions: [senderJid],
  });

  return { action: 'warned', reason: detection.reason, strikes };
}

export function getModerationStats() {
  let trackedUsers = 0;
  for (const group of messageState.values()) trackedUsers += group.size;
  return {
    trackedUsers,
    trackedGroups: messageState.size,
    thresholds: {
      floodMessages: thresholds().floodMessages,
      floodWindowSeconds: thresholds().floodWindowMs / 1000,
      duplicateCount: thresholds().duplicateCount,
      duplicateWindowSeconds: thresholds().duplicateWindowMs / 1000,
      mentionLimit: thresholds().mentionLimit,
      raidJoins: thresholds().raidJoins,
      raidWindowSeconds: thresholds().raidWindowMs / 1000,
    },
  };
}
