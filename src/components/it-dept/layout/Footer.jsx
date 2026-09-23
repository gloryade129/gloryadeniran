'use client';
import React from 'react';
import { ShieldCheck, Heart, Terminal, Code2 } from 'lucide-react';
export const Footer = () => {
    return (<footer className="relative z-10 w-full border-t border-white/5 bg-cyber-bg/90 backdrop-blur-md py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Dept & Set Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400"/>
              <span className="font-semibold text-sm text-gray-200 tracking-wide">
                Department of Information Technology
              </span>
              <span className="text-xs font-mono text-blue-300 bg-blue-600/10 px-2 py-0.5 rounded border border-blue-600/20">
                2025–2029 Set
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Facilitated by Class Representative & Assistant Class Representative • Academic Session 2026/2027
            </p>
          </div>

          {/* Privacy & Integrity Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-surface/90 border border-blue-600/20 text-xs font-mono text-gray-300">
            <ShieldCheck className="w-4 h-4 text-blue-400"/>
            <span>Strict Leadership Review Anonymity Decoupling</span>
          </div>

          {/* Engineering Credit */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
            <Code2 className="w-3.5 h-3.5 text-gray-400"/>
            <span>Built with precision for 200L transition</span>
            <Heart className="w-3 h-3 text-blue-500 fill-blue-500 inline ml-0.5"/>
          </div>
        </div>
      </div>
    </footer>);
};
