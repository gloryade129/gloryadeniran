/**
 * src/admin-commands.js
 * Master WhatsApp DM Command Interface for God's Virtue
 * 
 * Allows the owner/administrator to control the bot, manage groups,
 * trigger syncs, test AI responses, and lock/unlock groups directly from WhatsApp DM.
 */

import { generateResponse } from './ai-engine.js';

// Cache of authorized admin phone numbers
const authorizedAdmins = new Set();

// Master Admin PIN for .claim authentication (defaults to 1290 or env ADMIN_PIN)
const MASTER_PIN = process.env.ADMIN_PIN || '1290';

// Pre-authorize env phones if provided
if (process.env.ADMIN_PHONE) {
  process.env.ADMIN_PHONE.split(',').forEach(p => authorizedAdmins.add(p.trim().replace(/\D/g, '')));
}
if (process.env.OWNER_PHONE) {
  process.env.OWNER_PHONE.split(',').forEach(p => authorizedAdmins.add(p.trim().replace(/\D/g, '')));
}

/**
 * Checks if a phone number is an authorized administrator
 */
export function isAuthorizedAdmin(senderPhone, botPhone) {
  const cleanSender = senderPhone.replace(/\D/g, '');
  const cleanBot = botPhone.replace(/\D/g, '');

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
}) {
  const parts = messageText.trim().split(/\s+/);
  const rawCmd = parts[0].toLowerCase();
  const args = parts.slice(1);
  const cleanSender = senderPhone.replace(/\D/g, '');

  // Helper to send text reply back to DM
  const reply = async (text) => {
    try {
      await sock.sendMessage(senderJid, { text: text.trim() });
    } catch (err) {
      console.warn('[admin-cmd] Reply error:', err.message);
    }
  };

  // ─── 1. Authentication / Claim Command ───
  if (rawCmd === '.claim' || rawCmd === '.auth') {
    const enteredPin = args[0] || '';
    if (enteredPin === MASTER_PIN) {
      authorizedAdmins.add(cleanSender);
      await reply(
        `[ACCESS GRANTED]\n\nYour phone number (+${cleanSender}) is now authenticated as Master Administrator for God's Virtue.\n\nType .help to see all available admin controls.`
      );
      return true;
    } else {
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
        await reply(`[GROUP LOCKED] "${targetGroup.group_name}" is now locked. Only group admins can send messages.`);
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
        await sock.groupSettingUpdate(targetGroup.group_jid, 'not_announcement');
        targetGroup.is_locked = false;
        if (supabase) {
          await supabase.from('gods_virtue_groups').update({ is_locked: false }).eq('group_jid', targetGroup.group_jid);
        }
        await reply(`[GROUP OPENED] "${targetGroup.group_name}" is now open. All group members can send messages.`);
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
        await sock.sendMessage(targetGroup.group_jid, { text: `[OFFICIAL ANNOUNCEMENT]\n\n${broadcastContent}` });
        await reply(`[BROADCAST SENT] Dispatched successfully to "${targetGroup.group_name}".`);
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
        `• .lock <num>    -> Lock group (admin-only messages)\n` +
        `• .open <num>    -> Open group (all members can chat)\n` +
        `• .whitelist <num> on/off -> Toggle bot monitoring\n\n` +
        `EMERGENCY\n` +
        `• .pause         -> Emergency freeze on all replies\n` +
        `• .resume        -> Restore normal operations\n\n` +
        `COMMUNICATION & SPIRITUAL\n` +
        `• .broadcast <num> <msg> -> Send announcement to group\n` +
        `• .verse         -> Daily Scripture & virtue reflection\n` +
        `• .prayer <topic> -> Compose focused, heartfelt prayer\n` +
        `• .ask <prompt>  -> Direct prompt to Gemini AI engine\n\n` +
        `Prefix any command with a dot (.)`
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
