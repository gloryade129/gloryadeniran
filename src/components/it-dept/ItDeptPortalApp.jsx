'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CyberBackground } from './layout/CyberBackground';
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { Step0Welcome } from './survey/Step0Welcome';
import { Step1Identity } from './survey/Step1Identity';
import { Step2Retrospective } from './survey/Step2Retrospective';
import { Step3Leadership } from './survey/Step3Leadership';
import { Step4VisionCommittees } from './survey/Step4VisionCommittees';
import { Step5Celebration } from './survey/Step5Celebration';
import { INITIAL_SURVEY_STATE } from '@/components/it-dept/types/survey';
import { dataService } from './services/dataService';

const DRAFT_STORAGE_KEY = 'it_dept_survey_draft_v3';

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

  // Save draft
  useEffect(() => {
    if (currentStep > 0 && currentStep < 5) {
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
    setCurrentStep(prev => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleReset = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setFormData(INITIAL_SURVEY_STATE);
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmitJourney = useCallback(async (overrides = {}) => {
    setIsSubmitting(true);
    const payload = { ...formData, ...overrides };
    try {
      const res = await dataService.submitStudentJourney(payload);
      if (!res.success) {
        alert(res.error || 'Submission failed. Please check your network and try again.');
        setIsSubmitting(false);
        return false;
      }
      try {
        if (payload.email) {
          localStorage.setItem('it_dept_submitted_email', payload.email.trim().toLowerCase());
        }
        if (payload.matricNo) {
          localStorage.setItem('it_dept_submitted_matric', payload.matricNo.trim().toUpperCase());
        }
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {}
      setIsSubmitting(false);
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.message || 'Submission failed. Please check your network and try again.');
      setIsSubmitting(false);
      return false;
    }
  }, [formData]);

  const stepTitles = [
    'Welcome',
    'Profile',
    'Retrospective',
    'Leadership',
    'Committees',
    'Confirmation',
  ];

  const progressPercent = currentStep === 0 ? 0 : currentStep >= 5 ? 100 : Math.round((currentStep / 4) * 100);

  return (
    <div className="it-portal-wrap it-dept-portal">
      <CyberBackground />
      <Navbar />

      {/* Progress Bar */}
      {currentStep >= 1 && currentStep <= 4 && (
        <div
          style={{
            position: 'sticky',
            top: '60px',
            zIndex: 30,
            background: 'rgba(6, 9, 19, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '8px 16px',
          }}
        >
          <div
            style={{
              maxWidth: '640px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.72rem',
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: '6px',
            }}
          >
            <span style={{ color: '#93C5FD' }}>
              STEP {currentStep} OF 4: <span style={{ color: '#FFFFFF' }}>{stepTitles[currentStep]}</span>
            </span>
            <span style={{ color: '#64748B' }}>{progressPercent}%</span>
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
          maxWidth: '800px',
          margin: '0 auto',
          padding: '24px 16px 40px',
          minHeight: 'calc(100vh - 140px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {currentStep === 0 && <Step0Welcome onStart={handleStart} />}
        {currentStep === 1 && <Step1Identity formData={formData} onChange={handleFieldChange} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 2 && <Step2Retrospective formData={formData} onChange={handleFieldChange} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 3 && <Step3Leadership formData={formData} onChange={handleFieldChange} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 4 && <Step4VisionCommittees formData={formData} onChange={handleFieldChange} onSubmit={handleSubmitJourney} onBack={handleBack} isSubmitting={isSubmitting} />}
        {currentStep === 5 && <Step5Celebration formData={formData} onReset={handleReset} />}
      </main>

      <Footer />
    </div>
  );
};
export default App;
