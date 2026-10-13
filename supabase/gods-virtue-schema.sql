-- ============================================================================
-- GOD'S VIRTUE: WhatsApp AI Assistant & Group Moderation Engine
-- Database Architecture & Supabase Schema Migration: gods-virtue-schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Table: gods_virtue_config
-- Global bot parameters, kill-switch, anti-ban timing, and master persona prompt
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'primary',
    bot_name VARCHAR(100) NOT NULL DEFAULT 'God''s Virtue',
    is_active BOOLEAN NOT NULL DEFAULT true,             -- Master emergency kill switch
    is_connected BOOLEAN NOT NULL DEFAULT false,        -- Live WhatsApp socket status
    phone_number VARCHAR(30) DEFAULT NULL,               -- Connected bot phone number
    account_name VARCHAR(150) DEFAULT NULL,              -- WhatsApp pushname / display name
    profile_picture_url TEXT DEFAULT NULL,               -- Profile picture if synced
    pairing_code VARCHAR(20) DEFAULT NULL,               -- Active 8-digit linking code
    pairing_requested_at TIMESTAMPTZ DEFAULT NULL,
    system_prompt TEXT NOT NULL DEFAULT 'You are "God''s Virtue", a wise, articulate, and uplifting AI assistant and WhatsApp group administrator. You converse with genuine Christian virtues, humility, and sound wisdom. You speak like a thoughtful, caring human—never robotic, without sterile disclaimers or walls of asterisks. Keep answers concise, natural, and helpful. STRICT EMOJI POLICY: Do NOT use emojis in your responses under any circumstances, unless the administrator explicitly trains or instructs you to use minimal and sensible emojis. In groups, you befriend members, answer questions politely when tagged, and gently maintain order.',
    temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.70,
    min_delay_ms INTEGER NOT NULL DEFAULT 2500,          -- Anti-ban: min latency before responding
    max_delay_ms INTEGER NOT NULL DEFAULT 6500,          -- Anti-ban: max latency
    wpm_typing_speed INTEGER NOT NULL DEFAULT 45,        -- Anti-ban: simulated typing speed (words/min)
    burst_limit_per_min INTEGER NOT NULL DEFAULT 5,      -- Max messages per chat per minute
    auto_reply_dms BOOLEAN NOT NULL DEFAULT true,        -- Reply in 1-on-1 private DMs
    group_mention_only BOOLEAN NOT NULL DEFAULT true,    -- Only reply in groups when tagged/quoted
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config if empty
INSERT INTO gods_virtue_config (
    id,
    bot_name,
    is_active,
    is_connected,
    system_prompt,
    temperature,
    min_delay_ms,
    max_delay_ms,
    wpm_typing_speed,
    burst_limit_per_min,
    auto_reply_dms,
    group_mention_only
) VALUES (
    'primary',
    'God''s Virtue',
    true,
    false,
    'You are "God''s Virtue", a wise, articulate, and uplifting AI assistant and WhatsApp group administrator. You converse with genuine Christian virtues, humility, and sound wisdom. You speak like a thoughtful, caring human—never robotic, without sterile disclaimers or walls of asterisks. Keep answers concise, natural, and helpful. STRICT EMOJI POLICY: Do NOT use emojis in your responses under any circumstances, unless the administrator explicitly trains or instructs you to use minimal and sensible emojis. In groups, you befriend members, answer questions politely when tagged, and gently maintain order.',
    0.70,
    2500,
    6500,
    45,
    5,
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Table: gods_virtue_sessions
-- Multi-device WhatsApp authentication keys (Baileys creds sync across restarts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_sessions (
    session_id VARCHAR(50) NOT NULL DEFAULT 'default',
    data_type VARCHAR(50) NOT NULL,                      -- 'creds' or 'key'
    key_id VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (session_id, key_id)
);

CREATE INDEX IF NOT EXISTS idx_gv_sessions_lookup ON gods_virtue_sessions(session_id, data_type, key_id);

-- ----------------------------------------------------------------------------
-- 3. Table: gods_virtue_groups
-- WhatsApp groups monitored by the bot, with individual rule toggles & schedules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_groups (
    group_jid VARCHAR(100) PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    is_monitored BOOLEAN NOT NULL DEFAULT true,          -- Whitelist: only monitored groups are processed
    anti_link_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_welcome_enabled BOOLEAN NOT NULL DEFAULT true,
    welcome_message TEXT DEFAULT 'Welcome to our community. We are glad to have you here. Please treat everyone with respect, avoid posting unsolicited external links, and feel free to reach out if you have any questions.',
    max_strikes INTEGER NOT NULL DEFAULT 3,
    custom_rules TEXT DEFAULT NULL,
    instructions TEXT DEFAULT NULL,                      -- Specific operational directives (e.g. topic rules)
    is_locked BOOLEAN NOT NULL DEFAULT false,           -- Current group announcement-only lock state
    schedule_enabled BOOLEAN NOT NULL DEFAULT false,     -- Enable automated daily lock/open schedule
    auto_lock_time VARCHAR(10) DEFAULT '22:00',          -- Daily lock time in HH:mm
    auto_open_time VARCHAR(10) DEFAULT '06:00',          -- Daily open time in HH:mm
    member_count INTEGER DEFAULT 0,
    bot_is_admin BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Table: gods_virtue_contacts
-- Linked WhatsApp contacts synced from the device
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_contacts (
    jid VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50),
    is_business BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gv_contacts_phone ON gods_virtue_contacts(phone);

-- ----------------------------------------------------------------------------
-- 5. Table: gods_virtue_actions
-- Realtime operational directives from Dashboard to Persistent Worker
-- (e.g. 'lock_group', 'open_group', 'sync_groups', 'sync_contacts')
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(50) NOT NULL,
    target_jid VARCHAR(100),
    payload JSONB DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',      -- 'pending', 'executed', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gv_actions_status ON gods_virtue_actions(status, created_at);

-- ----------------------------------------------------------------------------
-- 6. Table: gods_virtue_violations
-- Audit trail of warning strikes, deleted link messages, and member removals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_jid VARCHAR(100) NOT NULL REFERENCES gods_virtue_groups(group_jid) ON DELETE CASCADE,
    user_jid VARCHAR(100) NOT NULL,
    user_name VARCHAR(150),
    violation_type VARCHAR(50) NOT NULL,                -- 'link_spam', 'toxic_language', 'manual_warn'
    strike_count INTEGER NOT NULL DEFAULT 1,
    action_taken VARCHAR(50) NOT NULL,                  -- 'warned', 'message_deleted', 'member_removed'
    offending_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gv_violations_user ON gods_virtue_violations(group_jid, user_jid);
CREATE INDEX IF NOT EXISTS idx_gv_violations_time ON gods_virtue_violations(created_at DESC);

-- ----------------------------------------------------------------------------
-- 7. Table: gods_virtue_logs
-- Live message processing and AI decision audit stream
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_jid VARCHAR(100) NOT NULL,
    chat_name VARCHAR(255),
    is_group BOOLEAN NOT NULL DEFAULT false,
    sender_jid VARCHAR(100) NOT NULL,
    sender_name VARCHAR(150),
    incoming_text TEXT,
    reply_text TEXT,
    latency_ms INTEGER DEFAULT 0,
    simulated_typing_ms INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'replied',      -- 'replied', 'ignored', 'violation', 'rate_limited', 'error'
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gv_logs_time ON gods_virtue_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gv_logs_chat ON gods_virtue_logs(chat_jid);

-- ----------------------------------------------------------------------------
-- 8. Table: gods_virtue_announcements
-- Broadcast composer for sending and scheduling devotionals/announcements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gods_virtue_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_group_jid VARCHAR(100),                      -- NULL means broadcast to all monitored groups
    target_group_name VARCHAR(255) DEFAULT 'All Groups',
    title VARCHAR(200) NOT NULL,
    announcement_text TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ DEFAULT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',      -- 'pending', 'sent', 'failed'
    created_by VARCHAR(100) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gv_announcements_status ON gods_virtue_announcements(status, scheduled_at);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) & Role Grants
-- ----------------------------------------------------------------------------
ALTER TABLE gods_virtue_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE gods_virtue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gods_virtue_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE gods_virtue_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gods_virtue_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gods_virtue_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gods_virtue_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gods_virtue_announcements ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "gv_config_all" ON gods_virtue_config;
    CREATE POLICY "gv_config_all" ON gods_virtue_config FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "gv_sessions_all" ON gods_virtue_sessions;
    CREATE POLICY "gv_sessions_all" ON gods_virtue_sessions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "gv_groups_all" ON gods_virtue_groups;
    CREATE POLICY "gv_groups_all" ON gods_virtue_groups FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "gv_contacts_all" ON gods_virtue_contacts;
    CREATE POLICY "gv_contacts_all" ON gods_virtue_contacts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "gv_actions_all" ON gods_virtue_actions;
    CREATE POLICY "gv_actions_all" ON gods_virtue_actions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "gv_violations_all" ON gods_virtue_violations;
    CREATE POLICY "gv_violations_all" ON gods_virtue_violations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "gv_logs_all" ON gods_virtue_logs;
    CREATE POLICY "gv_logs_all" ON gods_virtue_logs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "gv_announcements_all" ON gods_virtue_announcements;
    CREATE POLICY "gv_announcements_all" ON gods_virtue_announcements FOR ALL USING (true) WITH CHECK (true);
END $$;
