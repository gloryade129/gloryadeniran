'use client';
import React from 'react';
import { ArrowRight, Clock, ShieldCheck, Award, MessageSquareQuote, CheckCircle2 } from 'lucide-react';
export const Step0Welcome = ({ onStart }) => {
    return (<div className="w-full max-w-3xl mx-auto py-4 sm:py-8 animate-fade-in">

      {/* ITSA Logo + Department Header */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <img src="/itsa-logo.png" alt="Information Technology Students Association Logo" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-blue-600 shadow-glow-blue" onError={(e) => {
            e.target.style.display = 'none';
        }}/>
        <div className="text-center">
          <span className="block font-mono font-bold text-xs tracking-widest text-blue-400 uppercase mb-1">
            I.T.S.A. — The Bedrock of Technology
          </span>
          <span className="block font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            University of Ilorin — Information Technology Department
          </span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-600/15 text-blue-300 border border-blue-600/35">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"/>
          IT DEPT — 2025 TO 2029 SET
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30">
          LEVEL UP TO 200L
        </span>
      </div>

      {/* Hero Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          Welcome to Your{' '}
          <br className="hidden sm:inline"/>
          <span className="cyber-gradient-text">200-Level Transition</span> Portal
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          From 100L foundational science to 200L computing specialization. Share your retrospective, review class leadership, sign up for impactful committees, and unlock your official Scholar Pass.
        </p>
      </div>

      {/* Class Rep Note Card */}
      <div className="glass-card-elevated rounded-2xl p-6 sm:p-7 mb-8 border border-blue-600/20 relative overflow-hidden hover:border-blue-500/35 transition-all duration-300">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"/>

        <div className="flex items-start gap-4 mb-4">
          <div className="shrink-0">
            <img src="https://gloryadeniran.cv/images/Put_an_I_watch_to_202606282357.jpeg" alt="Glory Adeniran — Class Representative" className="w-14 h-14 rounded-xl object-cover object-top border-2 border-blue-600/50" onError={(e) => {
            const el = e.target;
            el.style.display = 'none';
        }}/>
          </div>
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-600/30 text-blue-400 shrink-0">
                <MessageSquareQuote className="w-4 h-4"/>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  A Word from Class Leadership
                </h2>
                <p className="text-xs text-blue-400 font-mono">
                  Glory Adeniran — Class Representative, IT Dept 2025-2029 Set
                </p>
              </div>
            </div>
          </div>
        </div>

        <blockquote className="text-sm sm:text-base text-slate-300 italic pl-1 leading-relaxed border-l-2 border-blue-600/50 my-3">
          "Welcome IT Scholars! 100 level was a foundational marathon of general courses and adaptation. As we enter 200 level, we transition into core computing, software engineering, and technical specialization. Let us know how your 100L went, review leadership transparently, join your preferred committees, and claim your verified 200L Pass!"
        </blockquote>

        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1 text-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400"/> 100% Student Voice
          </span>
          <span className="flex items-center gap-1 text-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400"/> Genuine Class Impact
          </span>
        </div>
      </div>

      {/* Feature Perks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
        <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyber-surface border border-blue-600/20 text-blue-400">
            <Clock className="w-4 h-4"/>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-400">Time Required</p>
            <p className="text-sm font-semibold text-white">About 2 Minutes</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyber-surface border border-blue-600/20 text-blue-300">
            <ShieldCheck className="w-4 h-4"/>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-400">Leadership Review</p>
            <p className="text-sm font-semibold text-white">Anonymity Toggle</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyber-surface border border-blue-600/20 text-blue-300">
            <Award className="w-4 h-4"/>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-400">Instant Reward</p>
            <p className="text-sm font-semibold text-white">200L Scholar Pass</p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="flex flex-col items-center gap-3">
        <button onClick={onStart} type="button" className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-white bg-blue-600 hover:bg-blue-500 transition-all duration-200 shadow-glow-blue flex items-center justify-center gap-2 group cursor-pointer active:scale-95">
          <span>Begin Transition Journey</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
        </button>

        <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
          <span>Press</span>
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-cyber-surface border border-white/20 rounded text-slate-200">
            Enter
          </kbd>
          <span>to advance through steps</span>
        </p>
      </div>
    </div>);
};
