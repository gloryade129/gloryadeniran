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

// Prevent unhandled Baileys / WebSocket promise rejections from crashing the process
process.on('unhandledRejection', (reason) => {
  console.warn('[process] Handled background promise rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('[process] Handled background exception:', err?.message || err);
});

// Clean up low-level libsignal internal session dumps from cluttering stdout
function isLibsignalNoise(arg) {
  if (typeof arg !== 'string') return false;
  return (
    arg.startsWith('Failed to decrypt message') ||
    arg.startsWith('Session error:') ||
    arg.startsWith('Closing open session') ||
    arg.startsWith('Closing session:') ||
    arg.startsWith('Opening session:') ||
    arg.startsWith('Removing old closed session:') ||
    arg.startsWith('Session already closed') ||
    arg.startsWith('Session already open') ||
    arg.startsWith('Decrypted message with closed session') ||
    arg.includes('MessageCounterError')
  );
}

const _origConsoleInfo = console.info;
console.info = (...args) => {
  if (isLibsignalNoise(args[0])) return;
  _origConsoleInfo(...args);
};

const _origConsoleWarn = console.warn;
console.warn = (...args) => {
  if (isLibsignalNoise(args[0])) return;
  _origConsoleWarn(...args);
};

const _origConsoleError = console.error;
console.error = (...args) => {
  if (isLibsignalNoise(args[0])) return;
  _origConsoleError(...args);
};

// In-memory message store for Baileys E2EE decryption retry handling
const recentMessagesCache = new Map();
function cacheMessage(id, message) {
  if (!id || !message) return;
  recentMessagesCache.set(id, message);
  if (recentMessagesCache.size > 500) {
    const firstKey = recentMessagesCache.keys().next().value;
    recentMessagesCache.delete(firstKey);
  }
}

// Tracks chats that have received the one-time daily quota exhaustion notice
// Map<jid, timestamp>
const quotaExhaustionWarnedChats = new Map();

// ─── Health Check HTTP Server (Bind Immediately for Render / Cloud Web Services) ───
const PORT = process.env.PORT || 8080;
const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: "God's Virtue WhatsApp Worker",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/diag') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const effectiveKey = cachedApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const nowUtc = new Date().toISOString();
    const nowServerHHmm = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const nowLagosHHmm = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false });

    let pendingAnnouncements = [];
    if (supabase) {
      try {
        const { data: anns } = await supabase
          .from('gods_virtue_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        pendingAnnouncements = anns || [];
      } catch (e) {
        pendingAnnouncements = [{ error: e.message }];
      }
    }

    res.end(JSON.stringify({
      status: 'ok',
      hasApiKey: Boolean(effectiveKey),
      hasSupabase: Boolean(supabase),
      is_active: botConfig?.is_active,
      uptime: Math.floor(process.uptime()),
      time: {
        utcIso: nowUtc,
        serverHHmm: nowServerHHmm,
        lagosHHmm: nowLagosHHmm,
      },
      groupsCached: Array.from(groupSettingsCache.values()).map(g => ({
        jid: g.group_jid,
        name: g.group_name,
        monitored: g.is_monitored,
        isAdmin: g.bot_is_admin,
        isLocked: g.is_locked,
        scheduleEnabled: g.schedule_enabled,
        lockTime: g.auto_lock_time,
        openTime: g.auto_open_time,
      })),
      announcements: pendingAnnouncements,
      lastAIError,
      allModelErrors,
    }, null, 2));
  } else if (req.url === '/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const effectiveKey = cachedApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    try {
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${effectiveKey}`);
      const gData = await gRes.json();
      res.end(JSON.stringify({ status: gRes.status, data: gData }, null, 2));
    } catch (e) {
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.url === '/test-ai') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      const testResult = await generateResponse({
        jid: 'diag-test@s.whatsapp.net',
        senderName: 'Glory Adeniran',
        incomingText: 'break what you do down for me in this group What could we expect @God\'s Virtue',
        isGroup: true,
        groupName: "Adeniran's family",
      });
      res.end(JSON.stringify({
        success: true,
        reply: String(testResult),
        lastAIError,
        allModelErrors,
      }, null, 2));
    } catch (e) {
      res.end(JSON.stringify({
        success: false,
        error: e.message,
        lastAIError,
        allModelErrors,
      }, null, 2));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[healthcheck] HTTP server listening on 0.0.0.0:${PORT} (Render Free Tier compatible)`);
});

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  areJidsSameUser,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import qrcode from 'qrcode-terminal';

import { useSupabaseAuthState, clearSession } from './src/supabase-auth-adapter.js';
import { initAI, generateResponse, MASTER_SYSTEM_PROMPT, cachedApiKey, lastAIError, allModelErrors } from './src/ai-engine.js';
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
  sendBotIntroduction,
  sendGroupOpeningGreeting,
  sendDailyLockSummary,
} from './src/moderation.js';
import { extractIntroducedName } from './src/name-extractor.js';
import { handleAdminCommand, handleNaturalAdminInstruction, syncAuthorizedAdminsFromDb } from './src/admin-commands.js';

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
  system_prompt: MASTER_SYSTEM_PROMPT,
  temperature: 0.70,
  min_delay_ms: 2500,
  max_delay_ms: 6500,
  wpm_typing_speed: 45,
  burst_limit_per_min: 5,
  auto_reply_dms: true,
  group_mention_only: true,
};

let groupSettingsCache = new Map();

// Tracking sets for bot sent messages and introduction cooldowns
const botSentMessageIds = new Set();
const lastIntroSentTimes = new Map();
const KNOWN_BOT_LID = '4196921245809';
const KNOWN_BOT_PHONE = '2349036441605';

// Helper to gather all possible identifiers (JIDs, LIDs, phone numbers) of the bot
function getBotIdentifiers(targetSock) {
  const ids = new Set([KNOWN_BOT_LID, KNOWN_BOT_PHONE]);
  const me = targetSock?.authState?.creds?.me || {};
  const user = targetSock?.user || {};

  if (user.id) ids.add(user.id);
  if (user.lid) ids.add(user.lid);
  if (me.id) ids.add(me.id);
  if (me.lid) ids.add(me.lid);
  if (botConfig?.phone_number) {
    ids.add(botConfig.phone_number);
    ids.add(`${botConfig.phone_number}@s.whatsapp.net`);
  }

  // Extract clean numerical / user prefixes (e.g. '2349036441605', '4196921245809')
  for (const raw of Array.from(ids)) {
    if (typeof raw !== 'string') continue;
    const cleanUser = raw.split('@')[0]?.split(':')[0];
    if (cleanUser) {
      ids.add(cleanUser);
    }
  }

  return ids;
}

// Helper to check if a given JID or participant matches any bot identifier
function isBotIdentifierMatch(targetJid, botIds) {
  if (!targetJid || typeof targetJid !== 'string') return false;
  if (botIds.has(targetJid)) return true;

  const targetClean = targetJid.split('@')[0]?.split(':')[0];
  if (targetClean && botIds.has(targetClean)) return true;

  for (const botId of botIds) {
    if (typeof botId === 'string' && areJidsSameUser(targetJid, botId)) {
      return true;
    }
  }

  return false;
}

// In-memory daily group activity tracking for evening community recaps
// Map<groupJid, { newMembers: Array<{ jid, phone, name, time }>, messages: Array<{ senderName, senderJid, text, time }> }>
const dailyGroupActivity = new Map();
function getGroupDailyActivity(groupJid) {
  if (!dailyGroupActivity.has(groupJid)) {
    dailyGroupActivity.set(groupJid, { newMembers: [], messages: [] });
  }
  return dailyGroupActivity.get(groupJid);
}

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
      // Auto-upgrade legacy default prompt if still pointing to old preachy prompt
      if (data.system_prompt && data.system_prompt.includes('genuine Christian virtues')) {
        data.system_prompt = MASTER_SYSTEM_PROMPT;
        await supabase
          .from('gods_virtue_config')
          .update({ system_prompt: MASTER_SYSTEM_PROMPT })
          .eq('id', 'primary');
        console.log('[main] Upgraded legacy prompt to modern MASTER_SYSTEM_PROMPT in Supabase.');
      }

      if (botConfig.is_active !== data.is_active) {
        console.log(`[main] Bot kill-switch updated from dashboard: ${data.is_active ? 'ACTIVE (auto-replies enabled)' : 'PAUSED (auto-replies muted)'}`);
      }

      botConfig = { ...botConfig, ...data };
    }

    const { data: grpData } = await supabase.from('gods_virtue_groups').select('*');
    if (grpData) {
      grpData.forEach((g) => groupSettingsCache.set(g.group_jid, g));
    }

    // Refresh authorized admins from cloud DB
    await syncAuthorizedAdminsFromDb(supabase);
  } catch (err) {
    console.warn('[main] Cloud sync warning:', err.message);
  }
}

// ─── Primary Bot Socket Lifecycle ───
let sock = null;
let lastGroupSyncTime = 0;
const GROUP_SYNC_COOLDOWN_MS = 300000; // 5 minutes minimum between automated scans to prevent rate-overlimit

// Sync all participating WhatsApp groups to Supabase
async function syncAllGroups(force = false) {
  if (!sock?.user || !supabase) return;

  const now = Date.now();
  if (!force && now - lastGroupSyncTime < GROUP_SYNC_COOLDOWN_MS) {
    return; // Rate limit protection
  }
  lastGroupSyncTime = now;

  try {
    // 1. Refresh cache from Supabase first so we NEVER clobber user settings!
    try {
      const { data: dbGroups } = await supabase.from('gods_virtue_groups').select('*');
      if (dbGroups) {
        dbGroups.forEach((g) => groupSettingsCache.set(g.group_jid, g));
      }
    } catch (dbSyncErr) {
      console.warn('[groups] Could not pre-fetch groups from Supabase:', dbSyncErr.message);
    }

    const groups = await sock.groupFetchAllParticipating();
    const botIds = getBotIdentifiers(sock);

    for (const [jid, metadata] of Object.entries(groups)) {
      const isAdmin = metadata.participants?.some((p) => {
        const isMe = isBotIdentifierMatch(p.id, botIds);
        return isMe && (p.admin === 'admin' || p.admin === 'superadmin');
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
        // Newly discovered group: insert with initial defaults IF NOT ALREADY in DB
        const newRecord = {
          group_jid: jid,
          group_name: metadata.subject || 'WhatsApp Group',
          member_count: metadata.participants?.length || 0,
          bot_is_admin: isAdmin,
          is_monitored: true,
          anti_link_enabled: true,
          auto_welcome_enabled: true,
          max_strikes: 3,
          schedule_enabled: false,
          auto_lock_time: '22:00',
          auto_open_time: '06:00',
          is_locked: false,
          updated_at: new Date().toISOString(),
        };

        // Use ignoreDuplicates: true to ensure existing Supabase rows are NEVER overwritten with defaults!
        await supabase.from('gods_virtue_groups').upsert(newRecord, { onConflict: 'group_jid', ignoreDuplicates: true });

        // Update read-only metadata (name, count, admin status)
        const metaUpdate = {
          group_name: metadata.subject || 'WhatsApp Group',
          member_count: metadata.participants?.length || 0,
          bot_is_admin: isAdmin,
          updated_at: new Date().toISOString(),
        };
        await supabase.from('gods_virtue_groups').update(metaUpdate).eq('group_jid', jid);

        groupSettingsCache.set(jid, { ...newRecord, ...metaUpdate });
      }
    }
    console.log(`[groups] Synced ${Object.keys(groups).length} groups to Supabase.`);
  } catch (gErr) {
    if (gErr.message?.includes('rate-overlimit')) {
      console.log('[groups] WhatsApp rate limit active, backing off automated group scans.');
      lastGroupSyncTime = now + 180000; // Back off an extra 3 minutes
    } else {
      console.warn('[groups] Sync warning:', gErr.message);
    }
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
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end(undefined);
    } catch {}
    sock = null;
  }

  await syncConfigFromCloud();

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[main] Baileys Engine v${version.join('.')}, isLatest: ${isLatest}`);

  const { state, saveCreds } = await useSupabaseAuthState(supabase, process.env.SESSION_DIR || './session_auth');

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    defaultQueryTimeoutMs: 120000,
    connectTimeoutMs: 60000,
    getMessage: async (key) => {
      if (key?.id && recentMessagesCache.has(key.id)) {
        return recentMessagesCache.get(key.id);
      }
      return undefined;
    },
  });

  // Intercept sock.sendMessage to automatically track all sent message IDs and cache for decryption retries
  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = async (...args) => {
    const result = await originalSendMessage(...args);
    try {
      if (result?.key?.id) {
        botSentMessageIds.add(result.key.id);
        if (botSentMessageIds.size > 1000) {
          const first = botSentMessageIds.values().next().value;
          botSentMessageIds.delete(first);
        }
      }
      if (result?.key?.id && result?.message) {
        cacheMessage(result.key.id, result.message);
      }
    } catch {}
    return result;
  };

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
      const isReplaced = statusCode === DisconnectReason.connectionReplaced || statusCode === 440;
      console.warn(`[main] WhatsApp connection closed (code: ${statusCode}). Logged out: ${isLoggedOut}. Replaced: ${isReplaced}`);

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

      if (isReplaced) {
        console.warn('[main] WhatsApp session was replaced by another instance (e.g. Render zero-downtime deploy). Pausing 15s to allow old process to terminate...');
        await sleep(15000);
      } else {
        await sleep(3000);
      }
      startBot();
    } else if (connection === 'open') {
      const botPhone = sock.user?.id?.split(':')[0] || 'Unknown';
      const myLid = sock.user?.lid || sock.authState?.creds?.me?.lid;
      if (myLid && sock.user) {
        sock.user.lid = myLid;
      }
      console.log('\n======================================================');
      console.log(`[LIVE] "God's Virtue" is connected to WhatsApp! Linked to +${botPhone}`);
      console.log(`[LIVE] Identifiers -> JID: ${sock.user?.id}, LID: ${myLid || 'none'}`);
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

// Helper to extract the inner message (recursively unwraps ephemeral, view-once, and caption messages)
function unwrapMessage(message) {
  if (!message) return null;
  let unwrapped = message;
  while (
    unwrapped?.ephemeralMessage?.message ||
    unwrapped?.viewOnceMessage?.message ||
    unwrapped?.viewOnceMessageV2?.message ||
    unwrapped?.documentWithCaptionMessage?.message
  ) {
    unwrapped =
      unwrapped.ephemeralMessage?.message ||
      unwrapped.viewOnceMessage?.message ||
      unwrapped.viewOnceMessageV2?.message ||
      unwrapped.documentWithCaptionMessage?.message;
  }
  return unwrapped;
}

// Helper to detect if a message quotes or mentions the bot (supports Phone JID, Device JID, and WhatsApp LID)
function isBotMentionedOrQuoted(sock, m, messageText = '') {
  if (!sock) return false;
  const botIds = getBotIdentifiers(sock);
  const msg = unwrapMessage(m?.message);

  const contextInfo =
    msg?.extendedTextMessage?.contextInfo ||
    msg?.imageMessage?.contextInfo ||
    msg?.videoMessage?.contextInfo ||
    msg?.documentMessage?.contextInfo ||
    msg?.audioMessage?.contextInfo ||
    msg?.contactMessage?.contextInfo ||
    m?.message?.extendedTextMessage?.contextInfo ||
    m?.message?.contextInfo;

  // 1. Check if user quoted a message sent by the bot (by recorded stanza ID)
  if (contextInfo?.stanzaId && botSentMessageIds.has(contextInfo.stanzaId)) {
    return true;
  }

  // 2. Check if user quoted a message sent by the bot (by participant JID/LID)
  const quotedParticipant = contextInfo?.participant || '';
  if (quotedParticipant && isBotIdentifierMatch(quotedParticipant, botIds)) {
    return true;
  }

  // 3. Check if user quoted a message whose text originated from the bot
  const quotedMsg = unwrapMessage(contextInfo?.quotedMessage);
  const quotedText =
    quotedMsg?.conversation ||
    quotedMsg?.extendedTextMessage?.text ||
    quotedMsg?.imageMessage?.caption ||
    '';
  if (
    quotedText &&
    (quotedText.includes("God's Virtue") ||
      quotedText.includes("Gods Virtue") ||
      quotedText.includes("Glory Adeniran") ||
      quotedText.includes("Community Guidelines"))
  ) {
    return true;
  }

  // 4. Check if user tagged the bot (@bot) in mentionedJid array
  const mentionedJids = contextInfo?.mentionedJid || [];
  if (mentionedJids.length > 0) {
    for (const jid of mentionedJids) {
      if (isBotIdentifierMatch(jid, botIds)) {
        return true;
      }
    }
  }

  // 5. Natural text mentions & triggers
  const text = (messageText || '').toLowerCase().trim();
  if (!text) return false;

  // Exact names and common variations
  if (
    text.includes("god's virtue") ||
    text.includes("gods virtue") ||
    text.includes("god virtue") ||
    text.includes("@god") ||
    text.includes("@virtue") ||
    text.includes("@bot")
  ) {
    return true;
  }

  // Direct address to "virtue" or "bot" with word boundary
  // Examples: "Virtue, can you help?", "virtue please explain", "hey bot", "bot: how are you?", "ask bot", "hello bot"
  const directAddressRegex = /(^|\s)(@?bot|virtue)([,:?!~]|\s|$)/i;
  if (directAddressRegex.test(messageText)) {
    return true;
  }

  // Check if raw bot phone or LID is contained in text (e.g. "@2349036441605" or "@4196921245809")
  for (const id of botIds) {
    if (typeof id === 'string' && id.length >= 7 && messageText.includes(id)) {
      return true;
    }
  }

  return false;
}

  // ─── Handle New Incoming Messages ───
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;

    for (const m of messages) {
      try {
        if (m?.key?.id && m?.message) {
          cacheMessage(m.key.id, m.message);
        }

        const jid = m.key.remoteJid;
        if (!jid) continue;

        const isGroup = jid.endsWith('@g.us');
        const senderJid = isGroup ? m.key.participant || m.participant : jid;
        const senderPhone = (senderJid || '').split('@')[0]?.split(':')[0];
        const botPhone = (sock.user?.id || '').split('@')[0]?.split(':')[0];
        const senderName = m.pushName || 'Friend';

        // Extract message text content from unwrapped message
        const innerMsg = unwrapMessage(m.message);
        const messageText =
          innerMsg?.conversation ||
          innerMsg?.extendedTextMessage?.text ||
          innerMsg?.imageMessage?.caption ||
          innerMsg?.videoMessage?.caption ||
          innerMsg?.documentMessage?.caption ||
          innerMsg?.buttonsResponseMessage?.selectedDisplayText ||
          innerMsg?.templateButtonReplyMessage?.selectedDisplayText ||
          innerMsg?.listResponseMessage?.title ||
          '';

        if (!messageText.trim()) continue;

        // ─── Direct Admin Command Handling (.prefix) in DM or Group ───
        if (messageText.trim().startsWith('.')) {
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

        // ─── Natural Language Admin Instruction Handling from Glory Adeniran ───
        const naturalHandled = await handleNaturalAdminInstruction({
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
        if (naturalHandled) continue;

        // Skip messages sent by the bot itself
        if (m.key.fromMe) continue;

        const isAddressedToBot = !isGroup || isBotMentionedOrQuoted(sock, m, messageText);
        console.log(`[message] From "${senderName}" (${senderPhone}) in ${isGroup ? 'Group' : 'DM'}: "${messageText}" | Addressed to bot: ${isAddressedToBot}`);

        // Group Privacy & Whitelist Handling
        if (isGroup) {
          let gSettings = groupSettingsCache.get(jid);
          if (!gSettings) {
            gSettings = {
              group_jid: jid,
              group_name: 'WhatsApp Group',
              is_monitored: true,
              anti_link_enabled: true,
              auto_welcome_enabled: true,
              max_strikes: 3,
            };
            groupSettingsCache.set(jid, gSettings);
          }

          if (!gSettings.is_monitored) {
            if (isAddressedToBot) {
              // Group member explicitly talked to or tagged the bot: activate monitoring!
              gSettings.is_monitored = true;
              console.log(`[groups] Auto-activated monitoring for group ${jid} because member addressed bot.`);
              if (supabase) {
                supabase.from('gods_virtue_groups').update({ is_monitored: true }).eq('group_jid', jid).then(() => {});
              }
            } else {
              // Drop background chatter between members in unmonitored groups
              continue;
            }
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

          // Buffer message for evening community summary recap
          const activity = getGroupDailyActivity(jid);
          activity.messages.push({
            senderName: senderName || 'Member',
            senderJid,
            text: messageText,
            time: new Date().toISOString(),
          });
          if (activity.messages.length > 80) {
            activity.messages.splice(0, activity.messages.length - 80);
          }
        }

        const botJid = sock.user?.id?.split(':')[0];
        const isQuotedFromBot = Boolean(
          (botJid && m.message?.extendedTextMessage?.contextInfo?.participant?.includes(botJid)) ||
          (botPhone && m.message?.extendedTextMessage?.contextInfo?.participant?.includes(botPhone))
        );

        // ─── Contact Name Auto-Detection & Storage ───
        const detectedName = extractIntroducedName(messageText, isQuotedFromBot, !isGroup);
        if (detectedName) {
          if (supabase) {
            try {
              await supabase.from('gods_virtue_contacts').upsert({
                jid: senderJid,
                name: detectedName,
                phone: senderPhone,
                is_business: false,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'jid' });
              console.log(`[contacts] Saved contact for ${senderPhone}: "${detectedName}"`);
            } catch (dbErr) {
              console.warn('[contacts] Save contact DB warning:', dbErr.message);
            }
          }

          const mentionsBot =
            (m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []).some((j) => botJid && j.includes(botJid)) ||
            messageText.toLowerCase().includes("god's virtue");
          const isExplicitIntro =
            messageText.toLowerCase().includes('my name') ||
            messageText.toLowerCase().includes("i'm") ||
            messageText.toLowerCase().includes('i am') ||
            messageText.toLowerCase().includes('call me');

          const isDmEnabled = Boolean(
            botConfig.auto_reply_dms === true ||
            botConfig.auto_reply_dms === 'true' ||
            botConfig.auto_reply_dms === 1
          );

          // Warmly acknowledge if in DM (when DM replies are enabled), or if directly quoting/addressing the bot in the group
          if ((!isGroup && isDmEnabled) || (isGroup && (isAddressedToBot || isExplicitIntro))) {
            const confirmMsg = isGroup
              ? `It is great to meet you, ${detectedName}! Your contact has been saved. Welcome to our community! 🤝`
              : `It is a pleasure to meet you, ${detectedName}! I have saved your contact. Feel free to reach out anytime! ✨`;

            await simulateHumanPresence(sock, jid, m.key, confirmMsg, botConfig);
            const sentConfirm = await sock.sendMessage(
              jid,
              { text: confirmMsg, mentions: isGroup ? [senderJid] : [] },
              { quoted: m }
            );
            if (sentConfirm?.key?.id && sentConfirm?.message) {
              cacheMessage(sentConfirm.key.id, sentConfirm.message);
            }

            if (supabase) {
              supabase.from('gods_virtue_logs').insert({
                chat_jid: jid,
                chat_name: isGroup ? (groupSettingsCache.get(jid)?.group_name || 'Group') : detectedName,
                is_group: isGroup,
                sender_jid: senderJid,
                sender_name: detectedName,
                incoming_text: messageText,
                reply_text: confirmMsg,
                latency_ms: 1500,
                simulated_typing_ms: 1200,
                status: 'contact_saved',
              }).then(() => {}).catch(() => {});
            }

            // Removed continue - let normal processing handle trigger conditions and AI generation
          }
          // Removed else if branch - let normal trigger conditions check handle DM enable/disable
          }
        }

        // 2. Trigger Conditions Check
        const isDmAllowed = Boolean(
          botConfig.auto_reply_dms === true ||
          botConfig.auto_reply_dms === 'true' ||
          botConfig.auto_reply_dms === 1
        );

        let shouldRespond = false;

        if (isGroup) {
          // In groups: Only speak if mentioned (@...), replied to, or group_mention_only is false
          if (!botConfig.group_mention_only || isAddressedToBot) {
            shouldRespond = true;
          }
        } else {
          // In DMs: Respond to all 1-on-1 private messages ONLY if enabled
          shouldRespond = isDmAllowed;
        }

        if (!shouldRespond) {
          if (!isGroup) {
            console.log(`[main] Ignored DM message from "${senderName}" (${senderPhone}) because DM auto-replies are TOGGLED OFF.`);
          }
          continue;
        }

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

        const replyResult = await generateResponse({
          jid,
          senderName,
          incomingText: messageText,
          isGroup,
          groupName,
          systemPrompt: botConfig.system_prompt,
          temperature: botConfig.temperature,
        });

        if (!replyResult) continue;

        const reply = typeof replyResult === 'string' ? replyResult : (replyResult.text || String(replyResult));
        const isAllQuotaExhausted = Boolean(replyResult?.isAllQuotaExhausted);

        // If ALL model quotas have been exhausted for today:
        if (isAllQuotaExhausted) {
          const lastWarned = quotaExhaustionWarnedChats.get(jid);
          const now = Date.now();
          // If this chat was already warned today (within last 12 hours), SILENTLY IGNORE further messages
          if (lastWarned && (now - lastWarned < 12 * 60 * 60 * 1000)) {
            console.log(`[ai-engine] Quota exhausted across all models. Chat ${jid} was already warned. Silently dropping further message from "${senderName}".`);
            continue; // Do not respond!
          }

          // First time hitting all-models limit for this chat today: record timestamp and send the one-time warning
          quotaExhaustionWarnedChats.set(jid, now);
          console.log(`[ai-engine] All model quotas exhausted. Sending one-time daily rest warning to ${jid}...`);
        } else {
          // Normal generation succeeded: clear warning state if previously set
          if (quotaExhaustionWarnedChats.has(jid)) {
            quotaExhaustionWarnedChats.delete(jid);
          }
        }

        // 5. Simulate Human Presence (Random Jitter Delay + Realistic Typing State)
        const presenceResult = await simulateHumanPresence(sock, jid, m.key, reply, botConfig);

        // 6. Send the message
        const sentReply = await sock.sendMessage(
          jid,
          {
            text: reply,
            mentions: isGroup ? [senderJid] : [],
          },
          { quoted: m }
        );
        if (sentReply?.key?.id && sentReply?.message) {
          cacheMessage(sentReply.key.id, sentReply.message);
        }

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

  // ─── Handle Group Member Join (Auto-Welcome & Daily Activity Tracking) ───
  sock.ev.on('group-participants.update', async ({ id: groupJid, participants, action }) => {
    if (action === 'add') {
      const botIds = getBotIdentifiers(sock);
      const isBotAdded = participants.some((p) => isBotIdentifierMatch(p, botIds));

      if (isBotAdded) {
        console.log(`[groups] Bot was added to group: ${groupJid}! Initializing group settings as monitored...`);
        let meta = groupSettingsCache.get(groupJid) || {};
        meta.is_monitored = true;
        groupSettingsCache.set(groupJid, meta);

        if (supabase) {
          try {
            await supabase.from('gods_virtue_groups').upsert({
              group_jid: groupJid,
              is_monitored: true,
              anti_link_enabled: true,
              auto_welcome_enabled: true,
              max_strikes: 3,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'group_jid' });
          } catch (dbErr) {
            console.warn('[groups] Upsert group on join warning:', dbErr.message);
          }
        }

        // Send warm bot introduction with cooldown deduplication
        const now = Date.now();
        if (now - (lastIntroSentTimes.get(groupJid) || 0) > 60000) {
          lastIntroSentTimes.set(groupJid, now);
          await sleep(2000);
          let groupName = 'our community';
          try {
            const grpMeta = await sock.groupMetadata(groupJid);
            groupName = grpMeta.subject || groupName;
          } catch {}
          await sendBotIntroduction(sock, groupJid, groupName, meta);
        }
        return; // Bot introduction handled, do not send user welcome message to the bot itself!
      }

      // Filter out bot identifiers so the bot never welcomes itself
      const humanParticipants = participants.filter((p) => !isBotIdentifierMatch(p, botIds));
      if (humanParticipants.length === 0) return;

      // Record new human members for the evening daily summary recap
      const activity = getGroupDailyActivity(groupJid);
      for (const p of humanParticipants) {
        if (p) {
          activity.newMembers.push({
            jid: p,
            phone: p.split('@')[0]?.split(':')[0],
            time: new Date().toISOString(),
          });
        }
      }

      const groupSettings = groupSettingsCache.get(groupJid) || {
        auto_welcome_enabled: true,
      };

      let groupName = 'our community';
      try {
        const meta = await sock.groupMetadata(groupJid);
        groupName = meta.subject || groupName;
      } catch {}

      console.log(`[moderation] Welcoming ${humanParticipants.length} new member(s) in "${groupName}"`);
      await sendWelcomeGreeting({
        sock,
        groupJid,
        participantJids: humanParticipants,
        groupName,
        groupSettings,
      });
    }
  });

  // ─── Listen to Group Updates (Joining new groups) ───
  sock.ev.on('groups.upsert', async (newGroups) => {
    if (newGroups && newGroups.length > 0) {
      console.log(`[groups] Joined ${newGroups.length} new group(s), syncing...`);
      for (const grp of newGroups) {
        if (grp.id) {
          const cached = groupSettingsCache.get(grp.id) || {};
          cached.is_monitored = true;
          cached.group_name = grp.subject || cached.group_name || 'WhatsApp Group';
          groupSettingsCache.set(grp.id, cached);
          if (supabase) {
            try {
              await supabase.from('gods_virtue_groups').upsert({
                group_jid: grp.id,
                group_name: grp.subject || 'WhatsApp Group',
                is_monitored: true,
                anti_link_enabled: true,
                auto_welcome_enabled: true,
                max_strikes: 3,
                schedule_enabled: false,
                auto_lock_time: '22:00',
                auto_open_time: '06:00',
                is_locked: false,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'group_jid' });
            } catch (upsertErr) {
              console.warn('[groups] Groups upsert error:', upsertErr.message);
            }
          }
        }
      }
      await syncAllGroups(true);
      for (const grp of newGroups) {
        if (grp.id) {
          const now = Date.now();
          if (now - (lastIntroSentTimes.get(grp.id) || 0) > 60000) {
            lastIntroSentTimes.set(grp.id, now);
            await sleep(2500);
            const meta = groupSettingsCache.get(grp.id) || {};
            await sendBotIntroduction(sock, grp.id, grp.subject, meta);
          }
        }
      }
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

// ─── Fast Action Queue Polling (Runs every 3 seconds for immediate UI response) ───
let isProcessingActions = false;
async function processPendingActions() {
  if (isProcessingActions || !supabase || !sock?.user) return;
  isProcessingActions = true;
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
            console.log(`[action] Executing WhatsApp group lock for: ${act.target_jid}...`);
            await sock.groupSettingUpdate(act.target_jid, 'announcement');
            let meta = groupSettingsCache.get(act.target_jid) || {};
            meta.is_locked = true;
            groupSettingsCache.set(act.target_jid, meta);
            await supabase
              .from('gods_virtue_groups')
              .update({ is_locked: true, updated_at: new Date().toISOString() })
              .eq('group_jid', act.target_jid);
            console.log(`[action] Group locked successfully on WhatsApp: ${act.target_jid}`);

            // Dispatch evening daily summary recap
            const activity = getGroupDailyActivity(act.target_jid);
            await sleep(1500);
            await sendDailyLockSummary({
              sock,
              groupJid: act.target_jid,
              groupName: meta.group_name || 'our community',
              groupSettings: meta,
              newMembers: activity.newMembers,
              messages: activity.messages,
              botConfig,
              supabase,
            });
            activity.newMembers = [];
            activity.messages = [];
            actionSuccess = true;
          } else if (act.action_type === 'open_group' && act.target_jid) {
            console.log(`[action] Executing WhatsApp group open for: ${act.target_jid}...`);
            const meta = groupSettingsCache.get(act.target_jid) || {};

            // Send cheerful morning wake-up greeting FIRST
            await sendGroupOpeningGreeting(sock, act.target_jid, meta.group_name || 'our community');
            await sleep(2000);

            // Now officially unlock the group
            await sock.groupSettingUpdate(act.target_jid, 'not_announcement');
            meta.is_locked = false;
            groupSettingsCache.set(act.target_jid, meta);
            await supabase
              .from('gods_virtue_groups')
              .update({ is_locked: false, updated_at: new Date().toISOString() })
              .eq('group_jid', act.target_jid);
            console.log(`[action] Group opened successfully on WhatsApp: ${act.target_jid}`);
            actionSuccess = true;
          } else if (act.action_type === 'introduce_bot') {
            if (act.target_jid && act.target_jid !== 'all') {
              console.log(`[action] Sending bot introduction to: ${act.target_jid}`);
              let meta = groupSettingsCache.get(act.target_jid) || {};
              // Ensure we fetch the latest settings saved from dashboard
              if (supabase) {
                try {
                  const { data: dbGroup } = await supabase
                    .from('gods_virtue_groups')
                    .select('*')
                    .eq('group_jid', act.target_jid)
                    .maybeSingle();
                  if (dbGroup) {
                    meta = { ...meta, ...dbGroup, is_monitored: true };
                  }
                  await supabase.from('gods_virtue_groups').update({ is_monitored: true }).eq('group_jid', act.target_jid);
                } catch (dbErr) {
                  console.warn('[action] Group fetch warning:', dbErr.message);
                }
              }
              meta.is_monitored = true;
              groupSettingsCache.set(act.target_jid, meta);
              await sendBotIntroduction(sock, act.target_jid, meta?.group_name, meta);
            } else {
              console.log('[action] Sending bot introduction to all monitored groups...');
              if (supabase) {
                try {
                  const { data: allDbGroups } = await supabase.from('gods_virtue_groups').select('*');
                  if (allDbGroups) {
                    allDbGroups.forEach((g) => groupSettingsCache.set(g.group_jid, g));
                  }
                } catch (allErr) {
                  console.warn('[action] All groups fetch warning:', allErr.message);
                }
              }
              for (const [gJid, meta] of groupSettingsCache.entries()) {
                if (!meta.is_monitored) continue;
                await sendBotIntroduction(sock, gJid, meta.group_name, meta);
                await sleep(2000);
              }
            }
            actionSuccess = true;
          } else if (act.action_type === 'sync_all') {
            await syncAllGroups(true);
            actionSuccess = true;
          } else if (act.action_type === 'sync_contacts') {
            actionSuccess = true;
          } else {
            console.warn(`[action] Unknown action type: ${act.action_type}`);
            actionSuccess = true;
          }
        } catch (actErr) {
          console.error(`[action] Failed to execute ${act.action_type}:`, actErr.message);
        }
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
  } finally {
    isProcessingActions = false;
  }
}
setInterval(processPendingActions, 3000);

// ─── Fast Cloud Config & Whitelist Sync (Syncs dashboard changes in 5s) ───
setInterval(async () => {
  await syncConfigFromCloud();
}, 5000);

// ─── Background Tasks: Broadcasts, Schedules & Heartbeat (30s) ───
setInterval(async () => {
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
          console.log(`[broadcast] Dispatching announcement: "${ann.title}" (mention_all: ${ann.mention_all})`);
          
          let targetJids = [];
          if (ann.target_group_jid) {
            targetJids = [ann.target_group_jid];
          } else {
            // Dispatches to all MONITORED groups (or all cached groups if none explicitly flagged)
            targetJids = Array.from(groupSettingsCache.entries())
              .filter(([_, g]) => g.is_monitored)
              .map(([jid]) => jid);

            if (targetJids.length === 0) {
              targetJids = Array.from(groupSettingsCache.keys());
            }
          }

          for (const targetJid of targetJids) {
            try {
              let mentions = [];
              let headerPrefix = '';

              if (ann.mention_all && targetJid.endsWith('@g.us')) {
                headerPrefix = '[📢 ANNOUNCEMENT • @everyone]\n\n';
                try {
                  const grpMeta = await sock.groupMetadata(targetJid);
                  mentions = (grpMeta.participants || []).map(p => p.id).filter(Boolean);
                } catch (metaErr) {
                  console.warn(`[broadcast] Could not fetch participants for ${targetJid}:`, metaErr.message);
                }
              }

              const formattedText = headerPrefix
                ? `${headerPrefix}*${ann.title.toUpperCase()}*\n\n${ann.announcement_text}`
                : `${ann.title.toUpperCase()}\n\n${ann.announcement_text}`;

              await sock.sendMessage(targetJid, {
                text: formattedText,
                mentions: mentions.length > 0 ? mentions : undefined,
              });
              console.log(`[broadcast] Successfully sent "${ann.title}" to ${targetJid}`);
              await sleep(2000);
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

  // 3. Scheduled Auto Lock / Open Groups (Timezone Aware: Lagos / WAT / UTC / Local)
  if (supabase && sock?.user) {
    try {
      const serverHHmm = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const lagosHHmm = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false });
      const activeTimes = new Set([serverHHmm, lagosHHmm]);

      for (const [groupJid, settings] of groupSettingsCache.entries()) {
        if (!settings.schedule_enabled || !settings.is_monitored) continue;
        const shouldLock = settings.auto_lock_time && activeTimes.has(settings.auto_lock_time);
        const shouldOpen = settings.auto_open_time && activeTimes.has(settings.auto_open_time);
        if (shouldLock && !settings.is_locked) {
          try {
            await sock.groupSettingUpdate(groupJid, 'announcement');
            settings.is_locked = true;
            await supabase.from('gods_virtue_groups').update({ is_locked: true }).eq('group_jid', groupJid);
            console.log(`[schedule] Auto-locked group ${groupJid} at matching time (Lagos: ${lagosHHmm}, Server: ${serverHHmm})`);

            // Dispatch evening daily summary recap
            const activity = getGroupDailyActivity(groupJid);
            await sleep(1500);
            await sendDailyLockSummary({
              sock,
              groupJid,
              groupName: settings.group_name || 'our community',
              groupSettings: settings,
              newMembers: activity.newMembers,
              messages: activity.messages,
              botConfig,
              supabase,
            });
            activity.newMembers = [];
            activity.messages = [];
          } catch (lockErr) {
            console.warn(`[schedule] Auto-lock failed for ${groupJid}:`, lockErr.message);
          }
        } else if (shouldOpen && settings.is_locked) {
          try {
            // Send cheerful morning wake-up greeting FIRST
            await sendGroupOpeningGreeting(sock, groupJid, settings.group_name || 'our community');
            await sleep(2000);

            // Now officially unlock the group
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


// Start Service
startBot().catch((err) => console.error('[main] Fatal bot startup error:', err));
