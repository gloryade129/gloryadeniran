/**
 * src/engagement-plus.js
 * Polls, RSVP-style reminders, and scheduled messages for God's Virtue.
 *
 * WhatsApp renders native polls itself, so we only need to send the right
 * message shape. Reminders are stored in Supabase (`gods_virtue_reminders`) and
 * delivered by the worker's background loop, with an in-memory fallback so the
 * feature still works before the migration is applied.
 */

import { lagosNow } from './time-utils.js';

const REMINDERS_TABLE = 'gods_virtue_reminders';
const POLLS_TABLE = 'gods_virtue_polls';
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

let supabaseClient = null;
let remindersPersist = true;
let pollsPersist = true;
const localReminders = [];
const processingReminders = new Set();
let localReminderId = 0;

export function bindEngagementClient(supabase) {
  supabaseClient = supabase || null;
}

function handleTableError(table, err) {
  const msg = err?.message || String(err);
  if (/does not exist|schema cache|42P01|Could not find the table/i.test(msg)) {
    if (table === REMINDERS_TABLE) remindersPersist = false;
    if (table === POLLS_TABLE) pollsPersist = false;
    console.warn(`[engagement] "${table}" table not found in Supabase — apply the gods-virtue schema migration.`);
  } else {
    console.warn(`[engagement] ${table} warning:`, msg);
  }
}

/**
 * Parses "30m", "2h", "1d", "18:30", "today 18:30" or "tomorrow 09:00"
 * into an absolute ISO timestamp in Africa/Lagos.
 * @returns {{ iso: string, date: Date } | null}
 */
export function parseWhen(input, now = new Date()) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;

  const relative = raw.match(/^(\d{1,3})\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2];
    const ms = unit.startsWith('m') ? amount * 60_000 : unit.startsWith('h') ? amount * 3_600_000 : amount * 86_400_000;
    const date = new Date(now.getTime() + ms);
    return { iso: date.toISOString(), date };
  }

  const clock = raw.match(/^(?:(today|tomorrow)\s+)?(\d{1,2}):(\d{2})$/);
  if (clock) {
    const dayWord = clock[1] || 'today';
    const hour = Number(clock[2]);
    const minute = Number(clock[3]);
    if (hour > 23 || minute > 59) return null;

    const lagos = lagosNow(now);
    let dayOffset = dayWord === 'tomorrow' ? 1 : 0;
    const utcMs =
      Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() + dayOffset, hour, minute) -
      LAGOS_OFFSET_MS;

    let date = new Date(utcMs);
    // "today 09:00" when it is already 10:00 means tomorrow, unless the user
    // explicitly asked for tomorrow (already handled).
    if (dayWord === 'today' && date.getTime() <= now.getTime()) {
      date = new Date(date.getTime() + 86_400_000);
    }
    if (date.getTime() <= now.getTime()) {
      date = new Date(date.getTime() + 86_400_000);
    }
    return { iso: date.toISOString(), date };
  }

  return null;
}

export function formatReminderWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const day = lagos.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = lagos.toISOString().slice(11, 16);
  return `${day} at ${time} (Lagos)`;
}

// ─── Polls ──────────────────────────────────────────────────────────────────

/** Parses `.poll Question | Option A | Option B`. */
export function parsePollPayload(args = '') {
  const parts = String(args)
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) {
    throw new Error('Usage: .poll Question | Option 1 | Option 2 [| Option 3]');
  }
  const [question, ...options] = parts;
  if (question.length < 3) throw new Error('The poll question is too short.');
  if (options.length > 12) throw new Error('WhatsApp polls support at most 12 options.');
  return { question: question.slice(0, 255), options: options.map((o) => o.slice(0, 100)) };
}

export async function sendPoll({ sock, jid, question, options, selectableCount = 1, createdBy = null }) {
  const sent = await sock.sendMessage(jid, {
    poll: {
      name: question,
      values: options,
      selectableCount: Math.min(Math.max(Number(selectableCount) || 1, 1), options.length),
    },
  });

  if (supabaseClient && pollsPersist) {
    try {
      await supabaseClient.from(POLLS_TABLE).insert({
        group_jid: jid,
        question,
        options,
        selectable_count: selectableCount,
        message_id: sent?.key?.id || null,
        created_by: createdBy || null,
      });
    } catch (err) {
      handleTableError(POLLS_TABLE, err);
    }
  }

  return sent;
}

// ─── Reminders ──────────────────────────────────────────────────────────────

export async function scheduleReminder({ groupJid, message, remindAt, createdBy = null }) {
  const text = String(message || '').trim();
  if (!text) throw new Error('Reminder text is required.');
  const iso = remindAt instanceof Date ? remindAt.toISOString() : new Date(remindAt).toISOString();
  if (Number.isNaN(new Date(iso).getTime())) throw new Error('Invalid reminder time.');

  if (supabaseClient && remindersPersist) {
    try {
      const { data, error } = await supabaseClient
        .from(REMINDERS_TABLE)
        .insert({
          group_jid: groupJid,
          message: text.slice(0, 1000),
          remind_at: iso,
          status: 'pending',
          created_by: createdBy || null,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, local: false };
    } catch (err) {
      handleTableError(REMINDERS_TABLE, err);
    }
  }

  const local = {
    id: `local-${++localReminderId}`,
    group_jid: groupJid,
    message: text.slice(0, 1000),
    remind_at: iso,
    status: 'pending',
    created_by: createdBy || null,
    created_at: new Date().toISOString(),
    local: true,
  };
  localReminders.push(local);
  return local;
}

export async function listReminders({ groupJid = null, includeSent = false, limit = 20 } = {}) {
  const rows = [];

  if (supabaseClient && remindersPersist) {
    try {
      let query = supabaseClient
        .from(REMINDERS_TABLE)
        .select('id, group_jid, message, remind_at, status, created_by, created_at, sent_at')
        .order('remind_at', { ascending: true })
        .limit(Math.max(1, Math.min(limit, 50)));
      if (!includeSent) query = query.eq('status', 'pending');
      if (groupJid) query = query.eq('group_jid', groupJid);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...(data || []));
    } catch (err) {
      handleTableError(REMINDERS_TABLE, err);
    }
  }

  for (const local of localReminders) {
    if (!includeSent && local.status !== 'pending') continue;
    if (groupJid && local.group_jid !== groupJid) continue;
    if (!rows.some((r) => String(r.id) === String(local.id))) rows.push(local);
  }

  return rows
    .filter((row) => includeSent || row.status === 'pending')
    .sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at))
    .slice(0, limit);
}

export async function cancelReminder(id) {
  if (!id) return false;

  const localIndex = localReminders.findIndex((r) => String(r.id) === String(id));
  if (localIndex !== -1) {
    localReminders.splice(localIndex, 1);
    return true;
  }

  if (!supabaseClient || !remindersPersist) return false;
  try {
    const { error } = await supabaseClient
      .from(REMINDERS_TABLE)
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) throw error;
    return true;
  } catch (err) {
    handleTableError(REMINDERS_TABLE, err);
    return false;
  }
}

async function deliverReminder(sock, reminder) {
  const key = String(reminder.id);
  if (processingReminders.has(key)) return false;
  processingReminders.add(key);
  try {
    await sock.sendMessage(reminder.group_jid, {
      text: `⏰ *Reminder*\n\n${reminder.message}`,
    });
    return true;
  } catch (err) {
    console.warn('[engagement] Reminder delivery failed:', err?.message || err);
    return false;
  } finally {
    processingReminders.delete(key);
  }
}

/**
 * Delivers every due reminder. Called from the worker's background loop.
 * @returns {Promise<number>} number delivered
 */
export async function processDueReminders({ sock, now = new Date(), limit = 10 } = {}) {
  if (!sock) return 0;
  const nowIso = now.toISOString();
  let delivered = 0;

  if (supabaseClient && remindersPersist) {
    try {
      const { data, error } = await supabaseClient
        .from(REMINDERS_TABLE)
        .select('id, group_jid, message, remind_at')
        .eq('status', 'pending')
        .lte('remind_at', nowIso)
        .order('remind_at', { ascending: true })
        .limit(limit);
      if (error) throw error;

      for (const reminder of data || []) {
        const ok = await deliverReminder(sock, reminder);
        if (!ok) continue;
        delivered += 1;
        try {
          await supabaseClient
            .from(REMINDERS_TABLE)
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', reminder.id);
        } catch (err) {
          handleTableError(REMINDERS_TABLE, err);
        }
      }
    } catch (err) {
      handleTableError(REMINDERS_TABLE, err);
    }
  }

  // In-memory reminders (also covers the migration-not-applied case).
  for (const reminder of [...localReminders]) {
    if (reminder.status !== 'pending') continue;
    if (new Date(reminder.remind_at).getTime() > now.getTime()) continue;
    const ok = await deliverReminder(sock, reminder);
    if (ok) {
      reminder.status = 'sent';
      reminder.sent_at = new Date().toISOString();
      delivered += 1;
    }
  }

  return delivered;
}

export function getEngagementStats() {
  return {
    pendingLocalReminders: localReminders.filter((r) => r.status === 'pending').length,
    remindersPersisted: remindersPersist,
    pollsPersisted: pollsPersist,
  };
}
