'use client';

/**
 * Admin Dashboard: Beyond Performance Survey Entries
 * Displays summary metrics, segment distributions, and detailed search/table view.
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
    <div className={styles.adminContainer}>
      <div className={styles.innerWrap}>
        
        {/* Top Header */}
        <div className={styles.topBar}>
          <div className={styles.headingArea}>
            <h1>Beyond Performance · Survey Reflections</h1>
            <p>Participant responses, spiritual segmentation, and friction diagnostics</p>
          </div>
          <div className={styles.navLinks}>
            <Link href="/beyond-performance" target="_blank" className={styles.navBtn}>
              Open Live Survey
            </Link>
            <Link href="/admin/dashboard" className={styles.navBtnPrimary}>
              Portfolio Admin
            </Link>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        {stats && (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total Responses</div>
                <div className={styles.statValue}>{stats.total}</div>
                <div className={styles.statSubtext}>Completed survey records</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Average Openness</div>
                <div className={styles.statValue}>{stats.averageOpenness} / 5.0</div>
                <div className={styles.statSubtext}>Conversational transparency</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Top Segment</div>
                <div className={styles.statValue} style={{ fontSize: '20px', lineHeight: '36px' }}>
                  {Object.entries(stats.segmentCounts || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'GENERAL_GROWTH'}
                </div>
                <div className={styles.statSubtext}>Most frequent classification</div>
              </div>
            </div>

            {/* Segmentation Breakdown Grid */}
            <div className={styles.segmentsGrid}>
              {Object.entries(SEGMENT_LABELS).map(([key, label]) => {
                const count = stats.segmentCounts?.[key] || 0;
                const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={key} className={styles.segmentSummaryCard}>
                    <div className={styles.segmentSummaryTitle}>{label}</div>
                    <div className={styles.segmentSummaryCount}>{count}</div>
                    <div className={styles.segmentSummaryPercent}>
                      {percent}% of all respondents ({key})
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
            placeholder="Search by participant name, email, or church..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className={styles.filterSelect}
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
          >
            <option value="ALL">All Segments ({entries.length})</option>
            <option value="PERFORMANCE_BURNOUT">Performance Burnout</option>
            <option value="GENTLE_REBUILD">Gentle Rebuild</option>
            <option value="FOUNDATIONAL_STUDY">Foundational Study</option>
            <option value="GENERAL_GROWTH">General Growth</option>
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
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    Loading survey entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    No responses matching the current filter.
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item.id || item.email}>
                    <td style={{ color: '#94A3B8', fontSize: '12px' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ fontWeight: '600', color: '#FFFFFF' }}>{item.full_name}</td>
                    <td style={{ color: '#94A3B8' }}>{item.email}</td>
                    <td>{item.faith_status}</td>
                    <td>
                      <span className={`${styles.badge} ${getSegmentBadgeClass(item.assigned_segment)}`}>
                        {item.assigned_segment}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: '#D4AF37' }}>
                      {item.openness_rating} / 5
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.btnView}
                        onClick={() => setActiveModalEntry(item)}
                      >
                        View Full Details
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
                  ✕
                </button>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Faith Walk &amp; Classification</div>
                <div className={styles.modalSectionContent}>
                  <strong>Faith Journey:</strong> {activeModalEntry.faith_status}<br />
                  <strong>Assigned Segment:</strong> {activeModalEntry.assigned_segment} ({SEGMENT_LABELS[activeModalEntry.assigned_segment] || ''})<br />
                  <strong>Openness Score:</strong> {activeModalEntry.openness_rating} of 5
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Daily Prayer Reality</div>
                <div className={styles.modalSectionContent}>
                  {activeModalEntry.prayer_reality}
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Primary Friction Points</div>
                <div className={styles.modalSectionContent}>
                  {(activeModalEntry.prayer_friction_points || []).map((f) => (
                    <span key={f} className={styles.tagPill}>{f}</span>
                  ))}
                </div>
              </div>

              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Bible Study &amp; Preferred Formats</div>
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
                  <div className={styles.modalSectionTitle}>Observation on Biggest Misconception</div>
                  <div className={styles.modalSectionContent} style={{ fontStyle: 'italic' }}>
                    "{activeModalEntry.open_reflection}"
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'right', marginTop: '24px' }}>
                <button
                  type="button"
                  className={styles.btnView}
                  style={{ background: '#10B981', color: '#001647', border: 'none', fontWeight: '700' }}
                  onClick={() => setActiveModalEntry(null)}
                >
                  Close Reflection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
