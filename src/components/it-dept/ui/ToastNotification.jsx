'use client';
import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export const ToastNotification = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast || !toast.open) return;
    const duration = toast.duration || 4500;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast || !toast.open) return null;

  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  const iconColor = isError ? '#F87171' : isSuccess ? '#3ECF8E' : '#38BDF8';
  const borderColor = isError
    ? 'rgba(239, 68, 68, 0.35)'
    : isSuccess
    ? 'rgba(62, 207, 142, 0.35)'
    : 'rgba(56, 189, 248, 0.35)';

  const iconBg = isError
    ? 'rgba(239, 68, 68, 0.12)'
    : isSuccess
    ? 'rgba(62, 207, 142, 0.12)'
    : 'rgba(56, 189, 248, 0.12)';

  const IconComp = isError ? AlertCircle : isSuccess ? CheckCircle2 : Info;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        maxWidth: '92vw',
        width: '440px',
        pointerEvents: 'auto',
      }}
      className="it-toast-animate"
    >
      <div
        style={{
          background: 'rgba(18, 18, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          color: '#EDEDED',
          fontFamily: 'Montserrat, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '1px',
          }}
        >
          <IconComp size={18} color={iconColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <h4
              style={{
                margin: '0 0 2px',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
              }}
            >
              {toast.title}
            </h4>
          )}
          <p
            style={{
              margin: 0,
              fontSize: '0.84rem',
              color: isError ? '#FCA5A5' : '#D4D4D8',
              lineHeight: 1.45,
              fontWeight: 500,
              wordBreak: 'break-word',
            }}
          >
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#71717A',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717A')}
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;
