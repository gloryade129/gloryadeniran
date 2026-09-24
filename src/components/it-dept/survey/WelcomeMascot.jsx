'use client';
import React, { useState } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';

export const WelcomeMascot = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isWiggling, setIsWiggling] = useState(false);

  const quotes = [
    "Welcome, 200L IT Scholar! Ready to shape our class and level up?",
    "Every feedback counts towards building a legendary 200 Level!",
    "Your tech journey matters. Tap Start below to claim your official pass!",
  ];

  const handleMascotClick = () => {
    setIsWiggling(true);
    setQuoteIndex((prev) => (prev + 1) % quotes.length);
    setTimeout(() => setIsWiggling(false), 600);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0 auto 20px',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes mascotFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes mascotWave {
          0%, 100% { transform: rotate(0deg); transform-origin: 82px 64px; }
          25% { transform: rotate(18deg); transform-origin: 82px 64px; }
          75% { transform: rotate(-10deg); transform-origin: 82px 64px; }
        }
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes speechPopup {
          0% { opacity: 0; transform: scale(0.85) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mascot-container {
          animation: mascotFloat 3.6s ease-in-out infinite;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .mascot-container:hover {
          transform: scale(1.05);
        }
        .mascot-waving-arm {
          animation: mascotWave 1.8s ease-in-out infinite;
        }
        .mascot-eye {
          animation: eyeBlink 3.8s ease-in-out infinite;
          transform-origin: 50% 50%;
        }
        .mascot-bubble {
          animation: speechPopup 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Speech Bubble */}
      <div
        className="mascot-bubble"
        onClick={handleMascotClick}
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
          borderRadius: '16px',
          padding: '10px 16px',
          maxWidth: '340px',
          marginBottom: '14px',
          position: 'relative',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
          <Sparkles size={13} color="#60A5FA" />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Byte • 200L Class Companion
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#E2E8F0', lineHeight: 1.45, fontWeight: 500 }}>
          "{quotes[quoteIndex]}"
        </p>
        <span style={{ fontSize: '0.625rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
          (Tap me for more tips!)
        </span>

        {/* Bubble Tail */}
        <div
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '12px',
            height: '12px',
            background: 'rgba(15, 23, 42, 0.92)',
            borderRight: '1px solid rgba(59, 130, 246, 0.4)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.4)',
          }}
        />
      </div>

      {/* Animated SVG Mascot */}
      <div
        className="mascot-container"
        onClick={handleMascotClick}
        style={{
          transform: isWiggling ? 'rotate(10deg) scale(1.1)' : undefined,
          filter: 'drop-shadow(0 12px 20px rgba(37, 99, 235, 0.35))',
        }}
        title="Tap Byte!"
      >
        <svg
          width="110"
          height="110"
          viewBox="0 0 110 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glowing Aura Ring */}
          <circle cx="55" cy="55" r="48" stroke="url(#auraGrad)" strokeWidth="2" strokeDasharray="6 4" opacity="0.75" />

          {/* Body Base */}
          <rect x="30" y="44" width="50" height="42" rx="14" fill="url(#bodyGrad)" stroke="#3B82F6" strokeWidth="2.5" />
          
          {/* Scholar Cap / Headpiece */}
          <path d="M55 12L84 24L55 36L26 24L55 12Z" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="2" />
          <path d="M42 29V37C42 42 68 42 68 37V29" fill="#1E40AF" stroke="#3B82F6" strokeWidth="1.5" />
          {/* Golden Tassel */}
          <line x1="55" y1="24" x2="80" y2="34" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
          <circle cx="80" cy="35" r="3" fill="#F59E0B" />

          {/* Screen / Visor */}
          <rect x="36" y="50" width="38" height="22" rx="8" fill="#050B14" stroke="#60A5FA" strokeWidth="1.5" />
          
          {/* Glowing Cyber Eyes with Blink Animation */}
          <g className="mascot-eye">
            <ellipse cx="46" cy="61" rx="4" ry="5.5" fill="#38BDF8" />
            <circle cx="47.5" cy="59.5" r="1.5" fill="#FFFFFF" />
            
            <ellipse cx="64" cy="61" rx="4" ry="5.5" fill="#38BDF8" />
            <circle cx="65.5" cy="59.5" r="1.5" fill="#FFFFFF" />
          </g>

          {/* Friendly Robotic Smile */}
          <path d="M51 68C53 70 57 70 59 68" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />

          {/* Left Resting Arm */}
          <path d="M28 58C23 62 23 70 28 73" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />

          {/* Right Waving Arm with Waving Keyframes */}
          <g className="mascot-waving-arm">
            <path d="M82 58C89 54 94 48 98 42" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" />
            <circle cx="99" cy="41" r="5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1.5" />
          </g>

          {/* Set 200L Chest Badge */}
          <rect x="47" y="76" width="16" height="6" rx="3" fill="#1E3A8A" />
          <text x="55" y="80.5" fill="#93C5FD" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            200L
          </text>

          {/* Gradients */}
          <defs>
            <linearGradient id="bodyGrad" x1="30" y1="44" x2="80" y2="86" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0F172A" />
              <stop offset="1" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id="auraGrad" x1="7" y1="7" x2="103" y2="103" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="0.5" stopColor="#8B5CF6" stopOpacity="0.4" />
              <stop offset="1" stopColor="#38BDF8" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
export default WelcomeMascot;
