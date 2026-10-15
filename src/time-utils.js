/**
 * src/time-utils.js
 * Africa/Lagos (UTC+1, no DST) time helpers shared across the worker.
 */

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // UTC+1

/** Current HH:mm in Africa/Lagos, zero padded (e.g. "20:47"). */
export function lagosHHmm(date = new Date()) {
  return new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString().slice(11, 16);
}

/** "Friday 24 October 2026" style date line for Africa/Lagos. */
export function lagosDateLine(date = new Date()) {
  return new Date(date.getTime() + LAGOS_OFFSET_MS).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** ISO timestamp for midnight (00:00) of the current Lagos day. */
export function lagosDayStartIso(date = new Date()) {
  const lagosNow = new Date(date.getTime() + LAGOS_OFFSET_MS);
  const utcMidnightMinusLagosShift = Date.UTC(
    lagosNow.getUTCFullYear(),
    lagosNow.getUTCMonth(),
    lagosNow.getUTCDate()
  );
  return new Date(utcMidnightMinusLagosShift - LAGOS_OFFSET_MS).toISOString();
}

/**
 * True when the current Lagos time is inside [startHHmm, endHHmm] inclusive.
 * Zero-padded "HH:mm" strings compare correctly in lexicographic order.
 * Handles windows that wrap past midnight (e.g. "21:00"–"02:00").
 */
export function isWithinLagosHours(startHHmm, endHHmm, date = new Date()) {
  const now = lagosHHmm(date);
  if (startHHmm <= endHHmm) return now >= startHHmm && now <= endHHmm;
  return now >= startHHmm || now <= endHHmm;
}
