'use client';
import React, { useState } from 'react';
import { ArrowRight, Clock, ShieldCheck, CheckCircle2, UserCheck, Search, X, Loader2 } from 'lucide-react';
import { WelcomeMascot } from './WelcomeMascot';
import { dataService } from '../services/dataService';

export const Step0Welcome = ({ onStart, onReturningStudent, showToast }) => {
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const handleLookupSubmit = async (e) => {
    e?.preventDefault();
    const query = lookupQuery.trim();
    if (!query) {
      setLookupError('Please enter your Matric Number or Email.');
      return;
    }

    setIsLookingUp(true);
    setLookupError('');

    try {
      const isEmail = query.includes('@');
      const matricArg = isEmail ? '' : query.toUpperCase();
      const emailArg = isEmail ? query.toLowerCase() : '';

      const res = await dataService.lookupStudent(matricArg, emailArg);
      if (res && res.found && res.student) {
        showToast?.(`Welcome back, ${res.student.fullName}! Your records were loaded.`, 'success');
        setShowLookupModal(false);
        onReturningStudent?.(res.student);
      } else {
        setLookupError('No existing submission found for this Matric Number or Email. If you have not submitted before, please click "Begin Survey" below.');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setLookupError('Unable to verify submission right now. Please check your network connection.');
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 0' }} className="it-animate-fade">
      {/* Header Emblem */}
      <div style={{ textAlign: 'center', marginBottom: '26px' }}>
        <img
          src="/itsa-logo.png"
          alt="ITSA Emblem"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            objectFit: 'cover',
            margin: '0 auto 12px',
            border: '2px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.25)',
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <span className="it-badge" style={{ marginBottom: '10px' }}>
          2025–2029 SET
        </span>
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 5vw, 2.1rem)',
            fontWeight: 800,
            letterSpacing: '-0.025em',
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
              border: '1px solid rgba(59, 130, 246, 0.4)',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Class Leadership Welcome
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#60A5FA', margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
              Glory Adeniran · Class Representative
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6, margin: '0 0 10px' }}>
          "Welcome IT Scholars! Please take 2 minutes to fill out this form. We are updating our class directory, taking your candid feedback on our 100-level experience, and recruiting volunteers for class committees."
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: '#93C5FD', fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="#3B82F6" /> 100% Student Voice
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="#3B82F6" /> Confidential & Direct
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
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748B' }}>Time Estimate</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>~2 Minutes</p>
        </div>
        <div className="it-card" style={{ padding: '12px', textAlign: 'center' }}>
          <ShieldCheck size={16} color="#3B82F6" style={{ margin: '0 auto 4px' }} />
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748B' }}>Leadership Review</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#FFFFFF' }}>Optional Anonymous</p>
        </div>
      </div>

      {/* CTA Buttons Row */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onStart}
          type="button"
          className="it-btn-primary"
          style={{ width: '100%', maxWidth: '360px', padding: '14px 28px', fontSize: '0.95rem' }}
        >
          <span>Begin Survey</span>
          <ArrowRight size={18} />
        </button>

        <button
          onClick={() => {
            setLookupError('');
            setShowLookupModal(true);
          }}
          type="button"
          className="it-btn-secondary"
          style={{
            width: '100%',
            maxWidth: '360px',
            padding: '11px 20px',
            fontSize: '0.85rem',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            background: 'rgba(37, 99, 235, 0.06)',
            color: '#93C5FD',
          }}
        >
          <UserCheck size={16} color="#3B82F6" />
          <span>Already submitted? Answer new questions →</span>
        </button>
      </div>

      {/* Lookup Modal for Returning Students */}
      {showLookupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowLookupModal(false)}
        >
          <div
            className="it-card it-animate-fade"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              background: '#0D111D',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.7)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowLookupModal(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60A5FA',
                }}
              >
                <UserCheck size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Update Your Submission
                </h3>
                <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                  Answer the newly added leadership continuation questions
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 16px' }}>
              If you submitted before new questions were added, enter your Matric Number or Email below to load your details and jump directly to the new questions.
            </p>

            <form onSubmit={handleLookupSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#EDEDED', marginBottom: '6px' }}>
                  Matriculation Number or Email Address:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="it-input"
                    placeholder="e.g. 24/52HA042 or your@gmail.com"
                    value={lookupQuery}
                    onChange={(e) => {
                      setLookupQuery(e.target.value);
                      if (lookupError) setLookupError('');
                    }}
                    autoFocus
                    style={{ paddingRight: '36px', fontSize: '0.875rem' }}
                  />
                  <Search size={16} color="#64748B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {lookupError && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#FCA5A5',
                    fontSize: '0.78rem',
                    lineHeight: 1.45,
                    marginBottom: '14px',
                  }}
                >
                  {lookupError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowLookupModal(false)}
                  className="it-btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '9px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLookingUp}
                  className="it-btn-primary"
                  style={{ fontSize: '0.82rem', padding: '9px 18px', minWidth: '130px' }}
                >
                  {isLookingUp ? (
                    <>
                      <Loader2 size={14} className="it-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Find & Continue</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Welcome Mascot Pop-up (Detached from Hero, in bottom corner) */}
      <WelcomeMascot />
    </div>
  );
};
export default Step0Welcome;
