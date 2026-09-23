'use client';
import { dataService } from './services/dataService';
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
import { AdminPinModal } from './admin/AdminPinModal';
import { AdminDashboard } from './admin/AdminDashboard';

const DRAFT_STORAGE_KEY = 'it_dept_survey_draft_v1';
const SUBMISSIONS_STORAGE_KEY = 'it_dept_local_submissions_v1';
export const App = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState(() => {
        try {
            if (typeof window === 'undefined') return INITIAL_SURVEY_STATE;
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (saved) {
                return { ...INITIAL_SURVEY_STATE, ...JSON.parse(saved) };
            }
        }
        catch (e) {
            console.warn('Failed to load survey draft from localStorage:', e);
        }
        return INITIAL_SURVEY_STATE;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const checkIsAdminAuthenticated = useCallback(() => {
        try {
            return (sessionStorage.getItem('it_dept_admin_auth_v1') === 'true' ||
                sessionStorage.getItem('it_portal_admin_auth') === 'true');
        }
        catch {
            return false;
        }
    }, []);
    // Sync /admin route and browser history
    useEffect(() => {
        const handleLocationSync = () => {
            const isPathAdmin = window.location.pathname === '/admin' ||
                window.location.pathname.startsWith('/admin/') ||
                window.location.hash === '#/admin';
            if (isPathAdmin) {
                if (checkIsAdminAuthenticated()) {
                    setIsAdminOpen(true);
                    setIsPinModalOpen(false);
                }
                else {
                    setIsAdminOpen(false);
                    setIsPinModalOpen(true);
                }
            }
        };
        handleLocationSync();
        window.addEventListener('popstate', handleLocationSync);
        window.addEventListener('hashchange', handleLocationSync);
        return () => {
            window.removeEventListener('popstate', handleLocationSync);
            window.removeEventListener('hashchange', handleLocationSync);
        };
    }, [checkIsAdminAuthenticated]);
    const handleOpenAdmin = useCallback(() => {
        if (checkIsAdminAuthenticated()) {
            setIsAdminOpen(true);
            setIsPinModalOpen(false);
            if (window.location.pathname !== '/admin') {
                window.history.pushState(null, '', '/admin');
            }
        }
        else {
            setIsPinModalOpen(true);
        }
    }, [checkIsAdminAuthenticated]);
    const handlePinAuthenticated = useCallback(() => {
        setIsPinModalOpen(false);
        setIsAdminOpen(true);
        if (window.location.pathname !== '/admin') {
            window.history.pushState(null, '', '/admin');
        }
    }, []);
    const handleExitAdmin = useCallback(() => {
        setIsAdminOpen(false);
        setIsPinModalOpen(false);
        if (window.location.pathname === '/admin') {
            window.history.pushState(null, '', '/');
        }
    }, []);
    const handleLockAdmin = useCallback(() => {
        try {
            sessionStorage.removeItem('it_dept_admin_auth_v1');
            sessionStorage.removeItem('it_portal_admin_auth');
        }
        catch {
            // ignore
        }
        setIsAdminOpen(false);
        setIsPinModalOpen(true);
        if (window.location.pathname !== '/admin') {
            window.history.pushState(null, '', '/admin');
        }
    }, []);
    // Persist draft on form changes
    useEffect(() => {
        if (currentStep > 0 && currentStep < 5) {
            try {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
            }
            catch (e) {
                console.warn('Failed to save survey draft:', e);
            }
        }
    }, [formData, currentStep]);
    // Generic field updater
    const handleFieldChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
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
        }
        catch (e) {
            // ignore
        }
        setFormData(INITIAL_SURVEY_STATE);
        setCurrentStep(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);
    const handleSubmitJourney = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await dataService.submitStudentJourney(formData);
      if (!res.success) {
        if (res.error === 'MATRIC_EXISTS') {
          alert('This matriculation number has already submitted the 200L transition journey.');
        } else {
          alert(res.error || 'Submission failed. Please check your network and try again.');
        }
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission failed:', err);
      setIsSubmitting(false);
      setCurrentStep(5);
    }
  }, [formData]);
    // Global Keyboard Navigation (Enter to advance, Escape to back)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is inside a textarea or typing
            const target = e.target;
            const isTextarea = target?.tagName === 'TEXTAREA';
            if (e.key === 'Escape' && currentStep > 0 && currentStep < 5) {
                e.preventDefault();
                handleBack();
                return;
            }
            if (e.key === 'Enter') {
                if (isTextarea && !e.shiftKey) {
                    // Allow normal newline in textarea unless Shift+Enter or explicit submit
                    return;
                }
                if (currentStep === 0) {
                    e.preventDefault();
                    handleStart();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, handleStart, handleBack]);
    // Step Progress Calculation (1..4)
    const stepTitles = [
        'Welcome',
        'Identity & Profile',
        '100L Retrospective',
        'Leadership Review',
        'Committees & Vision',
        'Celebration & Pass',
    ];
    const calculateProgressPercent = () => {
        if (currentStep === 0)
            return 0;
        if (currentStep >= 5)
            return 100;
        return Math.round((currentStep / 4) * 100);
    };
    const progressPercentage = calculateProgressPercent();
    return (<div className="it-dept-portal relative min-h-screen flex flex-col bg-cyber-bg text-gray-100 font-sans selection:bg-blue-600/30 selection:text-blue-300">
      {/* Background Ambience & Cyber Grid */}
      <CyberBackground />

      {/* Sticky Top Navbar */}
      <Navbar onOpenAdmin={handleOpenAdmin} isAdminActive={isAdminOpen} onNavigateHome={() => {
            handleExitAdmin();
            setCurrentStep(0);
        }}/>

      {/* Progress Bar & Step Breadcrumb for Active Survey (Steps 1–4) */}
      {!isAdminOpen && currentStep >= 1 && currentStep <= 4 && (<div className="relative z-20 w-full bg-cyber-surface/90 backdrop-blur-md border-b border-white/10 sticky top-16 transition-all duration-300">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">
                  STEP {currentStep} OF 4:
                </span>
                <span className="text-white font-medium">
                  {stepTitles[currentStep]}
                </span>
              </div>
              <span className="text-gray-400 font-bold">
                {progressPercentage}% Completed
              </span>
            </div>

            {/* Glowing Gradient Progress Bar */}
            <div className="w-full h-2 rounded-full bg-gray-900 border border-white/10 overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 transition-all duration-300 ease-out shadow-glow-sm-blue" style={{ width: `${progressPercentage}%` }}/>
            </div>

            {/* Step Pills Navigation Indicators */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mt-2">
              {[1, 2, 3, 4].map((stepNum) => {
                const isPassed = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;
                return (<div key={stepNum} className={`h-1.5 rounded-full transition-all duration-300 ${isPassed
                        ? 'bg-blue-600'
                        : isCurrent
                            ? 'bg-blue-400 shadow-glow-sm-blue'
                            : 'bg-white/10'}`} title={`Step ${stepNum}: ${stepTitles[stepNum]}`}/>);
            })}
            </div>
          </div>
        </div>)}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-7xl mx-auto w-full">
        {isAdminOpen ? (<AdminDashboard onBackToSurvey={handleExitAdmin} onLock={handleLockAdmin}/>) : (<>
            {currentStep === 0 && (<Step0Welcome onStart={handleStart}/>)}

            {currentStep === 1 && (<Step1Identity formData={formData} onChange={handleFieldChange} onNext={handleNext} onBack={handleBack}/>)}

            {currentStep === 2 && (<Step2Retrospective formData={formData} onChange={handleFieldChange} onNext={handleNext} onBack={handleBack}/>)}

            {currentStep === 3 && (<Step3Leadership formData={formData} onChange={handleFieldChange} onNext={handleNext} onBack={handleBack}/>)}

            {currentStep === 4 && (<Step4VisionCommittees formData={formData} onChange={handleFieldChange} onSubmit={handleSubmitJourney} onBack={handleBack} isSubmitting={isSubmitting}/>)}

            {currentStep === 5 && (<Step5Celebration formData={formData} onReset={handleReset}/>)}
          </>)}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Admin PIN Gate Modal */}
      <AdminPinModal isOpen={isPinModalOpen} onClose={() => {
            setIsPinModalOpen(false);
            if (window.location.pathname === '/admin') {
                window.history.pushState(null, '', '/');
            }
        }} onAuthenticated={handlePinAuthenticated}/>
    </div>);
};
export default App;
