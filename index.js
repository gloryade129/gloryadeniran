/**
 * index.js
 * Persistent WhatsApp Bot Engine for "God's Virtue"
 * 
 * Orchestrates multi-device Baileys WebSockets, Google Gemini AI,
 * anti-ban human presence simulation, group moderation, and Supabase sync.
 */

// MUST stay the first import: dotenv/config loads .env during the import phase, before
// modules that read process.env at module scope (see src/admin-commands.js) are evaluated.
// A plain `dotenv.config()` statement runs afterwards, so those reads saw only real
// process-level env vars and silently ignored everything written in .env.
import 'dotenv/config';

import http from 'http';

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

// ─── Diagnostic endpoint auth ───
// /diag, /models and /test-ai expose account details and can burn paid/quota
// calls, so they must never be world-readable. Set ADMIN_DIAG_TOKEN on Render
// and call them with `x-diag-token: <token>` (or ?token=<token>).
const DIAG_TOKEN = process.env.ADMIN_DIAG_TOKEN || process.env.WORKER_DIAG_TOKEN || '';

function isDiagAuthorized(req) {
  if (!DIAG_TOKEN) return process.env.NODE_ENV !== 'production';
  try {
    const url = new URL(req.url, 'http://localhost');
    const provided = req.headers['x-diag-token'] || url.searchParams.get('token') || '';
    return provided === DIAG_TOKEN;
  } catch {
    return false;
  }
}

function rejectDiag(res) {
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Unauthorized. Set ADMIN_DIAG_TOKEN on the worker and send it as the x-diag-token header (or ?token=).',
  }));
}

// ─── Health Check HTTP Server (Bind Immediately for Render / Cloud Web Services) ───
const PORT = process.env.PORT || 8080;
const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const pathname = requestUrl.pathname;
  if (pathname === '/' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: "God's Virtue WhatsApp Worker",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else if (pathname === '/diag') {
    if (!isDiagAuthorized(req)) return rejectDiag(res);
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
      providers: getAIProviderHealth(),
      announcements: pendingAnnouncements,
      lastAIError,
      allModelErrors,
      memory: getMemoryStats(),
      learnedRules: listLearnedRules(),
      timetables: getTimetableStats(),
      knowledge: getKnowledgeStats(),
      engagement: getEngagementStats(),
      moderationPlus: getModerationStats(),
      mediaTools: getMediaToolStatus(),
    }, null, 2));
  } else if (pathname === '/models') {
    if (!isDiagAuthorized(req)) return rejectDiag(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const effectiveKey = cachedApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    try {
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${effectiveKey}`);
      const gData = await gRes.json();
      res.end(JSON.stringify({ status: gRes.status, data: gData }, null, 2));
    } catch (e) {
      res.end(JSON.stringify({ error: e.message }));
    }
  } else if (pathname === '/test-ai') {
    if (!isDiagAuthorized(req)) return rejectDiag(res);
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
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import qrcode from 'qrcode-terminal';

import { useSupabaseAuthState, clearSession } from './src/supabase-auth-adapter.js';
import { initAI, generateResponse, getConversationExchanges, MASTER_SYSTEM_PROMPT, buildOwnerProfileContext, cachedApiKey, lastAIError, allModelErrors, getAIProviderHealth } from './src/ai-engine.js';
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
import { handleAdminCommand, handleNaturalAdminInstruction, syncAuthorizedAdminsFromDb, isAuthorizedAdmin } from './src/admin-commands.js';
import {
  trackGroupActivity,
  checkSilenceEngagement,
  forgetEngagementMember,
  forgetEngagementGroup,
  getEngagementSnapshot,
} from './src/engagement.js';
import {
  bindRosterClient,
  loadMemberRoster,
  reconcileGroupParticipants,
  rememberMember,
  forgetMember,
  forgetGroup as forgetRosterGroup,
} from './src/member-roster.js';
import {
  bindMemoryClient,
  loadMemories,
  recallFor,
  buildMemoryContext,
  noteExchangeForExtraction,
  runMemoryExtraction,
  getMemoryStats,
} from './src/memory.js';
import {
  bindSelfImproverClient,
  loadLearnedRules,
  buildLearnedRulesContext,
  runDailyReflection,
  listLearnedRules,
  clearLearnedRules,
} from './src/self-improver.js';
import { lagosDateLine, lagosHHmm } from './src/time-utils.js';
import {
  bindTimetableClient,
  loadTimetables,
  hasActiveTimetable,
  getReminderTimes,
  buildNightReminder,
  buildMorningReminder,
  buildTimetableContext,
  processPendingTimetables,
  getTimetableStats,
} from './src/timetable.js';
import { buildGroupUpsert, buildDiscoveryUpsert } from './src/group-sync.js';
import { decideScheduleAction, scheduleSlotKey } from './src/schedule.js';
import { buildLanguageInstruction } from './src/language.js';
import { buildVoiceProfileContext, voiceProfileSummary, loadVoiceProfile } from './src/voice-profile.js';
import { enforceVoice, isGenericResponse } from './src/response-check.js';
import { decideReply, recordBotMessage, getReplyPolicyStats } from './src/selective-reply.js';
import { pickSticker, getStickerStats } from './src/sticker-replies.js';
import { planStatusPost } from './src/meme-themes.js';
import {
  bindKnowledgeClient,
  loadKnowledge,
  buildKnowledgeContext,
  getKnowledgeStats,
} from './src/knowledge.js';
import {
  analyzeMessage,
  processSmartModeration,
  recordGroupJoin,
  getModerationStats,
} from './src/moderation-plus.js';
import {
  bindEngagementClient,
  processDueReminders,
  getEngagementStats,
} from './src/engagement-plus.js';
import { makeVoiceNote, getMediaToolStatus } from './src/media-tools.js';

// ─── Initialize Supabase Client ───
const supabaseUrl = process.env.NEXT_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// RLS on every gods_virtue_* table is service-role-only. Do not silently fall
// back to the public anon key: it would fail anyway and hides a misconfiguration.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[main] Connected to Supabase cloud database.');
} else if (supabaseUrl && !supabaseKey) {
  console.warn('[main] SUPABASE_SERVICE_ROLE_KEY is missing. Supabase is disabled because the database now requires service-role access.');
} else {
  console.warn('[main] Supabase credentials not found in env. Running in local standalone mode.');
}

// ─── Initialize Gemini AI ───
initAI(process.env.GEMINI_API_KEY);

// ─── Trained voice profile (from tools/wa_export) ───
{
  const voice = voiceProfileSummary();
  if (voice) {
    console.log(
      `[voice] Trained voice active — ${voice.my_turns} own messages, median ${voice.median_length} chars, ` +
        `emoji rate ${voice.emoji_rate} (built ${voice.generated_at}).`
    );
  } else {
    console.log('[voice] No trained voice profile found. Run tools/wa_export/parse_whatsapp.py + style_profile.py to create one.');
  }

  const policy = getReplyPolicyStats();
  console.log(
    policy.trained
      ? `[reply-policy] Trained — owner participates in ${(policy.participation * 100).toFixed(0)}% of his chats, ` +
          `voluntary-reply threshold ${policy.threshold}.`
      : `[reply-policy] No engagement profile yet — using default threshold ${policy.threshold}.`
  );

  const stickers = getStickerStats();
  console.log(
    stickers.total > 0
      ? `[sticker] ${stickers.total} sticker(s) in ${stickers.dir} (${Object.keys(stickers.tags).join(', ')}).`
      : `[sticker] No stickers found in ${stickers.dir} — text-only replies.`
  );
}

// ─── Durable brain services: member roster, long-term memory, learned rules ───
bindRosterClient(supabase);
bindMemoryClient(supabase);
bindSelfImproverClient(supabase);
bindTimetableClient(supabase);
bindKnowledgeClient(supabase);
bindEngagementClient(supabase);
loadMemberRoster().catch((e) => console.warn('[roster] Boot load warning:', e?.message || e));
loadMemories().catch((e) => console.warn('[memory] Boot load warning:', e?.message || e));
loadLearnedRules().catch((e) => console.warn('[self-improver] Boot load warning:', e?.message || e));
loadTimetables().catch((e) => console.warn('[timetable] Boot load warning:', e?.message || e));
loadKnowledge().catch((e) => console.warn('[knowledge] Boot load warning:', e?.message || e));

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

// Tracking sets for bot sent messages, introductions, and name confirmations
const botSentMessageIds = new Set();
const lastIntroSentTimes = new Map();
const confirmedNameUsers = new Map(); // Map<senderJid, timestamp>
const pendingGroupWelcomes = new Map(); // Map<groupJid, Set<participantJid>>
const welcomedUserJids = new Set(); // Set of user JIDs who have been welcomed
const WELCOME_BATCH_INTERVAL_MS = 5 * 60 * 1000; // welcome waves every ~5 minutes
let lastWelcomeBatchTime = Date.now() - WELCOME_BATCH_INTERVAL_MS; // allow a first pass shortly after boot
let lastDailyVcfKey = '';

/** Queues members for the next welcome wave (deduped). */
function queueWelcome(groupJid, participantJids) {
  if (!participantJids || participantJids.length === 0) return;
  if (!pendingGroupWelcomes.has(groupJid)) {
    pendingGroupWelcomes.set(groupJid, new Set());
  }
  const groupPending = pendingGroupWelcomes.get(groupJid);
  for (const p of participantJids) {
    if (p) groupPending.add(p);
  }
}

/** Records a join for the evening recap without duplicates. */
function recordNewMember(groupJid, jid, phone) {
  if (!jid) return;
  const activity = getGroupDailyActivity(groupJid);
  if (activity.newMembers.some((m) => m.jid === jid)) return;
  activity.newMembers.push({
    jid,
    phone: phone || jid.split('@')[0]?.split(':')[0],
    time: new Date().toISOString(),
  });
}

// Process batched welcome greetings across all monitored groups (every ~5 minutes)
async function processPendingWelcomes() {
  if (!sock?.user) return;
  for (const [groupJid, pendingSet] of pendingGroupWelcomes.entries()) {
    if (!pendingSet || pendingSet.size === 0) continue;
    const gSettings = groupSettingsCache.get(groupJid) || {};
    if (!gSettings.is_monitored) continue;
    // Explicit opt-out only — a missing flag counts as enabled
    if (gSettings.auto_welcome_enabled === false || gSettings.auto_welcome_enabled === 'false' || gSettings.auto_welcome_enabled === 0) continue;

    // If group is locked, HOLD welcomes until group unlocks in the morning!
    if (gSettings.is_locked) {
      console.log(`[welcome] Holding ${pendingSet.size} welcome(s) for locked group ${groupJid} until morning unlock.`);
      continue;
    }

    const participantsToWelcome = Array.from(pendingSet);
    pendingSet.clear();

    let groupName = gSettings.group_name || 'our community';
    try {
      const meta = await sock.groupMetadata(groupJid).catch(() => null);
      if (meta?.subject) groupName = meta.subject;
    } catch {}

    console.log(`[welcome] Dispatching batch welcome to ${participantsToWelcome.length} member(s) in "${groupName}"`);
    await sendWelcomeGreeting({
      sock,
      groupJid,
      participantJids: participantsToWelcome,
      groupName,
      groupSettings: gSettings,
    });

    const duty = getGroupDutyLog(groupJid);
    duty.welcomes += participantsToWelcome.length;

    participantsToWelcome.forEach(jid => welcomedUserJids.add(jid));
  }
}

// Fired-slot guards for the daily auto lock / open scheduler.
// These MUST live outside groupSettingsCache: syncConfigFromCloud() rebuilds every
// group object from Supabase every 5 seconds, which silently wiped any in-memory
// guard stored on those objects (allowing duplicate evening recaps / morning greetings).
const firedScheduleSlots = new Set();
const scheduleFailCooldowns = new Map(); // slot key -> last failure timestamp
function scheduleRetryCooling(key) {
  const at = scheduleFailCooldowns.get(key);
  return Boolean(at && Date.now() - at < 5 * 60 * 1000);
}
function markScheduleSlot(key) {
  firedScheduleSlots.add(key);
  if (firedScheduleSlots.size > 5000) {
    const oldest = firedScheduleSlots.values().next().value;
    firedScheduleSlots.delete(oldest);
  }
}
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

// Record of the bot's own automated duties, so its AI self can naturally relate
// to the work it performs ("I'll post the recap when this group locks at 10").
// Map<groupJid, { day: 'YYYY-MM-DD', welcomes: n, recaps: n, lastRecapAt: iso, nudges: n }>
const botDutyLog = new Map();
function getGroupDutyLog(groupJid) {
  const today = lagosDateLine();
  let entry = botDutyLog.get(groupJid);
  if (!entry || entry.day !== today) {
    entry = { day: today, welcomes: 0, recaps: 0, lastRecapAt: null, nudges: 0 };
    botDutyLog.set(groupJid, entry);
  }
  return entry;
}

/**
 * Builds the live "situation sheet" injected into every AI reply for a group:
 * the real date/time, this group's schedule, and the bot's own recent duties.
 */
function buildBotDutySheet(groupJid) {
  const gSettings = groupSettingsCache.get(groupJid) || {};
  const duty = getGroupDutyLog(groupJid);
  const snapshot = getEngagementSnapshot(groupJid);

  const lines = [
    `RIGHT NOW: It is ${lagosHHmm()} on ${lagosDateLine()} (Africa/Lagos).`,
  ];

  if (gSettings.schedule_enabled) {
    lines.push(
      `THIS GROUP'S SCHEDULE: it auto-locks for the night at ${gSettings.auto_lock_time || '22:00'} and reopens at ${gSettings.auto_open_time || '06:00'}. Right now the group is ${gSettings.is_locked ? 'LOCKED (only admins can post)' : 'OPEN'}.`
    );
  } else if (gSettings.is_locked) {
    lines.push(`THIS GROUP IS CURRENTLY LOCKED (only admins can post).`);
  }

  // Lecture timetable (only present for the class group it was uploaded for)
  const timetableContext = buildTimetableContext(groupJid);
  if (timetableContext) lines.push(timetableContext);

  const dutyBits = [];
  if (duty.welcomes > 0) dutyBits.push(`welcomed ${duty.welcomes} new member(s) today`);
  if (duty.recaps > 0) dutyBits.push(`posted today's recap${duty.lastRecapAt ? ` at ${duty.lastRecapAt}` : ''}`);
  if (duty.nudges > 0) dutyBits.push(`started ${duty.nudges} conversation(s) when the group went quiet`);
  if (dutyBits.length > 0) {
    lines.push(`YOUR WORK TODAY HERE: you ${dutyBits.join(', ')}.`);
  } else {
    lines.push(`YOUR WORK HERE: you handle welcomes, the nightly recap, anti-link protection, and questions when tagged.`);
  }

  if (snapshot?.lastMessageAt) {
    lines.push(`GROUP ACTIVITY: last member message was at ${snapshot.lastMessageAt.slice(11, 16)}.`);
  }

  return lines.join('\n');
}

/**
 * Normalises a group row read from Supabase. A partial row (or one written before
 * a column existed) must never silently switch moderation/scheduling off: NULL is
 * treated as the secure default, while an explicit `false` is respected.
 */
function normalizeGroupSettings(row) {
  if (!row) return row;
  const bool = (value, fallback) => (value === undefined || value === null ? fallback : value);
  return {
    ...row,
    is_monitored: bool(row.is_monitored, true),
    anti_link_enabled: bool(row.anti_link_enabled, true),
    auto_welcome_enabled: bool(row.auto_welcome_enabled, true),
    schedule_enabled: bool(row.schedule_enabled, false),
    is_locked: bool(row.is_locked, false),
    bot_is_admin: bool(row.bot_is_admin, false),
    max_strikes: Number(row.max_strikes) > 0 ? Number(row.max_strikes) : 3,
    auto_lock_time: row.auto_lock_time || '22:00',
    auto_open_time: row.auto_open_time || '06:00',
  };
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
      // Auto-upgrade legacy persona prompts so tone/emoji rules stay current.
      // Any [Admin Directive] lines the owner taught via .instruct are preserved.
      const LEGACY_PROMPT_MARKERS = ['genuine Christian virtues', 'subtle mature emojis'];
      if (data.system_prompt && LEGACY_PROMPT_MARKERS.some((marker) => data.system_prompt.includes(marker))) {
        const directives = data.system_prompt
          .split('\n')
          .filter((line) => line.includes('[Admin Directive]:'));
        data.system_prompt = MASTER_SYSTEM_PROMPT + (directives.length > 0 ? `\n${directives.join('\n')}` : '');
        await supabase
          .from('gods_virtue_config')
          .update({ system_prompt: data.system_prompt })
          .eq('id', 'primary');
        console.log(`[main] Upgraded legacy persona prompt to modern MASTER_SYSTEM_PROMPT (${directives.length} admin directive(s) preserved).`);
      }

      // Narrow identity migration: the bot no longer runs on Gemini alone, so a
      // prompt that still claims a single provider is corrected without touching
      // the owner's tone/instructions.
      if (data.system_prompt && /powered by Google'?s? (cutting-edge )?Gemini/i.test(data.system_prompt)) {
        data.system_prompt = data.system_prompt.replace(
          /You are powered by Google'?s?[^.]*\./i,
          "You are powered by a resilient multi-model AI stack (Google Gemini, Groq, and Cloudflare Workers AI) that fails over automatically when a provider is busy."
        );
        await supabase
          .from('gods_virtue_config')
          .update({ system_prompt: data.system_prompt })
          .eq('id', 'primary');
        console.log('[main] Updated persona identity line to reflect the multi-model AI stack.');
      }

      if (botConfig.is_active !== data.is_active) {
        console.log(`[main] Bot kill-switch updated from dashboard: ${data.is_active ? 'ACTIVE (auto-replies enabled)' : 'PAUSED (auto-replies muted)'}`);
      }

      botConfig = { ...botConfig, ...data };
    }

    const { data: grpData } = await supabase.from('gods_virtue_groups').select('*');
    if (grpData) {
      grpData.forEach((g) => groupSettingsCache.set(g.group_jid, normalizeGroupSettings(g)));
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
const groupMissCounts = new Map(); // group_jid -> consecutive scans the bot was absent
const GROUP_SYNC_COOLDOWN_MS = 300000; // 5 minutes minimum between automated scans to prevent rate-overlimit

// Persist ONE group row without ever clobbering settings that already exist.
//   • existing row  → merge only the WhatsApp-owned metadata we send.
//   • brand-new row → insert-if-absent (ignoreDuplicates) then apply metadata, so
//     a row we simply haven't cached yet is never overwritten with defaults.
async function persistGroupRow({ jid, upsert, isNew }) {
  if (!supabase) return;
  const ownedUpdate = {
    group_name: upsert.group_name,
    member_count: upsert.member_count,
    bot_is_admin: upsert.bot_is_admin,
    updated_at: upsert.updated_at,
  };
  // `is_locked` mirrors WhatsApp's real announce state when metadata exposes it.
  if (typeof upsert.is_locked === 'boolean') ownedUpdate.is_locked = upsert.is_locked;

  if (isNew) {
    await supabase
      .from('gods_virtue_groups')
      .upsert(upsert, { onConflict: 'group_jid', ignoreDuplicates: true });
    await supabase
      .from('gods_virtue_groups')
      .update(ownedUpdate)
      .eq('group_jid', jid);
  } else {
    await supabase.from('gods_virtue_groups').upsert(upsert, { onConflict: 'group_jid' });
  }
}

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
        dbGroups.forEach((g) => groupSettingsCache.set(g.group_jid, normalizeGroupSettings(g)));
      }
    } catch (dbSyncErr) {
      console.warn('[groups] Could not pre-fetch groups from Supabase:', dbSyncErr.message);
    }

    const groups = await sock.groupFetchAllParticipating();
    const botIds = getBotIdentifiers(sock);
    const participatingJids = new Set(Object.keys(groups));

    // 1. Remove groups from the database ONLY when the bot has genuinely left
    //    them. `groupFetchAllParticipating()` occasionally returns a partial list
    //    after a reconnect, so a single missing entry is not proof: a row must be
    //    missing from THREE consecutive scans (~15 min) before it is deleted.
    //    This is what silently removed a still-active group (and its lock/open
    //    schedule) in the past.
    if (supabase && participatingJids.size > 0) {
      try {
        const { data: dbAllGroups } = await supabase.from('gods_virtue_groups').select('group_jid, bot_is_admin');
        if (dbAllGroups && dbAllGroups.length > 0) {
          const jidsToDelete = [];
          for (const dbG of dbAllGroups) {
            if (participatingJids.has(dbG.group_jid)) {
              groupMissCounts.delete(dbG.group_jid);
              continue;
            }
            const misses = (groupMissCounts.get(dbG.group_jid) || 0) + 1;
            groupMissCounts.set(dbG.group_jid, misses);
            if (misses >= 3) jidsToDelete.push(dbG.group_jid);
          }
          if (jidsToDelete.length > 0) {
            console.log(`[groups] Pruning ${jidsToDelete.length} group(s) confirmed absent from WhatsApp for 3 scans:`, jidsToDelete);
            for (const deadJid of jidsToDelete) {
              groupSettingsCache.delete(deadJid);
              groupMissCounts.delete(deadJid);
              await supabase.from('gods_virtue_groups').delete().eq('group_jid', deadJid);
            }
          }
        }
      } catch (pruneErr) {
        console.warn('[groups] Pruning removed groups error:', pruneErr.message);
      }
    }

    // 2. Sync all participating groups (admin OR member) so the dashboard always
    //    reflects every group the bot is actually in.
    for (const [jid, metadata] of Object.entries(groups)) {
      const isAdmin = metadata.participants?.some((p) => {
        const isMe = isBotIdentifierMatch(p.id, botIds);
        return isMe && (p.admin === 'admin' || p.admin === 'superadmin');
      }) || false;

      // Bot is a member but not an admin: keep the row on the dashboard (deleting
      // it would wipe the owner's settings) and just record the reduced privileges.
      if (!isAdmin) {
        const existingRow = groupSettingsCache.get(jid);
        const { upsert, cacheEntry, isNew } = buildGroupUpsert({ jid, metadata, existingRow, isAdmin: false });
        // WhatsApp is the source of truth for lock state; a stale dashboard flag
        // used to stop the morning auto-open branch from ever firing.
        if (typeof metadata?.announce === 'boolean') {
          upsert.is_locked = metadata.announce;
          cacheEntry.is_locked = metadata.announce;
        }
        groupSettingsCache.set(jid, cacheEntry);
        await persistGroupRow({ jid, upsert, isNew });
        continue;
      }

      // Reconcile membership against the durable roster: catches joins the live
      // event missed (socket reconnects) and joins made while the worker was down.
      try {
        const participantIds = (metadata.participants || []).map((p) => p.id).filter(Boolean);
        const botIdSet = botIds;
        const isBotParticipant = (p) => isBotIdentifierMatch(p, botIdSet);
        const joinedNow = reconcileGroupParticipants(jid, participantIds, isBotParticipant);
        if (joinedNow.length > 0) {
          for (const p of joinedNow) {
            if (welcomedUserJids.has(p)) continue;
            recordNewMember(jid, p);
            queueWelcome(jid, [p]);
          }
          console.log(`[roster] Queued ${joinedNow.length} reconciled new member(s) in ${jid} for welcome.`);
        }
      } catch (reconcileErr) {
        console.warn('[roster] Reconciliation warning:', reconcileErr.message);
      }

      const existing = groupSettingsCache.get(jid);
      const { upsert, cacheEntry, isNew } = buildGroupUpsert({ jid, metadata, existingRow: existing, isAdmin: true });
      if (typeof metadata?.announce === 'boolean') {
        upsert.is_locked = metadata.announce;
        cacheEntry.is_locked = metadata.announce;
      }
      groupSettingsCache.set(jid, cacheEntry);
      await persistGroupRow({ jid, upsert, isNew });
    }
    console.log(`[groups] Synced ${Object.keys(groups).length} participating group(s) to Supabase.`);
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
  await cleanStaleContacts().catch(() => {});

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

  // Helper to download media from WhatsApp (images, audio, stickers, videos, documents).
  // NOTE: `sock.downloadMediaMessage` does not exist in Baileys 6.x — it is a
  // standalone helper that needs the FULL WAMessage (not the unwrapped body).
  async function downloadMedia(msg) {
    try {
      const inner = unwrapMessage(msg?.message);
      const node =
        inner?.imageMessage ||
        inner?.audioMessage ||
        inner?.videoMessage ||
        inner?.documentMessage ||
        inner?.stickerMessage ||
        null;
      if (!node) return null;

      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage,
        }
      );
      if (!buffer) return null;

      const mimeType = node.mimetype || 'application/octet-stream';
      return { buffer: Buffer.from(buffer), mimeType, seconds: node.seconds || 0 };
    } catch (e) {
      console.warn('[media] Download failed:', e.message);
      return null;
    }
  }

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

        // Never treat status updates, broadcast lists, or channel posts as chats:
        // replying here would publish a public status/channel message instead of a DM.
        if (jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;

        const isGroup = jid.endsWith('@g.us');
        const senderJid = isGroup ? m.key.participant || m.participant : jid;
        const senderPhone = (senderJid || '').split('@')[0]?.split(':')[0];
        const botPhone = (sock.user?.id || '').split('@')[0]?.split(':')[0];
        const senderName = m.pushName || 'Friend';
        const botIds = getBotIdentifiers(sock);

        // ─── Critical loop protection: never download or answer our own messages ───
        if (m.key.fromMe) continue;
        if (m?.key?.id && botSentMessageIds.has(m.key.id)) continue;
        if (senderJid && isBotIdentifierMatch(senderJid, botIds)) continue;

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

        // Detect media attachments (pass the FULL message — Baileys needs the key)
        let media = null;
        if (innerMsg?.imageMessage) {
          media = await downloadMedia(m);
          if (media) media.type = 'image';
        } else if (innerMsg?.audioMessage || innerMsg?.pttMessage) {
          media = await downloadMedia(m);
          if (media) media.type = 'audio';
        } else if (innerMsg?.stickerMessage) {
          media = await downloadMedia(m);
          if (media) media.type = 'sticker';
        } else if (innerMsg?.videoMessage) {
          media = await downloadMedia(m);
          if (media) media.type = 'video';
        } else if (innerMsg?.documentMessage) {
          media = await downloadMedia(m);
          if (media) media.type = 'document';
        }

        // Feed the silence-breaker engine with EVERY real member message in
        // monitored groups — including images/stickers the bot won't reply to.
        if (isGroup && !m.key.fromMe && senderJid && !isBotIdentifierMatch(senderJid, botIds)) {
          trackGroupActivity(jid, senderJid, senderName, {
            hasText: Boolean(messageText.trim()),
            text: messageText,
          });
        }

        // If no text but has media, still process if addressed to bot
        const hasMedia = Boolean(media);
        if (!messageText.trim() && !hasMedia) continue;

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
            exportContactsVcf: exportAndSendVcf,
            getMeme: fetchRandomMeme,
            publishStatusMeme: postStatusMeme,
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
            // Persist immediately so the dashboard always reflects every group the
            // bot is active in — even if a join/promote event was missed offline.
            // ignoreDuplicates leaves any existing row (and its settings) untouched.
            if (supabase) {
              supabase
                .from('gods_virtue_groups')
                .upsert(buildDiscoveryUpsert({ jid, groupName: gSettings.group_name }), {
                  onConflict: 'group_jid',
                  ignoreDuplicates: true,
                })
                .then(() => {}, () => {});
            }
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
          // Smart moderation 2.0 runs first: flood / duplicate / mention spam.
          // Only confirmed non-admins are actioned, and a detection short-circuits
          // the AI reply so the bot does not reward spam with attention.
          try {
            const contextInfo =
              innerMsg?.extendedTextMessage?.contextInfo ||
              innerMsg?.imageMessage?.contextInfo ||
              innerMsg?.videoMessage?.contextInfo ||
              innerMsg?.documentMessage?.contextInfo ||
              {};
            const mentionedJids = Array.isArray(contextInfo.mentionedJid) ? contextInfo.mentionedJid : [];
            const detection = analyzeMessage({
              groupJid: jid,
              senderJid,
              text: messageText,
              mentions: mentionedJids,
            });

            if (detection.triggered) {
              const senderIsAdmin = await isGroupAdmin(sock, jid, senderJid);
              const outcome = await processSmartModeration({
                sock,
                groupJid: jid,
                senderJid,
                senderName,
                messageKey: m.key,
                rawText: messageText,
                detection,
                isAdmin: senderIsAdmin,
                groupSettings: groupSettingsCache.get(jid) || {},
                supabase,
              });
              if (outcome) {
                console.log(`[moderation-plus] ${outcome.action} for ${senderName} in ${jid} (${detection.reason}: ${detection.detail || ''})`);
                continue; // handled — do not generate an AI reply for this message
              }
            }
          } catch (smartErr) {
            console.warn('[moderation-plus] Check failed (continuing):', smartErr?.message || smartErr);
          }

          const groupSettings = groupSettingsCache.get(jid) || {
            anti_link_enabled: true,
            max_strikes: 3,
          };

          if (groupSettings.anti_link_enabled && containsDisallowedLink(messageText)) {
            const isAdmin = await isGroupAdmin(sock, jid, senderJid);
            if (isAdmin === null) {
              // Admin status could not be verified (metadata fetch failed).
              // Never punish on a guess — admins are always allowed to post links.
              console.warn(`[moderation] Link check skipped for ${senderName} in ${jid}: admin status could not be verified.`);
            } else if (!isAdmin) {
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
            // isAdmin === true -> group admins may post links; fall through to normal handling
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

        // ─── Contact Name Auto-Detection, Storage & Confirmation ───
        const detectedName = extractIntroducedName(messageText, isQuotedFromBot, !isGroup);
        if (detectedName && senderJid && !senderJid.includes('broadcast') && senderJid !== 'status') {
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

          // Confirm to the person: In group if introduced in group; in DM if introduced in DM (once per 24h)
          const now = Date.now();
          const lastConfirmed = confirmedNameUsers.get(senderJid) || 0;
          if (now - lastConfirmed > 24 * 60 * 60 * 1000) {
            confirmedNameUsers.set(senderJid, now);
            try {
              if (isGroup) {
                await sock.sendMessage(jid, {
                  text: `Good to meet you, @${senderPhone}. I've saved you as *${detectedName}* in the community directory.\n\nSave my number (+${botPhone}) so you can see our daily status updates too.`,
                  mentions: [senderJid],
                }, { quoted: m });
              } else {
                await sock.sendMessage(jid, {
                  text: `Good to meet you, *${detectedName}*. I've saved you to the directory.\n\nSave my number (+${botPhone}) so you can see my daily status updates too.`,
                }, { quoted: m });
              }
              console.log(`[contacts] Confirmed name save for "${detectedName}" (${senderPhone}) in ${isGroup ? 'Group' : 'DM'}`);
            } catch (confErr) {
              console.warn('[contacts] Confirmation error:', confErr.message);
            }
          }
        }

        // 2. Trigger Conditions Check
        const isDmAllowed = Boolean(
          botConfig.auto_reply_dms === true ||
          botConfig.auto_reply_dms === 'true' ||
          botConfig.auto_reply_dms === 1
        );

        // Authorized Master Admin (Glory) ALWAYS receives responses even if general DM replies are paused
        const isAdminSender = isAuthorizedAdmin(senderPhone, botPhone);

        let shouldRespond = false;
        let replyReason = '';

        if (isGroup) {
          // Groups: a hard mention-only switch still wins. Otherwise the
          // selective-reply engine decides whether this message is actually
          // worth a voluntary interjection — based on the message itself and on
          // how often the owner really speaks in his own chats.
          const decision = decideReply({
            chatJid: jid,
            text: messageText,
            isGroup,
            isAddressedToBot,
            mediaType: media?.type || null,
            senderJid,
            mentionOnly: Boolean(botConfig.group_mention_only),
            isAdminSender,
            isDmAllowed: isDmAllowed || isAdminSender,
            now: Date.now(),
          });
          shouldRespond = decision.respond;
          replyReason = decision.reason;
          if (!shouldRespond) {
            console.log(
              `[reply-policy] Staying quiet in "${jid}" (${decision.reason}, score ${decision.score.toFixed(2)} vs threshold ${decision.threshold.toFixed(2)}; signals: ${decision.signals.join(',') || 'none'}).`
            );
          } else if (decision.reason === 'voluntary') {
            console.log(
              `[reply-policy] Joining in voluntarily (score ${decision.score.toFixed(2)}; signals: ${decision.signals.join(',')}).`
            );
          }
        } else {
          // DMs: respond if general DM replies are enabled OR if the message is
          // from the authorized Master Admin.
          shouldRespond = isDmAllowed || isAdminSender;
          replyReason = isAdminSender ? 'owner-dm' : 'dm';
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

        const effectiveSenderName = detectedName || senderName;
        console.log(`[main] Generating Gemini AI response for ${effectiveSenderName} (${isGroup ? 'Group' : 'DM'}): "${messageText}"`);

        // 4. Generate AI Thought with Gemini
        let groupName = 'Group';
        if (isGroup && groupSettingsCache.has(jid)) {
          groupName = groupSettingsCache.get(jid).group_name;
        }

        // Dynamic context: what it remembers + rules it learned + its live duty sheet
        const recalledMemories = recallFor({ groupJid: isGroup ? jid : null, senderJid, incomingText: messageText });
        const knowledgeContext = await buildKnowledgeContext({
          groupJid: isGroup ? jid : null,
          query: messageText,
          limit: 3,
        });
        const extraContext = [
          // Permanent owner profile — injected on EVERY reply so the bot always knows
          // its creator is male and to address him as "Boss"/"Sir".
          buildOwnerProfileContext({ isOwnerSender: isAdminSender }),
          // Trained voice — measured from the owner's real WhatsApp history. Sits
          // high in the stack so it outranks the provider's default register.
          buildVoiceProfileContext(),
          // Owner-curated facts (RAG-style) and the member's language.
          knowledgeContext,
          buildLanguageInstruction(messageText),
          buildMemoryContext(recalledMemories),
          buildLearnedRulesContext(),
          isGroup ? buildBotDutySheet(jid) : `RIGHT NOW: It is ${lagosHHmm()} on ${lagosDateLine()} (Africa/Lagos).`,
        ].filter(Boolean);

        const replyResult = await generateResponse({
          jid,
          senderName: effectiveSenderName,
          incomingText: messageText,
          isGroup,
          groupName,
          systemPrompt: botConfig.system_prompt,
          temperature: botConfig.temperature,
          extraContext,
          media,
        });

        if (!replyResult) continue;

        const rawReply = typeof replyResult === 'string' ? replyResult : (replyResult.text || String(replyResult));
        const isAllQuotaExhausted = Boolean(replyResult?.isAllQuotaExhausted);

        // Trained-voice enforcement: strip provider boilerplate ("As an AI...",
        // "I hope this helps", markdown headings) and cap the length/emoji budget
        // to what the owner's real history actually looks like. Skipped for the
        // quota notice, which is a fixed operational message, not a chat reply.
        let reply = rawReply;
        if (!isAllQuotaExhausted && rawReply) {
          const { profile } = loadVoiceProfile();
          const enforced = enforceVoice(rawReply, profile);
          if (enforced.changed) {
            console.log(`[voice] Rewrote generic reply (${enforced.removed.join(', ') || 'length/emoji'}).`);
          }
          if (isGenericResponse(enforced.text)) {
            console.warn('[voice] Reply still reads as provider-default after enforcement — sending the rewritten version only.');
          }
          reply = enforced.text;
        }

        // No usable AI reply (model failed, and it is not the quota notice): stay
        // silent instead of sending a canned or empty message.
        if (!String(reply || '').trim()) {
          console.warn(`[main] No usable AI reply for ${jid} — staying silent (no canned fallback).`);
          continue;
        }

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

        // 6. Send the message (voice note in reply to a voice note, when TTS is available)
        let sentReply = null;
        const shouldVoiceReply =
          media?.type === 'audio' &&
          !isAllQuotaExhausted &&
          reply.length > 8 &&
          reply.length <= 1200;

        if (shouldVoiceReply) {
          try {
            const voice = await makeVoiceNote(reply);
            if (voice) {
              sentReply = await sock.sendMessage(
                jid,
                { audio: voice.buffer, mimetype: voice.mimetype, ptt: false },
                { quoted: m }
              );
              console.log('[main] Sent voice-note reply (Cloudflare TTS).');
            }
          } catch (voiceErr) {
            console.warn('[main] Voice reply failed, falling back to text:', voiceErr?.message || voiceErr);
          }
        }

        if (!sentReply) {
          sentReply = await sock.sendMessage(
            jid,
            {
              text: reply,
              mentions: isGroup ? [senderJid] : [],
            },
            { quoted: m }
          );
        }
        if (sentReply?.key?.id && sentReply?.message) {
          cacheMessage(sentReply.key.id, sentReply.message);
        }

        // Tell the reply-policy engine this chat has been spoken in, so the
        // cooldowns and hourly caps apply. Voluntary interjections count;
        // direct answers do not.
        recordBotMessage(jid, { voluntary: replyReason === 'voluntary' });

        // Occasionally follow the text with a sticker, the way a person does.
        // Rate comes from the trained profile; a missing sticker folder simply
        // means text only.
        if (!isAllQuotaExhausted && reply) {
          try {
            const sticker = pickSticker({ text: reply, profile: loadVoiceProfile().profile });
            if (sticker) {
              await sleep(600 + Math.floor(Math.random() * 900));
              await sock.sendMessage(
                jid,
                { sticker: sticker.buffer, mimetype: 'image/webp' },
                { quoted: m }
              );
              console.log(`[sticker] Sent "${sticker.tag}" sticker in ${jid}.`);
            }
          } catch (stickerErr) {
            console.warn('[sticker] Could not send sticker:', stickerErr?.message || stickerErr);
          }
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

        // 8. Long-term memory pass (throttled): learn durable facts from this chat
        if (noteExchangeForExtraction(jid)) {
          const exchanges = getConversationExchanges(jid, 12);
          runMemoryExtraction({
            chatJid: jid,
            senderJid,
            groupName,
            senderName: effectiveSenderName,
            exchanges,
          }).catch(() => {});
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
        console.log(`[groups] Bot was added to group: ${groupJid}! Initializing group settings...`);
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

        // NOTE: As requested, the bot NEVER automatically introduces itself when added to a group.
        // It only introduces itself when triggered from the dashboard button or via the .introduce command.
        await syncAllGroups(true);
        return;
      }

      // Filter out bot identifiers and members who have already been welcomed in the past
      const humanParticipants = participants.filter((p) => !isBotIdentifierMatch(p, botIds) && !welcomedUserJids.has(p));
      if (humanParticipants.length === 0) return;

      // Join-raid detection: many accounts joining within a short window.
      let raidDetected = false;
      let raidCount = 0;
      for (const _p of humanParticipants) {
        const joinState = recordGroupJoin(groupJid);
        raidCount = joinState.count;
        if (joinState.raid) raidDetected = true;
      }

      if (raidDetected) {
        const groupLabel = groupSettingsCache.get(groupJid)?.group_name || groupJid;
        console.warn(`[moderation-plus] Possible join raid in "${groupLabel}": ${raidCount} joins within the window.`);
        const ownerDigits = (process.env.OWNER_PHONE || process.env.ADMIN_PHONE || '')
          .split(',')[0]
          .replace(/\D/g, '');
        if (ownerDigits) {
          sock.sendMessage(`${ownerDigits}@s.whatsapp.net`, {
            text:
              `⚠️ *Possible join raid*\n\n"${groupLabel}" received ${raidCount} new members in a short window.\n` +
              `Review the group and remove fake accounts if needed.`,
          }).catch(() => {});
        }
        if (process.env.MODERATION_AUTO_LOCK_ON_RAID === 'true') {
          try {
            await sock.groupSettingUpdate(groupJid, 'announcement');
            console.log(`[moderation-plus] Auto-locked "${groupLabel}" after raid detection.`);
          } catch (lockErr) {
            console.warn('[moderation-plus] Raid auto-lock failed:', lockErr?.message || lockErr);
          }
        }
      }

      // Mark as known in the durable roster (so restarts/reconciliations never
      // double-welcome them, and the recap can still list them after a redeploy)
      for (const p of humanParticipants) {
        rememberMember(groupJid, p);
      }

      // Record new human members for the evening daily summary recap (deduped)
      for (const p of humanParticipants) {
        recordNewMember(groupJid, p);
      }

      // Queue into the ~5-minute welcome batch
      queueWelcome(groupJid, humanParticipants);
      console.log(`[moderation] Queued ${humanParticipants.length} new member(s) in "${groupJid}" for the next welcome wave.`);
    } else if (action === 'promote') {
      const botIds = getBotIdentifiers(sock);
      const isBotTargeted = participants.some((p) => isBotIdentifierMatch(p, botIds));

      if (isBotTargeted) {
        console.log(`[groups] Bot was PROMOTED to ADMIN in group ${groupJid}! Registering group to dashboard...`);
        let meta = groupSettingsCache.get(groupJid) || {};
        meta.bot_is_admin = true;
        meta.is_monitored = true;
        groupSettingsCache.set(groupJid, meta);

        if (supabase) {
          try {
            await supabase.from('gods_virtue_groups').upsert({
              group_jid: groupJid,
              bot_is_admin: true,
              is_monitored: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'group_jid' });
          } catch (dbErr) {
            console.warn('[groups] Upsert group on promote warning:', dbErr.message);
          }
        }
        await syncAllGroups(true);
      }
    } else if (action === 'remove' || action === 'demote') {
      const botIds = getBotIdentifiers(sock);
      const isBotTargeted = participants.some((p) => isBotIdentifierMatch(p, botIds));

      if (isBotTargeted) {
        if (action === 'remove') {
          console.log(`[groups] Bot was removed from group ${groupJid}. Cleaning up database & cache...`);
          groupSettingsCache.delete(groupJid);
          dailyGroupActivity.delete(groupJid);
          botDutyLog.delete(groupJid);
          forgetEngagementGroup(groupJid);
          forgetRosterGroup(groupJid);
          if (supabase) {
            await supabase.from('gods_virtue_groups').delete().eq('group_jid', groupJid);
          }
        } else if (action === 'demote') {
          console.log(`[groups] Bot was demoted from admin in group ${groupJid}. Keeping it on the dashboard as a member.`);
          const demotedMeta = groupSettingsCache.get(groupJid) || { group_jid: groupJid };
          demotedMeta.bot_is_admin = false;
          if (demotedMeta.is_monitored === undefined) demotedMeta.is_monitored = true;
          groupSettingsCache.set(groupJid, demotedMeta);
          if (supabase) {
            try {
              await supabase.from('gods_virtue_groups').upsert({
                group_jid: groupJid,
                is_monitored: demotedMeta.is_monitored,
                bot_is_admin: false,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'group_jid' });
            } catch (dbErr) {
              console.warn('[groups] Upsert group on demote warning:', dbErr.message);
            }
          }
        }
      } else if (action === 'remove') {
        // Regular members left: forget them so a future rejoin counts as new
        for (const p of participants || []) {
          if (!p) continue;
          forgetMember(groupJid, p);
          forgetEngagementMember(groupJid, p);
          welcomedUserJids.delete(p);
        }
      }
    }
  });

  // ─── Listen to Group Updates (Joining new groups) ───
  sock.ev.on('groups.upsert', async (newGroups) => {
    if (newGroups && newGroups.length > 0) {
      console.log(`[groups] Joined ${newGroups.length} new group(s), syncing...`);
      for (const grp of newGroups) {
        if (grp.id) {
          const cached = groupSettingsCache.get(grp.id) || {};
          if (cached.is_monitored === undefined) cached.is_monitored = true;
          cached.group_name = grp.subject || cached.group_name || 'WhatsApp Group';
          groupSettingsCache.set(grp.id, cached);
          if (supabase) {
            try {
              // NON-DESTRUCTIVE: inserting a brand-new row seeds defaults, but an
              // existing row keeps the owner's schedule/lock/moderation settings.
              // (This handler used to reset schedule_enabled/is_locked on every
              // reconnect, which silently killed auto lock/open for whole groups.)
              await supabase.from('gods_virtue_groups').upsert({
                group_jid: grp.id,
                group_name: grp.subject || 'WhatsApp Group',
                is_monitored: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'group_jid', ignoreDuplicates: true });

              await supabase
                .from('gods_virtue_groups')
                .update({
                  group_name: grp.subject || 'WhatsApp Group',
                  updated_at: new Date().toISOString(),
                })
                .eq('group_jid', grp.id);
            } catch (upsertErr) {
              console.warn('[groups] Groups upsert error:', upsertErr.message);
            }
          }
          // ── NEW: silently scrape this group's participants into contacts ───
          try {
            const meta = await sock.groupMetadata(grp.id).catch(() => null);
            if (meta?.participants) {
              const botIds = getBotIdentifiers(sock);
              for (const p of meta.participants) {
                if (p.isBot || isBotIdentifierMatch(p.id, botIds)) continue;
                const jid = p.id || p.jid || p.lid || '';
                const name = p.pushName || p.name || '';
                const phone = (jid.split('@')[0]?.split(':')[0] || '').replace(/\D/g, '');
                if (phone.length >= 7) {
                  await supabase.from('gods_virtue_contacts').upsert({
                    jid: jid,
                    name: name,
                    phone: phone,
                    is_business: false,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'jid' });
                }
              }
            }
          } catch (e) {
            console.warn('[scan] group contact warning:', e.message);
          }
          // ----------------------------------------------------------------
        }
      }
      await syncAllGroups(true);
    }
  });

  // ─── Sync WhatsApp Contacts to Supabase ───
  const syncContactsBatch = async (contactList) => {
    if (!supabase || !contactList || contactList.length === 0) return;
    try {
      const incoming = contactList.filter((c) => c.id && c.id.endsWith('@s.whatsapp.net'));
      if (incoming.length === 0) return;

      // Baileys contact events often omit `name`, and `notify` is only the person's
      // push-name. Writing those blindly (or as null) wiped out the curated names
      // saved earlier by the name-extraction engine, so only fill an empty slot.
      const existingNames = new Map();
      try {
        const jids = incoming.map((c) => c.id);
        for (let i = 0; i < jids.length; i += 100) {
          const chunk = jids.slice(i, i + 100);
          const { data } = await supabase.from('gods_virtue_contacts').select('jid, name').in('jid', chunk);
          (data || []).forEach((row) => existingNames.set(row.jid, row.name));
        }
      } catch (lookupErr) {
        console.warn('[contacts] Existing-name lookup warning:', lookupErr.message);
      }

      const contactRecords = incoming.map((c) => {
        const record = {
          jid: c.id,
          phone: c.id.split('@')[0],
          is_business: Boolean(c.isBusiness),
          updated_at: new Date().toISOString(),
        };
        const incomingName = c.name || c.notify || c.verifiedName || null;
        if (incomingName && !existingNames.get(c.id)) {
          record.name = incomingName;
        }
        return record;
      });

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

// ─── Shared Dispatch Announcement Helper ───
const recentBroadcasts = new Map(); // Map<dedupeKey, timestamp>

async function dispatchAnnouncement({ title, announcement_text, mention_all, target_group_jid }) {
  if (!sock || !sock.user) {
    console.warn('[broadcast] Bot socket not active; cannot dispatch.');
    return;
  }

  let targetJids = [];
  if (target_group_jid && target_group_jid !== 'all') {
    targetJids = [target_group_jid];
  } else {
    // Dispatches ONLY to monitored groups where the bot is an active admin
    targetJids = Array.from(groupSettingsCache.entries())
      .filter(([_, g]) => g.is_monitored && g.bot_is_admin)
      .map(([jid]) => jid);

    // Fallback: If no groups marked monitored yet, target all groups where bot is admin
    if (targetJids.length === 0) {
      targetJids = Array.from(groupSettingsCache.entries())
        .filter(([_, g]) => g.bot_is_admin)
        .map(([jid]) => jid);
    }
  }

  const cleanTitle = (title || 'ANNOUNCEMENT').toUpperCase();
  const cleanBody = (announcement_text || '').trim();

  for (const targetJid of targetJids) {
    try {
      // Deduplication guard: Never dispatch the identical announcement to the same group within 60 seconds
      const dedupeKey = `${targetJid}_${cleanTitle}_${cleanBody}`;
      const lastSent = recentBroadcasts.get(dedupeKey);
      const now = Date.now();
      if (lastSent && now - lastSent < 60000) {
        console.log(`[broadcast] Deduplicated: skipped identical broadcast to ${targetJid} (sent ${Math.round((now - lastSent)/1000)}s ago)`);
        continue;
      }
      recentBroadcasts.set(dedupeKey, now);
      if (recentBroadcasts.size > 500) {
        const oldest = recentBroadcasts.keys().next().value;
        recentBroadcasts.delete(oldest);
      }

      let mentions = [];
      let headerPrefix = '';

      if (mention_all && targetJid.endsWith('@g.us')) {
        headerPrefix = '[📢 ANNOUNCEMENT • @everyone]\n\n';
        try {
          const grpMeta = await sock.groupMetadata(targetJid);
          mentions = (grpMeta.participants || []).map(p => p.id).filter(Boolean);
        } catch (metaErr) {
          console.warn(`[broadcast] Could not fetch participants for ${targetJid}:`, metaErr.message);
        }
      }

      const formattedText = headerPrefix
        ? `${headerPrefix}*${cleanTitle}*\n\n${cleanBody}`
        : `*${cleanTitle}*\n\n${cleanBody}`;

      await sock.sendMessage(targetJid, {
        text: formattedText,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      console.log(`[broadcast] Dispatched "${cleanTitle}" to ${targetJid}`);
      await sleep(2000);
    } catch (bErr) {
      console.warn(`[broadcast] Failed to send to ${targetJid}:`, bErr.message);
    }
  }
}

// ─── Contact Card (.vcf) Generator & Exporter ───
function generateVCardString(contacts = []) {
  let vcf = '';
  for (const c of contacts) {
    if (!c.phone || c.phone === 'status' || c.jid?.includes('broadcast')) continue;
    const cleanPhone = c.phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 5) continue;
    const cleanName = (c.name || 'Community Member').trim();
    vcf += 'BEGIN:VCARD\r\n';
    vcf += 'VERSION:3.0\r\n';
    vcf += `FN:${cleanName}\r\n`;
    vcf += `TEL;TYPE=CELL:${cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`}\r\n`;
    vcf += `NOTE:Saved via God's Virtue Contact Intelligence\r\n`;
    vcf += 'END:VCARD\r\n';
  }
  return vcf;
}

async function exportAndSendVcf(socketInstance, overrideTargetJid = null) {
  if (!socketInstance?.user || !supabase) return false;
  try {
    const { data: contacts } = await supabase
      .from('gods_virtue_contacts')
      .select('*')
      .order('name', { ascending: true });

    if (!contacts || contacts.length === 0) {
      console.log('[vcf] No contacts found in database to export.');
      return false;
    }

    const validContacts = contacts.filter(c => c.phone && c.phone !== 'status' && !c.jid?.includes('broadcast'));
    if (validContacts.length === 0) return false;

    const vcardContent = generateVCardString(validContacts);
    const vcardBuffer = Buffer.from(vcardContent, 'utf-8');

    const botNumber = socketInstance.user.id.split(':')[0];
    const targetJid = overrideTargetJid || `${botNumber}@s.whatsapp.net`;
    const todayLagosStr = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' }).replace(/\//g, '-');

    await socketInstance.sendMessage(targetJid, {
      document: vcardBuffer,
      mimetype: 'text/vcard',
      fileName: `Gods_Virtue_Contacts_${todayLagosStr}.vcf`,
      caption: `📂 *DAILY CONTACTS EXPORT*\n\nHere is your contact card file for today (${validContacts.length} contacts).\n\n📲 *How to use*: Tap this file to import all contacts directly into your phonebook! That way, everyone can easily view God's Virtue WhatsApp status updates. ✨`,
    });
    console.log(`[vcf] Successfully sent ${validContacts.length} contacts as .vcf to ${targetJid}`);
    return true;
  } catch (err) {
    console.error('[vcf] Export error:', err.message);
    return false;
  }
}

// Clean up stale or corrupted entries from contacts table
async function cleanStaleContacts() {
  if (!supabase) return;
  try {
    await supabase.from('gods_virtue_contacts').delete().eq('jid', 'status@broadcast');
    await supabase.from('gods_virtue_contacts').delete().eq('phone', 'status');
    await supabase.from('gods_virtue_contacts').delete().ilike('name', '%balling%');
    await supabase.from('gods_virtue_contacts').delete().ilike('name', '%pissed%');
    await supabase.from('gods_virtue_contacts').delete().ilike('name', '%ohhh%');
  } catch {}
}

// ─── WhatsApp Status Distribution Engine ───
// NOTE: Baileys encodes EVERY status viewer as <digits>@s.whatsapp.net before the
// fan-out (see relayMessage in messages-send.js), so only genuine phone-number JIDs
// are safe to pass — raw @lid (privacy-ID) JIDs would be corrupted into fake phone
// numbers and break the send. Modern group metadata is largely LID-based, which is
// why contacts + configured admin phones carry most of the audience.
async function getStatusAudienceJids(socketInstance) {
  const audience = new Set();
  let fromContacts = 0;
  let fromGroups = 0;
  let skippedLids = 0;

  const addPn = (digits) => {
    if (digits && digits.length >= 7) audience.add(`${digits}@s.whatsapp.net`);
  };
  const pnDigitsOf = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

  // 1. Saved contacts — prefer the JID, but fall back to the stored phone number:
  //    rows captured from LID-based chats keep a real phone in `phone` even when
  //    `jid` is an @lid address.
  if (supabase) {
    try {
      const { data: contacts } = await supabase.from('gods_virtue_contacts').select('jid, phone');
      if (contacts) {
        contacts.forEach(c => {
          const jid = c.jid || '';
          if (jid.includes('status') || jid.includes('broadcast')) return;
          if (jid.endsWith('@s.whatsapp.net')) {
            addPn(pnDigitsOf(jid));
            fromContacts++;
          } else if (c.phone) {
            addPn(String(c.phone).replace(/\D/g, ''));
            fromContacts++;
          } else {
            skippedLids++;
          }
        });
      }
    } catch {}
  }

  // 2. All participants across monitored groups — prefer the phone-number form:
  //    Baileys exposes `jid` (phone) alongside `id`/`lid`, and lid-addressed
  //    groups only yield phone numbers through that field.
  for (const [gJid] of groupSettingsCache.entries()) {
    try {
      const meta = await socketInstance.groupMetadata(gJid).catch(() => null);
      if (meta?.participants) {
        meta.participants.forEach(p => {
          const candidates = [p.jid, p.id].filter(Boolean);
          for (const candidate of candidates) {
            if (candidate.endsWith('@s.whatsapp.net')) {
              addPn(pnDigitsOf(candidate));
              fromGroups++;
              return;
            }
            if (!candidate.includes('@')) {
              const bareDigits = candidate.replace(/\D/g, '');
              if (bareDigits.length >= 7) {
                addPn(bareDigits);
                fromGroups++;
                return;
              }
            }
          }
          skippedLids++;
        });
      }
    } catch {}
  }

  // 3. Configured admins/owner — guarantees the operator always sees posted statuses
  ['ADMIN_PHONE', 'OWNER_PHONE'].forEach((envName) => {
    (process.env[envName] || '').split(',').forEach((entry) => {
      const digits = entry.replace(/\D/g, '');
      if (digits) addPn(digits);
    });
  });

  // 4. Bot's own number
  if (socketInstance.user?.id) {
    addPn(pnDigitsOf(socketInstance.user.id));
  }

  const viewerJids = Array.from(audience);
  console.log(
    `[status] Audience: ${viewerJids.length} viewer(s) — contacts: ${fromContacts}, group members: ${fromGroups}` +
    (skippedLids > 0 ? `, skipped ${skippedLids} @lid entries (no phone number available)` : '')
  );
  return viewerJids;
}

async function postWhatsAppStatus(socketInstance, { imageBuffer, text, caption }) {
  if (!socketInstance?.user) return false;
  try {
    const audienceJids = await getStatusAudienceJids(socketInstance);
    if (audienceJids.length <= 1) {
      console.warn(
        '[status] Aborted: the viewer list only contains the bot itself, so nobody would see this status. ' +
        'Set OWNER_PHONE / ADMIN_PHONE in the worker environment, and import the exported .vcf into the ' +
        'bot\'s phonebook to give it a real audience.'
      );
      return false;
    }
    console.log(`[status] Distributing status broadcast to ${audienceJids.length} contacts/members...`);

    const options = {
      statusJidList: audienceJids.length > 0 ? audienceJids : undefined,
      broadcast: true,
    };

    if (imageBuffer) {
      await socketInstance.sendMessage('status@broadcast', {
        image: imageBuffer,
        caption: caption || '✨ Have a wonderful day!',
      }, options);
      console.log(`[status] Successfully posted image to WhatsApp Status!`);
    } else if (text) {
      await socketInstance.sendMessage('status@broadcast', {
        text: text,
        backgroundColor: '#0F172A',
        font: 1,
      }, options);
      console.log(`[status] Successfully posted text to WhatsApp Status!`);
    }
    return true;
  } catch (err) {
    console.error('[status] Post error:', err.message);
    return false;
  }
}

// ─── WhatsApp Status Meme Poster ───
// Posts Nigerian campus humour and Christian encouragement to Status. The image
// comes from a wholesome subreddit; the words — the part people actually
// forward — come from src/meme-themes.js, in the owner's own register.
async function fetchRandomMeme() {
  const plan = planStatusPost();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://meme-api.com/gimme/${plan.subreddit}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Anything NSFW or text-only is unusable as a Status image.
    if (!data?.url || data.nsfw) throw new Error('meme API returned no usable image');

    const imgRes = await fetch(data.url, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) throw new Error(`image HTTP ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    if (!buffer.length) throw new Error('empty image body');

    console.log(`[status-meme] Theme "${plan.themeLabel}" (r/${plan.subreddit}) — "${plan.caption}"`);
    return {
      title: plan.caption,
      caption: plan.caption,
      theme: plan.themeKey,
      url: data.url,
      buffer,
    };
  } catch (err) {
    console.warn('[status-meme] Failed to fetch meme image:', err.message);
    // Still worth posting: the caption alone is encouragement people appreciate.
    return {
      title: plan.caption,
      caption: plan.caption,
      theme: plan.themeKey,
      url: null,
      buffer: null,
    };
  }
}

async function postStatusMeme(socketInstance, memeObj) {
  if (!socketInstance || !socketInstance.user || !memeObj) return false;

  // Text-only Status when no image could be fetched — the caption is the point.
  if (!memeObj.buffer) {
    if (!memeObj.caption) return false;
    return await postWhatsAppStatus(socketInstance, {
      text: memeObj.caption,
      caption: memeObj.caption,
    });
  }

  return await postWhatsAppStatus(socketInstance, {
    imageBuffer: memeObj.buffer,
    caption: memeObj.caption || memeObj.title || '✨ Have a wonderful day!',
  });
}

// ─── Fast Action Queue Polling (Runs every 3 seconds for immediate UI response) ───
let isProcessingActions = false;
const processedActionIds = new Set();

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
        if (processedActionIds.has(act.id)) continue;
        processedActionIds.add(act.id);
        if (processedActionIds.size > 200) {
          const oldest = processedActionIds.values().next().value;
          processedActionIds.delete(oldest);
        }

        // Mark action as processing immediately in database
        await supabase
          .from('gods_virtue_actions')
          .update({ status: 'processing' })
          .eq('id', act.id);

        let actionSuccess = false;
        try {
          if (act.action_type === 'lock_group' && act.target_jid) {
            console.log(`[action] Executing silent WhatsApp group lock for: ${act.target_jid}...`);
            await sock.groupSettingUpdate(act.target_jid, 'announcement');
            let meta = groupSettingsCache.get(act.target_jid) || {};
            meta.is_locked = true;
            groupSettingsCache.set(act.target_jid, meta);
            await supabase
              .from('gods_virtue_groups')
              .update({ is_locked: true, updated_at: new Date().toISOString() })
              .eq('group_jid', act.target_jid);
            console.log(`[action] Group locked silently on WhatsApp: ${act.target_jid}`);
            actionSuccess = true;
          } else if (act.action_type === 'open_group' && act.target_jid) {
            console.log(`[action] Executing silent WhatsApp group open for: ${act.target_jid}...`);
            await sock.groupSettingUpdate(act.target_jid, 'not_announcement');
            let meta = groupSettingsCache.get(act.target_jid) || {};
            meta.is_locked = false;
            groupSettingsCache.set(act.target_jid, meta);
            await supabase
              .from('gods_virtue_groups')
              .update({ is_locked: false, updated_at: new Date().toISOString() })
              .eq('group_jid', act.target_jid);
            console.log(`[action] Group opened silently on WhatsApp: ${act.target_jid}`);
            actionSuccess = true;
          } else if (act.action_type === 'introduce_bot') {
            if (act.target_jid && act.target_jid !== 'all') {
              console.log(`[action] Sending bot introduction to: ${act.target_jid}`);
              let meta = groupSettingsCache.get(act.target_jid) || {};
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
          } else if (act.action_type === 'broadcast') {
            console.log(`[action] Executing instant broadcast action...`);
            const payload = act.payload || {};
            if (payload.announcement_id) {
              await supabase.from('gods_virtue_announcements').update({
                status: 'sent',
                sent_at: new Date().toISOString(),
              }).eq('id', payload.announcement_id);
            }
            await dispatchAnnouncement({
              title: payload.title || 'Announcement',
              announcement_text: payload.announcement_text || '',
              mention_all: Boolean(payload.mention_all),
              target_group_jid: act.target_jid === 'all' ? null : act.target_jid,
            });
            actionSuccess = true;
          } else if (act.action_type === 'post_meme_status' || act.action_type === 'post_status_meme') {
            console.log(`[action] Executing immediate themed status post...`);
            const meme = await fetchRandomMeme();
            if (meme && (meme.buffer || meme.caption)) {
              actionSuccess = await postStatusMeme(sock, meme);
            } else {
              console.warn('[action] Could not build a status post');
              actionSuccess = false;
            }
          } else if (act.action_type === 'post_custom_status') {
            console.log(`[action] Executing custom status post...`);
            const payload = act.payload || {};
            let imgBuf = null;
            if (payload.imageUrl) {
              try {
                const iRes = await fetch(payload.imageUrl);
                if (iRes.ok) {
                  imgBuf = Buffer.from(await iRes.arrayBuffer());
                }
              } catch (err) {
                console.warn('[action] Failed to fetch custom status image URL:', err.message);
              }
            }
            actionSuccess = await postWhatsAppStatus(sock, {
              imageBuffer: imgBuf,
              text: payload.text || null,
              caption: payload.caption || payload.text || '✨',
            });
          } else if (act.action_type === 'export_vcf') {
            console.log(`[action] Executing on-demand VCF export to WhatsApp...`);
            actionSuccess = await exportAndSendVcf(sock);
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

// ─── Background Tasks: Broadcasts, Schedules & Heartbeat (10s) ───
let isProcessingBackground = false;
const processingAnnouncementIds = new Set();

setInterval(async () => {
  if (isProcessingBackground) return;
  isProcessingBackground = true;
  try {
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

    // 1b. Deliver any due reminders (polls/RSVP follow-ups)
    if (sock?.user) {
      try {
        const delivered = await processDueReminders({ sock, limit: 10 });
        if (delivered > 0) console.log(`[engagement] Delivered ${delivered} due reminder(s).`);
      } catch (remErr) {
        console.warn('[engagement] Reminder loop warning:', remErr?.message || remErr);
      }
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
            if (processingAnnouncementIds.has(ann.id)) continue;
            processingAnnouncementIds.add(ann.id);
            if (processingAnnouncementIds.size > 200) {
              const oldest = processingAnnouncementIds.values().next().value;
              processingAnnouncementIds.delete(oldest);
            }

            // Immediately mark as sent before dispatching to eliminate double-send race condition
            await supabase.from('gods_virtue_announcements').update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            }).eq('id', ann.id);

            console.log(`[broadcast] Dispatching scheduled announcement: "${ann.title}" (mention_all: ${ann.mention_all})`);
            await dispatchAnnouncement({
              title: ann.title,
              announcement_text: ann.announcement_text,
              mention_all: Boolean(ann.mention_all),
              target_group_jid: ann.target_group_jid,
            });
          }
        }
      } catch (annErr) {
        console.warn('[broadcast] Check error:', annErr.message);
      }
    }

  // 3. Scheduled Auto Lock / Open Groups (Timezone: Africa/Lagos)
  if (supabase && sock?.user) {
    try {
      const lagosHHmm = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false });
      const todayLagosStr = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' });

      for (const [groupJid, settings] of groupSettingsCache.entries()) {
        if (!settings.schedule_enabled || !settings.is_monitored) continue;

        // Catch up to 3h late: a deploy/restart that straddles the target minute
        // must not silently skip the whole day's lock/open.
        const decision = decideScheduleAction({
          nowHHmm: lagosHHmm,
          autoLockTime: settings.auto_lock_time,
          autoOpenTime: settings.auto_open_time,
          isLocked: Boolean(settings.is_locked),
        });
        const shouldLock = decision.action === 'lock';
        const shouldOpen = decision.action === 'open';

        // Stable per-day slot keys (the old key embedded the current HH:mm, so the
        // guard never matched across the 10s loop and could fire twice).
        const lockKey = scheduleSlotKey(groupJid, todayLagosStr, 'lock');
        const openKey = scheduleSlotKey(groupJid, todayLagosStr, 'open');

        if (shouldLock && !settings.is_locked && !firedScheduleSlots.has(lockKey) && !scheduleRetryCooling(lockKey)) {
          markScheduleSlot(lockKey);
          try {
            await sock.groupSettingUpdate(groupJid, 'announcement');
          } catch (lockErr) {
            // Allow a retry after 5 minutes (e.g. the bot was briefly demoted).
            firedScheduleSlots.delete(lockKey);
            scheduleFailCooldowns.set(lockKey, Date.now());
            console.warn(`[schedule] Auto-lock failed for ${groupJid}:`, lockErr.message);
            continue;
          }

          settings.is_locked = true;
          await supabase.from('gods_virtue_groups').update({ is_locked: true }).eq('group_jid', groupJid)
            .then(() => {}, (dbErr) => console.warn('[schedule] Could not persist lock state:', dbErr.message));
          console.log(`[schedule] Auto-locked group ${groupJid} at Lagos time: ${lagosHHmm}`);

          // Side effects must never undo a successful lock (that used to retry the
          // whole branch and duplicate the recap).
          try {
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
              timetableNote: buildNightReminder(groupJid),
            });
            const duty = getGroupDutyLog(groupJid);
            duty.recaps += 1;
            duty.lastRecapAt = lagosHHmm;
            activity.newMembers = [];
            activity.messages = [];
          } catch (recapErr) {
            console.warn(`[schedule] Group locked, but recap failed for ${groupJid}:`, recapErr.message);
          }
        } else if (shouldOpen && settings.is_locked && !firedScheduleSlots.has(openKey) && !scheduleRetryCooling(openKey)) {
          markScheduleSlot(openKey);

          // Greeting first (with today's lectures, if any), but a greeting failure
          // must never leave the group locked.
          try {
            await sendGroupOpeningGreeting(
              sock,
              groupJid,
              settings.group_name || 'our community',
              buildMorningReminder(groupJid)
            );
            await sleep(2000);
          } catch (greetErr) {
            console.warn(`[schedule] Morning greeting failed for ${groupJid}:`, greetErr.message);
          }

          try {
            await sock.groupSettingUpdate(groupJid, 'not_announcement');
          } catch (openErr) {
            firedScheduleSlots.delete(openKey);
            scheduleFailCooldowns.set(openKey, Date.now());
            console.warn(`[schedule] Auto-open failed for ${groupJid}:`, openErr.message);
            continue;
          }

          settings.is_locked = false;
          await supabase.from('gods_virtue_groups').update({ is_locked: false }).eq('group_jid', groupJid)
            .then(() => {}, (dbErr) => console.warn('[schedule] Could not persist open state:', dbErr.message));
          console.log(`[schedule] Auto-opened group ${groupJid} at Lagos time: ${lagosHHmm}`);

          // Flush any held batch welcomes that were buffered overnight
          try {
            await processPendingWelcomes();
          } catch (welcomeErr) {
            console.warn(`[schedule] Group opened, but pending welcomes failed:`, welcomeErr.message);
          }
        }
      }
    } catch (schedErr) {
      console.warn('[schedule] Scheduler error:', schedErr.message);
    }
  }

  // 4. Scheduled Status Meme Posting (3 times a day: Morning ~08:00, Afternoon ~14:00, Night ~20:00)
  if (sock?.user && botConfig.status_memes_enabled !== false) {
    try {
      const lagosHHmm = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false });
      const targetTimes = (botConfig.status_meme_times || '08:00,14:00,20:00')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const todayLagosStr = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' });

      for (const tTime of targetTimes) {
        // Trigger if current minute matches configured time
        if (lagosHHmm === tTime) {
          const postKey = `${todayLagosStr}_${tTime}`;
          if (botConfig.last_status_post_key !== postKey) {
            botConfig.last_status_post_key = postKey;
            console.log(`[status-meme] Scheduled status meme trigger at Lagos time: ${lagosHHmm}...`);
            const meme = await fetchRandomMeme();
            if (meme && (meme.buffer || meme.caption)) {
              await postStatusMeme(sock, meme);
              if (supabase) {
                await supabase.from('gods_virtue_config').update({
                  last_status_post: new Date().toISOString(),
                }).eq('id', 'primary');
              }
            }
          }
        }
      }
    } catch (memeSchedErr) {
      console.warn('[status-meme] Scheduled meme check error:', memeSchedErr.message);
    }
  }

  // 5. Batch Welcome Dispatcher (Runs every ~5 minutes)
  if (sock?.user) {
    const now = Date.now();
    if (now - lastWelcomeBatchTime >= WELCOME_BATCH_INTERVAL_MS) {
      lastWelcomeBatchTime = now;
      await processPendingWelcomes();
    }
  }

  // 6. Daily 22:00 Lagos Time Contact Export (.VCF) to Bot DM
  if (sock?.user && supabase) {
    try {
      const lagosHHmm = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false });
      const todayLagosStr = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' });
      if (lagosHHmm === '22:00') {
        const vcfKey = `${todayLagosStr}_2200_vcf`;
        if (lastDailyVcfKey !== vcfKey) {
          lastDailyVcfKey = vcfKey;
          console.log('[vcf] Generating daily 22:00 contacts VCF file...');
          await exportAndSendVcf(sock);
        }
      }
    } catch (vcfErr) {
      console.warn('[vcf] Scheduled VCF export error:', vcfErr.message);
    }
  }

  // 7. Daily Self-Reflection at 03:30 Lagos (while every group is locked)
  if (supabase) {
    try {
      const nowHHmm = lagosHHmm();
      const dayKey = lagosDateLine();
      if (nowHHmm >= '03:30' && nowHHmm < '03:45') {
        const reflectionKey = `${dayKey}_0330_reflect`;
        if (!firedScheduleSlots.has(reflectionKey)) {
          markScheduleSlot(reflectionKey);
          console.log('[self-improver] Running daily self-reflection over recent replies...');
          const result = await runDailyReflection();
          if (result.added.length > 0) {
            console.log(`[self-improver] Learned ${result.added.length} new style rule(s):`);
            result.added.forEach((r) => console.log(`[self-improver]   + ${r}`));
          }
          if (result.stopDoing.length > 0) {
            console.log(`[self-improver] Noticed habits to stop: ${result.stopDoing.join(' | ')}`);
          }
        }
      }
    } catch (reflectErr) {
      console.warn('[self-improver] Reflection scheduling error:', reflectErr.message);
    }
  }

  // 8. Lecture timetable reminders (fallback path for groups WITHOUT an auto
  //    lock/open schedule). Groups that DO lock/open on schedule receive these
  //    notes attached to their nightly recap / morning greeting instead.
  if (sock?.user) {
    try {
      const nowHHmm = lagosHHmm();
      const todayKey = lagosDateLine();
      for (const [groupJid, settings] of groupSettingsCache.entries()) {
        if (!settings.is_monitored) continue;
        if (settings.schedule_enabled) continue; // handled with recap/greeting
        if (!hasActiveTimetable(groupJid)) continue;

        const times = getReminderTimes(groupJid);
        const nightKey = `${groupJid}_${todayKey}_${times.night}_tt_night`;
        const morningKey = `${groupJid}_${todayKey}_${times.morning}_tt_morning`;

        if (nowHHmm === times.night && !firedScheduleSlots.has(nightKey)) {
          markScheduleSlot(nightKey);
          const note = buildNightReminder(groupJid);
          if (note) await sock.sendMessage(groupJid, { text: note });
        }
        if (nowHHmm === times.morning && !firedScheduleSlots.has(morningKey)) {
          markScheduleSlot(morningKey);
          const note = buildMorningReminder(groupJid);
          if (note) await sock.sendMessage(groupJid, { text: note });
        }
      }
    } catch (ttSchedErr) {
      console.warn('[timetable] Reminder scheduler error:', ttSchedErr.message);
    }
  }

  // 9. Parse any lecture-timetable PDF uploaded from the dashboard
  if (supabase && sock?.user) {
    try {
      await processPendingTimetables({ sock });
    } catch (ttParseErr) {
      console.warn('[timetable] Pending-parse error:', ttParseErr.message);
    }
  }
  } catch (bgErr) {
    console.warn('[background] Scheduled loop error:', bgErr.message);
  } finally {
    isProcessingBackground = false;
  }
}, 10000);

// ─── Conversation Starter: silence breaker (checked once a minute) ───
setInterval(() => {
  if (!sock?.user) return;
  checkSilenceEngagement({
    sock,
    groupSettingsCache,
    botConfig,
    supabase,
    isBotJid: (jid) => isBotIdentifierMatch(jid, getBotIdentifiers(sock)),
  }).catch((e) => console.warn('[engagement] Check error:', e?.message || e));
}, 60000);


// Start Service
startBot().catch((err) => console.error('[main] Fatal bot startup error:', err));
