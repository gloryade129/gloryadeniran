'use client';
import React from 'react';
import { Terminal, Shield, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export const Navbar = ({ onOpenAdmin, isAdminActive = false, onNavigateHome }) => {
  return (
    <header className="sticky top-0 z-40 w-full" style={{ background: 'rgba(6, 9, 19, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div
          onClick={onNavigateHome}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <img
            src="/itsa-logo.png"
            alt="ITSA Logo"
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #2563EB', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: '#FFFFFF' }}>
                IT DEPT PORTAL
              </span>
              <span className="it-badge">2025–2029 SET</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
              100L → 200L Transition System
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94A3B8', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <span>gloryadeniran.cv</span>
            <ArrowUpRight size={13} />
          </Link>
          <button
            type="button"
            onClick={onOpenAdmin}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer',
              background: isAdminActive ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isAdminActive ? '#2563EB' : 'rgba(255, 255, 255, 0.1)'}`,
              color: isAdminActive ? '#93C5FD' : '#E2E8F0',
              transition: 'all 0.2s ease',
            }}
          >
            <Shield size={13} color="#3B82F6" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
