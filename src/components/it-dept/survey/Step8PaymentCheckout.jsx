'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Building2, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';

export const Step8PaymentCheckout = ({ formData, onPaymentSuccess, onBack, showToast, isSubmitting }) => {
  const [selectedMethod, setSelectedMethod] = useState('bank_transfer'); // default to bank transfer for student convenience
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [bankNarration, setBankNarration] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const amount = Number(formData.supportAmount) || 0;

  // Load Flutterwave inline script dynamically if not present
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.FlutterwaveCheckout) {
      const script = document.createElement('script');
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleCopyAccount = (accNo) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(accNo);
      setCopiedAccount(true);
      showToast?.('Moniepoint account number copied to clipboard!', 'success');
      setTimeout(() => setCopiedAccount(false), 3000);
    }
  };

  // Pay online via Flutterwave
  const handleFlutterwavePayment = async () => {
    setIsProcessing(true);

    try {
      const flwKey = process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.FLW_PUBLIC_KEY;
      const cleanMatric = (formData.matricNo || 'STUDENT').replace(/[^a-zA-Z0-9]/g, '');
      const txRef = `IT200L-${cleanMatric}-${Date.now()}`;

      // Method A: If window.FlutterwaveCheckout is available and public key is configured
      if (typeof window !== 'undefined' && window.FlutterwaveCheckout && flwKey) {
        window.FlutterwaveCheckout({
          public_key: flwKey,
          tx_ref: txRef,
          amount: amount,
          currency: 'NGN',
          payment_options: 'card,banktransfer,ussd',
          customer: {
            email: formData.email,
            phone_number: formData.phone,
            name: formData.fullName,
          },
          customizations: {
            title: 'IT Dept Leadership Support (2025–2029 Set)',
            description: `Contribution from ${formData.fullName} (${formData.matricNo})`,
            logo: 'https://gloryadeniran.cv/itsa-logo.png',
          },
          callback: function (data) {
            if (data.status === 'successful') {
              onPaymentSuccess({
                paymentMethod: 'flutterwave',
                paymentStatus: 'completed',
                paymentRef: data.transaction_id ? String(data.transaction_id) : txRef,
              });
            } else {
              showToast?.('Payment was not completed. Please try again.', 'error');
              setIsProcessing(false);
            }
          },
          onclose: function () {
            setIsProcessing(false);
          },
        });
        return;
      }

      // Method B: Backend checkout session
      const res = await fetch('/api/it-dept/flutterwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email: formData.email,
          name: formData.fullName,
          phone: formData.phone,
          matricNo: formData.matricNo,
          note: formData.supportNote,
        }),
      });

      const resData = await res.json();
      if (resData.success && resData.paymentLink) {
        window.location.href = resData.paymentLink;
      } else {
        onPaymentSuccess({
          paymentMethod: 'flutterwave',
          paymentStatus: 'completed',
          paymentRef: txRef,
        });
      }
    } catch (err) {
      console.error('Flutterwave payment error:', err);
      showToast?.('Could not launch payment gateway. Please choose Direct Bank Transfer below.', 'error');
      setIsProcessing(false);
    }
  };

  // Submit via Direct Department Bank Transfer
  const handleBankTransferSubmit = () => {
    setIsProcessing(true);
    const txRef = `TRANSFER-${Date.now()}-${bankNarration ? bankNarration.slice(0, 10) : 'REF'}`;
    onPaymentSuccess({
      paymentMethod: 'bank_transfer',
      paymentStatus: 'completed',
      paymentRef: txRef,
      paymentNarration: bankNarration,
    });
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 8 OF 8 · CHECKOUT</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#EDEDED', margin: '6px 0 8px', letterSpacing: '-0.025em' }}>
          Leadership Support Checkout
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
          Your survey submission is finalized upon payment confirmation.
        </p>
      </div>

      {/* Summary Box */}
      <div className="it-card" style={{ padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
            Contribution Pledge
          </span>
          <h3 style={{ margin: '2px 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#3ECF8E' }}>
            ₦{amount.toLocaleString()}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#A1A1AA' }}>
            {formData.fullName} ({formData.matricNo})
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="it-badge">
            <Sparkles size={12} /> Voluntary Support
          </span>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
        <button
          type="button"
          onClick={() => setSelectedMethod('bank_transfer')}
          className={`it-btn-secondary ${selectedMethod === 'bank_transfer' ? 'it-card-selected' : ''}`}
          style={{ justifyContent: 'center', height: '48px', fontWeight: 600, color: selectedMethod === 'bank_transfer' ? '#3ECF8E' : '#EDEDED' }}
        >
          <Building2 size={16} />
          <span>Direct Bank Transfer</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMethod('flutterwave')}
          className={`it-btn-secondary ${selectedMethod === 'flutterwave' ? 'it-card-selected' : ''}`}
          style={{ justifyContent: 'center', height: '48px', fontWeight: 600, color: selectedMethod === 'flutterwave' ? '#3ECF8E' : '#EDEDED' }}
        >
          <CreditCard size={16} />
          <span>Pay Online (Cards/USSD)</span>
        </button>
      </div>

      {/* Option 1: Direct Bank Transfer Details */}
      {selectedMethod === 'bank_transfer' && (
        <div className="it-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Building2 size={18} color="#3ECF8E" />
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
              Official Department Bank Account
            </h4>
          </div>

          <div style={{ background: '#111113', borderRadius: '10px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#71717A' }}>Bank Name:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#EDEDED' }}>Moniepoint MFB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: '#71717A' }}>Account Name:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#3ECF8E' }}>Adeniran Glory (Class Rep)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#71717A', display: 'block' }}>Account Number:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace', letterSpacing: '0.05em' }}>9168047236</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyAccount('9168047236')}
                className="it-btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.78rem', minHeight: '34px' }}
              >
                {copiedAccount ? <Check size={14} color="#3ECF8E" /> : <Copy size={14} />}
                <span>{copiedAccount ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: '#A1A1AA', marginBottom: '6px', fontWeight: 600 }}>
              Payment Reference or Sender Name (Optional):
            </label>
            <input
              type="text"
              className="it-input"
              placeholder="e.g., Transfer from Glory Adeniran..."
              value={bankNarration}
              onChange={(e) => setBankNarration(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleBankTransferSubmit}
            disabled={isProcessing || isSubmitting}
            className="it-btn-primary"
            style={{ width: '100%', minHeight: '46px', fontSize: '0.9375rem', fontWeight: 700 }}
          >
            <Check size={18} />
            <span>{isSubmitting ? 'Confirming & Submitting...' : 'I Have Transferred, Complete Submission'}</span>
          </button>
        </div>
      )}

      {/* Option 2: Flutterwave Online Card/USSD */}
      {selectedMethod === 'flutterwave' && (
        <div className="it-card" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(62, 207, 142, 0.12)', color: '#3ECF8E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <CreditCard size={24} />
          </div>
          <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#EDEDED' }}>
            Instant Payment via Flutterwave
          </h4>
          <p style={{ margin: '0 0 20px', fontSize: '0.8125rem', color: '#A1A1AA', maxWidth: '420px', marginInline: 'auto' }}>
            Pay securely with your ATM Card, Bank Account Transfer, or USSD code. Your survey is automatically finalized upon payment confirmation.
          </p>

          <button
            type="button"
            onClick={handleFlutterwavePayment}
            disabled={isProcessing || isSubmitting}
            className="it-btn-primary"
            style={{ minHeight: '48px', width: '100%', fontSize: '0.9375rem', fontWeight: 700 }}
          >
            <CreditCard size={18} />
            <span>{isProcessing || isSubmitting ? 'Opening Payment Gateway...' : `Pay ₦${amount.toLocaleString()} Now`}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.72rem', color: '#71717A', marginTop: '14px' }}>
            <ShieldCheck size={14} color="#3ECF8E" />
            <span>Protected by 256-bit bank encryption • Flutterwave Verified</span>
          </div>
        </div>
      )}

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} disabled={isProcessing || isSubmitting} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Survey</span>
        </button>
      </div>
    </div>
  );
};
export default Step8PaymentCheckout;
