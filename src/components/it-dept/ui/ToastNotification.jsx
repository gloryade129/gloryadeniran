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

  const iconColor = isError ? '#F87171' : isSuccess ? '#3B82F6' : '#60A5FA';
  const borderColor = isError
    ? 'rgba(239, 68, 68, 0.4)'
    : isSuccess
    ? 'rgba(37, 99, 235, 0.45)'
    : 'rgba(59, 130, 246, 0.35)';

  const iconBg = isError
    ? 'rgba(239, 68, 68, 0.12)'
    : isSuccess
    ? 'rgba(37, 99, 235, 0.15)'
    : 'rgba(59, 130, 246, 0.12)';

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
          background: 'rgba(17, 21, 36, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${borderColor}`,
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(37, 99, 235, 0.15)',
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
              color: isError ? '#FCA5A5' : '#E2E8F0',
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
            color: '#64748B',
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
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
export default ToastNotification;
