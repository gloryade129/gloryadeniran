'use client';
import React from 'react';
import { ArrowRight, Clock, ShieldCheck, Award, MessageSquareQuote, CheckCircle2 } from 'lucide-react';

export const Step0Welcome = ({ onStart }) => {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 0' }} className="it-animate-fade">
      {/* Header Emblem */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src="/itsa-logo.png"
          alt="ITSA Emblem"
          style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '2px solid #2563EB', boxShadow: '0 0 20px rgba(37, 99, 235, 0.35)' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <span className="it-badge" style={{ marginBottom: '12px' }}>
          LEVEL UP TO 200L
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', margin: '8px 0 12px', lineHeight: 1.15 }}>
          Transition to 200 Level
        </h1>
        <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
          Official 100L retrospective, confidential leadership review, committee sign-ups, and verified Scholar Pass generator for the IT Dept (2025–2029 Set).
        </p>
      </div>

      {/* Class Rep Note Card */}
      <div className="it-card" style={{ padding: '20px 24px', marginBottom: '24px', borderLeft: '3px solid #2563EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <img
            src="/images/Put_an_I_watch_to_202606282357.jpeg"
            alt="Glory Adeniran"
            style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', objectPosition: 'top', border: '1px solid rgba(37, 99, 235, 0.5)' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              A Word from Class Leadership
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#3B82F6', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
              Glory Adeniran · Class Representative
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 12px' }}>
          "Welcome IT Scholars! 100L was foundational. As we transition into core computing in 200L, let us know how your experience went, evaluate leadership transparently, join class committees, and claim your verified pass."
        </p>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#93C5FD', fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="#2563EB" /> 100% Student Voice
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="#2563EB" /> Real Class Impact
          </span>
        </div>
      </div>

      {/* 3 Perks Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        <div className="it-card" style={{ padding: '14px', textAlign: 'center' }}>
          <Clock size={16} color="#3B82F6" style={{ margin: '0 auto 6px' }} />
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>Time Required</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>~2 Minutes</p>
        </div>
        <div className="it-card" style={{ padding: '14px', textAlign: 'center' }}>
          <ShieldCheck size={16} color="#3B82F6" style={{ margin: '0 auto 6px' }} />
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>Leadership Review</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>Anonymity Toggle</p>
        </div>
        <div className="it-card" style={{ padding: '14px', textAlign: 'center' }}>
          <Award size={16} color="#3B82F6" style={{ margin: '0 auto 6px' }} />
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8' }}>Reward</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>200L Pass</p>
        </div>
      </div>

      {/* CTA Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onStart}
          type="button"
          className="it-btn-primary"
          style={{ width: '100%', maxWidth: '320px', padding: '14px 28px', fontSize: '1rem' }}
        >
          <span>Begin Transition Journey</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
export default Step0Welcome;
