'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Heart, Wallet, Check, AlertCircle } from 'lucide-react';

const CONTRIBUTION_PRESETS = [1000, 2000, 3000, 5000, 10000];

export const Step7SupportChoice = ({ formData, onChange, onNext, onBack, onCompleteWithoutPayment, isSubmitting }) => {
  const [customAmount, setCustomAmount] = useState(
    formData.supportAmount && !CONTRIBUTION_PRESETS.includes(formData.supportAmount)
      ? String(formData.supportAmount)
      : ''
  );
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectPreset = (amt) => {
    setCustomAmount('');
    onChange('supportAmount', amt);
    setErrorMsg('');
  };

  const handleCustomAmountChange = (val) => {
    const numeric = Number(val.replace(/\D/g, '')) || 0;
    setCustomAmount(val);
    onChange('supportAmount', numeric);
    setErrorMsg('');
  };

  const handleProceed = () => {
    if (formData.supportLeadershipChoice === 'yes') {
      if ((formData.supportAmount || 0) <= 0) {
        setErrorMsg('Please select or enter a contribution amount in ₦.');
        return;
      }
      setErrorMsg('');
      onNext(); // Advances to Step 8 (Bespoke Payment Page)
    } else {
      // Completed survey without financial contribution -> Submits directly
      onCompleteWithoutPayment();
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 7 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>
          Department Leadership Support
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
          Voluntary support platform for Class Representative & Assistant Class Representative semester welfare and tutorial initiatives.
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="it-card" style={{ padding: '24px', marginBottom: '26px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px' }}>
          Would you love to support the department leadership (Class Representative & Assistant Class Representative)?
        </p>

        {/* Choice buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div
            onClick={() => {
              onChange('supportLeadershipChoice', 'yes');
              if (!formData.supportAmount) onChange('supportAmount', 2000);
            }}
            className={`it-card-interactive ${formData.supportLeadershipChoice === 'yes' ? 'it-card-selected' : ''}`}
            style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px' }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: formData.supportLeadershipChoice === 'yes' ? '6px solid #2563EB' : '1px solid #64748B', background: '#FFFFFF' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: formData.supportLeadershipChoice === 'yes' ? '#93C5FD' : '#FFFFFF' }}>
                Yes, I'd love to contribute
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                Support semester welfare and tutorials
              </p>
            </div>
          </div>

          <div
            onClick={() => {
              onChange('supportLeadershipChoice', 'no');
              onChange('supportAmount', 0);
            }}
            className={`it-card-interactive ${formData.supportLeadershipChoice === 'no' ? 'it-card-selected' : ''}`}
            style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px' }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: formData.supportLeadershipChoice === 'no' ? '6px solid #2563EB' : '1px solid #64748B', background: '#FFFFFF' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: formData.supportLeadershipChoice === 'no' ? '#93C5FD' : '#FFFFFF' }}>
                Not now, active participation
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
                Support primarily by volunteering skills
              </p>
            </div>
          </div>
        </div>

        {/* When YES selected */}
        {formData.supportLeadershipChoice === 'yes' && (
          <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#93C5FD', marginBottom: '8px' }}>
                Select Contribution Amount (₦)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {CONTRIBUTION_PRESETS.map((amt) => {
                  const isSelected = formData.supportAmount === amt && !customAmount;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleSelectPreset(amt)}
                      className={`it-chip ${isSelected ? 'it-chip-selected' : ''}`}
                      style={{ padding: '8px 16px', fontSize: '0.875rem', fontWeight: 700 }}
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
                style={{ padding: '10px 14px', fontSize: '0.875rem' }}
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#94A3B8', marginBottom: '6px' }}>
                Note to Class Rep & ACR (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. For tutorial halls and class welfare..."
                className="it-input"
                style={{ padding: '10px 14px', fontSize: '0.875rem' }}
                value={formData.supportNote || ''}
                onChange={(e) => onChange('supportNote', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} disabled={isSubmitting} className="it-btn-secondary" style={{ minHeight: '44px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={handleProceed}
          disabled={isSubmitting}
          className="it-btn-primary"
          style={{ minHeight: '44px', minWidth: '180px' }}
        >
          {formData.supportLeadershipChoice === 'yes' ? (
            <>
              <span>Proceed to Payment (₦{Number(formData.supportAmount || 0).toLocaleString()})</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <span>{isSubmitting ? 'Submitting...' : 'Complete & Submit Survey'}</span>
              <Check size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default Step7SupportChoice;
