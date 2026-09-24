'use client';
import React from 'react';
import { ArrowRight, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { WelcomeMascot } from './WelcomeMascot';

export const Step0Welcome = ({ onStart }) => {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 0' }} className="it-animate-fade">
      {/* Animated Welcome Guy Mascot */}
      <WelcomeMascot />

      {/* Header Emblem */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="/itsa-logo.png"
          alt="ITSA Emblem"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            objectFit: 'cover',
            margin: '0 auto 12px',
            border: '2px solid #2563EB',
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.35)',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <span className="it-badge" style={{ marginBottom: '10px' }}>
          2025–2029 SET
        </span>
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            margin: '8px 0 10px',
            lineHeight: 1.2,
          }}
        >
          IT Department Student Survey
        </h1>
        <p
          style={{
            fontSize: '0.9375rem',
            color: '#94A3B8',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.55,
          }}
        >
          Collect your directory information, evaluate 100L experiences and leadership, and sign up for class committees.
        </p>
      </div>

      {/* Class Rep Note Card */}
      <div
        className="it-card"
        style={{
          padding: '18px 20px',
          marginBottom: '20px',
          borderLeft: '3px solid #2563EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <img
            src="/images/Put_an_I_watch_to_202606282357.jpeg"
            alt="Glory Adeniran"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              objectFit: 'cover',
              objectPosition: 'top',
              border: '1px solid rgba(37, 99, 235, 0.5)',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Class Leadership Welcome
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#3B82F6', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
              Glory Adeniran · Class Representative
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6, margin: '0 0 10px' }}>
          "Welcome IT Scholars! Please take 2 minutes to fill out this form. We are updating our class directory, taking your candid feedback on our 100-level experience, and recruiting volunteers for class committees."
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: '#93C5FD', fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="#2563EB" /> 100% Student Voice
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="#2563EB" /> Confidential & Direct
          </span>
        </div>
      </div>

      {/* Perks / Info Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          marginBottom: '24px',
        }}
      >
        <div className="it-card" style={{ padding: '12px', textAlign: 'center' }}>
          <Clock size={16} color="#3B82F6" style={{ margin: '0 auto 4px' }} />
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>Time Estimate</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>~2 Minutes</p>
        </div>
        <div className="it-card" style={{ padding: '12px', textAlign: 'center' }}>
          <ShieldCheck size={16} color="#3B82F6" style={{ margin: '0 auto 4px' }} />
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>Leadership Review</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>Optional Anonymous</p>
        </div>
      </div>

      {/* CTA Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onStart}
          type="button"
          className="it-btn-primary"
          style={{ width: '100%', maxWidth: '340px', padding: '14px 28px', fontSize: '1rem' }}
        >
          <span>Begin Survey</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
export default Step0Welcome;
