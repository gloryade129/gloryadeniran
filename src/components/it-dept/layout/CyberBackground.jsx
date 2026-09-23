'use client';
import React from 'react';
export const CyberBackground = () => {
    return (<div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Deep Obsidian Background Base */}
      <div className="absolute inset-0 bg-cyber-bg"/>

      {/* Cyber Grid Lines Overlay */}
      <div className="absolute inset-0 cyber-grid-pattern opacity-40"/>

      {/* Primary Radial Glow: Royal Blue Top/Center */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-25" style={{
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.45) 0%, rgba(26, 63, 212, 0.2) 50%, transparent 80%)',
        }}/>

      {/* Secondary Ambient Glow: Deep Blue Bottom Right */}
      <div className="absolute -bottom-32 -right-20 w-[550px] h-[550px] rounded-full blur-[150px] opacity-25" style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(0, 51, 153, 0.15) 60%, transparent 80%)',
        }}/>

      {/* Tertiary Accent Glow: Light Blue Bottom Left */}
      <div className="absolute top-1/2 -left-32 w-[450px] h-[450px] rounded-full blur-[130px] opacity-20" style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.25) 0%, transparent 70%)',
        }}/>

      {/* Blue Scanning Line Accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"/>
    </div>);
};
