/**
 * src/knowledge.js
 * Curated knowledge base for God's Virtue (lightweight RAG without embeddings).
 *
 * The owner can add facts, FAQs, church/company info and group-specific rules
 * with `.kb add`. When a member asks something related, the best matches are
 * injected into the prompt as trusted context, so the bot answers from the
 * knowledge base instead of hallucinating.
 *
 * Storage: `gods_virtue_knowledge` in Supabase.
 * Search: token overlap + phrase bonus — free, fast and deterministic.
 */

const TABLE = 'gods_virtue_knowledge';
const MAX_ROWS = 600;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONTENT_CHARS = 900;

let supabaseClient = null;
let persistEnabled = true;
let cache = [];
let cacheLoadedAt = 0;
let loadingPromise = null;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'are', 'was', 'were', 'this', 'that',
  'with', 'have', 'has', 'had', 'but', 'not', 'can', 'will', 'would', 'should',
  'what', 'when', 'where', 'who', 'how', 'why', 'from', 'they', 'them', 'our',
  'please', 'just', 'like', 'about', 'into', 'than', 'then', 'there', 'here',
  'does', 'did', 'doing', 'been', 'being', 'get', 'got', 'make', 'made',
  'know', 'want', 'need', 'tell', 'say', 'said', 'any', 'some', 'all',
]);

export function bindKnowledgeClient(supabase) {
  supabaseClient = supabase || null;
  cache = [];
  cacheLoadedAt = 0;
}

function handlePersistError(err) {
  const msg = err?.message || String(err);
  if (/does not exist|schema cache|42P01|Could not find the table/i.test(msg)) {
    persistEnabled = false;
    console.warn(`[knowledge] "${TABLE}" table not found in Supabase — apply the gods-virtue schema migration. Knowledge search will stay empty until then.`);
  } else {
    console.warn('[knowledge] Persistence warning:', msg);
  }
}

export function tokenize(text = '') {
  return (String(text).toLowerCase().match(/[\p{L}\p{N}']{2,}/gu) || [])
    .filter((t) => !STOPWORDS.has(t));
}

function normalizeRow(row) {
  return {
    id: row.id,
    groupJid: row.group_jid || null,
    title: row.title || '',
    content: row.content || '',
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    timesUsed: Number(row.times_used || 0),
  };
}

export async function loadKnowledge({ force = false } = {}) {
  if (!supabaseClient) return cache;
  if (!force && cacheLoadedAt > 0 && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return cache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { data, error } = await supabaseClient
        .from(TABLE)
        .select('id, group_jid, title, content, tags, created_by, created_at, times_used')
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);
      if (error) throw error;
      cache = (data || []).map(normalizeRow);
      cacheLoadedAt = Date.now();
      console.log(`[knowledge] Loaded ${cache.length} knowledge entr${cache.length === 1 ? 'y' : 'ies'}.`);
    } catch (err) {
      handlePersistError(err);
      // Retry after a minute, not on every message, if the table is missing.
      cacheLoadedAt = Date.now() - CACHE_TTL_MS + 60_000;
    } finally {
      loadingPromise = null;
    }
    return cache;
  })();

  return loadingPromise;
}

function overlapScore(queryTokens, targetText, weight = 1) {
  if (!targetText) return 0;
  const target = new Set(tokenize(targetText));
  if (target.size === 0) return 0;
  let matches = 0;
  for (const token of queryTokens) {
    if (target.has(token)) matches += 1;
  }
  return (matches / Math.sqrt(queryTokens.length || 1)) * weight;
}

function scoreRow(row, query, queryTokens) {
  const phrase = String(query || '').toLowerCase().trim();
  let score = 0;
  score += overlapScore(queryTokens, row.title, 2.2);
  score += overlapScore(queryTokens, row.content, 1);
  score += overlapScore(queryTokens, (row.tags || []).join(' '), 1.6);

  if (phrase.length >= 6) {
    if (row.title.toLowerCase().includes(phrase)) score += 3;
    else if (row.content.toLowerCase().includes(phrase)) score += 1.5;
  }
  return score;
}

/**
 * Returns the best matching entries for a question.
 * Group-specific entries are preferred; global entries (group_jid null) apply everywhere.
 */
export async function searchKnowledge({ groupJid = null, query = '', limit = 3, minScore = 0.9 } = {}) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return [];
  await loadKnowledge();

  const queryTokens = tokenize(trimmed);
  if (queryTokens.length === 0) return [];

  const candidates = cache.filter(
    (row) => !row.groupJid || (groupJid && row.groupJid === groupJid)
  );

  const scored = candidates
    .map((row) => ({ row, score: scoreRow(row, trimmed, queryTokens) }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 6)));

  return scored.map((entry) => ({ ...entry.row, score: Number(entry.score.toFixed(2)) }));
}

/** Builds a trusted prompt block from the best matches. Returns '' when nothing matches. */
export async function buildKnowledgeContext({ groupJid = null, query = '', limit = 3 } = {}) {
  try {
    const matches = await searchKnowledge({ groupJid, query, limit });
    if (matches.length === 0) return '';

    const blocks = matches.map((row, i) => {
      const content = String(row.content).slice(0, MAX_CONTENT_CHARS);
      const tags = row.tags?.length ? ` (tags: ${row.tags.slice(0, 6).join(', ')})` : '';
      return `[${i + 1}] ${row.title}${tags}\n${content}`;
    });

    return [
      '<knowledge_base>',
      'The owner approved these facts. Use them when relevant, quote them accurately, and never invent details that are not here.',
      ...blocks,
      '</knowledge_base>',
    ].join('\n');
  } catch (err) {
    console.warn('[knowledge] Context build warning:', err?.message || err);
    return '';
  }
}

function similarity(a = '', b = '') {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.min(ta.size, tb.size);
}

export async function addKnowledge({ groupJid = null, title, content, tags = [], createdBy = null }) {
  const cleanTitle = String(title || '').trim();
  const cleanContent = String(content || '').trim();
  if (!cleanTitle || !cleanContent) {
    throw new Error('Both a title and content are required.');
  }

  const normalizedTags = (Array.isArray(tags) ? tags : String(tags || '').split(','))
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  // Dedupe: same group + very similar title/content.
  await loadKnowledge();
  const duplicate = cache.find(
    (row) =>
      (row.groupJid || null) === (groupJid || null) &&
      (similarity(row.title, cleanTitle) > 0.85 || similarity(row.content, cleanContent) > 0.9)
  );
  if (duplicate) {
    return { duplicate: true, entry: duplicate };
  }

  const row = {
    group_jid: groupJid || null,
    title: cleanTitle.slice(0, 200),
    content: cleanContent.slice(0, 4000),
    tags: normalizedTags,
    created_by: createdBy || null,
  };

  if (!supabaseClient || !persistEnabled) {
    const local = normalizeRow({ ...row, id: `local-${Date.now()}`, created_at: new Date().toISOString() });
    cache.unshift(local);
    return { duplicate: false, entry: local, persisted: false };
  }

  try {
    const { data, error } = await supabaseClient.from(TABLE).insert(row).select().single();
    if (error) throw error;
    const entry = normalizeRow(data);
    cache.unshift(entry);
    return { duplicate: false, entry, persisted: true };
  } catch (err) {
    handlePersistError(err);
    const local = normalizeRow({ ...row, id: `local-${Date.now()}`, created_at: new Date().toISOString() });
    cache.unshift(local);
    return { duplicate: false, entry: local, persisted: false };
  }
}

export async function deleteKnowledge(id) {
  if (!id) return false;
  await loadKnowledge();
  const index = cache.findIndex((row) => String(row.id) === String(id));
  if (index === -1) return false;
  const [removed] = cache.splice(index, 1);

  if (supabaseClient && persistEnabled && !String(removed.id).startsWith('local-')) {
    try {
      const { error } = await supabaseClient.from(TABLE).delete().eq('id', removed.id);
      if (error) throw error;
    } catch (err) {
      handlePersistError(err);
      cache.splice(index, 0, removed);
      return false;
    }
  }
  return true;
}

export async function listKnowledge({ groupJid = null, limit = 20 } = {}) {
  await loadKnowledge();
  return cache
    .filter((row) => !groupJid || !row.groupJid || row.groupJid === groupJid)
    .slice(0, Math.max(1, Math.min(limit, 60)));
}

export function getKnowledgeStats() {
  return {
    total: cache.length,
    groupScoped: cache.filter((row) => Boolean(row.groupJid)).length,
    global: cache.filter((row) => !row.groupJid).length,
    persisted: persistEnabled,
    loadedAt: cacheLoadedAt ? new Date(cacheLoadedAt).toISOString() : null,
  };
}
