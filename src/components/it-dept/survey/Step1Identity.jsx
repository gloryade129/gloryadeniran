'use client';
import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, User, Hash, Mail, Phone, Calendar, Loader2 } from 'lucide-react';
import { MONTH_NAMES } from '@/components/it-dept/types/survey';

export const Step1Identity = ({ formData, onChange, onNext, onBack, showToast }) => {
  const [isChecking, setIsChecking] = useState(false);

  // Clear stale local duplicate markers on mount so deleted admin records can re-enter immediately
  useEffect(() => {
    try {
      localStorage.removeItem('it_dept_submitted_email');
      localStorage.removeItem('it_dept_submitted_matric');
    } catch (e) {}
  }, []);

  const isNameValid = formData.fullName.trim().length >= 3;
  const isMatricValid = /^[A-Z0-9/]{6,16}$/.test(formData.matricNo.trim().toUpperCase());
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isPhoneValid = formData.phone.trim().length >= 10;

  const handleContinue = async () => {
    if (!isNameValid) {
      showToast?.('Please enter your full official name (at least 3 characters).', 'error');
      return;
    }
    if (!isMatricValid) {
      showToast?.('Please enter a valid Matriculation Number (e.g., 24/52HA042).', 'error');
      return;
    }
    if (!isEmailValid) {
      showToast?.('Please enter a valid email address.', 'error');
      return;
    }
    if (!isPhoneValid) {
      showToast?.('Please enter a valid WhatsApp phone number.', 'error');
      return;
    }

    setIsChecking(true);

    try {
      const res = await fetch('/api/it-dept/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          matricNo: formData.matricNo.trim().toUpperCase(),
        }),
      });

      if (res.ok) {
        const checkData = await res.json();
        if (checkData.exists) {
          showToast?.(checkData.message || 'A submission with this email or matric number already exists in our records.', 'error');
          setIsChecking(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Duplicate check warning:', e);
    }

    setIsChecking(false);
    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 1 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#EDEDED', margin: '6px 0 8px', letterSpacing: '-0.025em' }}>
          Student Identity & Records
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
          Your directory details ensure smooth academic notifications, timetable releases, and class record verification.
        </p>
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {/* Full Name */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '8px' }}>
            <User size={15} color="#3B82F6" />
            <span>Full Official Name *</span>
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
        <div className="it-grid-2" style={{ gap: '16px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '8px' }}>
              <Hash size={15} color="#3B82F6" />
              <span>Matriculation Number *</span>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '8px' }}>
              <Phone size={15} color="#3B82F6" />
              <span>WhatsApp Phone *</span>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '8px' }}>
            <Mail size={15} color="#3B82F6" />
            <span>Email Address * <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.75rem' }}>(For confirmation receipt)</span></span>
          </label>
          <input
            type="email"
            className="it-input"
            placeholder="e.g., scholar@gmail.com"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </div>

        {/* Birthday */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '8px' }}>
            <Calendar size={15} color="#3B82F6" />
            <span>Birthday (Day & Month)</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px' }}>
            <select
              className="it-input"
              value={formData.birthDay}
              onChange={(e) => onChange('birthDay', Number(e.target.value))}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d} style={{ background: '#0F1322', color: '#EDEDED' }}>
                  Day {d}
                </option>
              ))}
            </select>
            <select
              className="it-input"
              value={formData.birthMonth}
              onChange={(e) => onChange('birthMonth', Number(e.target.value))}
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1} style={{ background: '#0F1322', color: '#EDEDED' }}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isChecking}
          className="it-btn-primary"
          style={{ minWidth: '160px' }}
        >
          {isChecking ? (
            <>
              <Loader2 size={16} className="it-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <span>Next: Tech Track</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default Step1Identity;
