'use client';
import React, { useState, useMemo } from 'react';
import { MessageSquare, Search, Star, ThumbsUp, AlertCircle, EyeOff, UserCheck } from 'lucide-react';

export const FeedbackCardList = ({ feedbacks = [], profiles = [] }) => {
  const [filterMode, setFilterMode] = useState('all'); // all, anon, attributed
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      const isAnon = item.isAnonymous || !item.studentId;
      if (filterMode === 'anon' && !isAnon) return false;
      if (filterMode === 'attributed' && isAnon) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWellDone = item.wellDone?.toLowerCase().includes(q);
        const matchesCritical = item.criticalAreas?.toLowerCase().includes(q);
        const matchesName = item.studentName?.toLowerCase().includes(q);
        if (!matchesWellDone && !matchesCritical && !matchesName) return false;
      }
      return true;
    });
  }, [feedbacks, filterMode, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls */}
      <div className="it-admin-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`it-admin-btn ${filterMode === 'all' ? 'it-admin-btn-primary' : ''}`}
          >
            All Feedback ({feedbacks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('anon')}
            className={`it-admin-btn ${filterMode === 'anon' ? 'it-admin-btn-primary' : ''}`}
          >
            <EyeOff size={13} />
            <span>Anonymous</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('attributed')}
            className={`it-admin-btn ${filterMode === 'attributed' ? 'it-admin-btn-primary' : ''}`}
          >
            <UserCheck size={13} />
            <span>Attributed</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder="Search feedback text..."
            className="it-input"
            style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredFeedbacks.length > 0 ? (
          filteredFeedbacks.map((f, i) => {
            const isAnon = f.isAnonymous || !f.studentId;
            const score = f.overallScore || '5.0';
            return (
              <div key={f.id || i} className="it-admin-card">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        background: isAnon ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                        border: `1px solid ${isAnon ? 'rgba(239, 68, 68, 0.3)' : 'rgba(37, 99, 235, 0.3)'}`,
                        color: isAnon ? '#FCA5A5' : '#93C5FD',
                      }}
                    >
                      {isAnon ? 'Anonymous Review' : 'Verified Student'}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
                      {isAnon ? 'Anonymous Scholar' : f.studentName || 'IT Scholar'}
                    </span>
                    {!isAnon && f.studentMatric && (
                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                        ({f.studentMatric})
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Star size={15} fill="#3B82F6" color="#3B82F6" />
                    <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {score} / 5.0
                    </span>
                  </div>
                </div>

                {/* Feedback Boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {f.wellDone && (
                    <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#60A5FA' }}>
                        <ThumbsUp size={13} />
                        <span>What Leadership Did Well:</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                        "{f.wellDone}"
                      </p>
                    </div>
                  )}

                  {f.criticalAreas && (
                    <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#FBBF24' }}>
                        <AlertCircle size={13} />
                        <span>Areas to Improve in 200L:</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                        "{f.criticalAreas}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="it-admin-card" style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
            No feedback entries found matching your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
export default FeedbackCardList;
