'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Star, Shield, AlertCircle } from 'lucide-react';

const ACR_METRICS = [
  { field: 'acrRatingCommunication', label: 'Communication & Responsiveness', desc: 'Passing department updates and prompt replies to queries' },
  { field: 'acrRatingMaterials', label: 'Academic & Material Assistance', desc: 'Helping distribute slides and course information' },
  { field: 'acrRatingAvailability', label: 'Availability & Presence', desc: 'Being reachable and active during lectures and class activities' },
  { field: 'acrRatingWelfare', label: 'Empathy & Peer Support', desc: 'Supporting student welfare and fostering class unity' },
];

export const Step5ACRLeadership = ({ formData, onChange, onNext, onBack }) => {
  const [errorMsg, setErrorMsg] = useState('');

  const handleContinue = () => {
    const unrated = ACR_METRICS.find(m => (formData[m.field] || 0) === 0);
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
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 5 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>
          Assistant Class Rep (ACR) Review
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
          Evaluate the Assistant Class Representative and provide constructive suggestions for 200 Level.
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '24px' }}>
        {ACR_METRICS.map((m) => {
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

        {/* Constructive Improvements */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            What critical areas should leadership improve in 200 Level?
          </label>
          <textarea
            className="it-input"
            rows={3}
            placeholder="Share honest, constructive feedback to help class leaders serve better..."
            value={formData.leadershipCriticalAreas}
            onChange={(e) => onChange('leadershipCriticalAreas', e.target.value)}
            style={{ fontSize: '0.875rem', padding: '12px' }}
          />
        </div>

        {/* Anonymity Toggle */}
        <div
          onClick={() => onChange('isAnonymousLeadership', !formData.isAnonymousLeadership)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: formData.isAnonymousLeadership ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: formData.isAnonymousLeadership ? '1px solid #2563EB' : '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
          }}
        >
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid #3B82F6', background: formData.isAnonymousLeadership ? '#2563EB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {formData.isAnonymousLeadership && <Star size={12} fill="#FFFFFF" color="#FFFFFF" />}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#E2E8F0' }}>
            <span style={{ fontWeight: 600 }}>Submit leadership review anonymously</span>
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8' }}>
              Your ratings and text critique will be detached from your matric number in executive analytics.
            </span>
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary" style={{ minHeight: '44px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minHeight: '44px', minWidth: '150px' }}>
          <span>Next: Volunteer Roles</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step5ACRLeadership;
