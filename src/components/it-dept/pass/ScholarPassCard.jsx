'use client';
import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Terminal, Award } from 'lucide-react';

export function generatePassId(matric) {
  let hash = 0;
  const str = (matric || 'IT/2024/000').toUpperCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return `#IT29-${hex}-200L`;
}

export const ScholarPassCard = forwardRef(({ formData }, ref) => {
  const cleanMatric = (formData.matricNo || 'IT/2024/000').toUpperCase();
  const cleanName = (formData.fullName || 'ESTEEMED SCHOLAR').toUpperCase();
  const passId = generatePassId(cleanMatric);
  const track = formData.techTrack?.split(' (')[0] || 'Software Engineering';

  return (
    <div
      ref={ref}
      className="it-scholar-pass"
      style={{
        width: '100%',
        maxWidth: '380px',
        margin: '0 auto',
        userSelect: 'none',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/itsa-logo.png"
            alt="ITSA"
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #2563EB', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <p style={{ margin: 0, fontSize: '0.625rem', fontFamily: 'JetBrains Mono, monospace', color: '#93C5FD', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              UNIVERSITY OF ILORIN
            </p>
            <h1 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em' }}>
              IT DEPARTMENT · 200L PASS
            </h1>
          </div>
        </div>
        <span style={{ fontSize: '0.6875rem', fontFamily: 'JetBrains Mono, monospace', color: '#60A5FA', padding: '2px 8px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.2)' }}>
          2025–2029
        </span>
      </div>

      {/* Middle Details */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 2px', fontSize: '0.6875rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
          SCHOLAR NAME
        </p>
        <h2 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cleanName}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '0.6875rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
              MATRIC NO
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#93C5FD', fontFamily: 'JetBrains Mono, monospace' }}>
              {cleanMatric}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '0.6875rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
              TECH TRACK
            </p>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom QR & Verification */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>
            <ShieldCheck size={14} />
            <span>OFFICIALLY VERIFIED</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.6875rem', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
            ID: {passId}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: '#475569' }}>
            Issued by Class Rep: Glory Adeniran
          </p>
        </div>

        <div style={{ background: '#FFFFFF', padding: '6px', borderRadius: '8px' }}>
          <QRCodeSVG
            value={`https://gloryadeniran.cv/it-dept#verify=${encodeURIComponent(cleanMatric)}`}
            size={56}
            level="M"
          />
        </div>
      </div>
    </div>
  );
});

ScholarPassCard.displayName = 'ScholarPassCard';
export default ScholarPassCard;
