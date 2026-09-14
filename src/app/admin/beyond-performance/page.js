'use client';

/**
 * Admin Dashboard: Beyond Performance Survey Entries
 * Features:
 * - Delete responses from Supabase & Redis
 * - Send personalized emails / pastoral follow-ups directly via Brevo
 * - Copy all email addresses / export summary
 * - View full diagnostic details
 * Strictly zero emojis.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './admin-survey.module.css';

const SEGMENT_LABELS = {
  PERFORMANCE_BURNOUT: 'Resting Beyond Performance',
  GENTLE_REBUILD: 'Gentle Rebuilding of Intimacy',
  FOUNDATIONAL_STUDY: 'Foundational Scriptural Clarity',
  GENERAL_GROWTH: 'Deepening Fellowship',
};

export default function AdminBeyondPerformancePage() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('ALL');
  const [activeModalEntry, setActiveModalEntry] = useState(null);

  // Email modal state
  const [emailModalEntry, setEmailModalEntry] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState('');

  // Delete state
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSegment !== 'ALL') params.append('segment', selectedSegment);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/beyond-performance/entries?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setEntries(data.entries || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.error('Failed to load survey records:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedSegment, search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchData]);

  // Handle Deletion
  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete the reflection for ${item.full_name} (${item.email})?`)) {
      return;
    }

    setIsDeletingId(item.id || item.email);
    try {
      const res = await fetch('/api/beyond-performance/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, email: item.email }),
      });

      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.email !== item.email && e.id !== item.id));
        if (activeModalEntry && (activeModalEntry.id === item.id || activeModalEntry.email === item.email)) {
          setActiveModalEntry(null);
        }
      }
    } catch (err) {
      alert('Failed to delete response: ' + err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Open Personalized Email Composer
  const handleOpenEmailComposer = (item) => {
    setEmailModalEntry(item);
    setEmailSubject(`A Personal Note from Glory Adeniran (God's Virtue)`);
    setEmailMessage(
      `Dear ${item.full_name.split(' ')[0]},\n\n` +
      `Thank you for taking the time to share your candid reflection in the Beyond Performance survey.\n\n` +
      `I saw your notes on "${item.prayer_reality}" and wanted to personally reach out with encouragement...\n\n` +
      `Remember, God is not grading you with a stopwatch. He is near and full of grace.`
    );
    setEmailStatusMessage('');
  };

  // Send Personalized Email
  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    if (!emailModalEntry || !emailMessage.trim()) return;

    setIsSendingEmail(true);
    setEmailStatusMessage('');

    try {
      const res = await fetch('/api/beyond-performance/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailModalEntry.email,
          participantName: emailModalEntry.full_name,
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailStatusMessage(`Personalized email successfully dispatched to ${emailModalEntry.email}`);
        setTimeout(() => {
          setEmailModalEntry(null);
          setEmailStatusMessage('');
        }, 1600);
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (err) {
      setEmailStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Copy All Emails
  const handleCopyAllEmails = () => {
    const emails = entries.map((e) => e.email).filter(Boolean).join(', ');
    navigator.clipboard.writeText(emails);
    setCopyStatus('Emails copied to clipboard!');
    setTimeout(() => setCopyStatus(''), 2500);
  };

  const getSegmentBadgeClass = (seg) => {
    switch (seg) {
      case 'PERFORMANCE_BURNOUT':
        return styles.badgeBurnout;
      case 'GENTLE_REBUILD':
        return styles.badgeRebuild;
      case 'FOUNDATIONAL_STUDY':
        return styles.badgeFoundational;
      default:
        return styles.badgeGrowth;
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Background Watermark Title */}
      <div className={styles.bgTitle} aria-hidden="true">
        BEYOND<br />ADMIN
      </div>

      <div className={styles.innerWrap}>
        
        {/* Top Header */}
        <div className={styles.topBar}>
          <div>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowBar} />
              <span className={styles.eyebrowTag}>00 / SYSTEM CONTROL</span>
              <span>GLORY ADENIRAN (GOD'S VIRTUE)</span>
            </div>
            <h1 className={styles.mainTitle}>
              Beyond Performance <em>Admin.</em>
            </h1>
            <p className={styles.subTitle}>
              Live diagnostics, participant responses, and personalized follow-up console.
            </p>
          </div>

          <div className={styles.navLinks}>
            <button type="button" onClick={handleCopyAllEmails} className={styles.btnSecondary}>
              <span className={styles.btnDot} />
              <span>{copyStatus || 'Copy All Emails'}</span>
            </button>
            <Link href="/beyond-performance" target="_blank" className={styles.shinyCta}>
              <span>Open Live Survey &nbsp;→</span>
            </Link>
            <Link href="/admin/dashboard" className={styles.btnSecondary}>
              <span className={styles.btnDot} />
              <span>Portfolio Admin</span>
            </Link>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        {stats && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>[TOTAL_RESPONSES]</div>
                <div className={styles.statValue}>{stats.total}</div>
                <div className={styles.statSubtext}>// Live recorded reflections</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>[AVG_TRANSPARENCY]</div>
                <div className={styles.statValue}>{stats.averageOpenness} <span style={{ fontSize: '18px', color: 'var(--gray-2)' }}>/ 5.0</span></div>
                <div className={styles.statSubtext}>// Conversational openness rating</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>[DOMINANT_SEGMENT]</div>
                <div className={styles.statValue} style={{ fontSize: '18px', lineHeight: '36px' }}>
                  {Object.entries(stats.segmentCounts || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'GENERAL_GROWTH'}
                </div>
                <div className={styles.statSubtext}>// Highest frequency classification</div>
              </div>
            </div>

            {/* Segmentation Breakdown Grid */}
            <div className={styles.segmentsGrid}>
              {Object.entries(SEGMENT_LABELS).map(([key, label]) => {
                const count = stats.segmentCounts?.[key] || 0;
                const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={key} className={styles.segmentCard}>
                    <div className={styles.segmentTitle}>{label}</div>
                    <div className={styles.segmentCount}>{count}</div>
                    <div className={styles.segmentPercent}>
                      {percent}% of total [{key}]
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Controls: Search and Filter */}
        <div className={styles.controlsBar}>
          <input
            type="text"
            className={styles.searchBox}
            placeholder="// Search by participant name, email, or church..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
          >
            <option value="ALL">ALL SEGMENTS ({entries.length})</option>
            <option value="PERFORMANCE_BURNOUT">PERFORMANCE BURNOUT</option>
            <option value="GENTLE_REBUILD">GENTLE REBUILD</option>
            <option value="FOUNDATIONAL_STUDY">FOUNDATIONAL STUDY</option>
            <option value="GENERAL_GROWTH">GENERAL GROWTH</option>
          </select>
        </div>

        {/* Responses Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Participant</th>
                <th>Email</th>
                <th>Faith Walk</th>
                <th>Assigned Segment</th>
                <th>Openness</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-2)' }}>
                    Loading survey records...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-2)' }}>
                    No responses matching the current query.
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item.id || item.email}>
                    <td style={{ color: 'var(--gray-2)', fontFamily: 'var(--mono, monospace)', fontSize: '11px' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--white)' }}>{item.full_name}</td>
                    <td style={{ color: 'var(--gray-1)', fontFamily: 'var(--mono, monospace)', fontSize: '12px' }}>{item.email}</td>
                    <td style={{ fontSize: '13px' }}>{item.faith_status}</td>
                    <td>
                      <span className={`${styles.badge} ${getSegmentBadgeClass(item.assigned_segment)}`}>
                        {item.assigned_segment}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--lime)', fontFamily: 'var(--mono, monospace)' }}>
                      {item.openness_rating} / 5
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                        <button
                          type="button"
                          className={styles.btnView}
                          onClick={() => setActiveModalEntry(item)}
                        >
                          VIEW
                        </button>
                        <button
                          type="button"
                          className={styles.btnView}
                          style={{ borderColor: 'var(--lime)', color: 'var(--lime)' }}
                          onClick={() => handleOpenEmailComposer(item)}
                        >
                          EMAIL
                        </button>
                        <button
                          type="button"
                          className={styles.btnView}
                          style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#F87171' }}
                          disabled={isDeletingId === (item.id || item.email)}
                          onClick={() => handleDelete(item)}
                        >
                          {isDeletingId === (item.id || item.email) ? '...' : 'DEL'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Details Modal */}
        {activeModalEntry && (
          <div className={styles.modalBackdrop} onClick={() => setActiveModalEntry(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>{activeModalEntry.full_name}</h2>
                  <p className={styles.modalSubtitle}>{activeModalEntry.email} · {activeModalEntry.church_name || 'No church specified'}</p>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setActiveModalEntry(null)}
                >
                  [ESC]
                </button>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>[01] Faith Walk &amp; Classification</div>
                <div className={styles.modalSectionContent}>
                  <strong>Faith Journey:</strong> {activeModalEntry.faith_status}<br />
                  <strong>Assigned Segment:</strong> {activeModalEntry.assigned_segment} ({SEGMENT_LABELS[activeModalEntry.assigned_segment] || ''})<br />
                  <strong>Openness Score:</strong> {activeModalEntry.openness_rating} of 5
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>[02] Daily Prayer Reality</div>
                <div className={styles.modalSectionContent}>
                  {activeModalEntry.prayer_reality}
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>[03] Primary Friction Points</div>
                <div className={styles.modalSectionContent}>
                  {(activeModalEntry.prayer_friction_points || []).map((f) => (
                    <span key={f} className={styles.tagPill}>{f}</span>
                  ))}
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>[04] Bible Study &amp; Preferred Formats</div>
                <div className={styles.modalSectionContent}>
                  <strong>Current Approach:</strong> {activeModalEntry.bible_reading_status}<br /><br />
                  <strong>Preferred Formats:</strong><br />
                  {(activeModalEntry.preferred_formats || []).map((fmt) => (
                    <span key={fmt} className={styles.tagPill}>{fmt}</span>
                  ))}
                </div>
              </div>

              {activeModalEntry.open_reflection && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>[05] Biggest Misconception Observation</div>
                  <div className={styles.modalSectionContent} style={{ fontStyle: 'italic' }}>
                    "{activeModalEntry.open_reflection}"
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#F87171' }}
                  onClick={() => handleDelete(activeModalEntry)}
                >
                  <span className={styles.btnDot} style={{ background: '#EF4444' }} />
                  <span>Delete Response</span>
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={styles.shinyCta}
                    onClick={() => {
                      const item = activeModalEntry;
                      setActiveModalEntry(null);
                      handleOpenEmailComposer(item);
                    }}
                  >
                    <span>Write Personal Email &nbsp;→</span>
                  </button>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setActiveModalEntry(null)}
                  >
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personalized Email Composer Modal */}
        {emailModalEntry && (
          <div className={styles.modalBackdrop} onClick={() => setEmailModalEntry(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Send Personal Note</h2>
                  <p className={styles.modalSubtitle}>To: {emailModalEntry.full_name} &lt;{emailModalEntry.email}&gt;</p>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setEmailModalEntry(null)}
                >
                  [ESC]
                </button>
              </div>

              {emailStatusMessage && (
                <div style={{ padding: '10px 14px', background: 'rgba(0, 145, 255, 0.1)', border: '1px solid var(--lime)', color: 'var(--lime)', fontSize: '13px', marginBottom: '16px', fontFamily: 'var(--mono, monospace)' }}>
                  {emailStatusMessage}
                </div>
              )}

              <form onSubmit={handleSendCustomEmail}>
                <div className={styles.modalSection}>
                  <label className={styles.modalSectionTitle} style={{ display: 'block' }}>Email Subject</label>
                  <input
                    type="text"
                    className={styles.searchBox}
                    style={{ width: '100%' }}
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.modalSection}>
                  <label className={styles.modalSectionTitle} style={{ display: 'block' }}>Message Content</label>
                  <textarea
                    className={styles.searchBox}
                    style={{ width: '100%', minHeight: '160px', resize: 'vertical', lineHeight: '1.6' }}
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: '11px', color: 'var(--gray-2)', marginTop: '4px', fontFamily: 'var(--mono, monospace)' }}>
                    // Dispatched via verified Brevo sender from Glory Adeniran (God's Virtue)
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setEmailModalEntry(null)}
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    className={styles.shinyCta}
                    disabled={isSendingEmail}
                  >
                    <span>{isSendingEmail ? 'DISPATCHING...' : 'SEND PERSONAL EMAIL →'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
