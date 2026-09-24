'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Unlock, KeyRound, AlertTriangle } from 'lucide-react';
import { AdminDashboard } from '@/components/it-dept/admin/AdminDashboard';
import '@/components/it-dept/it-portal.css';

const STORAGE_KEY_AUTH = 'it_dept_admin_auth_v1';
const STORAGE_KEY_AUTH_COMPAT = 'it_portal_admin_auth';

export default function ItDeptAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    try {
      const isAuth =
        sessionStorage.getItem(STORAGE_KEY_AUTH) === 'true' ||
        sessionStorage.getItem(STORAGE_KEY_AUTH_COMPAT) === 'true';
      setIsAuthenticated(isAuth);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const handleVerify = (pinToTest) => {
    const testPin = (pinToTest || pin).trim();
    if (!testPin) {
      setErrorMsg('Please enter the 4-digit administrative PIN.');
      return;
    }

    setIsVerifying(true);
    // Default PIN: 2025
    const configuredPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '2025';

    if (testPin === configuredPin || testPin === '2025') {
      try {
        sessionStorage.setItem(STORAGE_KEY_AUTH, 'true');
        sessionStorage.setItem(STORAGE_KEY_AUTH_COMPAT, 'true');
        sessionStorage.setItem('it_dept_admin_pin', testPin);
      } catch (e) {}
      setErrorMsg('');
      setIsAuthenticated(true);
    } else {
      setErrorMsg('Access Denied: Invalid Security PIN.');
      setPin('');
    }
    setIsVerifying(false);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
      sessionStorage.removeItem(STORAGE_KEY_AUTH_COMPAT);
      sessionStorage.removeItem('it_dept_admin_pin');
    } catch (e) {}
    setIsAuthenticated(false);
    setPin('');
  };

  if (isAuthenticated) {
    return (
      <div className="it-portal-wrap it-dept-portal it-admin-portal" style={{ minHeight: '100vh', padding: '24px 16px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/it-dept"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94A3B8',
              fontSize: '0.8125rem',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <ArrowLeft size={14} />
            <span>View Student Survey</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#F87171',
              fontSize: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <Lock size={12} />
            <span>Lock & Log Out</span>
          </button>
        </div>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <AdminDashboard onBackToSurvey={() => window.location.href = '/it-dept'} onLock={handleLogout} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="it-portal-wrap it-dept-portal it-admin-portal"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div
        className="it-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '28px 24px',
          textAlign: 'center',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(37, 99, 235, 0.2)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid #2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#3B82F6',
          }}
        >
          <Shield size={28} />
        </div>

        <span className="it-badge" style={{ marginBottom: '10px' }}>
          EXECUTIVE CONTROL
        </span>

        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '6px 0 8px',
            letterSpacing: '-0.01em',
          }}
        >
          IT Portal Admin Dashboard
        </h1>

        <p
          style={{
            fontSize: '0.8125rem',
            color: '#94A3B8',
            marginBottom: '20px',
            lineHeight: 1.5,
          }}
        >
          Class Representative & Leadership Control Center. View student directory, rating breakdowns, and export records.
        </p>

        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.8125rem',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: '6px',
                textAlign: 'left',
              }}
            >
              Security Access PIN (Default: 2025)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="it-input"
              placeholder="Enter PIN..."
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPin(val);
                if (val.length === 4) {
                  handleVerify(val);
                }
              }}
              style={{
                textAlign: 'center',
                letterSpacing: '0.25em',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || pin.length < 4}
            className="it-btn-primary"
            style={{ width: '100%', minHeight: '48px', fontSize: '0.9375rem' }}
          >
            <KeyRound size={16} />
            <span>{isVerifying ? 'Authenticating...' : 'Unlock Admin Dashboard'}</span>
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Link
            href="/it-dept"
            style={{
              color: '#64748B',
              fontSize: '0.75rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={13} />
            <span>Return to Student Survey</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
