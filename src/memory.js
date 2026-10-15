/**
 * src/memory.js
 * Long-term memory for God's Virtue.
 *
 * Conversation history alone resets on every deploy and never crosses chats.
 * This module keeps a small, durable set of FACTS per subject (a group or a
 * person) — names, preferences, decisions, recurring topics — extracted by a
 * cheap AI pass and injected into future prompts so the bot genuinely
 * remembers things it was told days ago.
 *
 * Storage: `gods_virtue_memories` in Supabase (graceful in-memory fallback if
 * the migration has not been applied yet).
 */

import { extractMemories as extractMemoriesWithAI } from './ai-engine.js';

const TABLE = 'gods_virtue_memories';
const MAX_MEMORIES_PER_SUBJECT = 40;
const MAX_RECALL = 6;
const EXTRACT_MIN_EXCHANGES = 3;   // gather at least 3 exchanges before an extraction pass
const EXTRACT_COOLDOWN_MS = 2 * 60 * 60 * 1000; // and never more than once per 2h per chat

let supabaseClient = null;
let persistEnabled = true;

// subjectJid -> Array<{ id, text, category, createdAt }>
const memoryCache = new Map();

const lastExtractionAt = new Map();   // chatJid -> ts
const pendingExchangeCount = new Map(); // chatJid -> n

export function bindMemoryClient(supabase) {
  supabaseClient = supabase || null;
}

function handlePersistError(err) {
  const msg = err?.message || String(err);
  if (/does not exist|schema cache|42P01|Could not find the table/i.test(msg)) {
    persistEnabled = false;
    console.warn(`[memory] "${TABLE}" table not found in Supabase — apply the gods-virtue schema migration. Memories will not survive restarts until then.`);
  } else {
    console.warn('[memory] Persistence warning:', msg);
  }
}

export async function loadMemories() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('id, subject_jid, memory_text, category, created_at')
      .order('created_at', { ascending: false })
      .limit(800);
    if (error) throw error;

    memoryCache.clear();
    for (const row of data || []) {
      if (!row.subject_jid || !row.memory_text) continue;
      if (!memoryCache.has(row.subject_jid)) memoryCache.set(row.subject_jid, []);
      const arr = memoryCache.get(row.subject_jid);
      if (arr.length < MAX_MEMORIES_PER_SUBJECT) {
        arr.push({ id: row.id, text: row.memory_text, category: row.category || 'fact', createdAt: row.created_at });
      }
    }
    let total = 0;
    memoryCache.forEach((v) => { total += v.length; });
    console.log(`[memory] Loaded ${total} memor(y/ies) across ${memoryCache.size} subject(s).`);
  } catch (err) {
    handlePersistError(err);
  }
}

function tokenize(text = '') {
  return String(text).toLowerCase().match(/[a-z0-9']{3,}/g) || [];
}

/** Cheap similarity so we never store the same fact twice in different words. */
function similarity(a = '', b = '') {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

/** Stores one durable fact. Dedupes against what is already remembered. */
export async function remember({ scope = 'group', subjectJid, text, category = 'fact' }) {
  if (!subjectJid || !text || !text.trim()) return false;
  const cleanText = text.trim().slice(0, 300);

  const arr = memoryCache.get(subjectJid) || [];
  if (arr.some((m) => similarity(m.text, cleanText) >= 0.6)) return false;
  if (arr.length >= MAX_MEMORIES_PER_SUBJECT) arr.shift(); // keep memory fresh

  const record = { id: null, text: cleanText, category, createdAt: new Date().toISOString() };
  arr.push(record);
  memoryCache.set(subjectJid, arr);

  if (supabaseClient && persistEnabled) {
    try {
      const { data, error } = await supabaseClient
        .from(TABLE)
        .insert({ scope, subject_jid: subjectJid, memory_text: cleanText, category })
        .select('id')
        .single();
      if (error) throw error;
      record.id = data?.id || null;
    } catch (err) {
      handlePersistError(err);
    }
  }
  console.log(`[memory] Remembered for ${subjectJid}: "${cleanText}"`);
  return true;
}

const STOPWORDS = new Set(['the', 'and', 'for', 'you', 'your', 'that', 'this', 'with', 'have', 'what', 'when', 'they', 'them', 'was', 'were', 'are', 'but', 'not', 'can', 'will', 'just', 'like', 'about', 'from', 'who', 'how', 'why', 'all', 'any', 'our', 'out', 'get', 'got', 'his', 'her', 'she', 'him', 'did', 'does', 'has', 'had', 'been', 'would', 'could', 'there', 'then', 'them', 'some', 'more', 'very']);

/**
 * Ranks remembered facts for the current incoming message: keyword overlap
 * with recency weighting, from both the group's memory and the sender's.
 * Sync by design (memory is already cached) — adds zero latency to replies.
 */
export function recallFor({ groupJid, senderJid, incomingText = '' }) {
  const now = Date.now();
  const queryTokens = new Set(
    tokenize(incomingText).filter((t) => !STOPWORDS.has(t))
  );

  const score = (m) => {
    const memTokens = tokenize(m.text);
    if (memTokens.length === 0) return 0;
    let overlap = 0;
    for (const t of memTokens) if (queryTokens.has(t)) overlap++;
    const ageDays = Math.max(0, (now - new Date(m.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    const recency = Math.max(0.3, 1 - ageDays / 30); // fades over a month
    return overlap * 2 + recency * 0.5;
  };

  const candidates = [];
  for (const subject of [groupJid, senderJid]) {
    if (!subject) continue;
    for (const m of memoryCache.get(subject) || []) {
      candidates.push({ text: m.text, score: score(m) });
    }
  }
  if (candidates.length === 0) return [];

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECALL)
    .map((c) => c.text);
}

/** Formats recalled memories as a system-prompt block (or '' if none). */
export function buildMemoryContext(recalled) {
  if (!recalled || recalled.length === 0) return '';
  return (
    `WHAT YOU REMEMBER ABOUT THIS CHAT (weave in naturally when relevant — never recite as a list, never say "as recorded"): ` +
    recalled.map((r) => `- ${r}`).join(' ')
  );
}

/**
 * Exchange counter used to decide when an extraction pass is due for a chat.
 * Returns true at most once per EXTRACT_COOLDOWN_MS per chat.
 */
export function noteExchangeForExtraction(chatJid) {
  const now = Date.now();
  const pending = (pendingExchangeCount.get(chatJid) || 0) + 1;
  pendingExchangeCount.set(chatJid, pending);
  if (pending < EXTRACT_MIN_EXCHANGES) return false;
  const last = lastExtractionAt.get(chatJid) || 0;
  if (now - last < EXTRACT_COOLDOWN_MS) return false;
  pendingExchangeCount.set(chatJid, 0);
  lastExtractionAt.set(chatJid, now);
  return true;
}

/**
 * Runs one AI extraction pass over a chat's recent exchanges and stores what is
 * worth keeping. Fire-and-forget safe; never throws.
 */
export async function runMemoryExtraction({ chatJid, senderJid, groupName, senderName, exchanges }) {
  try {
    if (!Array.isArray(exchanges) || exchanges.length === 0) return;

    const existing = [
      ...(memoryCache.get(chatJid) || []).map((m) => m.text),
      ...(senderJid ? (memoryCache.get(senderJid) || []).map((m) => m.text) : []),
    ].slice(0, 15);

    const extracted = await extractMemoriesWithAI({
      groupName,
      senderName,
      exchanges,
      existingMemories: existing,
    });

    for (const item of extracted || []) {
      if (item.scope === 'person' && senderJid) {
        await remember({ scope: 'contact', subjectJid: senderJid, text: item.text, category: item.category || 'person' });
      }
      await remember({ scope: 'group', subjectJid: chatJid, text: item.text, category: item.category || 'fact' });
    }
  } catch (err) {
    console.warn(`[memory] Extraction pass failed for ${chatJid}:`, err.message);
  }
}

/** Admin/diagnostic helper. */
export function getMemoryStats() {
  let total = 0;
  memoryCache.forEach((v) => { total += v.length; });
  return { subjects: memoryCache.size, total, persistEnabled };
}

/** Clears all memories for one subject, or everything with subjectJid='*'. */
export async function clearMemories(subjectJid) {
  if (subjectJid === '*') memoryCache.clear();
  else memoryCache.delete(subjectJid);
  if (supabaseClient && persistEnabled) {
    try {
      if (subjectJid === '*') await supabaseClient.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      else await supabaseClient.from(TABLE).delete().eq('subject_jid', subjectJid);
    } catch (err) {
      console.warn('[memory] Clear warning:', err.message);
    }
  }
}
