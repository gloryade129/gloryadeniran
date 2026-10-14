/**
 * src/moderation.js
 * Group Moderation & Shield Engine for God's Virtue
 * 
 * Handles anti-link defense, warning strike enforcement, member removals,
 * automated welcome greetings, and natural language admin commands.
 */

import { areJidsSameUser } from '@whiskeysockets/baileys';
import { generateDailyGroupSummary } from './ai-engine.js';

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
  if (!groupSettings.auto_welcome_enabled) return;
  if (!participantJids || participantJids.length === 0) return;

  const validJids = participantJids.filter(Boolean);
  if (validJids.length === 0) return;

  const tags = validJids.map((j) => `@${j.split('@')[0]}`).join(' ');

  // Base welcome message or warm default
  const baseGreeting = groupSettings.welcome_message?.trim() ||
    `We are glad to have you join our community. You are warmly welcome! ✨`;

  // Rules & guidelines
  let guidelines = [
    `• Mutual Respect: Please treat everyone with kindness, patience, and mutual respect.`,
    `• Community Protection: External advertising, spam, and unauthorized links are prohibited to keep our space safe for all.`
  ];

  if (groupSettings.custom_rules?.trim()) {
    guidelines.push(`• Guidelines: ${groupSettings.custom_rules.trim()}`);
  }

  // Daily lock/open schedule (if enabled)
  let scheduleNote = '';
  if (groupSettings.schedule_enabled) {
    const lockTime = groupSettings.auto_lock_time || '22:00';
    const openTime = groupSettings.auto_open_time || '06:00';
    scheduleNote = `\n\nDaily Community Hours:\n• Group automatically locks for quiet rest at ${lockTime} and reopens at ${openTime} every day.`;
  }

  // Request to reply with their names so contact can be saved
  const nameRequest = `\n\nTo help us get to know you and save your contact, kindly reply with your name (right here in the group, or in a private DM to me)! 🤝`;

  const fullMessage =
    `Welcome to ${groupName}, ${tags}!\n\n` +
    `${baseGreeting}\n\n` +
    `Community Guidelines:\n` +
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
      `\n\nDaily Community Schedule:\n` +
      `• Group automatically locks for quiet rest at ${lockTime} and reopens at ${openTime} daily.`;
  }

  let rulesNote = '';
  if (groupSettings?.custom_rules?.trim()) {
    rulesNote = `\n\nCommunity Guidelines:\n• ${groupSettings.custom_rules.trim()}`;
  }

  const introMessage =
    `Hello and warm greetings to everyone in ${groupName}! ✨\n\n` +
    `I am "God's Virtue", created by Glory Adeniran to serve as an assistant and administrator in this community.\n\n` +
    `My role here is to keep our group organized, safe, and helpful for everyone:\n\n` +
    `1. Welcoming Members: I greet newcomers, share guidelines, and help everyone settle in.\n` +
    `2. Community Protection: I quietly protect our space from unsolicited spam, scams, and external links.\n` +
    `3. Helpful Assistance: Whenever you have a question or need information, you can tag or mention me (@God's Virtue) anytime.` +
    `${rulesNote}` +
    `${scheduleNote}\n\n` +
    `Let's keep this space productive, welcoming, and respectful for all. Glad to be here with you! 🤝`;

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
 */
export async function sendGroupOpeningGreeting(sock, groupJid, groupName = 'our community') {
  const morningGreeting =
    `Wakey Wakey, it's another beautiful day! ☀️\n\n` +
    `Good morning, everyone in ${groupName}!\n\n` +
    `Our group is now officially open for the day. Wishing everyone a productive, fulfilling, and successful day ahead! ✨`;

  try {
    await sock.sendMessage(groupJid, { text: morningGreeting });
    console.log(`[moderation] Sent morning wake-up greeting to group ${groupJid}`);
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
}) {
  try {
    console.log(`[moderation] Preparing evening daily summary for "${groupName}" (${newMembers.length} joined, ${messages.length} messages)...`);

    // 1. Resolve human names for new members from Supabase contacts if available
    const resolvedMembers = [];
    for (const mem of newMembers) {
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

    const reopenTime = groupSettings?.auto_open_time || '06:00';
    const customInstructions = groupSettings?.instructions || '';

    // 2. Generate intelligent summary via Gemini AI
    const summaryText = await generateDailyGroupSummary({
      groupName,
      newMembers: resolvedMembers,
      messages,
      customInstructions,
      reopenTime,
    });

    // 3. Mentions for new members
    const mentionJids = resolvedMembers
      .map((m) => m.jid)
      .filter(Boolean);

    await sock.sendMessage(groupJid, {
      text: summaryText,
      mentions: mentionJids,
    });

    console.log(`[moderation] Dispatched daily lock summary to "${groupName}"`);
    return true;
  } catch (err) {
    console.warn(`[moderation] Failed to dispatch daily lock summary to ${groupJid}:`, err.message);
    return false;
  }
}


