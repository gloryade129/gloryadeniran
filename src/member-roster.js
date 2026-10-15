/**
 * src/member-roster.js
 * Durable memory of who is in each group.
 *
 * The old design only knew about joins through the live Baileys event and an
 * in-memory buffer, so a worker restart (or a missed socket event) made the bot
 * "forget" everyone who joined that day — recaps said "None today" and welcomes
 * never fired. This roster persists membership per group in Supabase
 * (`gods_virtue_group_members`), so joins are detected by diffing live group
 * metadata against the stored roster and survive restarts/deploys.
 *
 * If the table has not been created yet, persistence quietly disables itself
 * and the roster still works in memory for the lifetime of the process.
 */

const TABLE = 'gods_virtue_group_members';

let supabaseClient = null;
let persistEnabled = true;

// groupJid -> { members: Map<userJid, firstSeenIso>, baselineJids: Set<userJid>, baselineComplete: boolean }
// baselineJids holds everyone who was present at the silent baseline seed, so an
// entire existing group is never treated as "joined today".
const rosterByGroup = new Map();

export function bindRosterClient(supabase) {
  supabaseClient = supabase || null;
}

function handlePersistError(err) {
  const msg = err?.message || String(err);
  if (/does not exist|schema cache|42P01|Could not find the table/i.test(msg)) {
    persistEnabled = false;
    console.warn(`[roster] "${TABLE}" table not found in Supabase — apply the gods-virtue schema migration. Falling back to in-memory roster (joins will be missed across restarts until then).`);
  } else {
    console.warn('[roster] Persistence warning:', msg);
  }
}

/** Loads the persisted roster at boot. Never throws. */
export async function loadMemberRoster() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('group_jid, user_jid, first_seen_at');
    if (error) throw error;

    rosterByGroup.clear();
    for (const row of data || []) {
      if (!row.group_jid || !row.user_jid) continue;
      if (!rosterByGroup.has(row.group_jid)) {
        rosterByGroup.set(row.group_jid, { members: new Map(), baselineJids: new Set(), baselineComplete: true });
      }
      rosterByGroup.get(row.group_jid).members.set(row.user_jid, row.first_seen_at || new Date().toISOString());
    }
    console.log(`[roster] Loaded ${data?.length || 0} known member record(s) across ${rosterByGroup.size} group(s).`);
  } catch (err) {
    handlePersistError(err);
  }
}

function persistMember(groupJid, userJid, firstSeenIso) {
  if (!supabaseClient || !persistEnabled) return;
  supabaseClient
    .from(TABLE)
    .upsert(
      { group_jid: groupJid, user_jid: userJid, first_seen_at: firstSeenIso },
      { onConflict: 'group_jid,user_jid', ignoreDuplicates: true }
    )
    .then(({ error }) => { if (error) handlePersistError(error); })
    .catch((e) => handlePersistError(e));
}

function forgetPersisted(groupJid, userJid) {
  if (!supabaseClient || !persistEnabled) return;
  supabaseClient
    .from(TABLE)
    .delete()
    .eq('group_jid', groupJid)
    .eq('user_jid', userJid)
    .then(({ error }) => { if (error) handlePersistError(error); })
    .catch(() => {});
}

function ensureGroupState(groupJid) {
  if (!rosterByGroup.has(groupJid)) {
    rosterByGroup.set(groupJid, { members: new Map(), baselineJids: new Set(), baselineComplete: false });
  }
  return rosterByGroup.get(groupJid);
}

/**
 * Marks a member as known (memory + persistence). Returns true if they were new.
 */
export function rememberMember(groupJid, userJid, firstSeenIso = new Date().toISOString()) {
  if (!groupJid || !userJid) return false;
  const state = ensureGroupState(groupJid);
  if (state.members.has(userJid)) return false;
  state.members.set(userJid, firstSeenIso);
  persistMember(groupJid, userJid, firstSeenIso);
  return true;
}

/** Forgets a member (they left or were removed) so a future rejoin counts as new. */
export function forgetMember(groupJid, userJid) {
  if (!groupJid || !userJid) return;
  const state = rosterByGroup.get(groupJid);
  if (!state) return;
  state.members.delete(userJid);
  forgetPersisted(groupJid, userJid);
}

/** Forgets a whole group (bot removed). */
export function forgetGroup(groupJid) {
  rosterByGroup.delete(groupJid);
  if (supabaseClient && persistEnabled) {
    supabaseClient.from(TABLE).delete().eq('group_jid', groupJid).then(() => {}).catch(() => {});
  }
}

/**
 * Reconciles the roster against a live metadata participant list.
 *
 * @param {string} groupJid
 * @param {string[]} participantJids all participant identifiers (ids/lids/jids)
 * @param {(jid: string) => boolean} isBotFn excludes the bot's own identifiers
 * @returns {string[]} human participants that are genuinely NEW since the last
 *         reconciliation (empty on the silent baseline seed).
 */
export function reconcileGroupParticipants(groupJid, participantJids, isBotFn) {
  const humans = (participantJids || []).filter(Boolean).filter((p) => !isBotFn(p));

  const state = ensureGroupState(groupJid);
  const nowIso = new Date().toISOString();

  if (!state.baselineComplete) {
    // First time we ever observe this group via metadata: seed a silent baseline.
    // Everyone currently in the group becomes "known" — we never welcome an entire
    // group at once — but members recorded moments earlier by the live join event
    // (e.g. the person whose join brought us here) keep their real join time.
    for (const p of humans) {
      const wasAlreadyKnown = state.members.has(p);
      if (!wasAlreadyKnown) {
        state.members.set(p, nowIso);
        state.baselineJids.add(p); // silent: counts as "always been here" for the recap
      }
      persistMember(groupJid, p, state.members.get(p));
    }
    state.baselineComplete = true;
    console.log(`[roster] Seeded baseline of ${humans.length} existing member(s) in ${groupJid} (no welcomes fired).`);
    return [];
  }

  const joined = [];
  for (const p of humans) {
    if (!state.members.has(p)) {
      state.members.set(p, nowIso);
      persistMember(groupJid, p, nowIso);
      joined.push(p);
    }
  }

  // Members who are no longer in the group have left
  const humanSet = new Set(humans);
  for (const p of Array.from(state.members.keys())) {
    if (!humanSet.has(p)) {
      state.members.delete(p);
      forgetPersisted(groupJid, p);
    }
  }

  if (joined.length > 0) {
    console.log(`[roster] Detected ${joined.length} new member(s) in ${groupJid} via metadata reconciliation.`);
  }
  return joined;
}

/**
 * Members whose first_seen falls within [sinceIso, now], excluding the silent
 * baseline seed. Used by the evening recap so restarts never lose "new faces".
 *
 * @returns {Array<{ jid: string, phone: string, firstSeen: string }>}
 */
export function getNewMembersSince(groupJid, sinceIso) {
  const state = rosterByGroup.get(groupJid);
  if (!state) return [];
  const out = [];
  for (const [jid, firstSeen] of state.members.entries()) {
    if (!firstSeen) continue;
    if (firstSeen < sinceIso) continue;
    if (state.baselineJids.has(jid)) continue; // present at the silent baseline seed
    out.push({ jid, phone: jid.split('@')[0]?.split(':')[0] || '', firstSeen });
  }
  return out;
}

export function getRosterSize(groupJid) {
  return rosterByGroup.get(groupJid)?.members.size || 0;
}
