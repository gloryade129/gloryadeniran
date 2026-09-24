'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass } from 'lucide-react';
import { TECH_TRACKS, MONTH_NAMES } from '@/components/it-dept/types/survey';

const ICON_MAP = { Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass };

export const Step1Identity = ({ formData, onChange, onNext, onBack }) => {
  const [errorMsg, setErrorMsg] = useState('');

  const isNameValid = formData.fullName.trim().length >= 3;
  const isMatricValid = /^[A-Z0-9/]{6,16}$/.test(formData.matricNo.trim().toUpperCase());
  const isEmailValid = /^[^s@]+@[^s@]+.[^s@]+$/.test(formData.email.trim());
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
      setErrorMsg('Please enter a valid email address for confirmation.');
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
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 1 OF 4</span>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 8px' }}>
          Student Identity & Profile
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
          Your directory details ensure seamless communication and personalize your 200L Scholar Pass.
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.8125rem', marginBottom: '20px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
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
            Email Address * <span style={{ color: '#64748B', fontWeight: 400 }}>(For your pass & class updates)</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px' }}>
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
            Chosen Tech Track / Career Interest *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {TECH_TRACKS.map((track) => {
              const IconComp = ICON_MAP[track.icon] || Code;
              const isSelected = formData.techTrack === track.name;
              return (
                <div
                  key={track.id}
                  onClick={() => onChange('techTrack', track.name)}
                  className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div style={{ padding: '8px', borderRadius: '8px', background: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.05)', color: isSelected ? '#FFFFFF' : '#94A3B8' }}>
                    <IconComp size={16} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? '#93C5FD' : '#FFFFFF' }}>
                      {track.name.split(' (')[0]}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748B' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
