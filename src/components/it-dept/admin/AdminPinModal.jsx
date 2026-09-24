'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
const STORAGE_KEY_AUTH = 'it_dept_admin_auth_v1';
const STORAGE_KEY_AUTH_COMPAT = 'it_portal_admin_auth';
const STORAGE_KEY_LOCKOUT = 'it_dept_admin_lockout_ts';
const STORAGE_KEY_ATTEMPTS = 'it_dept_admin_fail_attempts';
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;
export const AdminPinModal = ({ isOpen, onClose, onAuthenticated, }) => {
    const [pin, setPin] = useState('');
    const [errorMsg, setErrorMsg] = useState(null);
    const [isShaking, setIsShaking] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY_ATTEMPTS);
            return saved ? parseInt(saved, 10) : 0;
        }
        catch {
            return 0;
        }
    });
    const [lockoutRemaining, setLockoutRemaining] = useState(0);
    const inputRef = useRef(null);
    // Check lockout on mount and on changes
    useEffect(() => {
        const checkLockout = () => {
            try {
                const lockoutUntilStr = sessionStorage.getItem(STORAGE_KEY_LOCKOUT);
                if (lockoutUntilStr) {
                    const lockoutUntil = parseInt(lockoutUntilStr, 10);
                    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
                    if (remaining > 0) {
                        setLockoutRemaining(remaining);
                        return;
                    }
                    else {
                        sessionStorage.removeItem(STORAGE_KEY_LOCKOUT);
                        sessionStorage.setItem(STORAGE_KEY_ATTEMPTS, '0');
                        setFailedAttempts(0);
                        setLockoutRemaining(0);
                    }
                }
            }
            catch {
                // ignore
            }
        };
        checkLockout();
        const interval = setInterval(checkLockout, 1000);
        return () => clearInterval(interval);
    }, []);
    // Countdown timer when locked out
    useEffect(() => {
        if (lockoutRemaining <= 0)
            return;
        const timer = setInterval(() => {
            setLockoutRemaining(prev => {
                if (prev <= 1) {
                    try {
                        sessionStorage.removeItem(STORAGE_KEY_LOCKOUT);
                        sessionStorage.setItem(STORAGE_KEY_ATTEMPTS, '0');
                    }
                    catch {
                        // ignore
                    }
                    setFailedAttempts(0);
                    setErrorMsg(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [lockoutRemaining]);
    // Focus input on open
    useEffect(() => {
        if (isOpen && lockoutRemaining === 0) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, lockoutRemaining]);
    const verifyPin = useCallback((pinToTest) => {
        if (lockoutRemaining > 0)
            return;
        const configuredPin = (typeof window !== 'undefined' && sessionStorage.getItem('it_dept_admin_pin')) || process.env.NEXT_PUBLIC_ADMIN_PIN || '2025';
        if (pinToTest.trim() === configuredPin) {
            setIsSuccess(true);
            setErrorMsg(null);
            try {
                sessionStorage.setItem('it_dept_admin_pin', pinToTest.trim());
        sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
                sessionStorage.setItem(STORAGE_KEY_AUTH_COMPAT, 'true');
                sessionStorage.removeItem(STORAGE_KEY_LOCKOUT);
                sessionStorage.setItem(STORAGE_KEY_ATTEMPTS, '0');
            }
            catch {
                // ignore
            }
            setTimeout(() => {
                setIsSuccess(false);
                setPin('');
                onAuthenticated();
            }, 500);
        }
        else {
            const newAttempts = failedAttempts + 1;
            setFailedAttempts(newAttempts);
            try {
                sessionStorage.setItem(STORAGE_KEY_ATTEMPTS, String(newAttempts));
            }
            catch {
                // ignore
            }
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            if (newAttempts >= MAX_ATTEMPTS) {
                const lockoutUntil = Date.now() + COOLDOWN_SECONDS * 1000;
                try {
                    sessionStorage.setItem(STORAGE_KEY_LOCKOUT, String(lockoutUntil));
                }
                catch {
                    // ignore
                }
                setLockoutRemaining(COOLDOWN_SECONDS);
                setErrorMsg(`Rate limit exceeded: 5 failed attempts. Locked out for ${COOLDOWN_SECONDS}s.`);
                setPin('');
            }
            else {
                setErrorMsg(`Access Denied: Invalid Security PIN. (${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} remaining)`);
                setPin('');
            }
        }
    }, [failedAttempts, lockoutRemaining, onAuthenticated]);
    const handleDigitPress = (digit) => {
        if (lockoutRemaining > 0 || isSuccess)
            return;
        if (pin.length < 6) {
            const nextPin = pin + digit;
            setPin(nextPin);
            setErrorMsg(null);
            // If 4 digits reached, auto-verify if default length
            if (nextPin.length === 4) {
                verifyPin(nextPin);
            }
        }
    };
    const handleBackspace = () => {
        if (lockoutRemaining > 0 || isSuccess)
            return;
        setPin(prev => prev.slice(0, -1));
        setErrorMsg(null);
    };
    const handleClear = () => {
        if (lockoutRemaining > 0 || isSuccess)
            return;
        setPin('');
        setErrorMsg(null);
    };
    const handleKeyDown = (e) => {
        if (lockoutRemaining > 0 || isSuccess)
            return;
        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            handleDigitPress(e.key);
        }
        else if (e.key === 'Backspace') {
            e.preventDefault();
            handleBackspace();
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (pin.length > 0) {
                verifyPin(pin);
            }
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cyber-bg/85 backdrop-blur-xl animate-fade-in">
      <style>{`
        @keyframes shakeKeypad {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shakeKeypad 0.45s ease-in-out;
        }
      `}</style>

      {/* Outer Glow Container */}
      <div className={`relative w-full max-w-md glass-card-elevated rounded-3xl p-6 sm:p-8 border transition-all duration-300 ${isSuccess
            ? 'border-blue-500 shadow-glow-blue'
            : isShaking
                ? 'border-rose-500 shadow-lg shadow-rose-500/30 animate-shake'
                : 'border-blue-600/30 shadow-glow-card'}`}>
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-blue-600/10 blur-2xl pointer-events-none"/>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-blue-600/10 blur-2xl pointer-events-none"/>

        {/* Security Shield Icon Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 border transition-colors duration-300 ${isSuccess
            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-glow-sm-blue'
            : lockoutRemaining > 0
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-blue-600/20 border-blue-600/40 text-blue-300 shadow-glow-sm-blue'}`}>
            {isSuccess ? (<Unlock className="w-8 h-8 animate-pulse"/>) : lockoutRemaining > 0 ? (<AlertTriangle className="w-8 h-8 text-rose-400"/>) : (<Lock className="w-8 h-8"/>)}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <span>EXECUTIVE ACCESS</span>
            <Shield className="w-5 h-5 text-blue-400"/>
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-sans">
            Class Rep & Exco Portal â€¢ 2025â€“2029 Set
          </p>
        </div>

        {/* Hidden native input for keyboard capture */}
        <input ref={inputRef} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pin} onChange={e => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            setPin(val);
            if (val.length === 4)
                verifyPin(val);
        }} onKeyDown={handleKeyDown} disabled={lockoutRemaining > 0 || isSuccess} className="sr-only" autoFocus/>

        {/* PIN Digits Display */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
            {[0, 1, 2, 3].map(index => {
            const hasDigit = pin.length > index;
            return (<div key={index} onClick={() => inputRef.current?.focus()} className={`w-11 h-14 sm:w-12 sm:h-16 rounded-xl flex items-center justify-center text-xl font-mono border transition-all duration-200 cursor-pointer ${hasDigit
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-glow-sm-blue'
                    : 'bg-cyber-surface/60 border-white/10 text-gray-500'} ${isSuccess ? 'border-blue-500 text-blue-400 bg-blue-600/10' : ''}`}>
                  {hasDigit ? 'â—' : 'â—‹'}
                </div>);
        })}
          </div>

          {/* Feedback & Error / Cooldown Alerts */}
          {lockoutRemaining > 0 ? (<div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin"/>
              <span>Lockout Active: {lockoutRemaining}s cooldown remaining</span>
            </div>) : errorMsg ? (<div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono text-center">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0"/>
              <span>{errorMsg}</span>
            </div>) : (<p className="text-[11px] text-center text-gray-400 font-mono">
              Enter 4-digit security PIN (Default: 2025)
            </p>)}
        </div>

        {/* Interactive Cyberpunk On-Screen Numpad */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (<button key={num} type="button" disabled={lockoutRemaining > 0 || isSuccess} onClick={() => handleDigitPress(num)} className="h-12 sm:h-13 rounded-xl bg-cyber-surface hover:bg-cyber-elevated active:bg-blue-600/30 border border-white/10 hover:border-blue-600/40 text-lg font-mono font-medium text-gray-100 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
              {num}
            </button>))}
          <button type="button" disabled={lockoutRemaining > 0 || isSuccess || pin.length === 0} onClick={handleClear} className="h-12 sm:h-13 rounded-xl bg-cyber-surface/60 hover:bg-cyber-surface border border-white/10 text-xs font-mono uppercase text-gray-400 hover:text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed">
            Clear
          </button>
          <button type="button" disabled={lockoutRemaining > 0 || isSuccess} onClick={() => handleDigitPress('0')} className="h-12 sm:h-13 rounded-xl bg-cyber-surface hover:bg-cyber-elevated active:bg-blue-600/30 border border-white/10 hover:border-blue-600/40 text-lg font-mono font-medium text-gray-100 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
            0
          </button>
          <button type="button" disabled={lockoutRemaining > 0 || isSuccess || pin.length === 0} onClick={handleBackspace} className="h-12 sm:h-13 rounded-xl bg-cyber-surface/60 hover:bg-cyber-surface border border-white/10 text-xs font-mono uppercase text-gray-400 hover:text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed">
            âŒ« Del
          </button>
        </div>

        {/* Submit Button (if pin entered manually) */}
        <div className="space-y-3">
          <button type="button" disabled={pin.length < 4 || lockoutRemaining > 0 || isSuccess} onClick={() => verifyPin(pin)} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-cyber-emerald-light hover:to-cyber-violet-light text-cyber-dark font-mono font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-glow-sm-blue transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
            <KeyRound className="w-4 h-4"/>
            <span>AUTHENTICATE PORTAL</span>
          </button>

          {/* Return / Cancel Button */}
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-200 text-xs font-mono flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-white/10">
            <ArrowLeft className="w-3.5 h-3.5"/>
            <span>Return to Student Survey</span>
          </button>
        </div>
      </div>
    </div>);
};
export default AdminPinModal;
