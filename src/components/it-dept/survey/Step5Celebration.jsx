'use client';
import React, { useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ScholarPassCard } from '../pass/ScholarPassCard';
import { PassExporter } from '../pass/PassExporter';
import { RotateCcw } from 'lucide-react';

export const Step5Celebration = ({ formData, onReset }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#3B82F6', '#60A5FA', '#FFFFFF'],
      });
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }} className="it-animate-fade">
      <span className="it-badge" style={{ marginBottom: '12px' }}>
        LEVEL UP COMPLETE
      </span>
      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 8px' }}>
        Welcome to 200 Level, {formData.fullName.split(' ')[0]}!
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#94A3B8', maxWidth: '440px', margin: '0 auto 24px' }}>
        Your transition responses have been submitted. Download your official 200L Scholar Pass below.
      </p>

      {/* Render Pass */}
      <ScholarPassCard ref={cardRef} formData={formData} />

      {/* Exporter Buttons */}
      <PassExporter cardRef={cardRef} matricNo={formData.matricNo} fullName={formData.fullName} />

      {/* Reset */}
      <div style={{ marginTop: '28px' }}>
        <button
          type="button"
          onClick={onReset}
          style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCcw size={12} />
          <span>Fill another response</span>
        </button>
      </div>
    </div>
  );
};
export default Step5Celebration;
