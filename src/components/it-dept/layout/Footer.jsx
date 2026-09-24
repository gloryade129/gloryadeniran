'use client';
import React from 'react';

export const Footer = () => {
  return (
    <footer style={{ width: '100%', padding: '24px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: '48px', textAlign: 'center' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: '#64748B' }}>
        <span>© {new Date().getFullYear()} Information Technology Students Association (ITSA) · University of Ilorin</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Developed by Glory Adeniran · Class Representative</span>
      </div>
    </footer>
  );
};
export default Footer;
