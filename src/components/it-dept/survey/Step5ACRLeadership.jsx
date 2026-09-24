'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Star, Shield } from 'lucide-react';

const ACR_METRICS = [
  { field: 'acrRatingCommunication', label: 'Communication & Responsiveness', desc: 'Passing department updates and prompt replies to queries' },
  { field: 'acrRatingMaterials', label: 'Academic & Material Assistance', desc: 'Helping distribute slides and course information' },
  { field: 'acrRatingAvailability', label: 'Availability & Presence', desc: 'Being reachable and active during lectures and class activities' },
  { field: 'acrRatingWelfare', label: 'Empathy & Peer Support', desc: 'Supporting student welfare and fostering class unity' },
];

export const Step5ACRLeadership = ({ formData, onChange, onNext, onBack, showToast }) => {
  const handleContinue = () => {
    const unrated = ACR_METRICS.find(m => (formData[m.field] || 0) === 0);
    if (unrated) {
      showToast?.(`Please select a rating for: ${unrated.label}`, 'error');
      return;
    }
    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 5 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#EDEDED', margin: '6px 0 8px', letterSpacing: '-0.025em' }}>
          Assistant Class Rep (ACR) Review
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
          Evaluate the Assistant Class Representative and provide constructive suggestions for 200 Level.
        </p>
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '24px' }}>
        {ACR_METRICS.map((m) => {
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

        {/* Qualitative Comments */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '6px' }}>
            What did our leadership team do well in 100 Level?
          </label>
          <textarea
            className="it-input"
            rows={2}
            placeholder="e.g. Prompt announcements, material sharing..."
            value={formData.leadershipPraises || ''}
            onChange={(e) => onChange('leadershipPraises', e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '6px' }}>
            What critical areas should leadership improve in 200 Level?
          </label>
          <textarea
            className="it-input"
            rows={2}
            placeholder="e.g. More study groups, earlier timetable notifications..."
            value={formData.leadershipImprovements || ''}
            onChange={(e) => onChange('leadershipImprovements', e.target.value)}
          />
        </div>

        {/* Anonymity Toggle */}
        <div
          onClick={() => onChange('isAnonymousFeedback', !formData.isAnonymousFeedback)}
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            background: formData.isAnonymousFeedback ? 'rgba(62, 207, 142, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: formData.isAnonymousFeedback ? '1px solid #3ECF8E' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={16} color={formData.isAnonymousFeedback ? '#3ECF8E' : '#71717A'} />
            <div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: formData.isAnonymousFeedback ? '#3ECF8E' : '#EDEDED' }}>
                Submit Leadership Comments Anonymously
              </p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#71717A' }}>
                Detaches your identity from these written review questions
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(formData.isAnonymousFeedback)}
            onChange={() => {}}
            style={{ width: '16px', height: '16px', accentColor: '#3ECF8E' }}
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minWidth: '170px' }}>
          <span>Next: Volunteer Roles</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step5ACRLeadership;
