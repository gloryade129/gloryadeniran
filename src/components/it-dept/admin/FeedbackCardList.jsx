'use client';
import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  EyeOff,
  UserCheck,
  Sparkles,
  Heart,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';

export const FeedbackCardList = ({ feedbacks = [], profiles = [] }) => {
  const [filterMode, setFilterMode] = useState('all'); // all, anon, attributed
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});

  // Fast profile lookup maps
  const profilesMap = useMemo(() => {
    const byId = new Map();
    const byMatric = new Map();
    for (const p of profiles) {
      if (p.id) byId.set(p.id, p);
      if (p.matricNo) byMatric.set(p.matricNo.trim().toUpperCase(), p);
    }
    return { byId, byMatric };
  }, [profiles]);

  // Enrich each feedback item with profile info and fallback comments
  const enrichedFeedbacks = useMemo(() => {
    return feedbacks.map((f, idx) => {
      const matchedProfile = f.studentId ? profilesMap.byId.get(f.studentId) : null;
      const isAnon = Boolean(f.isAnonymous || !f.studentId);

      const studentName = isAnon ? '' : (f.studentName || matchedProfile?.fullName || '');
      const studentMatric = isAnon ? '' : (f.studentMatric || matchedProfile?.matricNo || '');
      const studentEmail = isAnon ? '' : (f.studentEmail || matchedProfile?.email || '');
      const techTrack = isAnon ? '' : (f.techTrack || matchedProfile?.techTrack || '');

      const wellDone = (f.wellDone || f.positiveShoutout || '').trim();
      const criticalAreas = (f.criticalAreas || f.qualitativeCritique || '').trim();
      const suggestions200L = (f.suggestions200L || matchedProfile?.suggestions200L || '').trim();
      const supportNote = (f.supportNote || matchedProfile?.supportNote || '').trim();
      const challenges100L = (f.challenges100L && f.challenges100L.length > 0)
        ? f.challenges100L
        : (matchedProfile?.challenges100L || []);

      const crRecommendContinue = f.crRecommendContinue || matchedProfile?.crRecommendContinue || '';
      const crRecommendReason = (f.crRecommendReason || matchedProfile?.crRecommendReason || '').trim();
      const acrRecommendContinue = f.acrRecommendContinue || matchedProfile?.acrRecommendContinue || '';
      const acrRecommendReason = (f.acrRecommendReason || matchedProfile?.acrRecommendReason || '').trim();

      const crComm = Number(f.crCommunication) || 0;
      const crMat = Number(f.crMaterials) || 0;
      const crAvail = Number(f.crAvailability) || 0;
      const crWelf = Number(f.crWelfare) || 0;

      const acrComm = Number(f.acrCommunication) || 0;
      const acrMat = Number(f.acrMaterials) || 0;
      const acrAvail = Number(f.acrAvailability) || 0;
      const acrWelf = Number(f.acrWelfare) || 0;

      const nonZeroRatings = [crComm, crMat, crAvail, crWelf, acrComm, acrMat, acrAvail, acrWelf].filter(r => r > 0);
      const computedScore = nonZeroRatings.length > 0
        ? Math.round((nonZeroRatings.reduce((a, b) => a + b, 0) / nonZeroRatings.length) * 10) / 10
        : 0;
      const score = Number(f.overallScore) > 0 ? Number(f.overallScore) : computedScore;

      const hasAnyComment = Boolean(
        wellDone ||
        criticalAreas ||
        suggestions200L ||
        supportNote ||
        crRecommendReason ||
        acrRecommendReason
      );

      return {
        ...f,
        uniqueKey: f.id || `fb-${idx}`,
        isAnon,
        studentName,
        studentMatric,
        studentEmail,
        techTrack,
        wellDone,
        criticalAreas,
        suggestions200L,
        supportNote,
        challenges100L,
        crRecommendContinue,
        crRecommendReason,
        acrRecommendContinue,
        acrRecommendReason,
        crComm,
        crMat,
        crAvail,
        crWelf,
        acrComm,
        acrMat,
        acrAvail,
        acrWelf,
        score,
        hasAnyComment,
      };
    });
  }, [feedbacks, profilesMap]);

  const filteredFeedbacks = useMemo(() => {
    return enrichedFeedbacks.filter((item) => {
      if (filterMode === 'anon' && !item.isAnon) return false;
      if (filterMode === 'attributed' && item.isAnon) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWellDone = item.wellDone?.toLowerCase().includes(q);
        const matchesCritical = item.criticalAreas?.toLowerCase().includes(q);
        const matchesSuggestions = item.suggestions200L?.toLowerCase().includes(q);
        const matchesSupport = item.supportNote?.toLowerCase().includes(q);
        const matchesCrReason = item.crRecommendReason?.toLowerCase().includes(q);
        const matchesAcrReason = item.acrRecommendReason?.toLowerCase().includes(q);
        const matchesName = item.studentName?.toLowerCase().includes(q);
        const matchesMatric = item.studentMatric?.toLowerCase().includes(q);

        if (
          !matchesWellDone &&
          !matchesCritical &&
          !matchesSuggestions &&
          !matchesSupport &&
          !matchesCrReason &&
          !matchesAcrReason &&
          !matchesName &&
          !matchesMatric
        ) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedFeedbacks, filterMode, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls Bar */}
      <div
        className="it-admin-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
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
            onClick={() => setFilterMode('attributed')}
            className={`it-admin-btn ${filterMode === 'attributed' ? 'it-admin-btn-primary' : ''}`}
          >
            <UserCheck size={13} />
            <span>Verified Scholars ({enrichedFeedbacks.filter((f) => !f.isAnon).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('anon')}
            className={`it-admin-btn ${filterMode === 'anon' ? 'it-admin-btn-primary' : ''}`}
          >
            <EyeOff size={13} />
            <span>Anonymous ({enrichedFeedbacks.filter((f) => f.isAnon).length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder="Search scholar, matric, comments, reasons..."
            className="it-input"
            style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredFeedbacks.length > 0 ? (
          filteredFeedbacks.map((f) => {
            const isExpanded = expandedCards[f.uniqueKey] !== false; // Default expanded so all comments are immediately visible!

            return (
              <div key={f.uniqueKey} className="it-admin-card" style={{ padding: '20px' }}>
                {/* Header Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '10px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: f.isAnon ? 'rgba(239, 68, 68, 0.15)' : 'rgba(37, 99, 235, 0.18)',
                        border: `1px solid ${f.isAnon ? 'rgba(239, 68, 68, 0.35)' : 'rgba(37, 99, 235, 0.35)'}`,
                        color: f.isAnon ? '#FCA5A5' : '#93C5FD',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {f.isAnon ? <EyeOff size={11} /> : <UserCheck size={11} />}
                      <span>{f.isAnon ? 'Anonymous Review' : 'Verified Student'}</span>
                    </span>

                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
                      {f.isAnon ? 'Anonymous Scholar' : f.studentName || 'Verified IT Scholar'}
                    </span>

                    {!f.isAnon && f.studentMatric && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#60A5FA',
                          fontFamily: 'monospace',
                          background: 'rgba(37, 99, 235, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        {f.studentMatric}
                      </span>
                    )}

                    {!f.isAnon && f.techTrack && (
                      <span
                        className="it-chip"
                        style={{ fontSize: '0.7rem', padding: '2px 8px', color: '#94A3B8' }}
                      >
                        {f.techTrack.split(' (')[0]}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(37, 99, 235, 0.12)',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                      }}
                    >
                      <Star size={14} fill="#3B82F6" color="#3B82F6" />
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {f.score} / 5.0
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(f.uniqueKey)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={isExpanded ? 'Collapse card' : 'Expand card'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* 8-Criteria Star Ratings Breakdown Matrix */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {/* CR Glory Adeniran Ratings */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#60A5FA',
                            marginBottom: '8px',
                          }}
                        >
                          <Award size={13} />
                          <span>Glory Adeniran (Class Rep):</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Communication:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.crComm}/5</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Materials:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.crMat}/5</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Availability:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.crAvail}/5</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Welfare:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.crWelf}/5</span>
                          </div>
                        </div>
                      </div>

                      {/* ACR Esther Ratings */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#93C5FD',
                            marginBottom: '8px',
                          }}
                        >
                          <Award size={13} />
                          <span>Esther (Assistant Class Rep):</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Communication:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.acrComm}/5</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Materials:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.acrMat}/5</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Availability:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.acrAvail}/5</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                            <span>Welfare:</span>
                            <span style={{ fontWeight: 700, color: '#FFFFFF' }}>★ {f.acrWelf}/5</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Continuation Recommendations */}
                    {(f.crRecommendContinue || f.acrRecommendContinue) && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '10px',
                        }}
                      >
                        {f.crRecommendContinue && (
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: 'rgba(37, 99, 235, 0.08)',
                              border: '1px solid rgba(37, 99, 235, 0.2)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                                Glory (CR) Continue:
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background:
                                    f.crRecommendContinue === 'yes'
                                      ? 'rgba(37, 99, 235, 0.2)'
                                      : f.crRecommendContinue === 'no'
                                      ? 'rgba(239, 68, 68, 0.2)'
                                      : 'rgba(100, 116, 139, 0.2)',
                                  color:
                                    f.crRecommendContinue === 'yes'
                                      ? '#60A5FA'
                                      : f.crRecommendContinue === 'no'
                                      ? '#F87171'
                                      : '#94A3B8',
                                }}
                              >
                                {f.crRecommendContinue.toUpperCase()}
                              </span>
                            </div>
                            {f.crRecommendReason ? (
                              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#E2E8F0', fontStyle: 'italic', lineHeight: 1.45 }}>
                                "{f.crRecommendReason}"
                              </p>
                            ) : (
                              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic' }}>
                                (No additional reason entered)
                              </p>
                            )}
                          </div>
                        )}

                        {f.acrRecommendContinue && (
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: 'rgba(37, 99, 235, 0.08)',
                              border: '1px solid rgba(37, 99, 235, 0.2)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                                Esther (ACR) Continue:
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background:
                                    f.acrRecommendContinue === 'yes'
                                      ? 'rgba(37, 99, 235, 0.2)'
                                      : f.acrRecommendContinue === 'no'
                                      ? 'rgba(239, 68, 68, 0.2)'
                                      : 'rgba(100, 116, 139, 0.2)',
                                  color:
                                    f.acrRecommendContinue === 'yes'
                                      ? '#60A5FA'
                                      : f.acrRecommendContinue === 'no'
                                      ? '#F87171'
                                      : '#94A3B8',
                                }}
                              >
                                {f.acrRecommendContinue.toUpperCase()}
                              </span>
                            </div>
                            {f.acrRecommendReason ? (
                              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#E2E8F0', fontStyle: 'italic', lineHeight: 1.45 }}>
                                "{f.acrRecommendReason}"
                              </p>
                            ) : (
                              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic' }}>
                                (No additional reason entered)
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Qualitative Feedback Boxes */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {/* What Leadership Did Well */}
                      {f.wellDone && (
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'rgba(37, 99, 235, 0.08)',
                            border: '1px solid rgba(37, 99, 235, 0.22)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#60A5FA',
                            }}
                          >
                            <ThumbsUp size={13} />
                            <span>What Leadership Did Well:</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.55 }}>
                            "{f.wellDone}"
                          </p>
                        </div>
                      )}

                      {/* Critical Areas to Improve */}
                      {f.criticalAreas && (
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.22)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#FBBF24',
                            }}
                          >
                            <AlertCircle size={13} />
                            <span>Critical Areas to Improve in 200L:</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.55 }}>
                            "{f.criticalAreas}"
                          </p>
                        </div>
                      )}

                      {/* 200L Suggestions & Vision */}
                      {f.suggestions200L && (
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.22)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#A78BFA',
                            }}
                          >
                            <Sparkles size={13} />
                            <span>Suggestions for 200 Level:</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.55 }}>
                            "{f.suggestions200L}"
                          </p>
                        </div>
                      )}

                      {/* Personal Note to Leadership */}
                      {f.supportNote && (
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.22)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: '#34D399',
                            }}
                          >
                            <Heart size={13} />
                            <span>Personal Note to Leadership:</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.55, fontStyle: 'italic' }}>
                            "{f.supportNote}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 100L Challenges Badges (if any) */}
                    {f.challenges100L?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                          100L Challenges:
                        </span>
                        {f.challenges100L.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="it-chip"
                            style={{ fontSize: '0.7rem', padding: '2px 8px', color: '#CBD5E1' }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Informative fallback if scholar entered no free-text comments at all */}
                    {!f.hasAnyComment && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px dashed rgba(255, 255, 255, 0.08)',
                          color: '#94A3B8',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Info size={14} color="#60A5FA" />
                        <span>
                          No written critique was submitted by this scholar. View their evaluated criteria breakdown above.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="it-admin-card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
            No feedback entries found matching your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackCardList;
