'use client';

/**
 * Admin Dashboard: Beyond Performance Survey Entries
 * Design: Matches gloryadeniran.cv native aesthetic and tokens
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
              <span>SURVEY ANALYTICS &amp; DIAGNOSTICS</span>
            </div>
            <h1 className={styles.mainTitle}>
              Beyond Performance <em>Admin.</em>
            </h1>
            <p className={styles.subTitle}>
              Live diagnostics, participant responses, and spiritual segmentation distribution.
            </p>
          </div>

          <div className={styles.navLinks}>
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
                <th>Action</th>
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
                      <button
                        type="button"
                        className={styles.btnView}
                        onClick={() => setActiveModalEntry(item)}
                      >
                        VIEW DETAILS
                      </button>
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

              <div style={{ textAlign: 'right', marginTop: '24px' }}>
                <button
                  type="button"
                  className={styles.shinyCta}
                  onClick={() => setActiveModalEntry(null)}
                >
                  <span>Close Details &nbsp;→</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
