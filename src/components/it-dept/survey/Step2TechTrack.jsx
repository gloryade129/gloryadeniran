'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass, Check } from 'lucide-react';
import { TECH_TRACKS } from '@/components/it-dept/types/survey';

const ICON_MAP = { Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass };

export const Step2TechTrack = ({ formData, onChange, onNext, onBack }) => {
  const [errorMsg, setErrorMsg] = useState('');

  const handleContinue = () => {
    if (!formData.techTrack) {
      setErrorMsg('Please select your preferred Tech Track / Career Interest.');
      return;
    }
    setErrorMsg('');
    onNext();
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 2 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>
          Tech Track & Career Focus
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
          Which area of computing and technology are you passionate about specializing in during 200 Level?
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {TECH_TRACKS.map((track) => {
          const IconComp = ICON_MAP[track.icon] || Code;
          const isSelected = formData.techTrack === track.name;
          return (
            <div
              key={track.id}
              onClick={() => {
                onChange('techTrack', track.name);
                setErrorMsg('');
              }}
              className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
              style={{
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: '14px',
                border: isSelected ? '2px solid #2563EB' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'rgba(12, 18, 32, 0.75)',
                boxShadow: isSelected ? '0 0 20px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#FFFFFF' : '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: isSelected ? '#93C5FD' : '#FFFFFF' }}>
                    {track.name.split(' (')[0]}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                    {track.desc}
                  </p>
                </div>
              </div>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: isSelected ? 'none' : '1px solid #475569',
                  background: isSelected ? '#2563EB' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                {isSelected && <Check size={14} color="#FFFFFF" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary" style={{ minHeight: '44px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minHeight: '44px', minWidth: '150px' }}>
          <span>Next: 100L Review</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step2TechTrack;
