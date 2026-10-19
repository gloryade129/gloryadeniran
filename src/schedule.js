/**
 * src/schedule.js
 * Pure helpers for the daily auto lock / open schedule.
 *
 * Extracted from index.js so the behaviour can be tested without a WhatsApp
 * socket. Two bugs motivated this:
 *   • exact `HH:mm === HH:mm` matching missed the slot whenever a deploy or a
 *     slow 10s loop crossed the minute;
 *   • a stale `is_locked` flag (reset by a reconnect) meant the open branch
 *     never fired, leaving a group locked forever.
 */

/** Parses "22:00" or "22:00:00" into minutes since midnight, or null. */
export function parseHhmm(value) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes elapsed since `target` today; null when either value is invalid. */
export function minutesSince(target, nowHHmm) {
  const targetMinutes = parseHhmm(target);
  const nowMinutes = parseHhmm(nowHHmm);
  if (targetMinutes === null || nowMinutes === null) return null;
  return nowMinutes - targetMinutes;
}

/**
 * Chooses at most one action for a group.
 *
 * @param {object} args
 * @param {string} args.nowHHmm          current Lagos time, "HH:mm"
 * @param {string} args.autoLockTime     "22:00"
 * @param {string} args.autoOpenTime     "06:00"
 * @param {boolean} args.isLocked        last known lock state
 * @param {number} [args.catchupMinutes] how late a missed slot may still fire
 * @returns {{ action: 'lock'|'open'|null, delta: number|null }}
 */
export function decideScheduleAction({
  nowHHmm,
  autoLockTime,
  autoOpenTime,
  isLocked,
  catchupMinutes = 180,
}) {
  const lockDelta = minutesSince(autoLockTime, nowHHmm);
  const openDelta = minutesSince(autoOpenTime, nowHHmm);

  const lockInWindow = lockDelta !== null && lockDelta >= 0 && lockDelta <= catchupMinutes;
  const openInWindow = openDelta !== null && openDelta >= 0 && openDelta <= catchupMinutes;

  // If both targets fall in the catch-up window, act on the most recent one.
  const preferLock = lockInWindow && (!openInWindow || lockDelta <= openDelta);

  if (preferLock && !isLocked) return { action: 'lock', delta: lockDelta };
  if (openInWindow && !preferLock && isLocked) return { action: 'open', delta: openDelta };
  return { action: null, delta: null };
}

/** Stable per-day slot key so a guard survives the 10s loop. */
export function scheduleSlotKey(groupJid, dateStr, action) {
  return `${groupJid}_${dateStr}_${action}`;
}
