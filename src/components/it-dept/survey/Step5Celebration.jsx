'use client';
import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, Sparkles, RotateCcw, PartyPopper, ShieldCheck } from 'lucide-react';
import { ScholarPassCard } from '../pass/ScholarPassCard';
import { PassExporter } from '../pass/PassExporter';
export const Step5Celebration = ({ formData, onReset, }) => {
    const cardRef = useRef(null);
    const triggerConfetti = () => {
        const count = 200;
        const defaults = {
            origin: { y: 0.65 }
        };
        const fire = (particleRatio, opts) => {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        };
        fire(0.25, {
            spread: 26,
            startVelocity: 55,
            colors: ['#2563EB', '#3B82F6', '#60A5FA']
        });
        fire(0.2, {
            spread: 60,
            colors: ['#2563EB', '#60A5FA', '#1E40AF']
        });
        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8,
            colors: ['#3B82F6', '#93C5FD', '#1D4ED8']
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2,
            colors: ['#2563EB', '#60A5FA', '#FFFFFF']
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 45,
            colors: ['#1D4ED8', '#3B82F6', '#93C5FD']
        });
    };
    useEffect(() => {
        // Automatically trigger confetti fireworks on mount
        triggerConfetti();
    }, []);
    return (<div className="w-full max-w-4xl mx-auto py-2 sm:py-6 animate-fade-in text-center space-y-8">
      {/* Celebration Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-blue-600/15 text-blue-400 border border-blue-600/40 shadow-glow-sm-blue">
          <PartyPopper className="w-4 h-4 text-blue-400"/>
          <span>LEVEL-UP PROTOCOL COMPLETE</span>
          <Sparkles className="w-3.5 h-3.5 text-blue-300"/>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          Congratulations, <br className="sm:hidden"/>
          <span className="cyber-gradient-text">200-Level IT Scholar!</span> 
        </h2>

        <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto">
          Your retrospective, leadership feedback, and committee preferences have been officially recorded. Here is your personalized, verified 200L Scholar Pass.
        </p>

        {/* Confetti re-trigger pill */}
        <div className="pt-1">
          <button type="button" onClick={triggerConfetti} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-blue-300 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 transition-colors cursor-pointer">
            <Sparkles className="w-3.5 h-3.5"/>
            <span>Burst Confetti Again</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column or Stacked Display: Left Card, Right Exporter & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Pass Card Display (Left / Top) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full flex justify-center">
            <ScholarPassCard ref={cardRef} formData={formData}/>
          </div>
          <p className="text-[11px] font-mono text-gray-400 mt-3 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400"/>
            <span>Official digital pass verifiable via embedded QR code.</span>
          </p>
        </div>

        {/* Pass Actions & Communities (Right / Bottom) */}
        <div className="lg:col-span-6 space-y-6 text-left">
          {/* Status Overview Card */}
          <div className="glass-card-elevated rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
                TRANSITION STATUS
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-blue-400">
                <CheckCircle className="w-3.5 h-3.5"/> Verified Scholar
              </span>
            </div>

            <div className="text-xs text-gray-300 space-y-1.5 pt-1">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">Class Set:</span>
                <span className="font-mono font-bold text-white">IT DEPT (2025â€“2029)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">Level:</span>
                <span className="font-mono font-bold text-blue-400">200 Level (Active)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-gray-400">Leadership Critique:</span>
                <span className="font-mono text-gray-200">
                  {formData.isAnonymousLeadership ? (<span className="text-blue-300 font-semibold">Decoupled (Anonymous)</span>) : (<span>Attributed Profile</span>)}
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-gray-400">Committees:</span>
                <span className="font-mono font-semibold text-white">
                  {formData.committees.length} Team{formData.committees.length > 1 ? 's' : ''} Selected
                </span>
              </div>
            </div>
          </div>

          {/* Pass Exporter & Social Links */}
          <PassExporter cardRef={cardRef} matricNo={formData.matricNo} fullName={formData.fullName}/>

          {/* Reset / New Session */}
          <div className="text-center pt-2">
            <button type="button" onClick={onReset} className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5"/>
              <span>Submit Another Response / Restart Journey</span>
            </button>
          </div>
        </div>
      </div>
    </div>);
};
