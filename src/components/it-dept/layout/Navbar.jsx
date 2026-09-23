'use client';
import React from 'react';
import { Terminal, Shield } from 'lucide-react';
export const Navbar = ({ onOpenAdmin, isAdminActive = false, onNavigateHome, }) => {
    return (<header className="sticky top-0 z-40 w-full bg-cyber-bg/90 backdrop-blur-md border-b border-blue-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div onClick={onNavigateHome} className="flex items-center gap-3 cursor-pointer group transition-transform duration-150 active:scale-95">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-700/20 border border-blue-600/40 group-hover:border-blue-500 shadow-glow-sm-blue transition-all duration-300">
            <Terminal className="w-5 h-5 text-blue-400 group-hover:rotate-6 transition-transform"/>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-wide text-white group-hover:text-blue-300 transition-colors">
                IT DEPT PORTAL
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-blue-700/20 text-blue-300 border border-blue-600/30">
                2025-2029 SET
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tracking-tight">
              100L <span className="text-blue-400 font-semibold">to</span> 200L Transition System
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyber-surface/90 border border-blue-900/30 text-xs font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span>LEVEL-UP ACTIVE</span>
          </div>
          <button onClick={onOpenAdmin} type="button" className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all duration-200 border ${isAdminActive
            ? 'bg-blue-700/20 border-blue-500 text-blue-300 shadow-glow-sm-blue'
            : 'bg-cyber-surface/80 hover:bg-cyber-surface border-white/10 hover:border-blue-600/50 text-slate-300 hover:text-white'}`} title="Class Leadership Analytics Portal">
            <Shield className="w-3.5 h-3.5 text-blue-400"/>
            <span className="hidden xs:inline">Admin Portal</span>
            <span className="xs:hidden">Admin</span>
          </button>
        </div>
      </div>
    </header>);
};
