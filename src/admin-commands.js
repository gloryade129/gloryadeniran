/**
 * src/admin-commands.js
 * Master WhatsApp DM Command Interface for God's Virtue
 * 
 * Allows the owner/administrator to control the bot, manage groups,
 * trigger syncs, test AI responses, and lock/unlock groups directly from WhatsApp DM.
 */

import crypto from 'node:crypto';

import { generateResponse } from './ai-engine.js';
import { sendBotIntroduction, sendGroupOpeningGreeting, sendDailyLockSummary } from './moderation.js';
import { sleep } from './antiban.js';
import { listLearnedRules, clearLearnedRules } from './self-improver.js';
import { getMemoryStats, clearMemories } from './memory.js';

// Cache of authorized admin phone numbers
export const authorizedAdmins = new Set();

// ─── Master Admin PIN for ".claim <PIN>" ───
// The old hardcoded fallback ("1290") was committed to a PUBLIC repository, so anyone
// who read the source could message the bot and promote themselves to master admin
// (full group control, broadcasts, and .vcf contact export). Prefer a configured
// ADMIN_PIN; otherwise issue a random PIN per boot and print it to these logs so the
// owner can still bootstrap access safely.
const PIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

function generateSessionPin(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += PIN_ALPHABET[bytes[i] % PIN_ALPHABET.length];
  return out;
}

const configuredPin = (process.env.ADMIN_PIN || '').trim();
const MASTER_PIN = configuredPin || generateSessionPin();

if (configuredPin) {
  console.log('[admin-cmd] Admin claim PIN loaded from the ADMIN_PIN environment variable.');
} else {
  console.log(
    '[admin-cmd] ADMIN_PIN is not configured, so a random admin claim PIN was generated for this process.\n' +
    `             To grant admin access, message the bot: .claim ${MASTER_PIN}\n` +
    '             Set ADMIN_PIN (and/or ADMIN_PHONE) in your environment for a stable setup.'
  );
}

// Pre-authorize env phones if provided
if (process.env.ADMIN_PHONE) {
  process.env.ADMIN_PHONE.split(',').forEach(p => authorizedAdmins.add(p.trim().replace(/\D/g, '')));
}
if (process.env.OWNER_PHONE) {
  process.env.OWNER_PHONE.split(',').forEach(p => authorizedAdmins.add(p.trim().replace(/\D/g, '')));
}

/**
 * Loads saved admin phones from Supabase configuration table
 */
export async function syncAuthorizedAdminsFromDb(supabase) {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('gods_virtue_config')
      .select('admin_phones')
      .eq('id', 'primary')
      .maybeSingle();

    if (error) {
      warnAdminSchemaOnce(error.message);
      return;
    }

    if (data?.admin_phones && Array.isArray(data.admin_phones)) {
      const sizeBefore = authorizedAdmins.size;
      data.admin_phones.forEach((p) => {
        if (typeof p === 'string' && p.trim()) {
          authorizedAdmins.add(p.replace(/\D/g, ''));
        }
      });
      // This runs on every 5s cloud sync — only log when the list actually changed
      if (authorizedAdmins.size !== sizeBefore) {
        console.log(`[admin-cmd] Loaded ${authorizedAdmins.size} authorized admin phone(s) from Supabase.`);
      }
    }
  } catch (err) {
    warnAdminSchemaOnce(err.message);
  }
}

// The admin_phones column is referenced by both this worker and the dashboard, but it is
// missing from supabase/gods-virtue-schema.sql. Surface that ONCE instead of silently
// failing every 5 seconds (supabase-js returns errors rather than throwing).
let adminSchemaWarned = false;
function warnAdminSchemaOnce(message) {
  if (adminSchemaWarned) return;
  adminSchemaWarned = true;
  console.warn(
    `[admin-cmd] Could not read gods_virtue_config.admin_phones (${message}).\n` +
    '             Admins cannot be persisted until the column exists. Run on Supabase:\n' +
    "             ALTER TABLE gods_virtue_config ADD COLUMN IF NOT EXISTS admin_phones JSONB DEFAULT '[]';"
  );
}

/**
 * Checks if a phone number is an authorized administrator
 */
export function isAuthorizedAdmin(senderPhone, botPhone = '') {
  const cleanSender = (senderPhone || '').replace(/\D/g, '');
  const cleanBot = (botPhone || '').replace(/\D/g, '');

  // 1. Bot's own number ("Message yourself" feature on WhatsApp) is always authorized
  if (cleanSender === cleanBot && cleanBot.length > 0) return true;

  // 2. Pre-authorized admin list
  if (authorizedAdmins.has(cleanSender)) return true;

  return false;
}

/**
 * Formats uptime into a readable string
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * Resolves a group from a number index (1, 2, ...) or search text
 */
function resolveGroup(identifier, groupList) {
  if (!identifier) return null;
  const num = parseInt(identifier.trim(), 10);
  if (!isNaN(num) && num >= 1 && num <= groupList.length) {
    return groupList[num - 1];
  }
  const cleanId = identifier.trim().toLowerCase();
  return groupList.find(g => 
    (g.group_name && g.group_name.toLowerCase().includes(cleanId)) ||
    g.group_jid === identifier.trim()
  ) || null;
}

/**
 * Handles an incoming admin command starting with "."
 */
export async function handleAdminCommand({
  sock,
  m,
  senderJid,
  senderPhone,
  messageText,
  botPhone,
  botConfig,
  supabase,
  groupSettingsCache,
  syncAllGroups,
  // Feature hooks injected by index.js (avoids a circular import back into the entrypoint)
  exportContactsVcf = null,
  getMeme = null,
  publishStatusMeme = null,
}) {
  const parts = messageText.trim().split(/\s+/);
  const rawCmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const cleanSender = senderPhone.replace(/\D/g, '');

  // Helper to send text reply back
  const reply = async (text) => {
    try {
      const targetChat = m?.key?.remoteJid || senderJid;
      await sock.sendMessage(targetChat, { text: text.trim() }, { quoted: m });
    } catch (err) {
      console.warn('[admin-cmd] Reply error:', err.message);
    }
  };

  // ─── 1. Authentication / Claim Command ───
  if (rawCmd === '.claim' || rawCmd === '.auth') {
    const enteredPin = (args[0] || '').trim();
    // Case-insensitive: WhatsApp users routinely type lowercase letters
    if (enteredPin && enteredPin.toUpperCase() === MASTER_PIN.toUpperCase()) {
      authorizedAdmins.add(cleanSender);

      // Permanently save to Supabase so admin stays authorized across all server restarts
      let persistedToCloud = true;
      if (supabase) {
        try {
          const { data: currentCfg, error: selectErr } = await supabase
            .from('gods_virtue_config')
            .select('admin_phones')
            .eq('id', 'primary')
            .maybeSingle();

          if (selectErr) {
            persistedToCloud = false;
            warnAdminSchemaOnce(selectErr.message);
          } else {
            const existingAdmins = Array.isArray(currentCfg?.admin_phones) ? currentCfg.admin_phones : [];
            if (!existingAdmins.includes(cleanSender)) {
              const updatedAdmins = [...existingAdmins, cleanSender];
              const { error: updateErr } = await supabase
                .from('gods_virtue_config')
                .update({ admin_phones: updatedAdmins, updated_at: new Date().toISOString() })
                .eq('id', 'primary');
              if (updateErr) {
                persistedToCloud = false;
                warnAdminSchemaOnce(updateErr.message);
              } else {
                console.log(`[admin-cmd] Permanently persisted admin +${cleanSender} to Supabase.`);
              }
            }
          }
        } catch (dbErr) {
          persistedToCloud = false;
          warnAdminSchemaOnce(dbErr.message);
        }
      } else {
        persistedToCloud = false;
      }

      await reply(
        `[ACCESS GRANTED]\n\nYour phone number (+${cleanSender}) is now authenticated as Master Administrator for God's Virtue.` +
        (persistedToCloud
          ? '\n\nThis authorization is saved permanently and survives restarts.'
          : '\n\nNote: this authorization is only held in memory for the current session, because it could not be saved to the database (see worker logs). Set ADMIN_PHONE in the worker environment to make it permanent.') +
        `\n\nYou can give instructions anytime directly in chat or using dot commands (e.g. .help, .tagall <text>, .instruct <new rules>).`
      );
      return true;
    } else {
      // Log rejected attempts: this is how you spot someone probing the claim PIN
      console.warn(`[admin-cmd] Rejected .claim attempt from +${cleanSender} (wrong PIN).`);
      await reply(
        `[ACCESS DENIED]\n\nInvalid administration PIN. Please provide the correct authorization code: .claim <PIN>`
      );
      return true;
    }
  }

  // ─── 2. Permission Check for All Other Commands ───
  const authorized = isAuthorizedAdmin(senderPhone, botPhone);
  if (!authorized) {
    await reply(
      `[GOD'S VIRTUE COMMAND INTERFACE]\n\nAccess restricted to authorized administrators.\nTo authenticate your phone, send: .claim <PIN>`
    );
    return true;
  }

  // ─── 3. Command Routing ───

  // Convert cached groups to indexed array
  const cachedGroups = Array.from(groupSettingsCache.values());

  switch (rawCmd) {
    // ─── System & Diagnostics ───
    case '.ping': {
      const start = Date.now();
      const uptime = formatUptime(process.uptime());
      const memUsage = Math.round(process.memoryUsage().rss / 1024 / 1024);
      const pingMs = Date.now() - start;
      await reply(
        `[PONG]\n\nStatus: ONLINE & ACTIVE\nLatency: ${pingMs}ms\nUptime: ${uptime}\nMemory: ${memUsage} MB\nConnected Phone: +${botPhone}\nStrict Whitelist: ACTIVE\nKill-Switch: ${botConfig.is_active ? 'OFF (Normal)' : 'ACTIVATED (Paused)'}`
      );
      return true;
    }

    case '.status': {
      const monitoredCount = cachedGroups.filter(g => g.is_monitored).length;
      const adminCount = cachedGroups.filter(g => g.bot_is_admin).length;
      const uptime = formatUptime(process.uptime());

      await reply(
        `[DIAGNOSTIC STATUS: GOD'S VIRTUE]\n\n` +
        `- Core Engine: Baileys Multi-Device WebSockets\n` +
        `- AI Intelligence: Google Gemini 2.0 Flash\n` +
        `- Socket State: CONNECTED\n` +
        `- Active Phone: +${botPhone}\n` +
        `- Bot Name: ${botConfig.bot_name || "God's Virtue"}\n` +
        `- Master Kill-Switch: ${botConfig.is_active ? 'ONLINE (Operational)' : 'PAUSED (Replies Halted)'}\n` +
        `- Discovered Groups: ${cachedGroups.length}\n` +
        `- Monitored Groups: ${monitoredCount}\n` +
        `- Bot Admin in: ${adminCount} groups\n` +
        `- Typo / Human Delay: ${botConfig.min_delay_ms / 1000}s - ${botConfig.max_delay_ms / 1000}s\n` +
        `- System Uptime: ${uptime}\n\n` +
        `Send .groups to inspect monitored communities.`
      );
      return true;
    }

    case '.uptime': {
      await reply(`[UPTIME] God's Virtue has been running continuously for: ${formatUptime(process.uptime())}`);
      return true;
    }

    // ─── Contact Card (.vcf) & Status Meme Commands ───
    case '.vcf':
    case '.contacts': {
      if (typeof exportContactsVcf !== 'function') {
        await reply(`[CONTACTS] Contact export is unavailable in this build.`);
        return true;
      }
      await reply(`[CONTACTS] Generating daily .vcf contact card file for phonebook import...`);
      try {
        const targetChat = m?.key?.remoteJid || senderJid;
        const ok = await exportContactsVcf(sock, targetChat);
        if (!ok) {
          await reply(`[CONTACTS] Export failed — no saved contacts were found (or the database is unreachable).`);
        }
      } catch (vcfErr) {
        await reply(`[CONTACTS] Export failed: ${vcfErr.message}`);
      }
      return true;
    }

    case '.meme':
    case '.statusmeme': {
      if (typeof getMeme !== 'function' || typeof publishStatusMeme !== 'function') {
        await reply(`[STATUS] Status meme publishing is unavailable in this build.`);
        return true;
      }
      await reply(`[STATUS] Fetching fresh meme and publishing to WhatsApp Status...`);
      try {
        const meme = await getMeme();
        if (meme && meme.buffer) {
          const ok = await publishStatusMeme(sock, meme);
          await reply(ok ? `[STATUS POSTED] Successfully published: "${meme.title}" to WhatsApp Status! ✨` : `[STATUS FAILED] Could not publish to status.`);
        } else {
          await reply(`[STATUS FAILED] Could not fetch meme from the meme API.`);
        }
      } catch (memeErr) {
        await reply(`[STATUS FAILED] ${memeErr.message}`);
      }
      return true;
    }

    // ─── Emergency Kill Switch ───
    case '.pause':
    case '.kill': {
      botConfig.is_active = false;
      if (supabase) {
        await supabase.from('gods_virtue_config').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', 'primary');
      }
      await reply(
        `[EMERGENCY KILL-SWITCH ACTIVATED]\n\nAll automated AI replies and moderation actions have been paused immediately.\nThe WhatsApp connection remains linked. Send .resume to restore operations.`
      );
      return true;
    }

    case '.resume':
    case '.start': {
      botConfig.is_active = true;
      if (supabase) {
        await supabase.from('gods_virtue_config').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', 'primary');
      }
      await reply(
        `[OPERATIONS RESUMED]\n\nGod's Virtue is now active. Automated replies, whitelisted moderation, and schedules are functioning normally.`
      );
      return true;
    }

    // ─── DM Auto-Replies Toggle ───
    case '.dms':
    case '.dm': {
      const state = (args[0] || '').toLowerCase();
      if (state !== 'on' && state !== 'off') {
        await reply(
          `[DM AUTO-REPLIES STATUS]\n\nCurrent state: ${botConfig.auto_reply_dms ? 'ENABLED (Bot replies to personal 1-on-1 DMs)' : 'DISABLED (Bot ignores personal DMs, active in groups)'}\n\nUsage: .dms on OR .dms off`
        );
        return true;
      }
      const shouldReplyDms = state === 'on';
      botConfig.auto_reply_dms = shouldReplyDms;
      if (supabase) {
        await supabase
          .from('gods_virtue_config')
          .update({ auto_reply_dms: shouldReplyDms, updated_at: new Date().toISOString() })
          .eq('id', 'primary');
      }
      await reply(
        `[DM REPLIES ${shouldReplyDms ? 'ENABLED' : 'DISABLED'}]\n\n${
          shouldReplyDms
            ? 'God\'s Virtue will now respond thoughtfully to direct 1-on-1 personal chats.'
            : 'God\'s Virtue will strictly ignore direct personal chats from others. Group moderation and group replies remain fully active.'
        }`
      );
      return true;
    }

    // ─── Group Management ───
    case '.groups': {
      if (cachedGroups.length === 0) {
        await reply(`[GROUPS] No groups currently discovered. Send .sync to scan WhatsApp.`);
        return true;
      }

      let listMsg = `[WHATSAPP GROUPS: ${cachedGroups.length} TOTAL]\n\n`;
      cachedGroups.forEach((g, idx) => {
        const num = idx + 1;
        const role = g.bot_is_admin ? 'ADMIN' : 'MEMBER';
        const mon = g.is_monitored ? 'MONITORED' : 'IGNORED';
        const lock = g.is_locked ? 'LOCKED' : 'OPEN';
        listMsg += `${num}. ${g.group_name || 'Group'}\n   [${role}] [${mon}] [${lock}] (${g.member_count || 0} members)\n\n`;
      });

      listMsg += `Commands:\n.lock <number> -> Lock group\n.open <number> -> Open group\n.whitelist <number> on/off -> Toggle monitoring`;
      await reply(listMsg);
      return true;
    }

    case '.sync': {
      await reply(`[SYNC INITIATED] Scanning participating WhatsApp groups and synchronizing with Supabase...`);
      await syncAllGroups(true);
      await reply(`[SYNC COMPLETE] All groups and administrative rights refreshed successfully.`);
      return true;
    }

    case '.lock': {
      const targetId = args[0];
      if (!targetId) {
        await reply(`Usage: .lock <group_number_or_name>\nExample: .lock 1`);
        return true;
      }
      const targetGroup = resolveGroup(targetId, cachedGroups);
      if (!targetGroup) {
        await reply(`Group "${targetId}" not found. Send .groups to view numbered list.`);
        return true;
      }
      if (!targetGroup.bot_is_admin) {
        await reply(`Cannot lock "${targetGroup.group_name}": The bot is not an admin of this group.`);
        return true;
      }

      try {
        await sock.groupSettingUpdate(targetGroup.group_jid, 'announcement');
        targetGroup.is_locked = true;
        if (supabase) {
          await supabase.from('gods_virtue_groups').update({ is_locked: true }).eq('group_jid', targetGroup.group_jid);
        }
        await reply(`[GROUP LOCKED] "${targetGroup.group_name}" is now locked. Disagreeable posting is disabled and daily summary sent.`);
        await sleep(1500);
        await sendDailyLockSummary({
          sock,
          groupJid: targetGroup.group_jid,
          groupName: targetGroup.group_name,
          groupSettings: targetGroup,
          newMembers: [],
          messages: [],
          botConfig,
          supabase,
        });
      } catch (lErr) {
        await reply(`Failed to lock "${targetGroup.group_name}": ${lErr.message}`);
      }
      return true;
    }

    case '.open':
    case '.unlock': {
      const targetId = args[0];
      if (!targetId) {
        await reply(`Usage: .open <group_number_or_name>\nExample: .open 1`);
        return true;
      }
      const targetGroup = resolveGroup(targetId, cachedGroups);
      if (!targetGroup) {
        await reply(`Group "${targetId}" not found. Send .groups to view numbered list.`);
        return true;
      }
      if (!targetGroup.bot_is_admin) {
        await reply(`Cannot unlock "${targetGroup.group_name}": The bot is not an admin of this group.`);
        return true;
      }

      try {
        await sendGroupOpeningGreeting(sock, targetGroup.group_jid, targetGroup.group_name);
        await sleep(2000);
        await sock.groupSettingUpdate(targetGroup.group_jid, 'not_announcement');
        targetGroup.is_locked = false;
        if (supabase) {
          await supabase.from('gods_virtue_groups').update({ is_locked: false }).eq('group_jid', targetGroup.group_jid);
        }
        await reply(`[GROUP OPENED] "${targetGroup.group_name}" is now open with morning greeting. All group members can send messages.`);
      } catch (oErr) {
        await reply(`Failed to open "${targetGroup.group_name}": ${oErr.message}`);
      }
      return true;
    }

    case '.whitelist':
    case '.monitor': {
      const targetId = args[0];
      const state = (args[1] || '').toLowerCase();
      if (!targetId || (state !== 'on' && state !== 'off')) {
        await reply(`Usage: .whitelist <group_number> <on|off>\nExample: .whitelist 1 on`);
        return true;
      }
      const targetGroup = resolveGroup(targetId, cachedGroups);
      if (!targetGroup) {
        await reply(`Group "${targetId}" not found. Send .groups to view numbered list.`);
        return true;
      }

      const shouldMonitor = state === 'on';
      targetGroup.is_monitored = shouldMonitor;
      if (supabase) {
        await supabase.from('gods_virtue_groups').update({ is_monitored: shouldMonitor }).eq('group_jid', targetGroup.group_jid);
      }
      await reply(
        `[WHITELIST UPDATED] "${targetGroup.group_name}" is now ${shouldMonitor ? 'MONITORED (Bot reads and moderates)' : 'IGNORED (Bot is blind for privacy)'}.`
      );
      return true;
    }

    // ─── Automated Schedule Management from DM ───
    case '.schedule': {
      const targetId = args[0];
      const state = (args[1] || '').toLowerCase();
      if (!targetId || (state !== 'on' && state !== 'off')) {
        await reply(`Usage: .schedule <group_number> <on|off> [lock_time] [open_time]\nExample: .schedule 1 on 22:00 06:00\nExample: .schedule 1 off`);
        return true;
      }
      const targetGroup = resolveGroup(targetId, cachedGroups);
      if (!targetGroup) {
        await reply(`Group "${targetId}" not found. Send .groups to view numbered list.`);
        return true;
      }

      const shouldEnable = state === 'on';
      const lockTime = args[2] || targetGroup.auto_lock_time || '22:00';
      const openTime = args[3] || targetGroup.auto_open_time || '06:00';

      targetGroup.schedule_enabled = shouldEnable;
      targetGroup.auto_lock_time = lockTime;
      targetGroup.auto_open_time = openTime;

      if (supabase) {
        await supabase
          .from('gods_virtue_groups')
          .update({
            schedule_enabled: shouldEnable,
            auto_lock_time: lockTime,
            auto_open_time: openTime,
            updated_at: new Date().toISOString(),
          })
          .eq('group_jid', targetGroup.group_jid);
      }
      await reply(
        `[SCHEDULE UPDATED] Daily lock schedule for "${targetGroup.group_name}": ${shouldEnable ? `ENABLED (Auto-Lock: ${lockTime}, Auto-Open: ${openTime})` : 'DISABLED'}.`
      );
      return true;
    }

    // ─── Direct In-Group / Target Group Mention All (@everyone) ───
    case '.tagall':
    case '.everyone': {
      let targetJid = m?.key?.remoteJid;
      let textContent = args.join(' ').trim();

      // If used in DM or with a target group number: .tagall <group_num> <message>
      if (!targetJid || !targetJid.endsWith('@g.us')) {
        if (args.length >= 2) {
          const resolved = resolveGroup(args[0], cachedGroups);
          if (resolved) {
            targetJid = resolved.group_jid;
            textContent = args.slice(1).join(' ').trim();
          }
        }
      }

      if (!targetJid || !targetJid.endsWith('@g.us')) {
        await reply(`Usage in group: .tagall <announcement text>\nUsage in DM: .tagall <group_number> <announcement text>`);
        return true;
      }

      try {
        const meta = await sock.groupMetadata(targetJid);
        const participantIds = (meta.participants || []).map(p => p.id).filter(Boolean);
        const announcementBody = textContent || 'Important announcement for all community members.';
        const cleanMessage = `[📢 ANNOUNCEMENT • @everyone]\n\n${announcementBody}`;

        await sock.sendMessage(targetJid, {
          text: cleanMessage,
          mentions: participantIds,
        });

        if (targetJid !== (m?.key?.remoteJid)) {
          await reply(`[TAGGED ALL] Notification dispatched to "${meta.subject}" with ${participantIds.length} members notified.`);
        }
      } catch (tagErr) {
        await reply(`Tag all failed: ${tagErr.message}`);
      }
      return true;
    }

    // ─── Broadcast to ALL Monitored Groups with Mention All ───
    case '.broadcastall': {
      const textContent = args.join(' ').trim();
      if (!textContent) {
        await reply(`Usage: .broadcastall <announcement text>`);
        return true;
      }

      let count = 0;
      for (const [gJid, meta] of groupSettingsCache.entries()) {
        if (!meta.is_monitored) continue;
        try {
          const grpMeta = await sock.groupMetadata(gJid).catch(() => null);
          const mentions = grpMeta?.participants ? grpMeta.participants.map(p => p.id) : [];
          const formatted = `[📢 ANNOUNCEMENT • @everyone]\n\n${textContent}`;

          await sock.sendMessage(gJid, {
            text: formatted,
            mentions: mentions.length > 0 ? mentions : undefined,
          });
          count++;
          await sleep(2500);
        } catch (bErr) {
          console.warn(`[broadcastall] Failed to send to ${gJid}:`, bErr.message);
        }
      }
      await reply(`[BROADCAST COMPLETE] Dispatched announcement with @everyone mentions to ${count} monitored group(s).`);
      return true;
    }

    // ─── Instruct Bot / Update Master System Prompt ───
    case '.instruct':
    case '.remember': {
      const directive = args.join(' ').trim();
      if (!directive) {
        await reply(`Usage: .instruct <new rule or knowledge>\nExample: .instruct Always announce that Sunday fellowship starts at 9:00 AM prompt.`);
        return true;
      }

      try {
        const appendText = `\n- [Admin Directive]: ${directive}`;
        const updatedPrompt = (botConfig.system_prompt || '') + appendText;
        botConfig.system_prompt = updatedPrompt;

        if (supabase) {
          await supabase
            .from('gods_virtue_config')
            .update({ system_prompt: updatedPrompt, updated_at: new Date().toISOString() })
            .eq('id', 'primary');
        }

        await reply(
          `[INSTRUCTION RECORDED]\n\nUnderstood, Glory. I have permanently committed this rule into my core system memory:\n"${directive}"`
        );
      } catch (instErr) {
        await reply(`Failed to update instruction: ${instErr.message}`);
      }
      return true;
    }

    // ─── Self-Improvement: learned style rules ───
    case '.learned':
    case '.learn': {
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'clear' || sub === 'reset') {
        await clearLearnedRules();
        await reply(`[LEARNED RULES CLEARED]\n\nI've wiped every style rule I wrote for myself. The daily self-review will start fresh from tonight's reflection.`);
        return true;
      }
      const rules = listLearnedRules();
      if (rules.length === 0) {
        await reply(`[LEARNED RULES]\n\nI haven't written any style rules for myself yet. The daily self-review runs at 3:30 AM and learns from how members actually respond to my replies.\n\nSend .learned clear to reset them anytime.`);
        return true;
      }
      await reply(`[LEARNED RULES — ${rules.length} active]\n\nThese are the style rules I wrote for myself after reviewing my own replies:\n\n${rules.map((r) => `- ${r}`).join('\n')}\n\nSend .learned clear to wipe them all.`);
      return true;
    }

    // ─── Long-Term Memory ───
    case '.memories':
    case '.memory': {
      const sub = (args[0] || '').toLowerCase();
      if (sub === 'clear' || sub === 'forget') {
        const target = args[1] || '*';
        await clearMemories(target);
        await reply(`[MEMORIES CLEARED]\n\nWiped ${target === '*' ? 'all stored memories' : `memories for ${target}`}.`);
        return true;
      }
      const stats = getMemoryStats();
      await reply(
        `[LONG-TERM MEMORY]\n\nSubjects remembered: ${stats.subjects}\nTotal memories: ${stats.total}\nDurable storage: ${stats.persistEnabled ? 'Supabase (survives restarts)' : 'In-memory only — apply the gods-virtue schema migration for durability'}\n\nMemories are learned automatically from conversations and used to make replies more personal. Send .memories clear to wipe them.`
      );
      return true;
    }

    case '.scanallcontacts': {
      if (!supabase) {
        await reply('[SCAN CONTACTS] Supabase not configured — cannot save contacts.');
        return true;
      }
      let total = 0;
      for (const [groupJid, gSettings] of groupSettingsCache.entries()) {
        if (!gSettings.is_monitored) continue;
        try {
          const meta = await sock.groupMetadata(groupJid).catch(() => null);
          if (!meta?.participants) continue;
          const botIds = getBotIdentifiers(sock);
          for (const p of meta.participants) {
            if (p.isBot || isBotIdentifierMatch(p.id, botIds)) continue;
            const jid = p.id || p.jid || p.lid || '';
            const name = p.pushName || p.name || '';
            const phone = (jid.split('@')[0]?.split(':')[0] || '').replace(/\D/g, '');
            if (phone.length >= 7) {
              const { data: exists } = await supabase
                .from('gods_virtue_contacts')
                .select('jid')
                .eq('jid', jid)
                .maybeSingle();
              if (!exists) {
                await supabase.from('gods_virtue_contacts').upsert({
                  jid: jid,
                  name: name,
                  phone: phone,
                  is_business: false,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'jid' });
                total++;
              }
            }
          }
        } catch (e) {
          console.warn('[scanall] error for', groupJid, e.message);
        }
      }
      await reply(`[SCAN CONTACTS] Scanned ${groupSettingsCache.size} groups — saved ${total} new contact(s) to Supabase.`);
      return true;
    }

    // ─── Broadcast from DM ───
    case '.broadcast': {
      if (args.length < 2) {
        await reply(`Usage: .broadcast <group_number> <announcement text>\nExample: .broadcast 1 Meeting starts in 30 minutes.`);
        return true;
      }
      const targetGroup = resolveGroup(args[0], cachedGroups);
      if (!targetGroup) {
        await reply(`Group "${args[0]}" not found. Send .groups to view list.`);
        return true;
      }
      const broadcastContent = args.slice(1).join(' ');
      try {
        let mentions = [];
        try {
          const grpMeta = await sock.groupMetadata(targetGroup.group_jid);
          mentions = (grpMeta.participants || []).map(p => p.id).filter(Boolean);
        } catch {}

        await sock.sendMessage(targetGroup.group_jid, {
          text: `[📢 ANNOUNCEMENT • @everyone]\n\n${broadcastContent}`,
          mentions: mentions.length > 0 ? mentions : undefined,
        });
        await reply(`[BROADCAST SENT] Dispatched successfully to "${targetGroup.group_name}" with @everyone mentions.`);
      } catch (bErr) {
        await reply(`Broadcast failed: ${bErr.message}`);
      }
      return true;
    }

    // ─── AI Persona & Spiritual Generation ───
    case '.verse': {
      await reply(`Generating scriptural reflection...`);
      try {
        const reflection = await generateResponse({
          jid: senderJid,
          senderName: 'Admin',
          incomingText: 'Provide a powerful, uplifting Bible verse for today with a brief 2-sentence practical reflection on Christian virtue and leadership. Keep it inspiring, concise, and without emojis.',
          systemPrompt: botConfig.system_prompt,
          temperature: 0.65,
        });
        await reply(`[DAILY SCRIPTURAL VIRTUE]\n\n${reflection.text}`);
      } catch (vErr) {
        await reply(`Scripture generation error: ${vErr.message}`);
      }
      return true;
    }

    case '.prayer': {
      const topic = args.join(' ') || 'wisdom, peace, and divine direction';
      await reply(`Composing prayer for: "${topic}"...`);
      try {
        const prayer = await generateResponse({
          jid: senderJid,
          senderName: 'Admin',
          incomingText: `Compose a heartfelt, reverent, and powerful Christian prayer focused on: "${topic}". Make it grounded, articulate, and spiritually uplifting. No emojis.`,
          systemPrompt: botConfig.system_prompt,
          temperature: 0.70,
        });
        await reply(`[PRAYER: ${topic.toUpperCase()}]\n\n${prayer.text}`);
      } catch (pErr) {
        await reply(`Prayer generation error: ${pErr.message}`);
      }
      return true;
    }

    case '.ask': {
      const query = args.join(' ');
      if (!query) {
        await reply(`Usage: .ask <your question>\nExample: .ask What are practical ways to cultivate patience in leadership?`);
        return true;
      }
      try {
        const response = await generateResponse({
          jid: senderJid,
          senderName: 'Admin',
          incomingText: query,
          systemPrompt: botConfig.system_prompt,
          temperature: botConfig.temperature || 0.70,
        });
        await reply(`[GOD'S VIRTUE AI]\n\n${response.text}`);
      } catch (aErr) {
        await reply(`AI query error: ${aErr.message}`);
      }
      return true;
    }

    // ─── Introduction Command ───
    case '.introduce':
    case '.intro': {
      const targetArg = (args[0] || '').toLowerCase();
      if (targetArg === 'all') {
        let sentCount = 0;
        for (const [gJid, meta] of groupSettingsCache.entries()) {
          if (!meta.is_monitored) continue;
          await sendBotIntroduction(sock, gJid, meta.group_name, meta);
          sentCount++;
          await sleep(2000);
        }
        await reply(`[INTRODUCTION BROADCAST]\n\nSent introductory administrator message to ${sentCount} monitored group(s).`);
        return true;
      }

      if (!targetArg) {
        await reply(`Usage: .introduce <group_number_or_name> OR .introduce all\nExample: .introduce 1 OR .introduce all`);
        return true;
      }

      const targetGroup = resolveGroup(targetArg, cachedGroups);
      if (!targetGroup) {
        await reply(`Group "${targetArg}" not found. Send .groups to view numbered list.`);
        return true;
      }

      await sendBotIntroduction(sock, targetGroup.group_jid, targetGroup.group_name, targetGroup);
      await reply(`[INTRODUCED]\n\nSent introductory administrator message to "${targetGroup.group_name}".`);
      return true;
    }

    // ─── Help Menu ───
    case '.help':
    case '.menu': {
      await reply(
        `[GOD'S VIRTUE: ADMIN COMMAND SUITE]\n\n` +
        `DIAGNOSTICS & STATUS\n` +
        `• .ping          -> Latency, memory, and connection check\n` +
        `• .status        -> Full diagnostic summary\n` +
        `• .uptime        -> Continuous runtime timer\n\n` +
        `GROUP CONTROLS\n` +
        `• .groups        -> List all groups with index numbers\n` +
        `• .sync          -> Force instant group & rights refresh\n` +
        `• .introduce <num>/all -> Send introductory admin message\n` +
        `• .lock <num>    -> Lock group (admin-only messages)\n` +
        `• .open <num>    -> Open group (all members can chat)\n` +
        `• .whitelist <num> on/off -> Toggle bot monitoring\n` +
        `• .schedule <num> on/off [lock] [open] -> Auto daily lock schedule\n\n` +
        `EMERGENCY & CHAT MODES\n` +
        `• .pause         -> Emergency freeze on all replies\n` +
        `• .resume        -> Restore normal operations\n` +
        `• .dms on/off    -> Toggle personal DM auto-replies\n\n` +
        `UTILITY\n` +
        `• .vcf / .contacts -> Export saved contacts as a .vcf phonebook file\n` +
        `• .meme / .statusmeme -> Post a fresh meme to WhatsApp Status\n\n` +
        `COMMUNICATION & ANNOUNCEMENTS\n` +
        `• .tagall <msg>   -> Mention everyone in current group (@all)\n` +
        `• .broadcast <num> <msg> -> Announce to specific group with @everyone\n` +
        `• .broadcastall <msg>   -> Announce to ALL monitored groups with @everyone\n` +
        `• .instruct <rule>      -> Permanently teach bot new knowledge/rules\n` +
        `• .verse         -> Daily Scripture & virtue reflection\n` +
        `• .prayer <topic> -> Compose focused, heartfelt prayer\n` +
        `• .ask <prompt>  -> Direct prompt to Gemini AI engine\n\n` +
        `MEMORY & SELF-IMPROVEMENT\n` +
        `• .learned       -> View style rules the bot wrote for itself\n` +
        `• .learned clear -> Wipe all self-learned rules\n` +
        `• .memories      -> Long-term memory stats\n` +
        `• .memories clear [group|all] -> Wipe stored memories\n\n` +
        `Prefix any command with a dot (.) or talk naturally: "Virtue, tag all members and announce..."`
      );
      return true;
    }

    default: {
      await reply(
        `[COMMAND UNKNOWN]\n\nCommand "${rawCmd}" not recognized.\nType .help to see all available admin controls.`
      );
      return true;
    }
  }
}

/**
 * Handles conversational / natural language admin instructions from an authorized admin.
 * e.g. "Virtue, tag all members and announce that...", "Virtue, lock this group", "Virtue, remember that..."
 * Returns true if the message was handled as an admin instruction, false otherwise.
 */
export async function handleNaturalAdminInstruction({
  sock,
  m,
  senderJid,
  senderPhone,
  messageText,
  botPhone,
  botConfig,
  supabase,
  groupSettingsCache,
  syncAllGroups,
}) {
  if (!isAuthorizedAdmin(senderPhone, botPhone)) {
    return false;
  }

  const clean = messageText.trim();
  const lower = clean.toLowerCase();

  // Helper to reply
  const reply = async (text) => {
    try {
      const targetChat = m?.key?.remoteJid || senderJid;
      await sock.sendMessage(targetChat, { text: text.trim() }, { quoted: m });
    } catch (err) {
      console.warn('[admin-natural] Reply error:', err.message);
    }
  };

  // Check 1: Tag all / Mention everyone intent
  // Matches: "tag all in Adeniran's family", "tag all members...", "tag everyone..."
  if (
    lower.includes('tag all') ||
    lower.includes('tag everyone') ||
    lower.includes('mention everyone') ||
    lower.includes('mention all')
  ) {
    const isDirectDm = !m?.key?.remoteJid?.endsWith('@g.us');
    let targetJid = isDirectDm ? null : m.key.remoteJid;
    let targetGroupName = null;

    // Check if user specified a group name in quotes e.g. "Adeniran's Family" or in <group_name> group
    const quotedMatch = clean.match(/["'“]([^"'”]+)["'”]/);
    const inGroupMatch = clean.match(/(?:in|to)\s+([A-Za-z0-9\s'’-]+?)\s+(?:group|chat)/i);

    const candidateName = quotedMatch ? quotedMatch[1] : (inGroupMatch ? inGroupMatch[1] : null);

    if (candidateName) {
      const cachedList = Array.from(groupSettingsCache.values());
      const matchedGroup = resolveGroup(candidateName, cachedList);
      if (matchedGroup) {
        targetJid = matchedGroup.group_jid;
        targetGroupName = matchedGroup.group_name;
      }
    }

    if (!targetJid) {
      await reply(`I couldn't identify the target group. Please specify the group name (e.g. tag all in "Adeniran's Family") or use .tagall <num> <text>.`);
      return true;
    }

    // Extract the message body to announce
    let body = clean;
    // If there is a quoted message text or text following "write", "saying", "that", "announce"
    const textAfterWrite = clean.match(/(?:write|saying|announce|that)\s+["'“]?([^"'”\n]+)["'”]?/i);
    if (textAfterWrite && textAfterWrite[1]) {
      body = textAfterWrite[1].trim();
    } else {
      body = clean
        .replace(/^virtue,?\s*/i, '')
        .replace(/^god's virtue,?\s*/i, '')
        .replace(/^(please\s+)?(i\s+need\s+you\s+to\s+)?tag\s+(all(\s+in\s+[^]+?)?|everyone)\s*/i, '')
        .trim();
    }

    if (!body) body = 'Important community announcement.';

    try {
      const meta = await sock.groupMetadata(targetJid);
      const participantIds = (meta.participants || []).map(p => p.id).filter(Boolean);
      await sock.sendMessage(targetJid, {
        text: `[📢 ANNOUNCEMENT • @everyone]\n\n${body}`,
        mentions: participantIds,
      });

      await reply(`[DISPATCHED] Tagged everyone in "${meta.subject || targetGroupName || 'the group'}" with: "${body}"`);
    } catch (err) {
      await reply(`Failed to tag group: ${err.message}`);
    }
    return true;
  }

  // Check 2: Lock current group intent
  // Matches: "virtue, lock this group", "lock the group", "close this group"
  if (
    (lower.includes('lock this group') || lower.includes('lock the group') || lower.includes('close this group')) &&
    m?.key?.remoteJid?.endsWith('@g.us')
  ) {
    const groupJid = m.key.remoteJid;
    try {
      await sock.groupSettingUpdate(groupJid, 'announcement');
      const meta = groupSettingsCache.get(groupJid) || {};
      meta.is_locked = true;
      groupSettingsCache.set(groupJid, meta);
      if (supabase) {
        await supabase.from('gods_virtue_groups').update({ is_locked: true }).eq('group_jid', groupJid);
      }
      await reply(`[GROUP LOCKED] Group has been locked for announcements upon your instruction, Glory.`);
    } catch (err) {
      await reply(`Could not lock group: ${err.message}`);
    }
    return true;
  }

  // Check 3: Open / Unlock current group intent
  // Matches: "virtue, open this group", "unlock the group", "open the group"
  if (
    (lower.includes('open this group') || lower.includes('unlock this group') || lower.includes('open the group')) &&
    m?.key?.remoteJid?.endsWith('@g.us')
  ) {
    const groupJid = m.key.remoteJid;
    try {
      await sock.groupSettingUpdate(groupJid, 'not_announcement');
      const meta = groupSettingsCache.get(groupJid) || {};
      meta.is_locked = false;
      groupSettingsCache.set(groupJid, meta);
      if (supabase) {
        await supabase.from('gods_virtue_groups').update({ is_locked: false }).eq('group_jid', groupJid);
      }
      await reply(`[GROUP OPENED] Group is now open for member interaction upon your instruction, Glory.`);
    } catch (err) {
      await reply(`Could not open group: ${err.message}`);
    }
    return true;
  }

  // Check 4: Permanent Instruction / Remember intent
  // Matches: "virtue, remember that...", "virtue, instruct:", "virtue, take note that..."
  if (
    lower.startsWith('virtue, remember') ||
    lower.startsWith("god's virtue, remember") ||
    lower.startsWith('virtue, take note') ||
    lower.startsWith('virtue, instruct')
  ) {
    const directive = clean
      .replace(/^virtue,?\s*(remember(\s+that)?|take note(\s+that)?|instruct(\s+that)?)\s*:?\s*/i, '')
      .replace(/^god's virtue,?\s*(remember(\s+that)?|take note(\s+that)?|instruct(\s+that)?)\s*:?\s*/i, '')
      .trim();

    if (directive) {
      const appendText = `\n- [Admin Directive]: ${directive}`;
      const updatedPrompt = (botConfig.system_prompt || '') + appendText;
      botConfig.system_prompt = updatedPrompt;

      if (supabase) {
        await supabase
          .from('gods_virtue_config')
          .update({ system_prompt: updatedPrompt, updated_at: new Date().toISOString() })
          .eq('id', 'primary');
      }

      await reply(
        `[INSTRUCTION COMMITTED]\n\nUnderstood, Glory. I have permanently committed this rule into memory:\n"${directive}"`
      );
      return true;
    }
  }

  // Check 5: Broadcast / Announce to All Groups intent (ONLY in 1-on-1 private DM with Admin)
  // Matches: "virtue, announce to all groups...", "announce that...", "broadcast that...", "tell all groups..."
  const isDirectDm = !m?.key?.remoteJid?.endsWith('@g.us');
  if (
    isDirectDm &&
    (lower.startsWith('virtue, announce') ||
     lower.startsWith("god's virtue, announce") ||
     lower.startsWith('announce to all') ||
     lower.startsWith('broadcast to all') ||
     lower.startsWith('virtue, broadcast') ||
     lower.startsWith("god's virtue, broadcast") ||
     lower.startsWith('tell all groups') ||
     lower.startsWith('send to all groups'))
  ) {
    let body = clean
      .replace(/^virtue,?\s*/i, '')
      .replace(/^god's virtue,?\s*/i, '')
      .replace(/^(please\s+)?(announce(\s+to\s+all(\s+monitored)?\s+groups)?|broadcast(\s+to\s+all(\s+monitored)?\s+groups)?|tell\s+all\s+groups|send\s+to\s+all\s+groups)(\s+that|\s+saying)?\s*:?\s*/i, '')
      .trim();

    if (!body) body = clean;

    let count = 0;
    for (const [gJid, meta] of groupSettingsCache.entries()) {
      if (!meta.is_monitored) continue;
      try {
        const grpMeta = await sock.groupMetadata(gJid).catch(() => null);
        const mentions = grpMeta?.participants ? grpMeta.participants.map(p => p.id) : [];
        const formatted = `[📢 ANNOUNCEMENT • @everyone]\n\n${body}`;

        await sock.sendMessage(gJid, {
          text: formatted,
          mentions: mentions.length > 0 ? mentions : undefined,
        });
        count++;
        await sleep(2500);
      } catch (bErr) {
        console.warn(`[admin-natural-broadcast] Failed to send to ${gJid}:`, bErr.message);
      }
    }
    await reply(`[BROADCAST DISPATCHED]\n\nDispatched your announcement with @everyone mentions to ${count} monitored group(s), Glory.`);
    return true;
  }

  return false;
}

