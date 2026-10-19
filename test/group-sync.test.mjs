/**
 * Tests for src/group-sync.js — the non-destructive group reconciliation logic.
 * Run with: node --test test/
 *
 * These lock in the fix for the "demoted then re-promoted bot disappears from
 * the dashboard" bug: a group row must NEVER be deleted just because the bot
 * lost admin rights, user settings must be preserved, and a lost row must be
 * recoverable.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroupUpsert, buildDiscoveryUpsert, NEW_GROUP_DEFAULTS } from '../src/group-sync.js';

const JID = '120363000000000000@g.us';

const USER_SETTINGS_ROW = {
  group_jid: JID,
  group_name: 'IFT 200 Level',
  is_monitored: true,
  anti_link_enabled: true,
  auto_welcome_enabled: true,
  max_strikes: 3,
  schedule_enabled: true,
  auto_lock_time: '21:30',
  auto_open_time: '05:45',
  is_locked: false,
  bot_is_admin: true,
  instructions: 'Focus on academics',
  custom_rules: 'No adverts',
};

const METADATA = { subject: 'IFT 200 Level (2025/2026)', participants: [{ id: '1' }, { id: '2' }] };

test('demote keeps the row and all user settings (never deletes)', () => {
  const { upsert, cacheEntry, isNew } = buildGroupUpsert({
    jid: JID,
    metadata: METADATA,
    existingRow: { ...USER_SETTINGS_ROW },
    isAdmin: false,
    now: '2026-10-17T00:00:00.000Z',
  });

  assert.equal(isNew, false);
  // Admin flag is downgraded...
  assert.equal(upsert.bot_is_admin, false);
  assert.equal(cacheEntry.bot_is_admin, false);
  // ...but user-owned settings are NEVER sent in the write payload...
  assert.equal(upsert.is_monitored, undefined);
  assert.equal(upsert.instructions, undefined);
  assert.equal(upsert.custom_rules, undefined);
  assert.equal(upsert.schedule_enabled, undefined);
  // ...and survive in the cache entry.
  assert.equal(cacheEntry.is_monitored, true);
  assert.equal(cacheEntry.schedule_enabled, true);
  assert.equal(cacheEntry.auto_lock_time, '21:30');
  assert.equal(cacheEntry.instructions, 'Focus on academics');
});

test('re-promote flips the flag back and preserves settings', () => {
  const demoted = buildGroupUpsert({ jid: JID, metadata: METADATA, existingRow: { ...USER_SETTINGS_ROW }, isAdmin: false });
  const repromoted = buildGroupUpsert({ jid: JID, metadata: METADATA, existingRow: demoted.cacheEntry, isAdmin: true });

  assert.equal(repromoted.upsert.bot_is_admin, true);
  assert.equal(repromoted.cacheEntry.bot_is_admin, true);
  assert.equal(repromoted.upsert.is_monitored, undefined);
  assert.equal(repromoted.cacheEntry.schedule_enabled, true, 'schedule survives a demote→promote round-trip');
  assert.equal(repromoted.cacheEntry.auto_lock_time, '21:30');
  assert.equal(repromoted.cacheEntry.custom_rules, 'No adverts');
});

test('brand-new admin group is seeded with defaults and admin flag', () => {
  const { upsert, isNew } = buildGroupUpsert({ jid: JID, metadata: METADATA, existingRow: null, isAdmin: true });
  assert.equal(isNew, true);
  assert.equal(upsert.bot_is_admin, true);
  assert.equal(upsert.is_monitored, NEW_GROUP_DEFAULTS.is_monitored);
  assert.equal(upsert.anti_link_enabled, true);
  assert.equal(upsert.group_name, METADATA.subject);
  assert.equal(upsert.member_count, 2);
});

test('brand-new member group is visible but not admin', () => {
  const { upsert, cacheEntry } = buildGroupUpsert({ jid: JID, metadata: METADATA, existingRow: null, isAdmin: false });
  assert.equal(upsert.bot_is_admin, false);
  assert.equal(upsert.is_monitored, true, 'group still appears on the dashboard');
  assert.equal(cacheEntry.bot_is_admin, false);
});

test('a lost row (cache has it, DB does not) is recoverable by upsert', () => {
  // existingRow is provided => we take the non-defaulting branch, but the payload
  // always carries group_jid + group_name, so PostgREST will INSERT on conflict-free.
  const { upsert } = buildGroupUpsert({ jid: JID, metadata: METADATA, existingRow: { ...USER_SETTINGS_ROW }, isAdmin: true });
  assert.equal(upsert.group_jid, JID);
  assert.equal(typeof upsert.group_name, 'string');
  assert.ok(upsert.group_name.length > 0, 'group_name is NOT NULL, so it must always be present');
});

test('metadata fallbacks never produce an empty name', () => {
  const { upsert } = buildGroupUpsert({ jid: JID, metadata: null, existingRow: null, isAdmin: true });
  assert.equal(upsert.group_name, 'WhatsApp Group');
  assert.equal(upsert.member_count, 0);
});

test('discovery upsert is minimal and non-destructive', () => {
  const row = buildDiscoveryUpsert({ jid: JID, groupName: 'Fresh Group' });
  assert.equal(row.group_jid, JID);
  assert.equal(row.group_name, 'Fresh Group');
  assert.equal(row.is_monitored, true);
  assert.equal(row.bot_is_admin, undefined, 'does not assert admin status from a live message');
  assert.equal(row.instructions, undefined);
});
