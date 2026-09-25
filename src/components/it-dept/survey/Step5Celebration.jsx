'use client';
import React from 'react';
import { CheckCircle2, RotateCcw, User, Mail, Hash, BookOpen } from 'lucide-react';

export const Step5Celebration = ({ formData, onReset, isUpdateMode = false }) => {
  const firstName = (formData.fullName || 'Scholar').split(' ')[0];

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', textAlign: 'center' }} className="it-animate-fade">
      {/* Success Icon */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(37, 99, 235, 0.15)',
          border: '2px solid #2563EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#3B82F6',
          boxShadow: '0 0 25px rgba(37, 99, 235, 0.35)',
        }}
      >
        <CheckCircle2 size={36} />
      </div>

      <span className="it-badge" style={{ marginBottom: '10px' }}>
        {isUpdateMode ? 'REVIEW UPDATED' : 'SUBMISSION RECORDED'}
      </span>

      <h2
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 1.85rem)',
          fontWeight: 800,
          color: '#FFFFFF',
          margin: '6px 0 10px',
        }}
      >
        {isUpdateMode ? `Review Updated, ${firstName}!` : `Thank You, ${firstName}!`}
      </h2>

      <p
        style={{
          fontSize: '0.9375rem',
          color: '#94A3B8',
          maxWidth: '440px',
          margin: '0 auto 24px',
          lineHeight: 1.55,
        }}
      >
        {isUpdateMode
          ? 'Your responses to the newly added leadership continuation questions and suggestions have been securely saved.'
          : 'Your directory details, retrospective feedback, and committee preferences have been securely saved.'}
      </p>

      {/* Clean Summary Card */}
      <div
        className="it-card"
        style={{
          padding: '20px',
          textAlign: 'left',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h3
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#FFFFFF',
            margin: '0 0 6px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '8px',
          }}
        >
          Submission Summary
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={15} color="#3B82F6" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.6875rem', color: '#64748B', display: 'block' }}>Name</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#E2E8F0' }}>{formData.fullName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Hash size={15} color="#3B82F6" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.6875rem', color: '#64748B', display: 'block' }}>Matriculation Number</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#93C5FD', fontFamily: 'JetBrains Mono, monospace' }}>
              {formData.matricNo}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Mail size={15} color="#3B82F6" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: '0.6875rem', color: '#64748B', display: 'block' }}>Confirmation Sent To</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#E2E8F0' }}>{formData.email}</span>
          </div>
        </div>

        {formData.techTrack && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={15} color="#3B82F6" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748B', display: 'block' }}>Tech Track</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#E2E8F0' }}>{formData.techTrack}</span>
            </div>
          </div>
        )}

        {(formData.volunteerRoles || formData.committees || []).length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748B', display: 'block', marginBottom: '6px' }}>
              Volunteer Roles Selected
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(formData.volunteerRoles || formData.committees || []).map((comm) => (
                <span
                  key={comm}
                  className="it-chip it-chip-selected"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                >
                  {comm}
                </span>
              ))}
            </div>
          </div>
        )}

        {Number(formData.supportAmount || 0) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <CheckCircle2 size={16} color="#34D399" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '0.6875rem', color: '#64748B', display: 'block' }}>Leadership Contribution</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#34D399' }}>
                ₦{Number(formData.supportAmount).toLocaleString()} ({formData.paymentMethod === 'bank_transfer' ? 'Direct Bank Transfer' : 'Online Payment Verified'})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Done / Return */}
      <div>
        <button
          type="button"
          onClick={onReset}
          className="it-btn-secondary"
          style={{ fontSize: '0.85rem', padding: '10px 22px' }}
        >
          <RotateCcw size={14} />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
};
export default Step5Celebration;
