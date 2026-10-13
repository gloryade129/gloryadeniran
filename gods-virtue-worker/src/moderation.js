/**
 * src/moderation.js
 * Group Moderation & Shield Engine for God's Virtue
 * 
 * Handles anti-link defense, warning strike enforcement, member removals,
 * automated welcome greetings, and natural language admin commands.
 */

import { areJidsSameUser } from '@whiskeysockets/baileys';

const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[a-zA-Z0-9]+)|(wa\.me\/[0-9]+)|(t\.me\/[a-zA-Z0-9_]+)/gi;

export function containsDisallowedLink(text = '') {
  return URL_REGEX.test(text);
}

/**
 * Checks if a participant is an admin in the group
 */
export async function isGroupAdmin(sock, groupJid, userJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    const participant = meta.participants.find((p) => 
      areJidsSameUser(p.id, userJid) || 
      (p.id || '').split('@')[0]?.split(':')[0] === (userJid || '').split('@')[0]?.split(':')[0]
    );
    return Boolean(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
  } catch (err) {
    console.warn('[moderation] Failed to verify group admin status:', err.message);
    return false;
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
 * Welcomes new group participants automatically
 */
export async function sendWelcomeGreeting({
  sock,
  groupJid,
  participantJids = [],
  groupName,
  groupSettings,
}) {
  if (!groupSettings.auto_welcome_enabled) return;

  const defaultGreeting = `Welcome to our community. We are glad to have you here. Please treat everyone with respect, avoid posting unsolicited external links, and feel free to reach out if you have any questions.`;
  const greetingText = groupSettings.welcome_message || defaultGreeting;

  for (const jid of participantJids) {
    try {
      const userTag = `@${jid.split('@')[0]}`;
      const message = `Welcome to ${groupName}, ${userTag}.\n\n${greetingText}`;
      await sock.sendMessage(groupJid, {
        text: message,
        mentions: [jid],
      });
    } catch (err) {
      console.warn('[moderation] Welcome message dispatch error:', err.message);
    }
  }
}
