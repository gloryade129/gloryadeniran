'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass } from 'lucide-react';
import { TECH_TRACKS, MONTH_NAMES } from '@/components/it-dept/types/survey';

const ICON_MAP = { Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass };

export const Step1Identity = ({ formData, onChange, onNext, onBack }) => {
  const [errorMsg, setErrorMsg] = useState('');

  const isNameValid = formData.fullName.trim().length >= 3;
  const isMatricValid = /^[A-Z0-9/]{6,16}$/.test(formData.matricNo.trim().toUpperCase());
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isPhoneValid = formData.phone.trim().length >= 10;
  const isTechTrackValid = Boolean(formData.techTrack);

  const handleContinue = () => {
    if (!isNameValid) {
      setErrorMsg('Please enter your full official name (at least 3 characters).');
      return;
    }
    if (!isMatricValid) {
      setErrorMsg('Please enter a valid Matriculation Number (e.g., 24/52HA042).');
      return;
    }
    if (!isEmailValid) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!isPhoneValid) {
      setErrorMsg('Please enter a valid WhatsApp phone number.');
      return;
    }
    if (!isTechTrackValid) {
      setErrorMsg('Please select your preferred Tech Track / Career Interest.');
      return;
    }
    setErrorMsg('');
    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '20px' }}>
        <span className="it-badge" style={{ marginBottom: '6px' }}>STEP 1 OF 4</span>
        <h2 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 6px' }}>
          Student Identity & Profile
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
          Your directory details ensure effective communication and records for the department.
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.8125rem', marginBottom: '16px' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="it-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        {/* Full Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Full Official Name *
          </label>
          <input
            type="text"
            className="it-input"
            placeholder="e.g., Adeniran Glory Oluwatobiloba"
            value={formData.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
          />
        </div>

        {/* Matric & WhatsApp */}
        <div className="it-grid-2">
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
              Matriculation Number *
            </label>
            <input
              type="text"
              className="it-input"
              placeholder="e.g., 24/52HA042"
              value={formData.matricNo}
              onChange={(e) => onChange('matricNo', e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
              WhatsApp Phone Number *
            </label>
            <input
              type="tel"
              className="it-input"
              placeholder="e.g., 08012345678"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Email Address * <span style={{ color: '#64748B', fontWeight: 400 }}>(For confirmation receipt)</span>
          </label>
          <input
            type="email"
            className="it-input"
            placeholder="e.g., student@gmail.com"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </div>

        {/* Birthday */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Birthday Celebration Day & Month
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px' }}>
            <select
              className="it-input"
              value={formData.birthDay}
              onChange={(e) => onChange('birthDay', Number(e.target.value))}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d} style={{ background: '#0C1220' }}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="it-input"
              value={formData.birthMonth}
              onChange={(e) => onChange('birthMonth', Number(e.target.value))}
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1} style={{ background: '#0C1220' }}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tech Track Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            Primary Tech Track / Career Interest *
          </label>
          <div className="it-grid-tracks">
            {TECH_TRACKS.map((track) => {
              const IconComp = ICON_MAP[track.icon] || Code;
              const isSelected = formData.techTrack === track.name;
              return (
                <div
                  key={track.id}
                  onClick={() => onChange('techTrack', track.name)}
                  className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div style={{ padding: '8px', borderRadius: '8px', background: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.05)', color: isSelected ? '#FFFFFF' : '#94A3B8', flexShrink: 0 }}>
                    <IconComp size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? '#93C5FD' : '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.name.split(' (')[0]}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary">
          <span>Continue</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step1Identity;
