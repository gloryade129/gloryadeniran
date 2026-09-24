'use client';
import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, MessageCircle, Radio, CheckCircle2 } from 'lucide-react';

export const PassExporter = ({ cardRef, matricNo, fullName }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#070B16',
      });
      const cleanMatric = (matricNo || 'SCHOLAR').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const link = document.createElement('a');
      link.download = `200L-Pass-${cleanMatric}.png`;
      link.href = dataUrl;
      link.click();
      setIsExporting(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (e) {
      console.error('Pass export failed:', e);
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    const msg = `I (${fullName || 'an IT Scholar'}) just leveled up to 200L in the Department of Information Technology (2025–2029 Set)! Claim your official pass and join class committees: https://gloryadeniran.cv/it-dept`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ maxWidth: '380px', margin: '20px auto 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {downloaded && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#93C5FD', fontSize: '0.8125rem' }}>
          <CheckCircle2 size={16} />
          <span>Pass downloaded! Post on your WhatsApp Status.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isExporting}
          className="it-btn-primary"
          style={{ padding: '12px 16px', fontSize: '0.8125rem' }}
        >
          <Download size={15} />
          <span>{isExporting ? 'Saving...' : 'Download Pass'}</span>
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="it-btn-secondary"
          style={{ padding: '12px 16px', fontSize: '0.8125rem' }}
        >
          <Share2 size={15} />
          <span>Share WhatsApp</span>
        </button>
      </div>

      {/* Official Links */}
      <div className="it-card" style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>
          OFFICIAL 200L COMMUNITIES
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <a
            href="https://chat.whatsapp.com/ITDept2029Community"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(37, 211, 102, 0.1)', border: '1px solid rgba(37, 211, 102, 0.25)', color: '#25D366', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}
          >
            <MessageCircle size={14} />
            <span>Community</span>
          </a>
          <a
            href="https://whatsapp.com/channel/ITDept2029Channel"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.25)', color: '#93C5FD', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}
          >
            <Radio size={14} />
            <span>Broadcasts</span>
          </a>
        </div>
      </div>
    </div>
  );
};
export default PassExporter;
