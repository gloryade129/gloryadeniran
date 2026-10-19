/**
 * Tests for the daily auto lock/open scheduler.
 * Run with: npm test
 *
 * Regression locks:
 *   • "22:00:00" (Postgres time) must parse exactly like "22:00".
 *   • A slot crossed by a deploy/restart still fires (catch-up window).
 *   • A stale `is_locked` flag can no longer wedge a group closed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHhmm, minutesSince, decideScheduleAction, scheduleSlotKey } from '../src/schedule.js';

test('parseHhmm accepts HH:mm and HH:mm:ss', () => {
  assert.equal(parseHhmm('22:00'), 22 * 60);
  assert.equal(parseHhmm('22:00:00'), 22 * 60);
  assert.equal(parseHhmm('06:05'), 6 * 60 + 5);
  assert.equal(parseHhmm('bad'), null);
  assert.equal(parseHhmm('25:00'), null);
  assert.equal(parseHhmm('12:99'), null);
});

test('minutesSince reports elapsed minutes and null for bad input', () => {
  assert.equal(minutesSince('22:00', '22:30'), 30);
  assert.equal(minutesSince('06:00', '05:30'), -30);
  assert.equal(minutesSince('nope', '10:00'), null);
});

test('a group locks at its lock time', () => {
  const decision = decideScheduleAction({
    nowHHmm: '22:00',
    autoLockTime: '22:00',
    autoOpenTime: '06:00',
    isLocked: false,
  });
  assert.equal(decision.action, 'lock');
});

test('a missed lock still fires inside the catch-up window', () => {
  const decision = decideScheduleAction({
    nowHHmm: '23:30',
    autoLockTime: '22:00',
    autoOpenTime: '06:00',
    isLocked: false,
  });
  assert.equal(decision.action, 'lock');
});

test('a lock older than the catch-up window is ignored', () => {
  const decision = decideScheduleAction({
    nowHHmm: '01:30',
    autoLockTime: '22:00',
    autoOpenTime: '06:00',
    isLocked: false,
  });
  assert.equal(decision.action, null);
});

test('a locked group opens at its open time', () => {
  const decision = decideScheduleAction({
    nowHHmm: '06:00',
    autoLockTime: '22:00',
    autoOpenTime: '06:00',
    isLocked: true,
  });
  assert.equal(decision.action, 'open');
});

test('a missed open still fires after a restart', () => {
  const decision = decideScheduleAction({
    nowHHmm: '07:15',
    autoLockTime: '22:00',
    autoOpenTime: '06:00',
    isLocked: true,
  });
  assert.equal(decision.action, 'open');
});

test('an already-open group is not opened again', () => {
  const decision = decideScheduleAction({
    nowHHmm: '06:00',
    autoLockTime: '22:00',
    autoOpenTime: '06:00',
    isLocked: false,
  });
  assert.equal(decision.action, null);
});

test('when both slots are in the window the most recent wins', () => {
  const decision = decideScheduleAction({
    nowHHmm: '06:30',
    autoLockTime: '06:00',
    autoOpenTime: '05:00',
    isLocked: false,
  });
  assert.equal(decision.action, 'lock');
});

test('a group with no valid schedule stays untouched', () => {
  const decision = decideScheduleAction({
    nowHHmm: '12:00',
    autoLockTime: '',
    autoOpenTime: 'nonsense',
    isLocked: true,
  });
  assert.equal(decision.action, null);
});

test('slot keys are stable per day and action', () => {
  assert.equal(scheduleSlotKey('g@g.us', '19/10/2026', 'lock'), 'g@g.us_19/10/2026_lock');
});
