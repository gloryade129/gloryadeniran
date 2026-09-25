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
  const [isUpdateMode, setIsUpdateMode] = useState(false);
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

  // Save draft across steps before submission (only in regular mode)
  useEffect(() => {
    if (!isUpdateMode && currentStep > 0 && currentStep < 9) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      } catch (e) {}
    }
  }, [formData, currentStep, isUpdateMode]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleStart = useCallback(() => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleReturningStudent = useCallback((studentData) => {
    if (!studentData) return;
    setFormData(prev => ({
      ...INITIAL_SURVEY_STATE,
      ...studentData,
    }));
    setIsUpdateMode(true);
    setCurrentStep(4); // Jump directly to Step 4 CR Leadership
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(
      `Welcome back, ${studentData.fullName || 'Scholar'}! Reviewing leadership continuation questions.`,
      'info',
      'Update Mode Active'
    );
  }, [showToast]);

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
    setIsUpdateMode(false);
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Submit student journey - handles both fresh insert and returning student updates
  const handleSubmitJourney = useCallback(async (overrides = {}) => {
    setIsSubmitting(true);
    const payload = { ...formData, ...overrides };
    try {
      const res = isUpdateMode
        ? await dataService.updateStudentJourney(payload)
        : await dataService.submitStudentJourney(payload);

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
      showToast(
        isUpdateMode
          ? 'Your responses and continuation questions were updated successfully!'
          : 'Survey submitted successfully! Welcome to 200 Level.',
        'success'
      );
      setCurrentStep(9); // Celebration Step
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (err) {
      console.error('Submission failed:', err);
      showToast(err.message || 'Submission failed. Please check your network and try again.', 'error');
      setIsSubmitting(false);
      return false;
    }
  }, [formData, isUpdateMode, showToast]);

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

      {/* Update Mode Active Banner */}
      {isUpdateMode && currentStep >= 1 && currentStep <= 8 && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 45,
            background: 'rgba(30, 58, 138, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.4)',
            padding: '8px 16px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
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
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DBEAFE' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#60A5FA',
                  boxShadow: '0 0 8px #60A5FA',
                }}
              />
              <span>
                <strong>Update Mode:</strong> Updating review for <strong>{formData.fullName}</strong> ({formData.matricNo})
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                color: '#FFFFFF',
                fontSize: '0.7rem',
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              Exit Update Mode
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar - Supabase Style Minimalist Line */}
      {currentStep >= 1 && currentStep <= 8 && (
        <div
          style={{
            position: 'sticky',
            top: isUpdateMode ? '37px' : '60px',
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
        {currentStep === 0 && (
          <Step0Welcome
            onStart={handleStart}
            onReturningStudent={handleReturningStudent}
            showToast={showToast}
          />
        )}
        {currentStep === 1 && (
          <Step1Identity
            formData={formData}
            onChange={handleFieldChange}
            onNext={handleNext}
            onBack={handleBack}
            onReturningStudent={handleReturningStudent}
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
            isUpdateMode={isUpdateMode}
            onUpdateSubmit={() => handleSubmitJourney()}
            isSubmitting={isSubmitting}
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
        {currentStep === 9 && (
          <Step5Celebration
            formData={formData}
            onReset={handleReset}
            isUpdateMode={isUpdateMode}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};
export default App;
