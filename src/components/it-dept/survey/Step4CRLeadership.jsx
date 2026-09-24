'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Star, Award } from 'lucide-react';

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
      <div className="it-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '3px solid #3ECF8E' }}>
        <img
          src="/images/Put_an_I_watch_to_202606282357.jpeg"
          alt="Glory Adeniran"
          style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(62, 207, 142, 0.4)' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>Glory Adeniran</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#3ECF8E', fontFamily: 'JetBrains Mono, monospace' }}>
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
                  <p style={{ margin: '2px 0 8px', fontSize: '0.75rem', color: '#71717A' }}>{m.desc}</p>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: val > 0 ? '#FBBF24' : '#52525B' }}>
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
                      background: val >= star ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: val >= star ? '1px solid rgba(251, 191, 36, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Star
                      size={20}
                      fill={val >= star ? '#FBBF24' : 'none'}
                      color={val >= star ? '#FBBF24' : '#52525B'}
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
