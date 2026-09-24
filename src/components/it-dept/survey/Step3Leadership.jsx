'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Star, Shield, Lock, Unlock } from 'lucide-react';

const METRICS = [
  { key: 'Communication', label: 'Communication & Timely Updates' },
  { key: 'Materials', label: 'Course Materials & Slide Distribution' },
  { key: 'Availability', label: 'Availability & Problem Resolution' },
  { key: 'Welfare', label: 'Empathy & Class Welfare Advocacy' },
];

export const Step3Leadership = ({ formData, onChange, onNext, onBack }) => {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 3 OF 4</span>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 8px' }}>
          Class Leadership Review
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
          Evaluate the Class Representative and Assistant Class Representative to improve 200L governance.
        </p>
      </div>

      {/* Anonymity Toggle Card */}
      <div
        onClick={() => onChange('isAnonymousLeadership', !formData.isAnonymousLeadership)}
        className={`it-card ${formData.isAnonymousLeadership ? 'it-card-selected' : ''}`}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: formData.isAnonymousLeadership ? '#2563EB' : 'rgba(255, 255, 255, 0.05)', color: '#FFFFFF' }}>
            {formData.isAnonymousLeadership ? <Lock size={18} /> : <Unlock size={18} />}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
              Submit Leadership Review Anonymously
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: formData.isAnonymousLeadership ? '#93C5FD' : '#64748B' }}>
              {formData.isAnonymousLeadership
                ? 'Active: Your identity is completely severed from this feedback in the database.'
                : 'Off: Feedback is associated with your student profile.'}
            </p>
          </div>
        </div>
        <input
          type="checkbox"
          checked={formData.isAnonymousLeadership}
          onChange={() => {}}
          style={{ accentColor: '#2563EB', width: '18px', height: '18px', cursor: 'pointer' }}
        />
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
        {/* Class Representative Evaluation */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
            Class Representative (CR) Evaluation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {METRICS.map(m => {
              const field = `crRating${m.key}`;
              const score = formData[field] || 5;
              return (
                <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>{m.label}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => onChange(field, star)}
                        className={`it-star-btn ${score >= star ? 'active' : ''}`}
                      >
                        <Star size={20} fill={score >= star ? '#3B82F6' : 'none'} color={score >= star ? '#3B82F6' : '#475569'} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assistant Class Representative Evaluation */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
            Assistant Class Representative (ACR) Evaluation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {METRICS.map(m => {
              const field = `acrRating${m.key}`;
              const score = formData[field] || 5;
              return (
                <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#CBD5E1' }}>{m.label}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => onChange(field, star)}
                        className={`it-star-btn ${score >= star ? 'active' : ''}`}
                      >
                        <Star size={20} fill={score >= star ? '#3B82F6' : 'none'} color={score >= star ? '#3B82F6' : '#475569'} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Qualitative comments */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            What did leadership do well in 100L?
          </label>
          <textarea
            className="it-input"
            rows={3}
            placeholder="Share positive highlights or appreciation..."
            value={formData.leadershipWellDone}
            onChange={(e) => onChange('leadershipWellDone', e.target.value)}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Critical areas leadership should improve in 200L
          </label>
          <textarea
            className="it-input"
            rows={3}
            placeholder="Constructive critique to help CR and ACR lead better..."
            value={formData.leadershipCriticalAreas}
            onChange={(e) => onChange('leadershipCriticalAreas', e.target.value)}
          />
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={onNext} className="it-btn-primary">
          <span>Continue</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step3Leadership;
