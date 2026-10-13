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
  const [testMessage, setTestMessage] = useState('Hello God\'s Virtue! What advice do you have for someone starting a new tech venture?');
  const [playgroundOutput, setPlaygroundOutput] = useState('');
  const [testingAi, setTestingAi] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Initial Data Fetch
  const fetchAllData = useCallback(async () => {
    try {
      const [statusRes, groupsRes, logsRes, annRes] = await Promise.all([
        fetch('/api/gods-virtue/status'),
        fetch('/api/gods-virtue/groups'),
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
        showToast(nextState ? '🕊️ God\'s Virtue resumed auto-replies.' : '⚠️ Emergency Kill-Switch Activated! Auto-replies paused.');
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
        showToast('Pairing requested! Start the persistent bot worker to view your code.');
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
      showToast('Copied pairing code to clipboard!');
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
        showToast('✓ AI instructions & anti-ban settings saved!');
      }
    } catch (err) {
      alert('Failed to save config: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save Group Settings
  const handleSaveGroup = async (groupJid, updates) => {
    try {
      const res = await fetch('/api/gods-virtue/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_jid: groupJid, ...updates }),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => prev.map(g => g.group_jid === groupJid ? { ...g, ...updates } : g));
        showToast('✓ Group moderation settings updated!');
        setEditingGroup(null);
      }
    } catch (err) {
      alert('Failed to update group: ' + err.message);
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
        showToast('✓ Broadcast announcement queued successfully!');
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
    setPlaygroundOutput('Thinking with configured virtues & wisdom...');
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

  return (
    <div className={styles.panel}>
      {/* ─── Toast Feedback ─── */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--lime)',
          color: 'var(--white)',
          padding: '12px 20px',
          borderRadius: 8,
          fontSize: 13,
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

      {/* ─── Top Master Status Bar ─── */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          {config.is_connected ? (
            <span className={styles.badgeLive}>
              <span className={styles.pulseDot} />
              LIVE ON WHATSAPP
            </span>
          ) : !config.is_active ? (
            <span className={styles.badgePaused}>
              <span className={styles.pulseDot} />
              PAUSED (EMERGENCY)
            </span>
          ) : (
            <span className={styles.badgeOffline}>
              <span className={styles.pulseDot} />
              WORKER OFFLINE
            </span>
          )}

          <div className={styles.statusMeta}>
            <div className={styles.botTitle}>🕊️ {config.bot_name || "God\u2019s Virtue"}</div>
            <div className={styles.botPhone}>
              {config.phone_number ? `Linked Phone: +${config.phone_number}` : 'No phone linked yet'}
            </div>
          </div>
        </div>

        <div className={styles.statusRight}>
          <button
            onClick={handleToggleKillSwitch}
            className={`${styles.killSwitchBtn} ${config.is_active ? styles.killSwitchActive : styles.killSwitchPaused}`}
            title="Emergency Kill-Switch: Pause all automated WhatsApp replies immediately"
          >
            {config.is_active ? '⏸️ PAUSE BOT (KILL-SWITCH)' : '▶️ RESUME BOT'}
          </button>
        </div>
      </div>

      {/* ─── Sub Navigation ─── */}
      <div className={styles.subTabs}>
        <button
          onClick={() => setSubTab('pairing')}
          className={`${styles.tabBtn} ${subTab === 'pairing' ? styles.tabBtnActive : ''}`}
        >
          📱 1. LINKING & PAIRING
        </button>
        <button
          onClick={() => setSubTab('persona')}
          className={`${styles.tabBtn} ${subTab === 'persona' ? styles.tabBtnActive : ''}`}
        >
          🧠 2. AI PERSONA & PROMPT
        </button>
        <button
          onClick={() => setSubTab('groups')}
          className={`${styles.tabBtn} ${subTab === 'groups' ? styles.tabBtnActive : ''}`}
        >
          🛡️ 3. GROUP MODERATION ({groups.length})
        </button>
        <button
          onClick={() => setSubTab('logs')}
          className={`${styles.tabBtn} ${subTab === 'logs' ? styles.tabBtnActive : ''}`}
        >
          📜 4. AUDIT & MESSAGE LOGS ({logs.length})
        </button>
        <button
          onClick={() => setSubTab('broadcast')}
          className={`${styles.tabBtn} ${subTab === 'broadcast' ? styles.tabBtnActive : ''}`}
        >
          📢 5. GROUP BROADCASTS
        </button>
      </div>

      {/* ─── TAB 1: WhatsApp Linking & Pairing ─── */}
      {subTab === 'pairing' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>WhatsApp Account Connection</div>
              <div className={styles.cardSubtitle}>
                Link &quot;God&apos;s Virtue&quot; to your dedicated WhatsApp account using an 8-Digit Pairing Code (no QR camera scan required).
              </div>
            </div>
          </div>

          <div className={styles.pairingGrid}>
            <div className={styles.pairingBox}>
              <div className={styles.pairingTitle}>
                <span>Option A: 8-Digit Phone Pairing Code (Recommended)</span>
              </div>
              <p className={styles.instructions}>
                Enter your WhatsApp number with international country code (no `+` or spaces). Click &quot;Generate Code&quot;, then open WhatsApp on your phone:
              </p>
              <div className={styles.instructions}>
                <ol>
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Tap <strong>Settings</strong> (or 3 dots) &rarr; <strong>Linked Devices</strong></li>
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
                    {copiedCode ? '✓ Copied' : '📋 Copy Code'}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--gray-3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '16px 0' }}>
                  {config.is_connected ? '🟢 Account is currently linked and active!' : 'Awaiting code request or worker start...'}
                </div>
              )}
            </div>

            <div className={styles.pairingBox}>
              <div className={styles.pairingTitle}>
                <span>Option B: Anti-Ban Health & Worker Status</span>
              </div>
              <div className={styles.instructions}>
                <p>
                  <strong>Current Socket Status:</strong> {config.is_connected ? '🟢 Connected (Active WebSocket)' : '🔴 Disconnected'}
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Simulated Human Latency:</strong> {config.min_delay_ms / 1000}s – {config.max_delay_ms / 1000}s jitter before replying.
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Simulated Typing Speed:</strong> ~{config.wpm_typing_speed} words per minute.
                </p>
                <p style={{ marginTop: 8 }}>
                  <strong>Burst Protection:</strong> Max {config.burst_limit_per_min} messages/min to keep account safe.
                </p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--gray-2)', marginBottom: 8 }}>
                  HOW TO RUN BOT WORKER:
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
cd gods-virtue-worker{'\n'}npm install{'\n'}npm run dev
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: AI Persona, System Prompt & Anti-Ban Timing ─── */}
      {subTab === 'persona' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>AI Brain, Persona & Anti-Ban Parameters</div>
              <div className={styles.cardSubtitle}>
                Fine-tune how &quot;God&apos;s Virtue&quot; speaks, its Christian virtues, and human simulation parameters.
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label className={styles.label}>
                <span>MASTER SYSTEM PROMPT & PERSONA INSTRUCTIONS</span>
                <span>{config.system_prompt?.length || 0} chars</span>
              </label>
              <textarea
                value={config.system_prompt || ''}
                onChange={e => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
                className={styles.textarea}
                placeholder="Instruct God's Virtue on how to speak, scriptures to reference, tone of humility and wisdom..."
                rows={6}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <span>AI CREATIVITY (TEMPERATURE): {config.temperature}</span>
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
                <span>TYPING SPEED SIMULATION: {config.wpm_typing_speed} WPM</span>
                <span>Human typing presence delay</span>
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
                <span>MIN HUMAN REACTION DELAY: {(config.min_delay_ms || 2500) / 1000}s</span>
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
                <span>MAX HUMAN REACTION DELAY: {(config.max_delay_ms || 6500) / 1000}s</span>
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
                <div className={styles.toggleDesc}>Only speaks when tagged (@God&apos;s Virtue) or replied to. Prevents spamming groups.</div>
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
                <div className={styles.toggleLabel}>Auto-Reply to 1-on-1 DMs</div>
                <div className={styles.toggleDesc}>Responds to all direct personal messages like a thoughtful spiritual companion.</div>
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
                {saving ? 'Saving...' : '💾 Save Persona & Anti-Ban Rules'}
              </button>
            </div>
          </form>

          {/* Interactive Persona Playground */}
          <div className={styles.playgroundBox} style={{ marginTop: 16 }}>
            <div className={styles.cardTitle}>🧪 Test Prompt Playground</div>
            <div className={styles.cardSubtitle}>
              Send a test message to evaluate how &quot;God&apos;s Virtue&quot; responds with your current prompt before replying on WhatsApp.
            </div>

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
              <div className={styles.chatPreviewArea}>
                <strong>God&apos;s Virtue:</strong>
                <p style={{ marginTop: 6 }}>{playgroundOutput}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Group Moderation & Shield Settings ─── */}
      {subTab === 'groups' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>WhatsApp Groups & Shield Settings</div>
              <div className={styles.cardSubtitle}>
                Control anti-link enforcement, automated welcome messages, and member strike tolerances for each group.
              </div>
            </div>
          </div>

          <div className={styles.groupsGrid}>
            {groups.length === 0 ? (
              <div className={styles.emptyState}>
                No monitored groups yet. Once the bot joins a group, it will automatically populate here!
              </div>
            ) : (
              groups.map(group => (
                <div key={group.group_jid} className={styles.groupCard}>
                  <div className={styles.groupCardHeader}>
                    <div>
                      <div className={styles.groupName}>{group.group_name || 'WhatsApp Group'}</div>
                      <div className={styles.groupJid}>{group.group_jid}</div>
                    </div>
                    <span className={styles.pillBadge}>
                      {group.bot_is_admin ? '🛡️ BOT IS ADMIN' : 'MEMBER'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className={styles.toggleRow} style={{ padding: '8px 12px' }}>
                      <span className={styles.toggleLabel}>🛡️ Anti-Link Shield</span>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={group.anti_link_enabled}
                          onChange={e => handleSaveGroup(group.group_jid, { anti_link_enabled: e.target.checked })}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>

                    <div className={styles.toggleRow} style={{ padding: '8px 12px' }}>
                      <span className={styles.toggleLabel}>👋 Auto-Welcome Members</span>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={group.auto_welcome_enabled}
                          onChange={e => handleSaveGroup(group.group_jid, { auto_welcome_enabled: e.target.checked })}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>

                    <div className={styles.toggleRow} style={{ padding: '8px 12px' }}>
                      <span className={styles.toggleLabel}>⚠️ Strikes Before Kick</span>
                      <select
                        value={group.max_strikes || 3}
                        onChange={e => handleSaveGroup(group.group_jid, { max_strikes: parseInt(e.target.value, 10) })}
                        style={{
                          background: 'var(--bg-2)',
                          color: 'var(--white)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 12,
                          fontFamily: 'var(--mono)'
                        }}
                      >
                        <option value={1}>1 Strike (Immediate)</option>
                        <option value={2}>2 Strikes</option>
                        <option value={3}>3 Strikes (Standard)</option>
                        <option value={5}>5 Strikes</option>
                      </select>
                    </div>
                  </div>

                  {editingGroup === group.group_jid ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        defaultValue={group.welcome_message}
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
                            const val = document.getElementById(`wm-${group.group_jid}`)?.value;
                            handleSaveGroup(group.group_jid, { welcome_message: val });
                          }}
                          className={styles.btnPrimary}
                        >
                          Save Greeting
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingGroup(group.group_jid)}
                      className={styles.btnSecondary}
                      style={{ width: '100%' }}
                    >
                      ✏️ Edit Welcome Message Template
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: Live Message Stream & Audit Logs ─── */}
      {subTab === 'logs' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Live Message & Moderation Audit Stream</div>
              <div className={styles.cardSubtitle}>
                Real-time record of conversations processed, anti-ban simulated typing times, and moderation actions.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {['all', 'group', 'dm', 'violation'].map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`${styles.tabBtn} ${logFilter === f ? styles.tabBtnActive : ''}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.logsList}>
            {logs.length === 0 ? (
              <div className={styles.emptyState}>
                No messages logged yet. As conversations occur on WhatsApp, they will stream here in real time.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={styles.logRow}>
                  <div className={styles.logRowHeader}>
                    <div className={styles.logSender}>
                      {log.is_group ? `👥 [${log.chat_name || 'Group'}]` : '👤 [Private DM]'} {log.sender_name || log.sender_jid}
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
                    {log.latency_ms > 0 && <span>HUMAN JITTER: {log.latency_ms}ms</span>}
                    {log.simulated_typing_ms > 0 && <span>TYPING PRESENCE: {log.simulated_typing_ms}ms</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: Group Broadcasts & Announcements ─── */}
      {subTab === 'broadcast' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Broadcast & Announcement Desk</div>
              <div className={styles.cardSubtitle}>
                Compose devotionals, reminders, or community announcements and broadcast them to monitored WhatsApp groups.
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
                {groups.map(g => (
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
                {saving ? 'Dispatching...' : '📢 Dispatch Broadcast Announcement'}
              </button>
            </div>
          </form>

          {announcements.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className={styles.cardTitle} style={{ fontSize: 14, marginBottom: 12 }}>Recent Broadcasts</div>
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
