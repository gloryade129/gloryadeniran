/**
 * Tests for src/timetable.js — lecture reminder/context builders.
 * Run with: node --test test/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setTimetableRow,
  buildNightReminder,
  buildMorningReminder,
  buildTimetableContext,
  hasActiveTimetable,
  getReminderTimes,
  normalizeSchedule,
  diffSchedules,
} from '../src/timetable.js';

const G = '120363000000000000@g.us';

setTimetableRow({
  group_jid: G,
  label: 'IFT 200 Level — 2025/2026 Set',
  semester: 'harmattan',
  status: 'active',
  is_active: true,
  night_reminder_time: '21:00',
  morning_reminder_time: '06:00',
  schedule: normalizeSchedule({
    harmattan: {
      monday: [{ code: 'COS 201', title: 'Computer Programming 1', start: '10:00', end: '12:00', venue: 'LR 2' }],
      tuesday: [
        { code: 'UIL-IFT 201', title: 'Use of Library', start: '10:00', end: '12:00', venue: 'CISLT' },
        { code: 'COS 201', title: 'Computer Programming 1', start: '12:00', end: '14:00', venue: 'CISLT' },
      ],
      friday: [],
    },
    rain: {
      monday: [{ code: 'UIL-IFT 204', title: 'Library', start: '08:00', end: '10:00', venue: 'LR 4' }],
    },
  }),
});

const MONDAY = new Date('2026-10-19T12:00:00Z');
const FRIDAY = new Date('2026-10-16T12:00:00Z');
const SUNDAY = new Date('2026-10-18T12:00:00Z');

test('active timetable is detected with its reminder times', () => {
  assert.equal(hasActiveTimetable(G), true);
  assert.deepEqual(getReminderTimes(G), { night: '21:00', morning: '06:00' });
});

test('morning reminder lists today\'s lectures with a first-class line', () => {
  const msg = buildMorningReminder(G, MONDAY);
  assert.match(msg, /TODAY'S LECTURES/);
  assert.match(msg, /COS 201/);
  assert.match(msg, /First class starts at 10:00/);
});

test('night reminder lists tomorrow\'s lectures', () => {
  const msg = buildNightReminder(G, SUNDAY);
  assert.match(msg, /TOMORROW'S LECTURES/);
  assert.match(msg, /COS 201/);
});

test('free days get a short no-lectures note', () => {
  const night = buildNightReminder(G, FRIDAY); // Friday -> Saturday (empty)
  assert.match(night, /Nothing on the timetable tomorrow/);
  const morning = buildMorningReminder(G, FRIDAY);
  assert.match(morning, /No lectures today/);
});

test('context block is scoped to this group and lists the week', () => {
  const ctx = buildTimetableContext(G, MONDAY);
  assert.match(ctx, /LECTURE TIMETABLE FOR THIS GROUP/);
  assert.match(ctx, /only to this group/i);
  assert.match(ctx, /Tuesday: .*UIL-IFT 201/);
});

test('a group with no timetable produces no reminders or context', () => {
  assert.equal(buildTimetableContext('999@g.us'), '');
  assert.equal(buildNightReminder('999@g.us'), '');
  assert.equal(buildMorningReminder('999@g.us'), '');
  assert.equal(hasActiveTimetable('999@g.us'), false);
});

test('a pending_parse row is not treated as active', () => {
  setTimetableRow({ group_jid: 'pending@g.us', status: 'pending_parse', is_active: true, schedule: { harmattan: {} } });
  assert.equal(hasActiveTimetable('pending@g.us'), false);
  assert.equal(buildMorningReminder('pending@g.us'), '');
});

test('diffSchedules reports added and removed lectures', () => {
  const changes = diffSchedules(
    { harmattan: { monday: [{ code: 'COS 201', start: '10:00', end: '12:00', venue: 'LR 2' }] } },
    { harmattan: { monday: [{ code: 'COS 201', start: '12:00', end: '14:00', venue: 'LR 5' }] } },
  );
  assert.equal(changes.length, 2);
  assert.ok(changes.some((c) => c.includes('Added') && c.includes('LR 5')));
  assert.ok(changes.some((c) => c.includes('Removed') && c.includes('LR 2')));
});
