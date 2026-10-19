/**
 * src/moderation.js
 * Group Moderation & Shield Engine for God's Virtue
 * 
 * Handles anti-link defense, warning strike enforcement, member removals,
 * automated welcome greetings, and natural language admin commands.
 */

import { areJidsSameUser } from '@whiskeysockets/baileys';
import { generateDailyGroupSummary } from './ai-engine.js';
import { getNewMembersSince } from './member-roster.js';
import { lagosDayStartIso } from './time-utils.js';

/** Explicit opt-outs only — a missing/undefined flag means "enabled". */
export function isExplicitlyDisabled(value) {
  return value === false || value === 'false' || value === 0 || value === '0';
}

// NOTE: no /g flag on purpose — a global regex keeps `lastIndex` between .test()
// calls, which made every second link-bearing message pass the shield unchecked.
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[a-zA-Z0-9]+)|(wa\.me\/[0-9]+)|(t\.me\/[a-zA-Z0-9_]+)/i;

export function containsDisallowedLink(text = '') {
  if (typeof text !== 'string' || !text) return false;
  URL_REGEX.lastIndex = 0; // defensive: guard against a future /g re-introduction
  return URL_REGEX.test(text);
}

/**
 * Checks if a participant is an admin in the group.
 *
 * Group metadata can expose the same person in up to three forms — `id` (lid or
 * phone), `jid` (phone-number form) and `lid` (privacy-ID form) — and a message
 * key can carry either form depending on the group's addressing mode, so ALL
 * forms are compared before deciding.
 *
 * Metadata is cached for 60s (a link-bearing message must not force a network
 * round-trip each time).
 *
 * @returns {Promise<true|false|null>} `null` when the status could NOT be
 * determined (metadata unavailable). Callers must treat null as "unknown", never
 * as "not admin", so a transient error can never punish an admin.
 */
const groupMetaCache = new Map(); // groupJid -> { meta, fetchedAt }
const GROUP_META_CACHE_TTL_MS = 60000;
const digitsOf = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

export async function isGroupAdmin(sock, groupJid, userJid) {
  try {
    let meta;
    const cached = groupMetaCache.get(groupJid);
    if (cached && Date.now() - cached.fetchedAt < GROUP_META_CACHE_TTL_MS) {
      meta = cached.meta;
    } else {
      meta = await sock.groupMetadata(groupJid);
      groupMetaCache.set(groupJid, { meta, fetchedAt: Date.now() });
    }

    const userDigits = digitsOf(userJid);
    if (!userDigits) return false;
    const participant = (meta.participants || []).find((p) =>
      [p.id, p.jid, p.lid].filter(Boolean).some(
        (form) => areJidsSameUser(form, userJid) || digitsOf(form) === userDigits
      )
    );
    return Boolean(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
  } catch (err) {
    console.warn(`[moderation] Could not verify admin status of ${userJid} in ${groupJid} (treating as unknown):`, err.message);
    return null;
  }
}

/**
 * Checks if the bot itself has admin rights in the group
 */
export async function isBotAdmin(sock, groupJid, botJid) {
  return await isGroupAdmin(sock, groupJid, botJid);
}

/**
 * Executes anti-link shield when an unauthorized link is detected
 */
export async function processAntiLinkViolation({
  sock,
  groupJid,
  senderJid,
  senderName,
  messageKey,
  rawText,
  groupSettings,
  supabase,
}) {
  const maxStrikes = groupSettings.max_strikes || 3;
  let currentStrikes = 1;

  // 1. Log violation to Supabase
  if (supabase) {
    try {
      // Count previous violations
      const { data: previous } = await supabase
        .from('gods_virtue_violations')
        .select('id')
        .eq('group_jid', groupJid)
        .eq('user_jid', senderJid);

      currentStrikes = (previous?.length || 0) + 1;

      await supabase.from('gods_virtue_violations').insert({
        group_jid: groupJid,
        user_jid: senderJid,
        user_name: senderName,
        violation_type: 'link_spam',
        strike_count: currentStrikes,
        action_taken: currentStrikes >= maxStrikes ? 'member_removed' : 'warned',
        offending_content: rawText,
      });
    } catch (dbErr) {
      console.warn('[moderation] DB record violation error:', dbErr.message);
    }
  }

  // 2. Delete the offending message if bot is admin
  try {
    await sock.sendMessage(groupJid, { delete: messageKey });
  } catch (delErr) {
    console.warn('[moderation] Delete message warning (bot may not be admin):', delErr.message);
  }

  const cleanUserTag = `@${senderJid.split('@')[0]}`;

  // 3. Take disciplinary action based on strike count
  if (currentStrikes >= maxStrikes) {
    try {
      await sock.groupParticipantsUpdate(groupJid, [senderJid], 'remove');
      await sock.sendMessage(groupJid, {
        text: `${cleanUserTag} has been removed from the group following repeated link violations (${maxStrikes} warnings reached).`,
        mentions: [senderJid],
      });
    } catch (kickErr) {
      await sock.sendMessage(groupJid, {
        text: `Notice: ${cleanUserTag} has exceeded the maximum allowed warnings (${maxStrikes}/${maxStrikes}). Group admins, please review and take appropriate action.`,
        mentions: [senderJid],
      });
    }
  } else {
    // Issue respectful warning
    await sock.sendMessage(groupJid, {
      text: `Notice to ${cleanUserTag}: External links are not permitted in this group to maintain community safety. Please review the guidelines. (Warning ${currentStrikes}/${maxStrikes})`,
      mentions: [senderJid],
    });
  }
}

/**
 * Welcomes new group participants automatically with guidelines, locking schedule,
 * and an invitation to reply with their names so their contacts can be saved.
 */
export async function sendWelcomeGreeting({
  sock,
  groupJid,
  participantJids = [],
  groupName = 'our community',
  groupSettings = {},
}) {
  if (isExplicitlyDisabled(groupSettings.auto_welcome_enabled)) return;
  if (!participantJids || participantJids.length === 0) return;

  const validJids = participantJids.filter(Boolean);
  if (validJids.length === 0) return;

  const tags = validJids.map((j) => `@${j.split('@')[0]}`).join(' ');

  // Base welcome message or warm default
  const baseGreeting = groupSettings.welcome_message?.trim() ||
    `You're welcome aboard. Glad to have you here.`;

  // Guidelines, in plain human language
  let guidelines = [
    `Just a couple of things to note:`,
    `- Treat everyone here with respect — kindness costs nothing.`,
    `- No advertising, spam, or unsolicited links. Let's keep this space safe for everybody.`
  ];

  if (groupSettings.custom_rules?.trim()) {
    guidelines.push(`- ${groupSettings.custom_rules.trim()}`);
  }

  // Daily lock/open schedule (if enabled)
  let scheduleNote = '';
  if (groupSettings.schedule_enabled) {
    const lockTime = groupSettings.auto_lock_time || '22:00';
    const openTime = groupSettings.auto_open_time || '06:00';
    scheduleNote = `\n\nOne more thing: this group locks for quiet hours at ${lockTime} every night and opens again at ${openTime}.`;
  }

  // Request to reply with their names so contact can be saved
  const nameRequest = `\n\nDrop your name here (or DM it to me) so I can save your contact properly.`;

  const fullMessage =
    `Welcome to ${groupName}, ${tags}!\n\n` +
    `${baseGreeting}\n\n` +
    `${guidelines.join('\n')}` +
    `${scheduleNote}` +
    `${nameRequest}`;

  try {
    await sock.sendMessage(groupJid, {
      text: fullMessage,
      mentions: validJids,
    });
    console.log(`[moderation] Dispatched welcome greeting to ${validJids.length} member(s) in "${groupName}"`);
  } catch (err) {
    console.warn('[moderation] Welcome message dispatch error:', err.message);
  }
}

/**
 * Sends a warm, human-like introduction message explaining God's Virtue's role as group administrator.
 * Includes creator Glory Adeniran, purpose, and automated group lock/open times if scheduling is enabled.
 */
export async function sendBotIntroduction(sock, groupJid, groupName = 'our community', groupSettings = {}) {
  const isScheduleOn = Boolean(
    groupSettings?.schedule_enabled === true ||
    groupSettings?.schedule_enabled === 'true' ||
    groupSettings?.schedule_enabled === 1
  );

  let scheduleNote = '';
  if (isScheduleOn) {
    const lockTime = groupSettings?.auto_lock_time || '22:00';
    const openTime = groupSettings?.auto_open_time || '06:00';
    scheduleNote =
      `\n\nJust so you know: this group locks for quiet hours at ${lockTime} every night and opens again at ${openTime}.`;
  }

  let rulesNote = '';
  if (groupSettings?.custom_rules?.trim()) {
    rulesNote = `\n\nCommunity guidelines:\n- ${groupSettings.custom_rules.trim()}`;
  }

  const introMessage =
    `Hello everyone in ${groupName}. I'm "God's Virtue" — created by Glory Adeniran to help run this community.\n\n` +
    `In short, here's what I do here:\n` +
    `1. I welcome new members and help them settle in.\n` +
    `2. I keep the space clean — spam, scams, and unsolicited links get removed quietly.\n` +
    `3. I answer questions when you tag me. Ask anything.\n` +
    `${rulesNote}` +
    `${scheduleNote}\n\n` +
    `Glad to be here with you all.`;

  try {
    await sock.sendMessage(groupJid, { text: introMessage });
    console.log(`[moderation] Sent bot introduction to group ${groupJid} (schedule included: ${isScheduleOn})`);
    return true;
  } catch (err) {
    console.warn(`[moderation] Failed to send bot introduction to ${groupJid}:`, err.message);
    return false;
  }
}

/**
 * Sends the cheerful morning wake-up greeting when opening a group:
 * "Wakey Wakey, it's another beautiful day!" followed by unlocking the group.
 * When a `timetableNote` is supplied (the group's lecture timetable), it is
 * appended so members get today's schedule with the good-morning message.
 */
export async function sendGroupOpeningGreeting(sock, groupJid, groupName = 'our community', timetableNote = '') {
  const morningGreeting =
    `Good morning, everyone in ${groupName}.\n\n` +
    `The group is open again for the day. How was your night — sleep well?\n` +
    `Anyone still stirring, say hello. Have a good one today.` +
    (timetableNote ? `\n\n${timetableNote}` : '');

  try {
    await sock.sendMessage(groupJid, { text: morningGreeting });
    console.log(`[moderation] Sent morning wake-up greeting to group ${groupJid}${timetableNote ? ' (with timetable)' : ''}`);
    return true;
  } catch (err) {
    console.warn(`[moderation] Failed to send morning opening greeting to ${groupJid}:`, err.message);
    return false;
  }
}

/**
 * Generates and dispatches the evening daily community summary recap after locking the group:
 * Summarizes new members who joined, topics discussed, and goodnight blessing.
 */
export async function sendDailyLockSummary({
  sock,
  groupJid,
  groupName = 'our community',
  groupSettings = {},
  newMembers = [],
  messages = [],
  botConfig = {},
  supabase = null,
  timetableNote = '',
}) {
  try {
    console.log(`[moderation] Preparing evening daily summary for "${groupName}" (${newMembers.length} joined, ${messages.length} messages)...`);

    // 1. Resolve human names for new members from Supabase contacts if available
    const resolvedMembers = [];
    const seenJids = new Set();
    for (const mem of newMembers) {
      if (!mem?.jid || seenJids.has(mem.jid)) continue;
      seenJids.add(mem.jid);
      let resolvedName = mem.name;
      if (!resolvedName && supabase) {
        try {
          const { data } = await supabase
            .from('gods_virtue_contacts')
            .select('name')
            .eq('jid', mem.jid)
            .maybeSingle();
          if (data?.name) resolvedName = data.name;
        } catch {}
      }
      resolvedMembers.push({
        jid: mem.jid,
        phone: mem.phone || mem.jid?.split('@')[0],
        name: resolvedName || null,
      });
    }

    // 1b. Belt & braces: the durable member roster knows who joined today even if
    // the worker restarted mid-day and lost its in-memory activity buffer.
    try {
      const sinceIso = lagosDayStartIso();
      const rosterJoins = await getNewMembersSince(groupJid, sinceIso);
      for (const join of rosterJoins) {
        if (!join?.jid || seenJids.has(join.jid)) continue;
        seenJids.add(join.jid);
        let resolvedName = join.name || null;
        if (!resolvedName && supabase) {
          try {
            const { data } = await supabase
              .from('gods_virtue_contacts')
              .select('name')
              .eq('jid', join.jid)
              .maybeSingle();
            if (data?.name) resolvedName = data.name;
          } catch {}
        }
        resolvedMembers.push({ jid: join.jid, phone: join.phone || join.jid?.split('@')[0], name: resolvedName });
      }
    } catch (rosterErr) {
      console.warn('[moderation] Roster new-member check warning:', rosterErr.message);
    }

    // 1c. If the in-memory message buffer is thin (typically after a restart),
    // recover the day's discussions from the audit log instead of writing fiction.
    let effectiveMessages = messages;
    if (supabase && messages.length < 5) {
      try {
        const { data: logRows } = await supabase
          .from('gods_virtue_logs')
          .select('sender_name, incoming_text, created_at')
          .eq('chat_jid', groupJid)
          .eq('is_group', true)
          .gte('created_at', lagosDayStartIso())
          .order('created_at', { ascending: true })
          .limit(50);
        if (logRows && logRows.length > messages.length) {
          effectiveMessages = logRows
            .filter((r) => r.incoming_text && r.incoming_text.trim())
            .map((r) => ({ senderName: r.sender_name || 'Member', senderJid: null, text: r.incoming_text, time: r.created_at }));
          console.log(`[moderation] Recapped from audit log instead of memory (${effectiveMessages.length} messages recovered).`);
        }
      } catch (logErr) {
        console.warn('[moderation] Log-based recap recovery warning:', logErr.message);
      }
    }

    const reopenTime = groupSettings?.auto_open_time || '06:00';
    const customInstructions = groupSettings?.instructions || '';

    // 2. Generate intelligent summary via Gemini AI
    const summaryText = await generateDailyGroupSummary({
      groupName,
      newMembers: resolvedMembers,
      messages: effectiveMessages,
      customInstructions,
      reopenTime,
    });

    // 3. Mentions for new members
    const mentionJids = resolvedMembers
      .map((m) => m.jid)
      .filter(Boolean);

    const finalRecap = timetableNote ? `${summaryText}\n\n${timetableNote}` : summaryText;

    await sock.sendMessage(groupJid, {
      text: finalRecap,
      mentions: mentionJids,
    });

    console.log(`[moderation] Dispatched daily lock summary to "${groupName}"${timetableNote ? ' (with tomorrow\'s timetable)' : ''}`);
    return true;
  } catch (err) {
    console.warn(`[moderation] Failed to dispatch daily lock summary to ${groupJid}:`, err.message);
    return false;
  }
}


