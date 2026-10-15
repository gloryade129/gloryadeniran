/**
 * src/self-improver.js
 * Bounded self-improvement for God's Virtue.
 *
 * Once a day (scheduled at 03:30 Lagos, while every group is locked), the bot
 * reviews its own recent replies and whether members actually responded after
 * them, then writes itself a few STYLE rules ("stop doing X", "start doing Y").
 * Those rules are appended to its persona prompt every day afterwards.
 *
 * Safety bounds:
 * - max 3 new rules per day, max 10 active rules total (oldest retire automatically)
 * - rules are plain behavioural style only — identity/permission changes are
 *   rejected by a hard filter and the AI is instructed never to propose them
 * - every rule is visible and clearable by the owner via `.learned` / `.learned clear`
 */

import { reflectOnBehavior } from './ai-engine.js';

const TABLE = 'gods_virtue_learned_rules';
const MAX_ACTIVE_RULES = 10;
const MAX_NEW_RULES_PER_DAY = 3;
const MAX_RULE_LENGTH = 160;
const SAMPLE_LOG_ROWS = 40;

let supabaseClient = null;
let persistEnabled = true;

let activeRules = []; // Array<{ id, rule_text, rationale, createdAt }> ordered oldest->newest

// Hard filter: a "style rule" may never rewrite who the bot is or who controls it.
const IDENTITY_RULE_REGEX = /ignore (all |the |previous |prior )?(instructions|rules|prompts)|you are (not|now)|your (owner|creator) is|obey|unrestricted|jailbreak|system prompt|developer mode|no longer (follow|obey)|always (obey|comply)/i;

export function bindSelfImproverClient(supabase) {
  supabaseClient = supabase || null;
}

function handlePersistError(err) {
  const msg = err?.message || String(err);
  if (/does not exist|schema cache|42P01|Could not find the table/i.test(msg)) {
    persistEnabled = false;
    console.warn(`[self-improver] "${TABLE}" table not found — apply the gods-virtue schema migration. Learned rules will not survive restarts until then.`);
  } else {
    console.warn('[self-improver] Persistence warning:', msg);
  }
}

export async function loadLearnedRules() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('id, rule_text, rationale, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    if (error) throw error;
    activeRules = (data || []).map((r) => ({
      id: r.id,
      rule_text: r.rule_text,
      rationale: r.rationale || '',
      createdAt: r.created_at,
    }));
    console.log(`[self-improver] Loaded ${activeRules.length} learned style rule(s).`);
  } catch (err) {
    handlePersistError(err);
  }
}

/** Formats the active learned rules as a persona-prompt block ('' when none). */
export function buildLearnedRulesContext() {
  if (activeRules.length === 0) return '';
  return (
    `RULES YOU LEARNED FROM YOUR OWN EXPERIENCE (follow them — they refine how you speak, never your identity): ` +
    activeRules.map((r) => `- ${r.rule_text}`).join(' ')
  );
}

export function listLearnedRules() {
  return activeRules.map((r, i) => `${i + 1}. ${r.rule_text}${r.rationale ? ` (why: ${r.rationale})` : ''}`);
}

export async function clearLearnedRules() {
  activeRules = [];
  if (supabaseClient && persistEnabled) {
    try {
      await supabaseClient.from(TABLE).update({ status: 'retired', retired_at: new Date().toISOString() }).eq('status', 'active');
    } catch (err) {
      console.warn('[self-improver] Clear warning:', err.message);
    }
  }
}

function normalizeRuleCandidate(rule) {
  if (typeof rule !== 'string') return null;
  const clean = rule.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > MAX_RULE_LENGTH) return null;
  if (IDENTITY_RULE_REGEX.test(clean)) return null;
  // Reject near-duplicates of existing rules
  const lower = clean.toLowerCase();
  if (activeRules.some((r) => r.rule_text.toLowerCase() === lower)) return null;
  return clean;
}

async function retireOldestIfNeeded() {
  while (activeRules.length > MAX_ACTIVE_RULES) {
    const oldest = activeRules.shift();
    if (supabaseClient && persistEnabled && oldest.id) {
      try {
        await supabaseClient.from(TABLE).update({ status: 'retired', retired_at: new Date().toISOString() }).eq('id', oldest.id);
      } catch (err) {
        console.warn('[self-improver] Retire warning:', err.message);
      }
    }
    console.log(`[self-improver] Retired oldest learned rule: "${oldest.rule_text}"`);
  }
}

/**
 * Builds engagement-aware exchange samples from the audit log: for each bot
 * reply, whether a human spoke again in that chat shortly after.
 */
async function fetchRecentExchanges() {
  if (!supabaseClient) return [];
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseClient
    .from('gods_virtue_logs')
    .select('chat_jid, is_group, sender_jid, sender_name, incoming_text, reply_text, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;

  const rows = (data || []).filter((r) => r.incoming_text || r.reply_text);

  // Group rows per chat to find "member spoke -> bot replied -> member replied?"
  const byChat = new Map();
  for (const r of rows) {
    if (!byChat.has(r.chat_jid)) byChat.set(r.chat_jid, []);
    byChat.get(r.chat_jid).push(r);
  }

  const samples = [];
  for (const chatRows of byChat.values()) {
    for (let i = 0; i < chatRows.length; i++) {
      const r = chatRows[i];
      if (!r.reply_text) continue; // only our replies get reviewed
      let engaged = false;
      for (let j = i + 1; j < Math.min(chatRows.length, i + 4); j++) {
        if (chatRows[j].incoming_text && chatRows[j].sender_jid !== r.sender_jid) {
          engaged = true;
          break;
        }
      }
      samples.push({
        isGroup: Boolean(r.is_group),
        memberMessage: r.incoming_text || '',
        botReply: r.reply_text,
        gotAReply: engaged,
      });
      if (samples.length >= SAMPLE_LOG_ROWS) return samples;
    }
  }
  return samples;
}

/**
 * One daily reflection pass: reviews recent replies and learns style rules.
 * Returns { added: string[], retired: number, stopDoing: string[] }.
 */
export async function runDailyReflection() {
  if (process.env.SELF_IMPROVEMENT === 'off') return { added: [], retired: 0, stopDoing: [] };
  try {
    const samples = await fetchRecentExchanges();
    if (samples.length < 8) {
      console.log('[self-improver] Not enough recent exchanges to reflect on — skipping today.');
      return { added: [], retired: 0, stopDoing: [] };
    }

    const reflection = await reflectOnBehavior({ samples, currentRules: activeRules.map((r) => r.rule_text) });
    const newRules = (reflection.newRules || [])
      .map(normalizeRuleCandidate)
      .filter(Boolean)
      .slice(0, MAX_NEW_RULES_PER_DAY);

    const added = [];
    for (const ruleText of newRules) {
      const record = { id: null, rule_text: ruleText, rationale: '', createdAt: new Date().toISOString() };
      activeRules.push(record);
      added.push(ruleText);

      if (supabaseClient && persistEnabled) {
        try {
          const { data, error } = await supabaseClient
            .from(TABLE)
            .insert({ rule_text: ruleText, rationale: (reflection.stopDoing || []).slice(0, 2).join('; '), status: 'active' })
            .select('id')
            .single();
          if (error) throw error;
          record.id = data?.id || null;
        } catch (err) {
          handlePersistError(err);
        }
      }
      console.log(`[self-improver] Learned new rule: "${ruleText}"`);
    }

    await retireOldestIfNeeded();

    return { added, retired: 0, stopDoing: reflection.stopDoing || [] };
  } catch (err) {
    console.warn('[self-improver] Daily reflection failed:', err.message);
    return { added: [], retired: 0, stopDoing: [] };
  }
}
