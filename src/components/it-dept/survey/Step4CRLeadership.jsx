'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Star, Award, AlertCircle } from 'lucide-react';

const CR_METRICS = [
  { field: 'crRatingCommunication', label: 'Communication & Class Announcements', desc: 'Timely lecture updates, venue changes, and department info' },
  { field: 'crRatingMaterials', label: 'Course Materials & Slide Distribution', desc: 'Sharing slides, syllabus, past questions, and lecture resources' },
  { field: 'crRatingAvailability', label: 'Availability & Problem Solving', desc: 'Readiness to answer questions and resolve academic issues' },
  { field: 'crRatingWelfare', label: 'Empathy & Class Welfare Advocacy', desc: 'Looking out for peers, handling lecturer conflicts, student care' },
];

export const Step4CRLeadership = ({ formData, onChange, onNext, onBack }) => {
  const [errorMsg, setErrorMsg] = useState('');

  const handleContinue = () => {
    const unrated = CR_METRICS.find(m => (formData[m.field] || 0) === 0);
    if (unrated) {
      setErrorMsg(`Please select a rating for: ${unrated.label}`);
      return;
    }
    setErrorMsg('');
    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 4 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>
          Class Representative (CR) Review
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
          Evaluate the performance and leadership of Glory Adeniran (Your Class Rep) in 100 Level.
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Leadership Profile Header Card */}
      <div className="it-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '3px solid #2563EB' }}>
        <img
          src="/images/Put_an_I_watch_to_202606282357.jpeg"
          alt="Glory Adeniran"
          style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(37,99,235,0.4)' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>Glory Adeniran</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#38BDF8', fontFamily: 'JetBrains Mono, monospace' }}>
            Class Representative · IT Dept (2025-2029 Set)
          </p>
        </div>
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '24px' }}>
        {CR_METRICS.map((m) => {
          const val = formData[m.field] || 0;
          return (
            <div key={m.field} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>{m.label}</h4>
                  <p style={{ margin: '2px 0 8px', fontSize: '0.75rem', color: '#94A3B8' }}>{m.desc}</p>
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: val > 0 ? '#FBBF24' : '#64748B' }}>
                  {val > 0 ? `${val} / 5` : 'Tap star'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      onChange(m.field, star);
                      setErrorMsg('');
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <Star
                      size={26}
                      fill={val >= star ? '#FBBF24' : 'none'}
                      color={val >= star ? '#FBBF24' : '#475569'}
                      strokeWidth={2}
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Qualitative highlight */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            What did leadership do well in 100 Level?
          </label>
          <textarea
            className="it-input"
            rows={3}
            placeholder="Share positive highlights, dedication, or support you appreciated..."
            value={formData.leadershipWellDone}
            onChange={(e) => onChange('leadershipWellDone', e.target.value)}
            style={{ fontSize: '0.875rem', padding: '12px' }}
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary" style={{ minHeight: '44px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minHeight: '44px', minWidth: '150px' }}>
          <span>Next: Assistant Class Rep</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step4CRLeadership;
