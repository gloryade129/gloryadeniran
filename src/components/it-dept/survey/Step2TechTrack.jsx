'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass, Check } from 'lucide-react';
import { TECH_TRACKS } from '@/components/it-dept/types/survey';

const ICON_MAP = { Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass };

export const Step2TechTrack = ({ formData, onChange, onNext, onBack, showToast }) => {
  const handleContinue = () => {
    if (!formData.techTrack) {
      showToast?.('Please select your preferred Tech Track / Career Interest.', 'error');
      return;
    }
    onNext();
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 2 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#EDEDED', margin: '6px 0 8px', letterSpacing: '-0.025em' }}>
          Tech Track & Career Focus
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
          Which area of computing and technology are you passionate about specializing in during 200 Level?
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {TECH_TRACKS.map((track) => {
          const IconComp = ICON_MAP[track.icon] || Code;
          const isSelected = formData.techTrack === track.name;
          return (
            <div
              key={track.id}
              onClick={() => onChange('techTrack', track.name)}
              className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
              style={{
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(62, 207, 142, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? '#3ECF8E' : '#A1A1AA',
                    flexShrink: 0,
                  }}
                >
                  <IconComp size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#3ECF8E' : '#EDEDED' }}>
                    {track.name}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#71717A' }}>
                    {track.desc}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#3ECF8E',
                    color: '#09090B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
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
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minWidth: '160px' }}>
          <span>Next: 100L Review</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step2TechTrack;
