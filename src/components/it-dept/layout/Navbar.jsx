'use client';
import React from 'react';

export const Navbar = () => {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(6, 9, 19, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/itsa-logo.png"
            alt="ITSA Logo"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: '1px solid #2563EB',
              objectFit: 'cover',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.92rem',
                letterSpacing: '0.01em',
                color: '#FFFFFF',
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              IT Department
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#94A3B8',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Directory & Feedback
            </span>
          </div>
        </div>
        <div>
          <span className="it-badge">2025–2029 SET</span>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
