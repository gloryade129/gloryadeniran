'use client';
import React from 'react';

export const Navbar = () => {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(10, 10, 12, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid rgba(62, 207, 142, 0.4)',
              objectFit: 'cover',
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '-0.01em',
                color: '#EDEDED',
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              IT Department
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#71717A',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Directory & Feedback
            </span>
          </div>
        </div>

        <span className="it-badge">
          2025–2029 SET
        </span>
      </div>
    </header>
  );
};
export default Navbar;
