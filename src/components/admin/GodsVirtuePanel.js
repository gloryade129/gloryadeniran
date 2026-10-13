'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './GodsVirtuePanel.module.css';

export default function GodsVirtuePanel() {
  const [subTab, setSubTab] = useState('pairing');
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Bot State & Config
  const [config, setConfig] = useState({
    bot_name: "God's Virtue",
    is_active: true,
    is_connected: false,
    phone_number: '',
    account_name: "God's Virtue",
    pairing_code: null,
    system_prompt: '',
    temperature: 0.70,
    min_delay_ms: 2500,
    max_delay_ms: 6500,
    wpm_typing_speed: 45,
    burst_limit_per_min: 5,
    auto_reply_dms: true,
    group_mention_only: true,
  });

  // Pairing Flow
  const [inputPhone, setInputPhone] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Groups & Moderation
  const [groups, setGroups] = useState([]);
  const [editingGroup, setEditingGroup] = useState(null);

  // Contacts
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');

  // Logs & Violations
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('all');

  // Broadcast Composer
  const [broadcastData, setBroadcastData] = useState({
    target_group_jid: '',
    title: '',
    announcement_text: '',
  });
  const [announcements, setAnnouncements] = useState([]);

  // AI Prompt Playground
  const [testMessage, setTestMessage] = useState('Hello God\'s Virtue. What advice do you have for someone starting a new venture?');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [testingAi, setTestingAi] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Initial Data Fetch
  const fetchAllData = useCallback(async () => {
    try {
      const [statusRes, groupsRes, contactsRes, logsRes, annRes] = await Promise.all([
        fetch('/api/gods-virtue/status'),
        fetch('/api/gods-virtue/groups'),
        fetch('/api/gods-virtue/contacts'),
        fetch(`/api/gods-virtue/logs?filter=${logFilter === 'all' ? '' : logFilter}`),
        fetch('/api/gods-virtue/broadcast'),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        if (sData.config) setConfig(sData.config);
      }
      if (groupsRes.ok) {
        const gData = await groupsRes.json();
        if (gData.groups) setGroups(gData.groups);
      }
      if (contactsRes.ok) {
        const cData = await contactsRes.json();
        if (cData.contacts) setContacts(cData.contacts);
      }
      if (logsRes.ok) {
        const lData = await logsRes.json();
        if (lData.logs) setLogs(lData.logs);
      }
      if (annRes.ok) {
        const aData = await annRes.json();
        if (aData.announcements) setAnnouncements(aData.announcements);
      }
    } catch (err) {
      console.warn('[GodsVirtuePanel] Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [logFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllData();
    }, 0);
    const interval = setInterval(fetchAllData, 6000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAllData]);

  // Toggle Master Kill Switch
  const handleToggleKillSwitch = async () => {
    const nextState = !config.is_active;
    try {
      const res = await fetch('/api/gods-virtue/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_kill_switch', isActive: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(prev => ({ ...prev, is_active: nextState }));
        showToast(nextState ? 'God\'s Virtue resumed auto-replies.' : 'Emergency Kill-Switch Activated: Auto-replies paused.');
      }
    } catch (err) {
      alert('Failed to toggle kill-switch: ' + err.message);
    }
  };

  // Request Pairing Code
  const handleRequestPairingCode = async (e) => {
    e.preventDefault();
    if (!inputPhone.trim()) {
      alert('Please enter your WhatsApp phone number with international country code (e.g. 2348012345678)');
      return;
    }
    setPairingLoading(true);
    try {
      const res = await fetch('/api/gods-virtue/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_pairing_code', phoneNumber: inputPhone }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pairing requested. Start the persistent bot worker to view your code.');
        fetchAllData();
      }
    } catch (err) {
      alert('Error requesting pairing code: ' + err.message);
    } finally {
      setPairingLoading(false);
    }
  };

  // Copy Pairing Code
  const copyPairingCode = () => {
    if (config.pairing_code) {
      navigator.clipboard.writeText(config.pairing_code.replace(/[^A-Za-z0-9]/g, ''));
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
      showToast('Copied pairing code to clipboard.');
    }
  };

  // Save AI Config
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/gods-virtue/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showToast('AI instructions and anti-ban settings saved.');
      }
    } catch (err) {
      alert('Failed to save config: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save Group Settings & Schedules
  const handleSaveGroup = async (groupJid, updates) => {
    // Optimistic UI update immediately
    setGroups(prev => prev.map(g => g.group_jid === groupJid ? { ...g, ...updates } : g));

    try {
      const res = await fetch('/api/gods-virtue/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_jid: groupJid, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Group settings updated.');
        if (data.group) {
          setGroups(prev => prev.map(g => g.group_jid === groupJid ? { ...g, ...data.group } : g));
        }
      } else {
        alert('Failed to update group: ' + (data.error || 'Server error'));
        fetchAllData();
      }
    } catch (err) {
      alert('Failed to update group: ' + err.message);
      fetchAllData();
    }
  };

  // Instant Group Action: Lock or Open Group, or Sync All
  const handleGroupAction = async (action, groupJid) => {
    try {
      const res = await fetch('/api/gods-virtue/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetJid: groupJid || null }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Action executed.');
        if (action === 'sync_all') {
          setTimeout(fetchAllData, 1500);
          setTimeout(fetchAllData, 4000);
        } else if (groupJid) {
          setGroups(prev => prev.map(g => g.group_jid === groupJid ? { ...g, is_locked: action === 'lock_group' } : g));
        }
      } else {
        alert(data.error || 'Failed to execute group action.');
      }
    } catch (err) {
      alert('Error triggering group action: ' + err.message);
    }
  };

  // Send / Schedule Broadcast
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastData.announcement_text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/gods-virtue/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Broadcast announcement queued successfully.');
        setBroadcastData({ target_group_jid: '', title: '', announcement_text: '' });
        fetchAllData();
      }
    } catch (err) {
      alert('Failed to broadcast: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Run AI Playground Test
  const handleTestPrompt = async () => {
    if (!testMessage.trim()) return;
    setTestingAi(true);
    setPlaygroundOutput('Evaluating prompt with configured virtues and wisdom...');
    try {
      const res = await fetch('/api/gods-virtue/test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: config.system_prompt,
          userMessage: testMessage,
          temperature: config.temperature,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPlaygroundOutput(data.reply);
      } else {
        setPlaygroundOutput(`[Error]: ${data.error}`);
      }
    } catch (err) {
      setPlaygroundOutput(`[Request Failed]: ${err.message}`);
    } finally {
      setTestingAi(false);
    }
  };

  const monitoredCount = groups.filter(g => g.is_monitored).length;
  const adminCount = groups.filter(g => g.bot_is_admin).length;
  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.phone || '').includes(contactSearch)
  );

  return (
    <div className={styles.panel}>
      {/* Toast Feedback */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--lime)',
          color: 'var(--white)',
          padding: '12px 20px',
          borderRadius: 6,
          fontSize: 12,
          fontFamily: 'var(--mono)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          {toastMsg}
        </div>
      )}

      {/* Top Master Status & Account Details Card */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <div className={styles.accountAvatar}>
            {(config.account_name || "GV").substring(0, 2).toUpperCase()}
          </div>

          <div className={styles.statusMeta}>
            <div className={styles.botTitle}>
              {config.account_name || config.bot_name || "God's Virtue"}
            </div>
            <div className={styles.botPhone}>
              {config.phone_number ? `+${config.phone_number}` : 'Account not linked'}
            </div>
          </div>

          {config.is_connected ? (
            <span className={styles.badgeLive}>
              <span className={styles.pulseDot} />
              CONNECTED_TO_WHATSAPP
            </span>
          ) : !config.is_active ? (
            <span className={styles.badgePaused}>
              <span className={styles.pulseDot} />
              EMERGENCY_PAUSED
            </span>
          ) : (
            <span className={styles.badgeOffline}>
              <span className={styles.pulseDot} />
              SOCKET_DISCONNECTED
            </span>
          )}
        </div>

        <div className={styles.statusRight}>
          <button
            onClick={handleToggleKillSwitch}
            className={`${styles.killSwitchBtn} ${config.is_active ? styles.killSwitchActive : styles.killSwitchPaused}`}
            title="Emergency Kill-Switch: Instantly pause or resume bot auto-replies"
          >
            {config.is_active ? '[PAUSE BOT]' : '[RESUME BOT]'}
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className={styles.metricsStrip}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>MONITORED GROUPS</span>
          <div className={styles.metricValue}>{monitoredCount} / {groups.length}</div>
          <span className={styles.metricSubtext}>WHITELIST ACTIVE</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>ADMIN PRIVILEGES</span>
          <div className={styles.metricValue}>{adminCount}</div>
          <span className={styles.metricSubtext}>CAN LOCK &amp; MODERATE</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>SYNCED CONTACTS</span>
          <div className={styles.metricValue}>{contacts.length}</div>
          <span className={styles.metricSubtext}>WHATSAPP DIRECTORY</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>SIMULATED TYPING</span>
          <div className={styles.metricValue}>{config.wpm_typing_speed} WPM</div>
          <span className={styles.metricSubtext}>ANTI-BAN ACTIVE</span>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className={styles.subTabs}>
        <button
          onClick={() => setSubTab('pairing')}
          className={`${styles.tabBtn} ${subTab === 'pairing' ? styles.tabBtnActive : ''}`}
        >
          [1. LINKING &amp; PAIRING]
        </button>
        <button
          onClick={() => setSubTab('groups')}
          className={`${styles.tabBtn} ${subTab === 'groups' ? styles.tabBtnActive : ''}`}
        >
          [2. GROUPS &amp; MODERATION ({groups.length})]
        </button>
        <button
          onClick={() => setSubTab('contacts')}
          className={`${styles.tabBtn} ${subTab === 'contacts' ? styles.tabBtnActive : ''}`}
        >
          [3. CONTACTS ({contacts.length})]
        </button>
        <button
          onClick={() => setSubTab('persona')}
          className={`${styles.tabBtn} ${subTab === 'persona' ? styles.tabBtnActive : ''}`}
        >
          [4. AI PERSONA &amp; RULES]
        </button>
        <button
          onClick={() => setSubTab('logs')}
          className={`${styles.tabBtn} ${subTab === 'logs' ? styles.tabBtnActive : ''}`}
        >
          [5. AUDIT LOGS ({logs.length})]
        </button>
        <button
          onClick={() => setSubTab('broadcast')}
          className={`${styles.tabBtn} ${subTab === 'broadcast' ? styles.tabBtnActive : ''}`}
        >
          [6. BROADCASTS]
        </button>
      </div>

      {/* TAB 1: WhatsApp Linking & Account Details */}
      {subTab === 'pairing' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>WhatsApp Account Linking</div>
              <div className={styles.cardSubtitle}>
                Link God&apos;s Virtue using an 8-Digit Pairing Code without needing to scan with a camera.
              </div>
            </div>
          </div>

          <div className={styles.pairingGrid}>
            <div className={styles.pairingBox}>
              <div className={styles.pairingTitle}>
                Option A: 8-Digit Phone Pairing Code (Recommended)
              </div>
              <p className={styles.instructions}>
                Enter your WhatsApp phone number with international country code (no `+` or spaces). Click &quot;Request Code&quot;, then open WhatsApp on your phone:
              </p>
              <div className={styles.instructions}>
                <ol>
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Tap <strong>Settings</strong> &rarr; <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> &rarr; <strong>Link with phone number instead</strong></li>
                  <li>Type the 8-digit code shown below</li>
                </ol>
              </div>

              <form onSubmit={handleRequestPairingCode} className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="e.g. 2348012345678"
                  value={inputPhone}
                  onChange={e => setInputPhone(e.target.value)}
                  className={styles.input}
                  required
                />
                <button type="submit" disabled={pairingLoading} className={styles.btnPrimary}>
                  {pairingLoading ? 'Requesting...' : 'Request Code'}
                </button>
              </form>

              {config.pairing_code ? (
                <div className={styles.codeDisplay}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--gray-2)' }}>
                    ACTIVE LINKING CODE:
                  </div>
                  <div className={styles.codeDigits}>
                    {config.pairing_code}
                  </div>
                  <button onClick={copyPairingCode} className={styles.btnSecondary}>
                    {copiedCode ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--gray-3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '16px 0' }}>
                  {config.is_connected ? 'Account is currently linked and active.' : 'Awaiting code request or worker start...'}
                </div>
              )}
            </div>

            <div className={styles.pairingBox}>
              <div className={styles.pairingTitle}>
                Account &amp; Anti-Ban Health Parameters
              </div>
              <div className={styles.instructions}>
                <p>
                  <strong>Socket Status:</strong> {config.is_connected ? 'Connected (Multi-Device Active)' : 'Disconnected'}
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Linked Account:</strong> {config.phone_number ? `+${config.phone_number}` : 'None'}
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Human Delay Window:</strong> {config.min_delay_ms / 1000}s – {config.max_delay_ms / 1000}s jitter before replying.
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Simulated Typing Speed:</strong> {config.wpm_typing_speed} words per minute.
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Burst Limit:</strong> Max {config.burst_limit_per_min} messages/min per chat.
                </p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--gray-2)', marginBottom: 8 }}>
                  WORKER START COMMAND:
                </div>
                <pre style={{
                  background: 'var(--bg-2)',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'var(--mono)',
                  color: 'var(--lime)',
                  overflowX: 'auto'
                }}>
cd gods-virtue-worker{'\n'}npm run dev
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Groups, Whitelist Selection, Lock/Unlock & Schedules */}
      {subTab === 'groups' && (
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className={styles.cardTitle}>WhatsApp Groups &amp; Moderation Center</div>
              <div className={styles.cardSubtitle}>
                Select which groups God&apos;s Virtue is permitted to see and moderate. Control group lock/unlock states and automated schedules.
              </div>
            </div>
            <button
              onClick={() => handleGroupAction('sync_all')}
              style={{
                background: 'var(--lime)',
                color: '#000',
                fontWeight: 700,
                fontSize: 11,
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--mono)',
                whiteSpace: 'nowrap'
              }}
            >
              [SYNC GROUPS NOW]
            </button>
          </div>

          <div className={styles.groupsGrid}>
            {groups.length === 0 ? (
              <div className={styles.emptyState} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
                <div>No groups discovered yet. If you recently added the bot to a group, click the button below to sync all groups.</div>
                <button
                  onClick={() => handleGroupAction('sync_all')}
                  style={{
                    background: 'var(--lime)',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  [SYNC GROUPS NOW]
                </button>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.group_jid} className={`${styles.groupCard} ${group.is_monitored ? styles.groupCardActive : ''}`}>
                  <div className={styles.groupCardHeader}>
                    <div>
                      <div className={styles.groupName}>{group.group_name || 'WhatsApp Group'}</div>
                      <div className={styles.groupJid}>{group.group_jid}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`${styles.badgePill} ${group.bot_is_admin ? styles.badgeAdmin : styles.badgeMember}`}>
                        {group.bot_is_admin ? '[ADMIN]' : '[MEMBER]'}
                      </span>
                      {group.bot_is_admin && (
                        <span className={`${styles.badgeLockStatus} ${group.is_locked ? styles.badgeLocked : styles.badgeOpen}`}>
                          {group.is_locked ? '[LOCKED]' : '[OPEN]'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Whitelist Visibility Switch */}
                  <div className={styles.toggleRow} style={{ background: group.is_monitored ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-2)', border: group.is_monitored ? '1px solid var(--lime)' : '1px solid var(--border)' }}>
                    <div>
                      <div className={styles.toggleLabel}>MODERATE THIS GROUP (WHITELIST)</div>
                      <div className={styles.toggleDesc}>
                        {group.is_monitored 
                          ? 'Active: Bot reads and moderates this group.' 
                          : 'Ignored: Bot is strictly blind to this group for privacy.'}
                      </div>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={Boolean(group.is_monitored)}
                        onChange={e => handleSaveGroup(group.group_jid, { is_monitored: e.target.checked })}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  {/* If monitored, show active controls */}
                  {group.is_monitored && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Instant Lock / Open Actions (If Admin) */}
                      {group.bot_is_admin && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleGroupAction('lock_group', group.group_jid)}
                            className={styles.btnActionLock}
                            style={{ flex: 1 }}
                          >
                            [LOCK GROUP NOW]
                          </button>
                          <button
                            onClick={() => handleGroupAction('open_group', group.group_jid)}
                            className={styles.btnActionOpen}
                            style={{ flex: 1 }}
                          >
                            [OPEN GROUP NOW]
                          </button>
                        </div>
                      )}

                      {/* Automated Daily Schedule Box */}
                      <div className={styles.scheduleBox}>
                        <div className={styles.toggleRow} style={{ padding: 0, background: 'transparent', border: 'none' }}>
                          <div>
                            <div className={styles.toggleLabel} style={{ fontSize: 12 }}>Automated Daily Lock Schedule</div>
                            <div className={styles.toggleDesc}>Lock and open group automatically at fixed hours.</div>
                          </div>
                          <label className={styles.switch}>
                            <input
                              type="checkbox"
                              checked={Boolean(group.schedule_enabled)}
                              onChange={e => handleSaveGroup(group.group_jid, { schedule_enabled: e.target.checked })}
                            />
                            <span className={styles.slider} />
                          </label>
                        </div>

                        {group.schedule_enabled && (
                          <div className={styles.timeRow} style={{ marginTop: 8 }}>
                            <div className={styles.field}>
                              <label className={styles.label}>AUTO-LOCK TIME</label>
                              <input
                                type="time"
                                defaultValue={group.auto_lock_time || "22:00"}
                                id={`alt-${group.group_jid}`}
                                className={styles.input}
                                onBlur={e => handleSaveGroup(group.group_jid, { auto_lock_time: e.target.value })}
                              />
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>AUTO-OPEN TIME</label>
                              <input
                                type="time"
                                defaultValue={group.auto_open_time || "06:00"}
                                id={`aot-${group.group_jid}`}
                                className={styles.input}
                                onBlur={e => handleSaveGroup(group.group_jid, { auto_open_time: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Toggles */}
                      <div className={styles.toggleRow} style={{ padding: '8px 12px' }}>
                        <span className={styles.toggleLabel} style={{ fontSize: 12 }}>Anti-Link Defense Shield</span>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={Boolean(group.anti_link_enabled)}
                            onChange={e => handleSaveGroup(group.group_jid, { anti_link_enabled: e.target.checked })}
                          />
                          <span className={styles.slider} />
                        </label>
                      </div>

                      <div className={styles.toggleRow} style={{ padding: '8px 12px' }}>
                        <span className={styles.toggleLabel} style={{ fontSize: 12 }}>Auto-Welcome New Members</span>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={Boolean(group.auto_welcome_enabled)}
                            onChange={e => handleSaveGroup(group.group_jid, { auto_welcome_enabled: e.target.checked })}
                          />
                          <span className={styles.slider} />
                        </label>
                      </div>

                      {/* Custom Directives / Instructions Editor */}
                      {editingGroup === group.group_jid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                          <label className={styles.label}>CUSTOM GROUP INSTRUCTIONS</label>
                          <textarea
                            defaultValue={group.instructions || ''}
                            id={`inst-${group.group_jid}`}
                            rows={3}
                            placeholder="e.g. Focus on academic discussions, lock at 10 PM, welcome newcomers..."
                            className={styles.textarea}
                            style={{ minHeight: 80, fontSize: 12 }}
                          />

                          <label className={styles.label}>WELCOME MESSAGE GREETING</label>
                          <textarea
                            defaultValue={group.welcome_message || ''}
                            id={`wm-${group.group_jid}`}
                            rows={3}
                            className={styles.textarea}
                            style={{ minHeight: 80, fontSize: 12 }}
                          />

                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingGroup(null)} className={styles.btnSecondary}>
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const instVal = document.getElementById(`inst-${group.group_jid}`)?.value;
                                const wmVal = document.getElementById(`wm-${group.group_jid}`)?.value;
                                handleSaveGroup(group.group_jid, { instructions: instVal, welcome_message: wmVal });
                              }}
                              className={styles.btnPrimary}
                            >
                              Save Directives
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingGroup(group.group_jid)}
                          className={styles.btnSecondary}
                          style={{ width: '100%', marginTop: 4 }}
                        >
                          Edit Group Instructions &amp; Greeting
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WhatsApp Contacts Directory */}
      {subTab === 'contacts' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>WhatsApp Contacts Directory ({contacts.length})</div>
              <div className={styles.cardSubtitle}>
                Contacts synced directly from the linked WhatsApp account.
              </div>
            </div>

            <div style={{ width: 240 }}>
              <input
                type="text"
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.contactsTable}>
            {filteredContacts.length === 0 ? (
              <div className={styles.emptyState}>
                {contacts.length === 0 ? 'No contacts synced yet. Start the bot worker to synchronize contacts.' : 'No contacts matching search query.'}
              </div>
            ) : (
              filteredContacts.map(c => (
                <div key={c.jid || c.phone} className={styles.contactRow}>
                  <div>
                    <div className={styles.contactName}>{c.name || 'WhatsApp Contact'}</div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--gray-3)' }}>{c.jid}</div>
                  </div>
                  <div className={styles.contactPhone}>
                    +{c.phone}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AI Persona, Prompt & Rules */}
      {subTab === 'persona' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>AI Persona, System Prompt &amp; Anti-Ban Controls</div>
              <div className={styles.cardSubtitle}>
                Instruct God&apos;s Virtue on character, rules, Christian virtues, and human simulation timing.
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>
                <span>MASTER SYSTEM PROMPT</span>
                <span>{config.system_prompt?.length || 0} chars</span>
              </label>
              <textarea
                value={config.system_prompt || ''}
                onChange={e => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                className={styles.textarea}
                placeholder="Instruct God's Virtue on how to speak, tone of humility, scriptures, and group rules..."
                rows={6}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <span>TEMPERATURE (CREATIVITY): {config.temperature}</span>
                <span>0.0 = Rigid | 1.0 = Creative</span>
              </label>
              <div className={styles.rangeRow}>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.temperature || 0.7}
                  onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <span>SIMULATED TYPING SPEED: {config.wpm_typing_speed} WPM</span>
                <span>Human presence calculation</span>
              </label>
              <div className={styles.rangeRow}>
                <input
                  type="range"
                  min="25"
                  max="80"
                  step="5"
                  value={config.wpm_typing_speed || 45}
                  onChange={e => setConfig(prev => ({ ...prev, wpm_typing_speed: parseInt(e.target.value, 10) }))}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <span>MIN HUMAN JITTER: {(config.min_delay_ms || 2500) / 1000}s</span>
              </label>
              <div className={styles.rangeRow}>
                <input
                  type="range"
                  min="1000"
                  max="5000"
                  step="500"
                  value={config.min_delay_ms || 2500}
                  onChange={e => setConfig(prev => ({ ...prev, min_delay_ms: parseInt(e.target.value, 10) }))}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <span>MAX HUMAN JITTER: {(config.max_delay_ms || 6500) / 1000}s</span>
              </label>
              <div className={styles.rangeRow}>
                <input
                  type="range"
                  min="4000"
                  max="12000"
                  step="500"
                  value={config.max_delay_ms || 6500}
                  onChange={e => setConfig(prev => ({ ...prev, max_delay_ms: parseInt(e.target.value, 10) }))}
                  className={styles.rangeInput}
                />
              </div>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <div className={styles.toggleLabel}>Mention-Only in Groups</div>
                <div className={styles.toggleDesc}>Only speaks when tagged or replied to. Prevents spamming groups.</div>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={Boolean(config.group_mention_only)}
                  onChange={e => setConfig(prev => ({ ...prev, group_mention_only: e.target.checked }))}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <div className={styles.toggleLabel}>Auto-Reply in Direct 1-on-1 Chats</div>
                <div className={styles.toggleDesc}>Responds to all direct personal messages like a thoughtful companion.</div>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={Boolean(config.auto_reply_dms)}
                  onChange={e => setConfig(prev => ({ ...prev, auto_reply_dms: e.target.checked }))}
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="submit" disabled={saving} className={styles.btnPrimary}>
                {saving ? 'Saving...' : 'Save Persona &amp; Rules'}
              </button>
            </div>
          </form>

          {/* Interactive Persona Playground */}
          <div className={styles.pairingBox} style={{ marginTop: 16 }}>
            <div className={styles.pairingTitle}>Test Prompt Playground</div>
            <p className={styles.instructions}>
              Evaluate how God&apos;s Virtue responds with your current prompt before replying on WhatsApp.
            </p>

            <div className={styles.inputGroup} style={{ marginTop: 8 }}>
              <input
                type="text"
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder="Ask God's Virtue anything..."
                className={styles.input}
              />
              <button onClick={handleTestPrompt} disabled={testingAi} className={styles.btnPrimary}>
                {testingAi ? 'Simulating...' : 'Test Reply'}
              </button>
            </div>

            {playgroundOutput && (
              <div style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: 14,
                fontSize: 13,
                color: 'var(--white)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                marginTop: 8
              }}>
                <strong>God&apos;s Virtue:</strong>
                <p style={{ marginTop: 6 }}>{playgroundOutput}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Live Message Stream & Audit Logs */}
      {subTab === 'logs' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Live Message &amp; Moderation Stream</div>
              <div className={styles.cardSubtitle}>
                Real-time audit of conversations processed in whitelisted groups and chats.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'group', 'dm', 'violation'].map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`${styles.tabBtn} ${logFilter === f ? styles.tabBtnActive : ''}`}
                  style={{ padding: '4px 10px', fontSize: 10 }}
                >
                  [{f.toUpperCase()}]
                </button>
              ))}
            </div>
          </div>

          <div className={styles.logsList}>
            {logs.length === 0 ? (
              <div className={styles.emptyState}>
                No messages logged yet. As conversations occur in whitelisted groups, they will stream here in real time.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={styles.logRow}>
                  <div className={styles.logRowHeader}>
                    <div className={styles.logSender}>
                      {log.is_group ? `[GROUP: ${log.chat_name || 'Group'}]` : '[DIRECT DM]'} {log.sender_name || log.sender_jid}
                    </div>
                    <div className={styles.logTime}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className={styles.logIncoming}>
                    <strong>Received:</strong> &quot;{log.incoming_text}&quot;
                  </div>

                  {log.reply_text && (
                    <div className={styles.logReply}>
                      {log.reply_text}
                    </div>
                  )}

                  <div className={styles.logMeta}>
                    <span>STATUS: {log.status?.toUpperCase()}</span>
                    {log.latency_ms > 0 && <span>REACTION: {log.latency_ms}ms</span>}
                    {log.simulated_typing_ms > 0 && <span>TYPING: {log.simulated_typing_ms}ms</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Broadcast Announcements */}
      {subTab === 'broadcast' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Group Broadcast Desk</div>
              <div className={styles.cardSubtitle}>
                Dispatch announcements or devotionals to whitelisted WhatsApp groups.
              </div>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className={styles.field}>
            <div className={styles.field}>
              <label className={styles.label}>TARGET AUDIENCE</label>
              <select
                value={broadcastData.target_group_jid}
                onChange={e => {
                  const selGroup = groups.find(g => g.group_jid === e.target.value);
                  setBroadcastData(prev => ({
                    ...prev,
                    target_group_jid: e.target.value,
                    target_group_name: selGroup ? selGroup.group_name : 'All Monitored Groups'
                  }));
                }}
                className={styles.input}
              >
                <option value="">All Monitored Groups</option>
                {groups.filter(g => g.is_monitored).map(g => (
                  <option key={g.group_jid} value={g.group_jid}>
                    {g.group_name} ({g.group_jid})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>ANNOUNCEMENT TITLE / SUBJECT</label>
              <input
                type="text"
                value={broadcastData.title}
                onChange={e => setBroadcastData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Weekly Devotional: Walking in Faith"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>ANNOUNCEMENT TEXT</label>
              <textarea
                value={broadcastData.announcement_text}
                onChange={e => setBroadcastData(prev => ({ ...prev, announcement_text: e.target.value }))}
                placeholder="Type your message, scripture, or update here..."
                rows={5}
                className={styles.textarea}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="submit" disabled={saving} className={styles.btnPrimary}>
                {saving ? 'Dispatching...' : 'Dispatch Broadcast'}
              </button>
            </div>
          </form>

          {announcements.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className={styles.cardTitle} style={{ fontSize: 13, marginBottom: 12 }}>RECENT BROADCASTS</div>
              <div className={styles.logsList}>
                {announcements.map(a => (
                  <div key={a.id} className={styles.logRow}>
                    <div className={styles.logRowHeader}>
                      <span className={styles.logSender}>{a.title}</span>
                      <span className={styles.logTime}>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.logIncoming}>To: {a.target_group_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--white)', marginTop: 4 }}>{a.announcement_text}</div>
                    <div className={styles.logMeta}>STATUS: {a.status?.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
