/**
 * src/timetable.js
 * Lecture-timetable intelligence for God's Virtue.
 *
 * A group can have ONE timetable row (e.g. the IFT interactive group). The row
 * holds both semesters parsed from an uploaded PDF, the currently active
 * semester, and per-group reminder times. This module:
 *   1. Caches timetables in memory (refreshed with the config sync),
 *   2. Parses freshly uploaded PDFs with Gemini and stores the result,
 *   3. Builds the nightly "tomorrow's lectures" and morning "today's lectures"
 *      notes that ride along with the group lock recap / open greeting,
 *   4. Produces the timetable context injected into the AI so it can answer
 *      "which courses do we have today?" inside the group it moderates,
 *   5. Diffs an old vs new parse so a re-upload can announce what changed.
 *
 * Storage: `gods_virtue_timetables` in Supabase (graceful in-memory fallback
 * when the migration has not been applied yet).
 */

import { lagosWeekdayKey, lagosShortDate, addDays } from './time-utils.js';
import { extractTimetableFromPdf } from './ai-engine.js';

const TABLE = 'gods_virtue_timetables';

// Stored columns only — never pull `pdf_base64` into the light cache.
const SELECT_COLS =
  'group_jid,label,semester,schedule,notes,is_active,night_reminder_time,morning_reminder_time,source_filename,status,parse_error,uploaded_at,updated_at';

export const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAYS = DAY_ORDER.slice(0, 5);

let supabaseClient = null;
let persistEnabled = true;

// groupJid -> timetable row
const timetableCache = new Map();

export function bindTimetableClient(supabase) {
  supabaseClient = supabase || null;
}

function handlePersistError(err) {
  const msg = err?.message || String(err);
  if (/does not exist|schema cache|42P01|Could not find the table/i.test(msg)) {
    persistEnabled = false;
    console.warn(
      `[timetable] "${TABLE}" table not found in Supabase — apply the gods-virtue schema migration. ` +
      'Timetables will not persist until then.'
    );
  } else {
    console.warn('[timetable] Persistence warning:', msg);
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────────

const pad2 = (n) => String(n).padStart(2, '0');

/** Accepts "8:00", "08:00", "8.00", "0800" etc. and returns "HH:mm" or null. */
function toHHmm(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  let m = raw.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
  if (!m) {
    m = raw.match(/^(\d{3,4})$/); // e.g. "0800"
    if (m) {
      const digits = m[1].padStart(4, '0');
      m = [raw, digits.slice(0, 2), digits.slice(2, 4)];
    } else {
      return null;
    }
  }
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[3] || '').toLowerCase();
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${pad2(h)}:${pad2(min)}`;
}

function normalizeLecture(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const code = String(raw.code || raw.course_code || '').trim();
  const title = String(raw.title || raw.course_title || raw.name || '').trim();
  const venue = String(raw.venue || raw.room || raw.location || '').trim();
  const start = toHHmm(raw.start || raw.start_time);
  const end = toHHmm(raw.end || raw.end_time);
  if (!code && !title) return null;
  return { code, title, venue, start: start || '', end: end || '' };
}

/**
 * Coerces whatever the model returned into the canonical shape:
 * { harmattan: { monday: [...], ... }, rain: {...} }
 */
export function normalizeSchedule(raw) {
  const out = {};
  for (const sem of ['harmattan', 'rain']) {
    const src = raw?.[sem] || raw?.semesters?.[sem] || {};
    out[sem] = {};
    for (const day of DAY_ORDER) {
      const list = Array.isArray(src?.[day]) ? src[day] : [];
      out[sem][day] = list
        .map(normalizeLecture)
        .filter((l) => l && (l.start || l.title || l.code))
        .sort((a, b) => String(a.start).localeCompare(String(b.start)));
    }
  }
  return out;
}

// ─── Cache / load ─────────────────────────────────────────────────────────────

export function setTimetableRow(row) {
  if (row?.group_jid) timetableCache.set(row.group_jid, row);
}

export function getTimetableRow(groupJid) {
  return timetableCache.get(groupJid) || null;
}

export async function loadTimetables() {
  if (!supabaseClient || !persistEnabled) return;
  try {
    const { data, error } = await supabaseClient.from(TABLE).select(SELECT_COLS);
    if (error) throw error;
    timetableCache.clear();
    for (const row of data || []) {
      if (row?.group_jid) timetableCache.set(row.group_jid, row);
    }
    console.log(`[timetable] Loaded ${timetableCache.size} timetable(s).`);
  } catch (err) {
    handlePersistError(err);
  }
}

export function getTimetableStats() {
  return { groups: timetableCache.size, persistEnabled };
}

function isActive(row) {
  return Boolean(row) && row.is_active !== false && (row.status === 'active' || row.status === undefined || row.status === null);
}

export function getSemesterKey(row) {
  return row?.semester === 'rain' ? 'rain' : 'harmattan';
}

function semesterLabel(key) {
  return key === 'rain' ? 'Rain (second) semester' : 'Harmattan (first) semester';
}

function dayLectures(row, dayKey) {
  const sem = getSemesterKey(row);
  return row?.schedule?.[sem]?.[dayKey] || [];
}

// ─── Public date lookups ──────────────────────────────────────────────────────

/**
 * @returns {{ active: boolean, dayKey: string, lectures: Array }}
 */
export function getLecturesForDate(groupJid, date = new Date()) {
  const row = getTimetableRow(groupJid);
  const dayKey = lagosWeekdayKey(date);
  if (!isActive(row)) return { active: false, dayKey, lectures: [] };
  return { active: true, dayKey, lectures: dayLectures(row, dayKey) };
}

/** True when the group has a usable, active timetable. */
export function hasActiveTimetable(groupJid) {
  return isActive(getTimetableRow(groupJid));
}

export function getReminderTimes(groupJid) {
  const row = getTimetableRow(groupJid);
  return {
    night: row?.night_reminder_time || '21:00',
    morning: row?.morning_reminder_time || '06:00',
  };
}

// ─── Message builders ─────────────────────────────────────────────────────────

function lectureLine(l) {
  const title = l.title ? ` ${l.title}` : '';
  const venue = l.venue ? ` — ${l.venue}` : '';
  const time = l.start && l.end ? `${l.start}–${l.end}  ` : '';
  return `• ${time}${l.code}${title}${venue}`.replace(/\s{2,}/g, ' ').trim();
}

/** Nightly note: tomorrow's lectures. Returns '' when the group has none. */
export function buildNightReminder(groupJid, date = new Date()) {
  const row = getTimetableRow(groupJid);
  if (!isActive(row)) return '';
  const target = addDays(date, 1);
  const heading = `*TOMORROW'S LECTURES — ${lagosShortDate(target)}*`;
  const lectures = dayLectures(row, lagosWeekdayKey(target));
  if (lectures.length === 0) {
    return `${heading}\nNothing on the timetable tomorrow.`;
  }
  return `${heading}\n${lectures.map(lectureLine).join('\n')}`;
}

/** Morning note: today's lectures. Returns '' when the group has none. */
export function buildMorningReminder(groupJid, date = new Date()) {
  const row = getTimetableRow(groupJid);
  if (!isActive(row)) return '';
  const heading = `*TODAY'S LECTURES — ${lagosShortDate(date)}*`;
  const lectures = dayLectures(row, lagosWeekdayKey(date));
  if (lectures.length === 0) {
    return `${heading}\nNo lectures today. Enjoy the break.`;
  }
  const first = lectures[0];
  const firstLine = first?.start ? `\n\nFirst class starts at ${first.start}.` : '';
  return `${heading}\n${lectures.map(lectureLine).join('\n')}${firstLine}`;
}

/**
 * Context block injected into the AI for THIS group only, so it can answer
 * schedule questions ("which courses today?", "where is IFT 203?").
 */
export function buildTimetableContext(groupJid, date = new Date()) {
  const row = getTimetableRow(groupJid);
  if (!isActive(row)) return '';

  const semKey = getSemesterKey(row);
  const fmtDay = (d) => {
    const lectures = dayLectures(row, lagosWeekdayKey(d));
    if (!lectures.length) return 'none';
    return lectures
      .map((l) => `${l.start}-${l.end} ${l.code}${l.title ? ' ' + l.title : ''} (${l.venue || 'venue TBA'})`)
      .join('; ');
  };

  const week = WEEKDAYS.map((d) => `  ${d[0].toUpperCase()}${d.slice(1)}: ${fmtDay(nextDayNamed(date, d))}`).join('\n');
  const tomorrow = addDays(date, 1);

  return (
    `LECTURE TIMETABLE FOR THIS GROUP — ${row.label || 'this class set'} (${semesterLabel(semKey)}). ` +
    `This timetable applies ONLY to this group; never share it for other groups and never guess beyond it.\n` +
    `  Today (${lagosShortDate(date)}): ${fmtDay(date)}\n` +
    `  Tomorrow (${lagosShortDate(tomorrow)}): ${fmtDay(tomorrow)}\n` +
    `  This week:\n${week}\n` +
    `If a member asks which courses/classes hold today, tomorrow or this week, or when/where a course meets, ` +
    `answer from these facts in a short, natural way (never invent a room, time or course that is not listed).`
  );
}

/** Returns the Date of the next occurrence of a named weekday from `from`. */
function nextDayNamed(from, dayKey) {
  const target = DAY_ORDER.indexOf(dayKey);
  const current = DAY_ORDER.indexOf(lagosWeekdayKey(from));
  const delta = (target - current + 7) % 7;
  return addDays(from, delta);
}

// ─── Diffing (for the change announcement) ────────────────────────────────────

function lectureKey(l) {
  return `${l.code} ${l.start}-${l.end}${l.venue ? ' (' + l.venue + ')' : ''}`.trim();
}

/** Human-readable list of changes between two schedules (both semesters). */
export function diffSchedules(oldSchedule, newSchedule) {
  const changes = [];
  const semLabel = { harmattan: 'Harmattan', rain: 'Rain' };
  for (const sem of ['harmattan', 'rain']) {
    for (const day of DAY_ORDER) {
      const oldKeys = (oldSchedule?.[sem]?.[day] || []).map(lectureKey);
      const newKeys = (newSchedule?.[sem]?.[day] || []).map(lectureKey);
      for (const k of newKeys) {
        if (!oldKeys.includes(k)) changes.push(`Added — ${semLabel[sem]} ${cap(day)}: ${k}`);
      }
      for (const k of oldKeys) {
        if (!newKeys.includes(k)) changes.push(`Removed — ${semLabel[sem]} ${cap(day)}: ${k}`);
      }
    }
  }
  return changes;
}

function cap(s) {
  return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
}

// ─── Pending-upload processing ─────────────────────────────────────────────────

async function announceTimetableChange({ sock, groupJid, changes, label }) {
  if (!sock?.user) return;
  const lines = changes.slice(0, 12).map((c) => `• ${c}`).join('\n');
  const more = changes.length > 12 ? `\n…and ${changes.length - 12} more change(s).` : '';
  const text =
    `*LECTURE TIMETABLE UPDATED*\n\n` +
    `There's been a change to the ${label || 'class'} timetable:\n${lines}${more}\n\n` +
    `Ask me anytime what we have for the day.`;
  try {
    await sock.sendMessage(groupJid, { text });
    console.log(`[timetable] Announced ${changes.length} timetable change(s) to ${groupJid}.`);
  } catch (err) {
    console.warn('[timetable] Change announcement failed:', err.message);
  }
}

async function markFailed(groupJid, reason) {
  console.warn(`[timetable] Parse failed for ${groupJid}: ${reason}`);
  setTimetableRow({ ...(getTimetableRow(groupJid) || {}), group_jid: groupJid, status: 'failed', parse_error: reason });
  if (!supabaseClient || !persistEnabled) return;
  try {
    await supabaseClient
      .from(TABLE)
      .update({ status: 'failed', parse_error: String(reason).slice(0, 500), pdf_base64: null, updated_at: new Date().toISOString() })
      .eq('group_jid', groupJid);
  } catch (err) {
    handlePersistError(err);
  }
}

/**
 * Parses any timetable row flagged `pending_parse` (a PDF uploaded from the
 * dashboard). On success it stores the parsed schedule, clears the raw PDF and
 * announces the diff inside the group. Called from the worker's main loop.
 */
export async function processPendingTimetables({ sock = null } = {}) {
  if (!supabaseClient || !persistEnabled) return;

  let rows = [];
  try {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('*')
      .eq('status', 'pending_parse')
      .limit(3);
    if (error) throw error;
    rows = data || [];
  } catch (err) {
    handlePersistError(err);
    return;
  }

  for (const row of rows) {
    const groupJid = row.group_jid;
    if (!row.pdf_base64) {
      await markFailed(groupJid, 'No PDF data was attached to the upload.');
      continue;
    }

    console.log(`[timetable] Parsing uploaded PDF for ${groupJid} (${row.source_filename || 'timetable.pdf'})...`);
    const result = await extractTimetableFromPdf({
      buffer: Buffer.from(row.pdf_base64, 'base64'),
      mimeType: 'application/pdf',
      filename: row.source_filename || 'timetable.pdf',
    });

    if (!result.ok) {
      await markFailed(groupJid, result.error || 'AI could not read the PDF.');
      continue;
    }

    const newSchedule = normalizeSchedule(result.data?.semesters || result.data?.schedule || {});
    const oldSchedule = row.schedule && Object.keys(row.schedule).length ? row.schedule : null;
    const changes = oldSchedule ? diffSchedules(oldSchedule, newSchedule) : [];

    const notes = Array.isArray(result.data?.notes)
      ? result.data.notes.join('\n')
      : (typeof result.data?.notes === 'string' ? result.data.notes : null);

    const update = {
      schedule: newSchedule,
      label: result.data?.label || row.label || null,
      notes,
      semester: row.semester === 'rain' ? 'rain' : 'harmattan',
      status: 'active',
      parse_error: null,
      pdf_base64: null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: saved, error: saveErr } = await supabaseClient
        .from(TABLE)
        .update(update)
        .eq('group_jid', groupJid)
        .select(SELECT_COLS)
        .single();
      if (saveErr) throw saveErr;
      setTimetableRow(saved);
    } catch (err) {
      handlePersistError(err);
      continue;
    }

    console.log(`[timetable] Stored parsed timetable for ${groupJid}.`);

    if (sock && changes.length > 0) {
      await announceTimetableChange({ sock, groupJid, changes, label: update.label });
    }
  }
}
