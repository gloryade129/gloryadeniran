'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkQuality from '@/hooks/useNetworkQuality';

export default function NetworkStatusPill() {
  const { isSlowNetwork, isOnline, isSaveData, isDetected } = useNetworkQuality();
  const [visible, setVisible] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!isDetected) return;

    if (!isOnline) {
      setNotice({
        type: 'offline',
        text: 'Offline mode active • Cached pages available',
        color: '#F59E0B',
      });
      setVisible(true);
      return;
    }

    if (isSaveData) {
      setNotice({
        type: 'savedata',
        text: 'Data Saver enabled • Media optimized for low data',
        color: '#38BDF8',
      });
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(t);
    }

    if (isSlowNetwork) {
      setNotice({
        type: 'slow',
        text: 'Slow network detected • Running in high-speed Lite Mode',
        color: '#38BDF8',
      });
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isSlowNetwork, isOnline, isSaveData, isDetected]);

  if (!notice) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99998,
            pointerEvents: 'auto',
          }}
        >
          <div
            onClick={() => setVisible(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'rgba(10, 14, 23, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              color: '#F8FAFC',
              fontFamily: 'var(--font, sans-serif)',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: notice.color, boxShadow: `0 0 8px ${notice.color}`, flexShrink: 0 }} />
            <span style={{ color: notice.color, fontWeight: 500 }}>{notice.text}</span>
            <span style={{ opacity: 0.5, marginLeft: '4px', fontSize: '10px' }}>✕</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
