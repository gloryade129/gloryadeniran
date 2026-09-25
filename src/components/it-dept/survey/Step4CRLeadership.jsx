'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Star, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';

const CR_METRICS = [
  { field: 'crRatingCommunication', label: 'Communication & Class Announcements', desc: 'Timely lecture updates, venue changes, and department info' },
  { field: 'crRatingMaterials', label: 'Course Materials & Slide Distribution', desc: 'Sharing slides, syllabus, past questions, and lecture resources' },
  { field: 'crRatingAvailability', label: 'Availability & Problem Solving', desc: 'Readiness to answer questions and resolve academic issues' },
  { field: 'crRatingWelfare', label: 'Empathy & Class Welfare Advocacy', desc: 'Looking out for peers, handling lecturer conflicts, student care' },
];

export const Step4CRLeadership = ({ formData, onChange, onNext, onBack, showToast }) => {
  const handleContinue = () => {
    const unrated = CR_METRICS.find(m => (formData[m.field] || 0) === 0);
    if (unrated) {
      showToast?.(`Please select a rating for: ${unrated.label}`, 'error');
      return;
    }

    if (!formData.crRecommendContinue) {
      showToast?.('Please indicate whether you recommend Glory to continue as Class Rep.', 'error');
      return;
    }

    if (!formData.crRecommendReason || formData.crRecommendReason.trim().length < 5) {
      showToast?.('Please share your reason (if yes why, if no why) with at least 5 characters.', 'error');
      return;
    }

    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 4 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#EDEDED', margin: '6px 0 8px', letterSpacing: '-0.025em' }}>
          Class Representative (CR) Review
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
          Evaluate the performance and leadership of Glory Adeniran (Your Class Rep) in 100 Level.
        </p>
      </div>

      {/* Leadership Profile Header Card */}
      <div className="it-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '3px solid #2563EB' }}>
        <img
          src="/images/Put_an_I_watch_to_202606282357.jpeg"
          alt="Glory Adeniran"
          style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1.5px solid rgba(59, 130, 246, 0.5)' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>Glory Adeniran</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}>
            Class Representative · IT Dept (2025-2029 Set)
          </p>
        </div>
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '24px' }}>
        {CR_METRICS.map((m) => {
          const val = formData[m.field] || 0;
          return (
            <div key={m.field} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#EDEDED' }}>{m.label}</h4>
                  <p style={{ margin: '2px 0 8px', fontSize: '0.75rem', color: '#94A3B8' }}>{m.desc}</p>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: val > 0 ? '#3B82F6' : '#64748B' }}>
                  {val > 0 ? `${val} / 5` : 'Tap star'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onChange(m.field, star)}
                    className={`it-star-btn ${val >= star ? 'active' : ''}`}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '6px',
                      background: val >= star ? 'rgba(37, 99, 235, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: val >= star ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Star
                      size={20}
                      fill={val >= star ? '#3B82F6' : 'none'}
                      color={val >= star ? '#3B82F6' : '#64748B'}
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Continuation Question for CR Glory */}
        <div style={{ paddingTop: '8px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            Would you recommend Glory to continue as the Class Representative in 200 Level? *
          </label>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0 0 12px 0' }}>
            Your honest assessment helps ensure effective leadership continuity for our class.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            {[
              { id: 'yes', label: 'Yes, definitely', icon: ThumbsUp },
              { id: 'no', label: 'No', icon: ThumbsDown },
              { id: 'undecided', label: 'Undecided', icon: HelpCircle },
            ].map(opt => {
              const isSelected = formData.crRecommendContinue === opt.id;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange('crRecommendContinue', opt.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(37, 99, 235, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1.5px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isSelected ? '#60A5FA' : '#CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <IconComp size={16} color={isSelected ? '#60A5FA' : '#94A3B8'} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '6px' }}>
              Kindly share your reason (If yes why, if no why): *
            </label>
            <textarea
              className="it-input"
              rows={3}
              placeholder="Please explain why you recommend or do not recommend Glory to continue as Class Rep for 200 Level..."
              value={formData.crRecommendReason || ''}
              onChange={(e) => onChange('crRecommendReason', e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', lineHeight: 1.5 }}
            />
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minWidth: '170px' }}>
          <span>Next: Assistant CR</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step4CRLeadership;
