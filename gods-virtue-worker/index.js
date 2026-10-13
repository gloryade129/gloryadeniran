/**
 * index.js
 * Persistent WhatsApp Bot Engine for "God's Virtue"
 * 
 * Orchestrates multi-device Baileys WebSockets, Google Gemini AI,
 * anti-ban human presence simulation, group moderation, and Supabase sync.
 */

import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import qrcode from 'qrcode-terminal';

import { useSupabaseAuthState, clearSession } from './src/supabase-auth-adapter.js';
import { initAI, generateResponse } from './src/ai-engine.js';
import {
  simulateHumanPresence,
  checkRateLimit,
  sleep,
} from './src/antiban.js';
import {
  containsDisallowedLink,
  isGroupAdmin,
  processAntiLinkViolation,
  sendWelcomeGreeting,
} from './src/moderation.js';
import { handleAdminCommand } from './src/admin-commands.js';

// ─── Initialize Supabase Client ───
const supabaseUrl = process.env.NEXT_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[main] Connected to Supabase cloud database.');
} else {
  console.warn('[main] Supabase credentials not found in env. Running in local standalone mode.');
}

// ─── Initialize Gemini AI ───
initAI(process.env.GEMINI_API_KEY);

// ─── Local Configuration State ───
let botConfig = {
  is_active: true,
  system_prompt: 'You are "God\'s Virtue", a wise, warm, and uplifting AI assistant and WhatsApp group administrator. You converse with genuine Christian virtues, humility, and sound wisdom. You speak like a thoughtful, caring human—never robotic, without sterile disclaimers or walls of asterisks. Keep answers concise, natural, and helpful. In groups, you befriend members, answer questions politely when tagged, and gently maintain order.',
  temperature: 0.70,
  min_delay_ms: 2500,
  max_delay_ms: 6500,
  wpm_typing_speed: 45,
  burst_limit_per_min: 5,
  auto_reply_dms: true,
  group_mention_only: true,
};

let groupSettingsCache = new Map();

// Sync config from Supabase
async function syncConfigFromCloud() {
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from('gods_virtue_config')
      .select('*')
      .eq('id', 'primary')
      .single();

    if (data) {
      botConfig = { ...botConfig, ...data };
    }

    const { data: grpData } = await supabase.from('gods_virtue_groups').select('*');
    if (grpData) {
      grpData.forEach((g) => groupSettingsCache.set(g.group_jid, g));
    }
  } catch (err) {
    console.warn('[main] Cloud sync warning:', err.message);
  }
}

// ─── Primary Bot Socket Lifecycle ───
let sock = null;
let lastGroupSyncTime = 0;
const GROUP_SYNC_COOLDOWN_MS = 45000; // 45 seconds minimum between automated scans

// Sync all participating WhatsApp groups to Supabase
async function syncAllGroups(force = false) {
  if (!sock?.user || !supabase) return;

  const now = Date.now();
  if (!force && now - lastGroupSyncTime < GROUP_SYNC_COOLDOWN_MS) {
    return; // Rate limit protection
  }
  lastGroupSyncTime = now;

  try {
    const groups = await sock.groupFetchAllParticipating();
    const myPhone = (sock.user?.id || '').split('@')[0]?.split(':')[0];

    for (const [jid, metadata] of Object.entries(groups)) {
      const isAdmin = metadata.participants?.some((p) => {
        const participantPhone = (p.id || '').split('@')[0]?.split(':')[0];
        return participantPhone === myPhone && (p.admin === 'admin' || p.admin === 'superadmin');
      }) || false;

      const existing = groupSettingsCache.get(jid);

      if (existing) {
        // Group already exists in DB: ONLY update WhatsApp-owned metadata
        // NEVER overwrite user settings (is_monitored, anti_link_enabled, schedules, etc.)
        const metaUpdate = {
          group_name: metadata.subject || existing.group_name || 'WhatsApp Group',
          member_count: metadata.participants?.length || 0,
          bot_is_admin: isAdmin,
          updated_at: new Date().toISOString(),
        };

        Object.assign(existing, metaUpdate);

        await supabase
          .from('gods_virtue_groups')
          .update(metaUpdate)
          .eq('group_jid', jid);
      } else {
        // Newly discovered group: insert with initial defaults
        const newRecord = {
          group_jid: jid,
          group_name: metadata.subject || 'WhatsApp Group',
          member_count: metadata.participants?.length || 0,
          bot_is_admin: isAdmin,
          is_monitored: false,
          anti_link_enabled: true,
          auto_welcome_enabled: true,
          max_strikes: 3,
          schedule_enabled: false,
          auto_lock_time: '22:00',
          auto_open_time: '06:00',
          is_locked: false,
          updated_at: new Date().toISOString(),
        };

        groupSettingsCache.set(jid, newRecord);
        await supabase.from('gods_virtue_groups').upsert(newRecord, { onConflict: 'group_jid' });
      }
    }
    console.log(`[groups] Synced ${Object.keys(groups).length} groups to Supabase.`);
  } catch (gErr) {
    console.warn('[groups] Sync warning:', gErr.message);
  }
}

let isRequestingPairing = false;

// Check and request 8-digit WhatsApp pairing code dynamically
async function checkAndGeneratePairingCode() {
  if (isRequestingPairing || !sock || sock.authState?.creds?.registered) return;

  try {
    let phone = botConfig.phone_number;
    if (!phone && supabase) {
      const { data } = await supabase
        .from('gods_virtue_config')
        .select('phone_number, pairing_code')
        .eq('id', 'primary')
        .single();
      if (!data?.pairing_code) phone = data?.phone_number;
    }

    if (phone && !botConfig.pairing_code) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 7) {
        isRequestingPairing = true;
        console.log(`[main] Requesting 8-digit WhatsApp pairing code for +${cleanPhone}...`);

        // Wait up to 3 seconds for socket readiness
        for (let i = 0; i < 6; i++) {
          if (sock?.ws?.isOpen) break;
          await sleep(500);
        }

        const code = await sock.requestPairingCode(cleanPhone);
        const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('\n========================================');
        console.log(`  WHATSAPP 8-DIGIT PAIRING CODE: ${formattedCode}`);
        console.log('========================================\n');

        botConfig.pairing_code = formattedCode;
        if (supabase) {
          await supabase.from('gods_virtue_config').update({
            pairing_code: formattedCode,
            updated_at: new Date().toISOString(),
          }).eq('id', 'primary');
        }
      }
    }
  } catch (pairErr) {
    console.warn('[main] Pairing code generation warning:', pairErr.message);
  } finally {
    isRequestingPairing = false;
  }
}

async function startBot() {
  await syncConfigFromCloud();

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[main] Baileys Engine v${version.join('.')}, isLatest: ${isLatest}`);

  const { state, saveCreds } = await useSupabaseAuthState(supabase, process.env.SESSION_DIR || './session_auth');

  sock = makeWASocket({
    version,
    logger: pino({ level: 'info' }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  // Handle Initial Pairing Check
  if (!sock.authState.creds.registered) {
    console.log('[main] Account not yet linked. Waiting for pairing code request from dashboard or QR scan.');
    setTimeout(() => {
      checkAndGeneratePairingCode();
    }, 2500);
  }

  // Handle Credentials Updates
  sock.ev.on('creds.update', saveCreds);

  // Handle Connection State Updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n[main] Scan QR Code (or use 8-Digit Pairing Code on Dashboard):');
      qrcode.generate(qr, { small: true });
      // When QR is ready, WhatsApp servers are ready for pairing codes
      checkAndGeneratePairingCode();
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.warn(`[main] WhatsApp connection closed (code: ${statusCode}). Logged out: ${isLoggedOut}`);

      if (supabase) {
        await supabase.from('gods_virtue_config').update({
          is_connected: false,
          updated_at: new Date().toISOString(),
        }).eq('id', 'primary');
      }

      if (isLoggedOut) {
        console.warn('[main] Session logged out / invalid. Purging stale credentials to allow fresh pairing...');
        await clearSession(supabase, process.env.SESSION_DIR || './session_auth');
        if (supabase) {
          await supabase.from('gods_virtue_config').update({
            pairing_code: null,
            phone_number: null,
          }).eq('id', 'primary');
        }
      }

      // ALWAYS reconnect and keep fresh socket active so dashboard pairing works immediately
      await sleep(3000);
      startBot();
    } else if (connection === 'open') {
      const botPhone = sock.user?.id?.split(':')[0] || 'Unknown';
      console.log('\n======================================================');
      console.log(`[LIVE] "God's Virtue" is connected to WhatsApp! Linked to +${botPhone}`);
      console.log('======================================================\n');

      if (supabase) {
        await supabase.from('gods_virtue_config').update({
          is_connected: true,
          phone_number: botPhone,
          pairing_code: null,
          last_heartbeat: new Date().toISOString(),
        }).eq('id', 'primary');
      }

      // Allow 4 seconds for WhatsApp initial handshake to settle before first group scan
      setTimeout(() => {
        syncAllGroups(true).catch(() => {});
      }, 4000);
    }
  });

  // ─── Handle New Incoming Messages ───
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      try {
        const jid = m.key.remoteJid;
        if (!jid) continue;

        const isGroup = jid.endsWith('@g.us');
        const senderJid = isGroup ? m.key.participant || m.participant : jid;
        const senderPhone = (senderJid || '').split('@')[0]?.split(':')[0];
        const botPhone = (sock.user?.id || '').split('@')[0]?.split(':')[0];
        const senderName = m.pushName || 'Friend';

        // Extract message text content
        const messageText =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          '';

        if (!messageText.trim()) continue;

        // ─── Direct Admin Command Handling (.prefix) in DM ───
        if (!isGroup && messageText.trim().startsWith('.')) {
          const handled = await handleAdminCommand({
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
          });
          if (handled) continue;
        }

        // Skip messages sent by the bot itself
        if (m.key.fromMe) continue;

        // STRICT WHITELIST: ignore groups that are not explicitly monitored
        if (isGroup) {
          const gSettings = groupSettingsCache.get(jid);
          if (!gSettings || !gSettings.is_monitored) {
            continue; // drop silently — privacy enforced
          }
        }

        // Emergency Kill-Switch Check
        if (!botConfig.is_active) {
          console.log(`[main] Bot paused via kill-switch. Ignored message from ${senderName}`);
          continue;
        }

        // 1. Group Moderation: Anti-Link Shield
        if (isGroup) {
          const groupSettings = groupSettingsCache.get(jid) || {
            anti_link_enabled: true,
            max_strikes: 3,
          };

          if (groupSettings.anti_link_enabled && containsDisallowedLink(messageText)) {
            const isAdmin = await isGroupAdmin(sock, jid, senderJid);
            if (!isAdmin) {
              console.log(`[moderation] Disallowed link detected from ${senderName} in ${jid}`);
              await processAntiLinkViolation({
                sock,
                groupJid: jid,
                senderJid,
                senderName,
                messageKey: m.key,
                rawText: messageText,
                groupSettings,
                supabase,
              });
              continue; // Do not process AI response for unauthorized links
            }
          }
        }

        // 2. Trigger Conditions Check
        const botJid = sock.user?.id?.split(':')[0];
        let shouldRespond = false;

        if (isGroup) {
          // In groups: Only speak if mentioned (@...) or replied to
          const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const isQuoted = m.message?.extendedTextMessage?.contextInfo?.participant?.includes(botJid);
          const mentionsBot = mentions.some((j) => j.includes(botJid)) || messageText.toLowerCase().includes("god's virtue");

          if (!botConfig.group_mention_only || mentionsBot || isQuoted) {
            shouldRespond = true;
          }
        } else {
          // In DMs: Respond to all 1-on-1 private messages if enabled
          shouldRespond = Boolean(botConfig.auto_reply_dms);
        }

        if (!shouldRespond) continue;

        // 3. Anti-Ban Rate Limit Check
        const rateCheck = checkRateLimit(jid, botConfig.burst_limit_per_min || 5);
        if (!rateCheck.allowed) {
          console.warn(`[antiban] Rate limit hit for ${jid}. Waiting ${rateCheck.waitSeconds}s.`);
          continue;
        }

        console.log(`[main] Generating response for ${senderName} (${isGroup ? 'Group' : 'DM'}): "${messageText}"`);

        // 4. Generate AI Thought with Gemini
        let groupName = 'Group';
        if (isGroup && groupSettingsCache.has(jid)) {
          groupName = groupSettingsCache.get(jid).group_name;
        }

        const reply = await generateResponse({
          jid,
          senderName,
          incomingText: messageText,
          isGroup,
          groupName,
          systemPrompt: botConfig.system_prompt,
          temperature: botConfig.temperature,
        });

        if (!reply) continue;

        // 5. Simulate Human Presence (Random Jitter Delay + Realistic Typing State)
        const presenceResult = await simulateHumanPresence(sock, jid, m.key, reply, botConfig);

        // 6. Send the message
        await sock.sendMessage(
          jid,
          {
            text: reply,
            mentions: isGroup ? [senderJid] : [],
          },
          { quoted: m }
        );

        console.log(`[main] Sent response to ${senderName} (Jitter: ${presenceResult.jitterMs}ms, Typing: ${presenceResult.typingMs}ms)`);

        // 7. Record Audit Log in Supabase
        if (supabase) {
          supabase
            .from('gods_virtue_logs')
            .insert({
              chat_jid: jid,
              chat_name: isGroup ? groupName : senderName,
              is_group: isGroup,
              sender_jid: senderJid,
              sender_name: senderName,
              incoming_text: messageText,
              reply_text: reply,
              latency_ms: presenceResult.jitterMs,
              simulated_typing_ms: presenceResult.typingMs,
              status: 'replied',
            })
            .then(() => {})
            .catch((e) => console.warn('[main] Log insert error:', e.message));
        }
      } catch (msgErr) {
        console.error('[main] Error processing message:', msgErr);
      }
    }
  });

  // ─── Handle Group Member Join (Auto-Welcome) ───
  sock.ev.on('group-participants.update', async ({ id: groupJid, participants, action }) => {
    if (action === 'add') {
      const groupSettings = groupSettingsCache.get(groupJid) || {
        auto_welcome_enabled: true,
      };

      let groupName = 'our community';
      try {
        const meta = await sock.groupMetadata(groupJid);
        groupName = meta.subject || groupName;
      } catch {}

      console.log(`[moderation] Welcoming ${participants.length} new members in ${groupName}`);
      await sendWelcomeGreeting({
        sock,
        groupJid,
        participantJids: participants,
        groupName,
        groupSettings,
      });
    }
  });

  // ─── Listen to Group Updates (Joining new groups) ───
  sock.ev.on('groups.upsert', async (newGroups) => {
    if (newGroups && newGroups.length > 0) {
      console.log(`[groups] Joined ${newGroups.length} new group(s), syncing...`);
      await syncAllGroups(true);
    }
  });

  // ─── Sync WhatsApp Contacts to Supabase ───
  const syncContactsBatch = async (contactList) => {
    if (!supabase || !contactList || contactList.length === 0) return;
    try {
      const contactRecords = contactList
        .filter((c) => c.id && c.id.endsWith('@s.whatsapp.net'))
        .map((c) => ({
          jid: c.id,
          name: c.name || c.notify || c.verifiedName || null,
          phone: c.id.split('@')[0],
          is_business: Boolean(c.isBusiness),
          updated_at: new Date().toISOString(),
        }));
      if (contactRecords.length > 0) {
        await supabase.from('gods_virtue_contacts').upsert(contactRecords, { onConflict: 'jid' });
        console.log(`[contacts] Synced ${contactRecords.length} contacts to Supabase.`);
      }
    } catch (cErr) {
      console.warn('[contacts] Sync error:', cErr.message);
    }
  };

  sock.ev.on('contacts.upsert', async (contacts) => {
    await syncContactsBatch(contacts);
  });

  sock.ev.on('contacts.update', async (updates) => {
    await syncContactsBatch(updates);
  });
}


// ─── Background Tasks: Broadcasts & Heartbeat ───
setInterval(async () => {
  await syncConfigFromCloud();

  // If unlinked, dynamically check if user requested a pairing code from the dashboard
  if (sock && !sock.authState?.creds?.registered) {
    await checkAndGeneratePairingCode();
  }

  // 1. Send Heartbeat & Periodic Group Sync
  if (supabase && sock?.user) {
    await supabase.from('gods_virtue_config').update({
      last_heartbeat: new Date().toISOString(),
    }).eq('id', 'primary');

    // Automatically discover newly added groups or admin role changes
    await syncAllGroups();
  }

  // 2. Check for Scheduled Broadcast Announcements
  if (supabase && sock?.user) {
    try {
      const now = new Date().toISOString();
      const { data: pending } = await supabase
        .from('gods_virtue_announcements')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', now);

      if (pending && pending.length > 0) {
        for (const ann of pending) {
          console.log(`[broadcast] Dispatching announcement: "${ann.title}"`);
          const targetJids = ann.target_group_jid
            ? [ann.target_group_jid]
            : Array.from(groupSettingsCache.keys());

          for (const targetJid of targetJids) {
            try {
              await sock.sendMessage(targetJid, {
                text: `${ann.title.toUpperCase()}\n\n${ann.announcement_text}`,
              });
              await sleep(2000); // 2s pause between groups to prevent burst flag
            } catch (bErr) {
              console.warn(`[broadcast] Failed to send to ${targetJid}:`, bErr.message);
            }
          }

          await supabase.from('gods_virtue_announcements').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          }).eq('id', ann.id);
        }
      }
    } catch (annErr) {
      console.warn('[broadcast] Check error:', annErr.message);
    }
  }

  // 3. Process Queued Actions from Dashboard
  if (supabase && sock?.user) {
    try {
      const { data: pendingActions } = await supabase
        .from('gods_virtue_actions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (pendingActions && pendingActions.length > 0) {
        for (const act of pendingActions) {
          let actionSuccess = false;
          try {
            if (act.action_type === 'lock_group' && act.target_jid) {
              await sock.groupSettingUpdate(act.target_jid, 'announcement');
              // Update cache
              if (groupSettingsCache.has(act.target_jid)) {
                groupSettingsCache.get(act.target_jid).is_locked = true;
              }
              console.log(`[action] Group locked: ${act.target_jid}`);
              actionSuccess = true;
            } else if (act.action_type === 'open_group' && act.target_jid) {
              await sock.groupSettingUpdate(act.target_jid, 'not_announcement');
              if (groupSettingsCache.has(act.target_jid)) {
                groupSettingsCache.get(act.target_jid).is_locked = false;
              }
              console.log(`[action] Group opened: ${act.target_jid}`);
              actionSuccess = true;
            } else if (act.action_type === 'sync_all') {
              await syncAllGroups(true);
              actionSuccess = true;
            } else if (act.action_type === 'sync_contacts') {
              actionSuccess = true; // triggered by contacts.upsert listener
            } else {
              console.warn(`[action] Unknown action type: ${act.action_type}`);
              actionSuccess = true; // mark unknown as executed to avoid loop
            }
          } catch (actErr) {
            console.error(`[action] Failed to execute ${act.action_type}:`, actErr.message);
          }
          // Mark action as executed or failed
          await supabase
            .from('gods_virtue_actions')
            .update({
              status: actionSuccess ? 'executed' : 'failed',
            })
            .eq('id', act.id);
        }
      }
    } catch (actQueueErr) {
      console.warn('[action] Queue poll error:', actQueueErr.message);
    }
  }

  // 4. Scheduled Auto Lock / Open Groups
  if (supabase && sock?.user) {
    try {
      const nowHHmm = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      for (const [groupJid, settings] of groupSettingsCache.entries()) {
        if (!settings.schedule_enabled || !settings.is_monitored) continue;
        const shouldLock = settings.auto_lock_time && settings.auto_lock_time === nowHHmm;
        const shouldOpen = settings.auto_open_time && settings.auto_open_time === nowHHmm;
        if (shouldLock && !settings.is_locked) {
          try {
            await sock.groupSettingUpdate(groupJid, 'announcement');
            settings.is_locked = true;
            await supabase.from('gods_virtue_groups').update({ is_locked: true }).eq('group_jid', groupJid);
            console.log(`[schedule] Auto-locked group ${groupJid} at ${nowHHmm}`);
          } catch (lockErr) {
            console.warn(`[schedule] Auto-lock failed for ${groupJid}:`, lockErr.message);
          }
        } else if (shouldOpen && settings.is_locked) {
          try {
            await sock.groupSettingUpdate(groupJid, 'not_announcement');
            settings.is_locked = false;
            await supabase.from('gods_virtue_groups').update({ is_locked: false }).eq('group_jid', groupJid);
            console.log(`[schedule] Auto-opened group ${groupJid} at ${nowHHmm}`);
          } catch (openErr) {
            console.warn(`[schedule] Auto-open failed for ${groupJid}:`, openErr.message);
          }
        }
      }
    } catch (schedErr) {
      console.warn('[schedule] Scheduler error:', schedErr.message);
    }
  }
}, 10000);


// ─── Health Check HTTP Server (For Render / Cloud Web Services) ───
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: "God's Virtue WhatsApp Worker",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[healthcheck] HTTP server listening on port ${PORT} (Render Free Tier compatible)`);
});

// Start Service
startBot().catch((err) => console.error('[main] Fatal bot startup error:', err));
