'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CyberBackground } from './layout/CyberBackground';
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { Step0Welcome } from './survey/Step0Welcome';
import { Step1Identity } from './survey/Step1Identity';
import { Step2TechTrack } from './survey/Step2TechTrack';
import { Step3Retrospective } from './survey/Step3Retrospective';
import { Step4CRLeadership } from './survey/Step4CRLeadership';
import { Step5ACRLeadership } from './survey/Step5ACRLeadership';
import { Step6VolunteerRoles } from './survey/Step6VolunteerRoles';
import { Step7SupportChoice } from './survey/Step7SupportChoice';
import { Step8PaymentCheckout } from './survey/Step8PaymentCheckout';
import { Step5Celebration } from './survey/Step5Celebration';
import { ToastNotification } from './ui/ToastNotification';
import { INITIAL_SURVEY_STATE } from '@/components/it-dept/types/survey';
import { dataService } from './services/dataService';

const DRAFT_STORAGE_KEY = 'it_dept_survey_draft_v4';

export const App = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) return { ...INITIAL_SURVEY_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Draft load error:', e);
    }
    return INITIAL_SURVEY_STATE;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, type: 'info', title: '', message: '' });

  const showToast = useCallback((message, type = 'error', title = '') => {
    setToast({
      open: true,
      type,
      title: title || (type === 'error' ? 'Notice' : type === 'success' ? 'Success' : 'Information'),
      message,
    });
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  // Save draft across steps before submission
  useEffect(() => {
    if (currentStep > 0 && currentStep < 9) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      } catch (e) {}
    }
  }, [formData, currentStep]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleStart = useCallback(() => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 8));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleReset = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem('it_dept_submitted_email');
      localStorage.removeItem('it_dept_submitted_matric');
    } catch (e) {}
    setFormData(INITIAL_SURVEY_STATE);
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Submit student journey - strictly triggered when payment is confirmed or opted out
  const handleSubmitJourney = useCallback(async (overrides = {}) => {
    setIsSubmitting(true);
    const payload = { ...formData, ...overrides };
    try {
      const res = await dataService.submitStudentJourney(payload);
      if (!res.success) {
        showToast(res.error || 'Submission failed. Please check your network and try again.', 'error');
        setIsSubmitting(false);
        return false;
      }
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem('it_dept_submitted_email');
        localStorage.removeItem('it_dept_submitted_matric');
      } catch (e) {}
      setIsSubmitting(false);
      showToast('Survey submitted successfully! Welcome to 200 Level.', 'success');
      setCurrentStep(9); // Celebration Step
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (err) {
      console.error('Submission failed:', err);
      showToast(err.message || 'Submission failed. Please check your network and try again.', 'error');
      setIsSubmitting(false);
      return false;
    }
  }, [formData, showToast]);

  // Handle return from external Flutterwave redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment') || urlParams.get('status');
    const txRef = urlParams.get('tx_ref') || urlParams.get('transaction_id');

    if (paymentStatus === 'successful' || paymentStatus === 'completed') {
      try {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          handleSubmitJourney({
            ...parsed,
            paymentStatus: 'completed',
            paymentMethod: 'flutterwave',
            paymentRef: txRef || `FLW-RETURN-${Date.now()}`
          });
        }
      } catch (e) {
        console.error('Auto-submitting after payment return error:', e);
      }
    }
  }, [handleSubmitJourney]);

  const maxSurveyStep = formData.supportLeadershipChoice === 'yes' ? 8 : 7;
  const stepTitles = [
    'Welcome',
    'Identity',
    'Tech Track',
    '100L Review',
    'Class Rep Review',
    'Assistant CR Review',
    'Volunteer Roles',
    'Support Leadership',
    'Payment Checkout',
    'Completed',
  ];

  const progressPercent =
    currentStep === 0
      ? 0
      : currentStep >= 9
      ? 100
      : Math.min(100, Math.round((currentStep / maxSurveyStep) * 100));

  return (
    <div className="it-portal-wrap it-dept-portal">
      <CyberBackground />
      <Navbar />

      {/* Global Floating Toast Notification */}
      <ToastNotification toast={toast} onClose={closeToast} />

      {/* Progress Bar - Supabase Style Minimalist Line */}
      {currentStep >= 1 && currentStep <= 8 && (
        <div
          style={{
            position: 'sticky',
            top: '60px',
            zIndex: 30,
            background: 'rgba(10, 10, 12, 0.95)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '10px 16px',
          }}
        >
          <div
            style={{
              maxWidth: '640px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: '8px',
            }}
          >
            <span style={{ color: '#60A5FA', fontWeight: 600 }}>
              STEP {currentStep} OF {maxSurveyStep}: <span style={{ color: '#EDEDED' }}>{stepTitles[currentStep]}</span>
            </span>
            <span style={{ color: '#71717A', fontWeight: 600 }}>{progressPercent}%</span>
          </div>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="it-progress-track">
              <div className="it-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        style={{
          maxWidth: '760px',
          margin: '0 auto',
          padding: '24px 16px 40px',
          minHeight: 'calc(100vh - 140px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {currentStep === 0 && <Step0Welcome onStart={handleStart} />}
        {currentStep === 1 && (
          <Step1Identity
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            showToast={showToast}
          />
        )}
        {currentStep === 2 && (
          <Step2TechTrack
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            showToast={showToast}
          />
        )}
        {currentStep === 3 && (
          <Step3Retrospective
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            showToast={showToast}
          />
        )}
        {currentStep === 4 && (
          <Step4CRLeadership
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            showToast={showToast}
          />
        )}
        {currentStep === 5 && (
          <Step5ACRLeadership
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            showToast={showToast}
          />
        )}
        {currentStep === 6 && (
          <Step6VolunteerRoles
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            showToast={showToast}
          />
        )}
        {currentStep === 7 && (
          <Step7SupportChoice
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            showToast={showToast}
            onCompleteWithoutPayment={() =>
              handleSubmitJourney({
                supportAmount: 0,
                paymentStatus: 'none',
                paymentMethod: 'none',
              })
            }
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 8 && (
          <Step8PaymentCheckout
            formData={formData}
            onPaymentSuccess={(paymentData) => handleSubmitJourney(paymentData)}
            onBack={handleBack}
            showToast={showToast}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 9 && <Step5Celebration formData={formData} onReset={handleReset} />}
      </main>

      <Footer />
    </div>
  );
};
export default App;
