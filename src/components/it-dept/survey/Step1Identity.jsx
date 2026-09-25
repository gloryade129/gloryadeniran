'use client';
import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, User, Hash, Mail, Phone, Calendar, Loader2, UserCheck } from 'lucide-react';
import { MONTH_NAMES } from '@/components/it-dept/types/survey';
import { dataService } from '../services/dataService';

export const Step1Identity = ({ formData, onChange, onNext, onBack, onReturningStudent, onViewCompleted, showToast }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [matchedStudentRecord, setMatchedStudentRecord] = useState(null);

  // Clear stale local duplicate markers on mount so deleted admin records can re-enter immediately
  useEffect(() => {
    try {
      localStorage.removeItem('it_dept_submitted_email');
      localStorage.removeItem('it_dept_submitted_matric');
    } catch (e) {}
  }, []);

  const nameParts = formData.fullName.trim().split(/\s+/).filter(Boolean);
  const isNameValid = nameParts.length >= 2 && nameParts.every(part => part.length >= 2);
  const trimmedMatric = formData.matricNo.trim().toUpperCase();
  // Unilorin Matric pattern: requires slash '/', starts with 2 digits, followed by 4-8 chars (e.g., 24/52HA042 or 25/52HT014)
  const isMatricValid = /^[0-9]{2}\/[0-9A-Z]{4,8}$/i.test(trimmedMatric);
  const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim());
  const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
  const isPhoneValid = (cleanPhone.length === 11 && cleanPhone.startsWith('0')) ||
                       (cleanPhone.length === 13 && cleanPhone.startsWith('234')) ||
                       (cleanPhone.length >= 10 && cleanPhone.length <= 14);

  const handleContinue = async () => {
    if (!isNameValid) {
      showToast?.('Please enter your full official name (both First Name and Surname).', 'error');
      return;
    }
    if (!isMatricValid) {
      showToast?.('Please enter a valid Matric Number with forward slash (e.g., 24/52HA042 or 25/52HT014).', 'error');
      return;
    }
    if (!isEmailValid) {
      showToast?.('Please enter a valid email address (e.g., yourname@gmail.com).', 'error');
      return;
    }
    if (!isPhoneValid) {
      showToast?.('Please enter a valid Nigerian WhatsApp phone number (e.g., 08012345678).', 'error');
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
          // Attempt to lookup student profile so they can jump directly to new questions
          const lookup = await dataService.lookupStudent(formData.matricNo.trim().toUpperCase(), formData.email.trim().toLowerCase());
          if (lookup && lookup.found && lookup.student) {
            setMatchedStudentRecord(lookup.student);
            showToast?.('Existing submission found! Click below to complete the newly added leadership questions.', 'info');
          } else {
            showToast?.(checkData.message || 'A submission with this email or matric number already exists in our records.', 'error');
          }
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

      {/* Returning Student Alert Banner */}
      {matchedStudentRecord && (
        <div
          className="it-card it-animate-fade"
          style={{
            padding: '16px 18px',
            marginBottom: '20px',
            border: matchedStudentRecord.hasCompletedAll ? '1.5px solid #10B981' : '1.5px solid #2563EB',
            background: matchedStudentRecord.hasCompletedAll ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: matchedStudentRecord.hasCompletedAll ? 'rgba(16, 185, 129, 0.25)' : 'rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: matchedStudentRecord.hasCompletedAll ? '#34D399' : '#60A5FA',
                flexShrink: 0,
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                {matchedStudentRecord.hasCompletedAll
                  ? `Survey Already Completed for ${matchedStudentRecord.fullName || formData.fullName}`
                  : `Previous Submission Found for ${matchedStudentRecord.fullName || formData.fullName}`}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: matchedStudentRecord.hasCompletedAll ? '#6EE7B7' : '#93C5FD', fontFamily: 'JetBrains Mono, monospace' }}>
                Matric: {matchedStudentRecord.matricNo || formData.matricNo}
              </p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: 1.5 }}>
            {matchedStudentRecord.hasCompletedAll
              ? 'Your submission, including all leadership continuation questions, has already been safely recorded and secured in our database. No duplicate submission is needed!'
              : "You previously submitted your student directory details. You don't need to refill earlier steps—jump straight to answering the newly added questions (Glory CR & Esther ACR continuation)!"}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {matchedStudentRecord.hasCompletedAll ? (
              <>
                <button
                  type="button"
                  onClick={() => onViewCompleted?.(matchedStudentRecord)}
                  className="it-btn-primary"
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.85rem',
                    alignSelf: 'flex-start',
                    background: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <UserCheck size={16} />
                  <span>View My 200L Pass & Submission Details →</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReturningStudent?.(matchedStudentRecord)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#60A5FA',
                    fontSize: '0.75rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    padding: '2px 0',
                  }}
                >
                  Want to modify an answer? Open edit mode
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onReturningStudent?.(matchedStudentRecord)}
                className="it-btn-primary"
                style={{
                  padding: '10px 18px',
                  fontSize: '0.85rem',
                  alignSelf: 'flex-start',
                  background: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <UserCheck size={16} />
                <span>Jump to New Leadership Questions →</span>
              </button>
            )}
          </div>
        </div>
      )}

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
