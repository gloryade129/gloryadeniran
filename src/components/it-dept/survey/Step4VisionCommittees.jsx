'use client';
import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Palette, Film, Share2, BookOpen, Laptop, HeartHandshake, Trophy, Camera, Heart, CreditCard, ShieldCheck } from 'lucide-react';
import { VOLUNTEER_ROLES } from '@/components/it-dept/types/survey';

const ROLE_ICONS = {
  Palette,
  Film,
  Share2,
  BookOpen,
  Laptop,
  HeartHandshake,
  Trophy,
  Camera,
};

const CONTRIBUTION_PRESETS = [1000, 2000, 3000, 5000, 10000];

export const Step4VisionCommittees = ({ formData, onChange, onSubmit, onBack, isSubmitting }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const toggleRole = (roleName) => {
    const current = formData.volunteerRoles || [];
    if (current.includes(roleName)) {
      onChange('volunteerRoles', current.filter((r) => r !== roleName));
    } else {
      onChange('volunteerRoles', [...current, roleName]);
    }
  };

  const handleSelectPreset = (amt) => {
    onChange('supportAmount', amt);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (val) => {
    const numeric = Number(val.replace(/\D/g, '')) || 0;
    setCustomAmount(val);
    onChange('supportAmount', numeric);
  };

  const handleFinalSubmit = async () => {
    // If student chose voluntary contribution and amount > 0
    if (formData.supportLeadershipChoice === 'yes' && (formData.supportAmount || 0) > 0) {
      setIsProcessingPayment(true);
      onChange('paymentMethod', 'flutterwave');
      try {
        const res = await fetch('/api/it-dept/flutterwave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: formData.supportAmount,
            email: formData.email,
            name: formData.fullName,
            phone: formData.phone,
            matricNo: formData.matricNo,
            note: formData.supportNote,
          }),
        });
        const flwData = await res.json();
        if (flwData.success && flwData.paymentLink) {
          onChange('paymentStatus', 'pending_flutterwave');
          onChange('paymentRef', flwData.txRef || '');
          await onSubmit({
            paymentMethod: 'flutterwave',
            paymentStatus: 'pending_flutterwave',
            paymentRef: flwData.txRef || '',
          });
          window.location.href = flwData.paymentLink;
          return;
        } else {
          // Fallback if keys are pending
          onChange('paymentStatus', 'pending');
          await onSubmit({
            paymentMethod: 'flutterwave',
            paymentStatus: 'pending',
          });
        }
      } catch (e) {
        console.warn('Flutterwave checkout fallback:', e);
        onChange('paymentStatus', 'pending');
        await onSubmit({
          paymentMethod: 'flutterwave',
          paymentStatus: 'pending',
        });
      } finally {
        setIsProcessingPayment(false);
      }
    } else {
      await onSubmit();
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '20px' }}>
        <span className="it-badge" style={{ marginBottom: '6px' }}>STEP 4 OF 4</span>
        <h2 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 6px' }}>
          Volunteering & Leadership Support
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
          Choose your creative volunteering roles and optionally support class leadership initiatives.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {/* SECTION 1: CREATIVE VOLUNTEER ROLES */}
        <div className="it-card" style={{ padding: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
            Which role(s) do you choose to volunteer for?
          </label>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0 0 14px' }}>
            Select one or more specialized roles where you would love to contribute your talents to the department:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {VOLUNTEER_ROLES.map((role) => {
              const isSelected = (formData.volunteerRoles || []).includes(role.name);
              const IconComp = ROLE_ICONS[role.icon] || Sparkles;

              return (
                <div
                  key={role.id}
                  onClick={() => toggleRole(role.name)}
                  className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        background: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#FFFFFF' : '#94A3B8',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: isSelected ? '#93C5FD' : '#FFFFFF' }}>
                        {role.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B', lineHeight: 1.4 }}>
                        {role.desc}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
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
                    {isSelected && <Check size={12} color="#FFFFFF" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom volunteer input */}
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>
              Other specialized skill or role (Optional):
            </label>
            <input
              type="text"
              className="it-input"
              placeholder="e.g. 3D Animator, Sound Engineer, Public Speaker..."
              value={formData.customVolunteerRole || ''}
              onChange={(e) => onChange('customVolunteerRole', e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>

        {/* SECTION 2: CONTRIBUTION & LEADERSHIP SUPPORT PLATFORM */}
        <div className="it-card" style={{ padding: '20px', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <Heart size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>
              Department Leadership Support
            </h3>
          </div>

          <p style={{ fontSize: '0.8125rem', color: '#CBD5E1', lineHeight: 1.5, margin: '0 0 14px' }}>
            Would you love to support the department leadership (the Class Representative and the Assistant Class Representative) in funding semester welfare, tutorial resources, emergency assistance, and set logistics?
          </p>

          {/* Yes / No Choices */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <div
              onClick={() => onChange('supportLeadershipChoice', 'yes')}
              className={`it-card-interactive ${formData.supportLeadershipChoice === 'yes' ? 'it-card-selected' : ''}`}
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: formData.supportLeadershipChoice === 'yes' ? '5px solid #2563EB' : '1px solid #64748B', background: '#FFFFFF' }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: formData.supportLeadershipChoice === 'yes' ? '#93C5FD' : '#FFFFFF' }}>
                  Yes, I'd love to contribute
                </p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748B' }}>
                  Voluntary support for class leadership
                </p>
              </div>
            </div>

            <div
              onClick={() => {
                onChange('supportLeadershipChoice', 'no');
                onChange('supportAmount', 0);
              }}
              className={`it-card-interactive ${formData.supportLeadershipChoice === 'no' ? 'it-card-selected' : ''}`}
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: formData.supportLeadershipChoice === 'no' ? '5px solid #2563EB' : '1px solid #64748B', background: '#FFFFFF' }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: formData.supportLeadershipChoice === 'no' ? '#93C5FD' : '#FFFFFF' }}>
                  Not now, active participation
                </p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748B' }}>
                  Support through team involvement
                </p>
              </div>
            </div>
          </div>

          {/* When YES is selected */}
          {formData.supportLeadershipChoice === 'yes' && (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#93C5FD', marginBottom: '6px' }}>
                  Select Contribution Amount (₦)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {CONTRIBUTION_PRESETS.map((amt) => {
                    const isSelected = formData.supportAmount === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectPreset(amt)}
                        className={`it-chip ${isSelected ? 'it-chip-selected' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '0.8125rem', fontWeight: 600 }}
                      >
                        ₦{amt.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom amount in ₦ (e.g. 2500)..."
                  className="it-input"
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                />
              </div>

              {/* Payment Processing Note: Flutterwave */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(37, 99, 235, 0.12)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(37, 99, 235, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60A5FA',
                    flexShrink: 0,
                  }}
                >
                  <CreditCard size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Pay Online via Flutterwave
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#93C5FD' }}>
                    Instant, secure payment with ATM Cards, Bank Transfer, or USSD
                  </p>
                </div>
              </div>

              {/* Encouragement note */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>
                  Note to Class Rep & ACR (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. For tutorial halls and class welfare..."
                  className="it-input"
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                  value={formData.supportNote || ''}
                  onChange={(e) => onChange('supportNote', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: '#94A3B8' }}>
                <ShieldCheck size={13} color="#3B82F6" />
                <span>Integrated with Flutterwave API for secure payment processing.</span>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: SUGGESTIONS */}
        <div className="it-card" style={{ padding: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Suggestions or Ideas for our Class
          </label>
          <textarea
            className="it-input"
            rows={3}
            placeholder="Share events, tutorials, welfare, or tech projects ideas..."
            value={formData.suggestions200L}
            onChange={(e) => onChange('suggestions200L', e.target.value)}
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} disabled={isSubmitting || isProcessingPayment} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={handleFinalSubmit}
          disabled={isSubmitting || isProcessingPayment}
          className="it-btn-primary"
          style={{ minWidth: '180px' }}
        >
          {isProcessingPayment ? (
            <span>Connecting Flutterwave...</span>
          ) : isSubmitting ? (
            <span>Submitting Survey...</span>
          ) : formData.supportLeadershipChoice === 'yes' && (formData.supportAmount || 0) > 0 ? (
            <>
              <span>Pay ₦{Number(formData.supportAmount).toLocaleString()} & Submit</span>
              <CreditCard size={16} />
            </>
          ) : (
            <>
              <span>Submit Survey</span>
              <Check size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default Step4VisionCommittees;
