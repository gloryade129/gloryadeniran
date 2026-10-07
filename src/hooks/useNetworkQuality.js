'use client';

import { useState, useEffect } from 'react';

/**
 * Custom Hook: useNetworkQuality
 * Detects network condition and progressive enhancement capabilities:
 * - isSlowNetwork: true if 2G, 3G, Data Saver is ON, or downlink < 1.8Mbps
 * - isStrongNetwork: true if fast 4G/5G/WiFi with low latency
 * - isSaveData: user explicitly requested low data usage
 * - effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
 * - isOnline: boolean
 * - isMobile: boolean (screen <= 768px)
 */
export function useNetworkQuality() {
  const [networkInfo, setNetworkInfo] = useState({
    isSlowNetwork: false,
    isStrongNetwork: true,
    isSaveData: false,
    effectiveType: '4g',
    isOnline: true,
    isMobile: false,
    isDetected: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkNetwork = () => {
      const isMobileDevice = window.innerWidth <= 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
      const isOnline = navigator.onLine !== false;

      // Check Network Information API (Chrome, Edge, Android, Opera)
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      let isSaveData = false;
      let effectiveType = '4g';
      let isSlow = false;

      if (conn) {
        isSaveData = Boolean(conn.saveData);
        effectiveType = conn.effectiveType || '4g';
        
        // Weak if on 2G, 3G, downlink < 1.8 Mbps, or RTT > 450ms
        const isLowType = ['slow-2g', '2g', '3g'].includes(effectiveType);
        const isLowBandwidth = typeof conn.downlink === 'number' && conn.downlink < 1.8;
        const isHighLatency = typeof conn.rtt === 'number' && conn.rtt > 450;
        
        if (isSaveData || isLowType || isLowBandwidth || isHighLatency) {
          isSlow = true;
        }
      }

      setNetworkInfo({
        isSlowNetwork: isSlow,
        isStrongNetwork: !isSlow && isOnline,
        isSaveData,
        effectiveType,
        isOnline,
        isMobile: isMobileDevice,
        isDetected: true,
      });
    };

    checkNetwork();

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', checkNetwork);
    }

    window.addEventListener('online', checkNetwork);
    window.addEventListener('offline', checkNetwork);
    window.addEventListener('resize', checkNetwork);

    return () => {
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', checkNetwork);
      }
      window.removeEventListener('online', checkNetwork);
      window.removeEventListener('offline', checkNetwork);
      window.removeEventListener('resize', checkNetwork);
    };
  }, []);

  return networkInfo;
}

export default useNetworkQuality;
