/**
 * src/group-sync.js
 * Pure helpers for reconciling WhatsApp groups into the dashboard database.
 *
 * The dashboard is the source of truth for what the owner sees and configures.
 * These helpers exist so that reconciliation is:
 *   1. Non-destructive — a group row is NEVER deleted just because the bot lost
 *      admin rights; only the WhatsApp-owned `bot_is_admin` flag changes.
 *   2. Recovering — a group the bot is still active in is always (re)upserted,
 *      so it reappears on the dashboard even after a missed promote/demote event.
 *   3. Safe — user-owned settings (whitelist, rules, schedules, timetables) are
 *      never overwritten; defaults are only seeded for brand-new rows.
 */

export const NEW_GROUP_DEFAULTS = {
  is_monitored: true,
  anti_link_enabled: true,
  auto_welcome_enabled: true,
  max_strikes: 3,
  schedule_enabled: false,
  auto_lock_time: '22:00',
  auto_open_time: '06:00',
  is_locked: false,
};

/**
 * Build the row to persist and the cache entry to hold for one participated group.
 *
 * @param {object}  args
 * @param {string}  args.jid          group JID
 * @param {object?} args.metadata     WhatsApp group metadata ({ subject, participants })
 * @param {object?} args.existingRow  current cached/DB row (null when brand-new to us)
 * @param {boolean} args.isAdmin      whether the bot is an admin in this group
 * @param {string?} args.now          ISO timestamp override (for tests)
 * @returns {{ upsert: object, cacheEntry: object, isNew: boolean }}
 */
export function buildGroupUpsert({ jid, metadata = null, existingRow = null, isAdmin, now = new Date().toISOString() }) {
  const groupName = metadata?.subject || existingRow?.group_name || 'WhatsApp Group';
  const memberCount = metadata?.participants?.length ?? existingRow?.member_count ?? 0;

  // WhatsApp-owned metadata only — never user settings.
  const owned = {
    group_jid: jid,
    group_name: groupName,
    member_count: memberCount,
    bot_is_admin: Boolean(isAdmin),
    updated_at: now,
  };

  const isNew = !existingRow;

  // Seed defaults ONLY for brand-new rows, so an existing row's whitelist,
  // rules, schedules and timetables are never clobbered by a sync.
  const upsert = isNew ? { ...NEW_GROUP_DEFAULTS, ...owned } : { ...owned };
  const cacheEntry = isNew ? { ...NEW_GROUP_DEFAULTS, ...owned } : { ...existingRow, ...owned };

  return { upsert, cacheEntry, isNew };
}

/**
 * Build a minimal, non-destructive upsert used when a group is first seen via a
 * live message rather than via an event. It never asserts admin status and never
 * overwrites anything already stored (`ignoreDuplicates`).
 */
export function buildDiscoveryUpsert({ jid, groupName = 'WhatsApp Group', now = new Date().toISOString() }) {
  return {
    group_jid: jid,
    group_name: groupName,
    is_monitored: true,
    updated_at: now,
  };
}
