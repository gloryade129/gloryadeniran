/**
 * src/lib/gods-virtue-db.js
 * Supabase PostgreSQL + Upstash Redis data layer for God's Virtue
 * WhatsApp Bot Control Center.
 */

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

const DEFAULT_CONFIG = {
  id: 'primary',
  bot_name: "God's Virtue",
  is_active: true,
  is_connected: false,
  phone_number: null,
  account_name: "God's Virtue",
  profile_picture_url: null,
  pairing_code: null,
  pairing_requested_at: null,
  system_prompt: 'You are "God\'s Virtue", a wise, articulate, and uplifting AI assistant and WhatsApp group administrator. You converse with genuine Christian virtues, humility, and sound wisdom. You speak like a thoughtful, caring human—never robotic, without sterile disclaimers or walls of asterisks. Keep answers concise, natural, and helpful. STRICT EMOJI POLICY: Do NOT use emojis in your responses under any circumstances, unless the administrator explicitly trains or instructs you to use minimal and sensible emojis. In groups, you befriend members, answer questions politely when tagged, and gently maintain order.',
  temperature: 0.70,
  min_delay_ms: 2500,
  max_delay_ms: 6500,
  wpm_typing_speed: 45,
  burst_limit_per_min: 5,
  auto_reply_dms: true,
  group_mention_only: true,
  last_heartbeat: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Fallback in-memory cache when running in development without live Supabase
let memoryConfig = { ...DEFAULT_CONFIG };
let memoryGroups = [
  {
    group_jid: '120363028392817283@g.us',
    group_name: "Faith & Tech Innovators",
    is_monitored: true,
    anti_link_enabled: true,
    auto_welcome_enabled: true,
    welcome_message: "Welcome to Faith & Tech Innovators. We are glad to have you here. Please treat everyone with respect, avoid posting unsolicited external links, and feel free to reach out if you have any questions.",
    max_strikes: 3,
    member_count: 42,
    bot_is_admin: true,
    is_locked: false,
    schedule_enabled: false,
    auto_lock_time: "22:00",
    auto_open_time: "06:00",
    instructions: "General tech discussions and wholesome fellowship.",
    updated_at: new Date().toISOString()
  }
];
let memoryContacts = [];
let memoryActions = [];
let memoryLogs = [];
let memoryViolations = [];
let memoryAnnouncements = [];

/**
 * 1. Fetch Global Bot Configuration
 */
export async function getBotConfig() {
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_config?id=eq.primary&select=*&limit=1`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows[0];
        }
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase getBotConfig error, using fallback:', e.message);
    }
  }

  return memoryConfig;
}

/**
 * 2. Update Global Bot Configuration
 */
export async function updateBotConfig(updates) {
  const now = new Date().toISOString();
  const payload = { ...updates, updated_at: now };

  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_config?id=eq.primary`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          memoryConfig = rows[0];
          return rows[0];
        }
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase updateBotConfig error:', e.message);
    }
  }

  memoryConfig = { ...memoryConfig, ...payload };
  return memoryConfig;
}

/**
 * 3. Request WhatsApp 8-digit Pairing Code
 */
export async function requestPairingCode(phoneNumber) {
  const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    throw new Error('Valid phone number with country code is required.');
  }

  return await updateBotConfig({
    phone_number: cleanPhone,
    pairing_code: null,
    pairing_requested_at: new Date().toISOString(),
  });
}

/**
 * 4. Toggle Master Emergency Kill-Switch
 */
export async function toggleKillSwitch(isActive) {
  return await updateBotConfig({
    is_active: Boolean(isActive),
  });
}

/**
 * 5. Get Groups (Participating and Monitored)
 */
export async function getMonitoredGroups() {
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_groups?select=*&order=updated_at.desc`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase getMonitoredGroups error:', e.message);
    }
  }

  return memoryGroups;
}

/**
 * 6. Update Group Settings, Schedules & Whitelist Status
 */
export async function updateGroupSettings(groupJid, settings) {
  const now = new Date().toISOString();
  const payload = { ...settings, updated_at: now };

  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_groups?group_jid=eq.${encodeURIComponent(groupJid)}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const rows = await res.json();
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : payload;
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase updateGroupSettings error:', e.message);
    }
  }

  const idx = memoryGroups.findIndex(g => g.group_jid === groupJid);
  if (idx >= 0) {
    memoryGroups[idx] = { ...memoryGroups[idx], ...payload };
    return memoryGroups[idx];
  } else {
    const newGroup = { group_jid: groupJid, group_name: 'WhatsApp Group', ...payload };
    memoryGroups.unshift(newGroup);
    return newGroup;
  }
}

/**
 * 7. Queue Realtime Operational Directive (Lock/Unlock, Sync, etc.)
 */
export async function queueGroupAction(actionType, targetJid, payload = {}) {
  const item = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    action_type: actionType,
    target_jid: targetJid,
    payload,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_actions`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const rows = await res.json();
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : item;
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase queueGroupAction error:', e.message);
    }
  }

  memoryActions.unshift(item);
  return item;
}

/**
 * 8. Get Contacts
 */
export async function getContacts({ limit = 100 } = {}) {
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_contacts?select=*&order=name.asc&limit=${limit}`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase getContacts error:', e.message);
    }
  }

  return memoryContacts.slice(0, limit);
}

/**
 * 9. Upsert Synced Contacts
 */
export async function upsertContacts(contacts) {
  if (!Array.isArray(contacts) || contacts.length === 0) return [];
  const now = new Date().toISOString();
  const formatted = contacts.map(c => ({
    jid: c.jid || c.id,
    name: c.name || c.notify || 'Contact',
    phone: (c.jid || c.id || '').split('@')[0],
    is_business: Boolean(c.is_business),
    updated_at: now,
  }));

  if (isSupabaseConfigured()) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/gods_virtue_contacts`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(formatted),
      });
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase upsertContacts error:', e.message);
    }
  }

  memoryContacts = formatted;
  return formatted;
}

/**
 * 10. Get Message Audit Logs
 */
export async function getAuditLogs({ limit = 50, filter = null } = {}) {
  if (isSupabaseConfigured()) {
    try {
      let query = `select=*&order=created_at.desc&limit=${limit}`;
      if (filter === 'group') query += `&is_group=eq.true`;
      if (filter === 'dm') query += `&is_group=eq.false`;
      if (filter === 'violation') query += `&status=eq.violation`;

      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_logs?${query}`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase getAuditLogs error:', e.message);
    }
  }

  return memoryLogs.slice(0, limit);
}

/**
 * 11. Insert Audit Log
 */
export async function createAuditLog(logData) {
  const item = {
    ...logData,
    id: logData.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/gods_virtue_logs`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase createAuditLog error:', e.message);
    }
  }

  memoryLogs.unshift(item);
  if (memoryLogs.length > 200) memoryLogs.pop();
  return item;
}

/**
 * 12. Get Group Violations & Strikes
 */
export async function getViolations({ limit = 50 } = {}) {
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_violations?select=*&order=created_at.desc&limit=${limit}`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase getViolations error:', e.message);
    }
  }

  return memoryViolations.slice(0, limit);
}

/**
 * 13. Get Announcements
 */
export async function getAnnouncements() {
  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_announcements?select=*&order=created_at.desc&limit=50`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase getAnnouncements error:', e.message);
    }
  }

  return memoryAnnouncements;
}

/**
 * 14. Create / Schedule Broadcast Announcement
 */
export async function createAnnouncement({ target_group_jid, target_group_name, title, announcement_text, scheduled_at }) {
  const item = {
    id: `ann-${Date.now()}`,
    target_group_jid: target_group_jid || null,
    target_group_name: target_group_name || 'All Monitored Groups',
    title: title || 'Group Broadcast',
    announcement_text,
    scheduled_at: scheduled_at || new Date().toISOString(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/gods_virtue_announcements`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) return rows[0];
      }
    } catch (e) {
      console.warn('[gods-virtue-db] Supabase createAnnouncement error:', e.message);
    }
  }

  memoryAnnouncements.unshift(item);
  return item;
}
