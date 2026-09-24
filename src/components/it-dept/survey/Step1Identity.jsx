'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, User, Hash, Mail, Phone, Calendar } from 'lucide-react';
import { MONTH_NAMES } from '@/components/it-dept/types/survey';

export const Step1Identity = ({ formData, onChange, onNext, onBack }) => {
  const [errorMsg, setErrorMsg] = useState('');

  const isNameValid = formData.fullName.trim().length >= 3;
  const isMatricValid = /^[A-Z0-9/]{6,16}$/.test(formData.matricNo.trim().toUpperCase());
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isPhoneValid = formData.phone.trim().length >= 10;

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

    try {
      const prevEmail = localStorage.getItem('it_dept_submitted_email');
      const prevMatric = localStorage.getItem('it_dept_submitted_matric');
      if (prevEmail && prevEmail === formData.email.trim().toLowerCase()) {
        setErrorMsg('A submission with this email address has already been recorded. Each student can only submit once.');
        return;
      }
      if (prevMatric && prevMatric === formData.matricNo.trim().toUpperCase()) {
        setErrorMsg('This matriculation number has already submitted the survey.');
        return;
      }
    } catch (e) {}

    setErrorMsg('');
    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 1 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>
          Student Identity & Records
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
          Your directory details ensure smooth academic notifications, timetable releases, and class record verification.
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {/* Full Name */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
            <User size={15} color="#60A5FA" />
            <span>Full Official Name *</span>
          </label>
          <input
            type="text"
            className="it-input"
            placeholder="e.g., Adeniran Glory Oluwatobiloba"
            value={formData.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            style={{ fontSize: '0.9375rem', padding: '12px 14px' }}
          />
        </div>

        {/* Matric & WhatsApp */}
        <div className="it-grid-2" style={{ gap: '16px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
              <Hash size={15} color="#60A5FA" />
              <span>Matriculation Number *</span>
            </label>
            <input
              type="text"
              className="it-input"
              placeholder="e.g., 24/52HA042"
              value={formData.matricNo}
              onChange={(e) => onChange('matricNo', e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9375rem', padding: '12px 14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
              <Phone size={15} color="#60A5FA" />
              <span>WhatsApp Phone *</span>
            </label>
            <input
              type="tel"
              className="it-input"
              placeholder="e.g., 08012345678"
              value={formData.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              style={{ fontSize: '0.9375rem', padding: '12px 14px' }}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
            <Mail size={15} color="#60A5FA" />
            <span>Email Address * <span style={{ color: '#64748B', fontWeight: 400, fontSize: '0.75rem' }}>(For confirmation receipt)</span></span>
          </label>
          <input
            type="email"
            className="it-input"
            placeholder="e.g., scholar@gmail.com"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            style={{ fontSize: '0.9375rem', padding: '12px 14px' }}
          />
        </div>

        {/* Birthday */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
            <Calendar size={15} color="#60A5FA" />
            <span>Birthday (Day & Month)</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px' }}>
            <select
              className="it-input"
              value={formData.birthDay}
              onChange={(e) => onChange('birthDay', Number(e.target.value))}
              style={{ fontSize: '0.9375rem', padding: '12px 14px' }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d} style={{ background: '#0C1220' }}>
                  Day {d}
                </option>
              ))}
            </select>
            <select
              className="it-input"
              value={formData.birthMonth}
              onChange={(e) => onChange('birthMonth', Number(e.target.value))}
              style={{ fontSize: '0.9375rem', padding: '12px 14px' }}
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1} style={{ background: '#0C1220' }}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary" style={{ minHeight: '44px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minHeight: '44px', minWidth: '150px' }}>
          <span>Next: Tech Track</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step1Identity;
