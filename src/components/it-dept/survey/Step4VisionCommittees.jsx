'use client';
import React, { useState } from 'react';
import { Check, ArrowLeft, Rocket, Sparkles, AlertCircle, BookOpen, Laptop, HeartHandshake, Palette, Trophy } from 'lucide-react';
import { CLASS_COMMITTEES } from '@/components/it-dept/types/survey';
const COMMITTEE_ICON_MAP = {
    BookOpen,
    Laptop,
    HeartHandshake,
    Palette,
    Trophy,
};
export const Step4VisionCommittees = ({ formData, onChange, onSubmit, onBack, isSubmitting = false, }) => {
    const [errorMsg, setErrorMsg] = useState('');
    const toggleCommittee = (committeeName) => {
        const exists = formData.committees.includes(committeeName);
        const updated = exists
            ? formData.committees.filter(c => c !== committeeName)
            : [...formData.committees, committeeName];
        onChange('committees', updated);
        if (errorMsg)
            setErrorMsg('');
    };
    const handleSubmit = (e) => {
        if (e)
            e.preventDefault();
        if (formData.committees.length === 0) {
            setErrorMsg('Please select at least one committee to contribute your skills to.');
            return;
        }
        setErrorMsg('');
        onSubmit();
    };
    return (<div className="w-full max-w-3xl mx-auto py-2 sm:py-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-600/10 text-blue-400 border border-blue-600/30">
            STEP 04 / 04
          </span>
          <span className="text-xs font-mono text-gray-400">200-LEVEL VISION &amp; COMMITTEE SELECTION</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Shape the Future of Our 200 Level
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          Join one or more class committees to build software, host hackathons, organize tutorials, or champion class welfare.
        </p>
      </div>

      {errorMsg && (<div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5"/>
          <p className="text-xs text-red-300">{errorMsg}</p>
        </div>)}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Committee Selection Cards */}
        <div className="glass-card-elevated rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-200">
              Select Committee(s) to Join <span className="text-blue-400">*</span>
            </h3>
            <span className="text-xs text-blue-400 font-mono">
              {formData.committees.length} Selected
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            You can select multiple committees based on your passion, technical skills, or interests.
          </p>

          <div className="space-y-3">
            {CLASS_COMMITTEES.map((comm) => {
            const Icon = COMMITTEE_ICON_MAP[comm.icon] || BookOpen;
            const isSelected = formData.committees.includes(comm.name);
            return (<div key={comm.id} onClick={() => toggleCommittee(comm.name)} className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-4 ${isSelected
                    ? 'bg-blue-600/15 border-blue-600 shadow-glow-sm-blue ring-1 ring-blue-500'
                    : 'bg-cyber-surface/60 border-white/5 hover:border-white/20 hover:bg-cyber-surface'}`}>
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${isSelected
                    ? 'bg-blue-600 text-gray-950 font-bold'
                    : 'bg-cyber-surface border border-white/10 text-blue-300'}`}>
                      <Icon className="w-5 h-5"/>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        {comm.name}
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {comm.desc}
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-1 transition-colors ${isSelected
                    ? 'bg-blue-600 border-blue-600 text-gray-950 font-bold'
                    : 'border-white/30 bg-cyber-surface'}`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]"/>}
                  </div>
                </div>);
        })}
          </div>
        </div>

        {/* Vision & Open Suggestions Textarea */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-300"/>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-200">
              Open Vision &amp; Suggestions for 200 Level
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            What events, tech workshops, initiatives, or social hangouts should the class organize this session?
          </p>
          <textarea id="suggestions200L" rows={4} value={formData.suggestions200L} onChange={(e) => onChange('suggestions200L', e.target.value)} placeholder="e.g. Host an IT 200L Web3 & AI hackathon, invite industry seniors for tech career fireside chats, launch collaborative GitHub repos for course projects..." className="w-full px-4 py-3 rounded-xl glass-input text-white text-xs sm:text-sm placeholder-gray-500 focus:border-blue-600"/>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button type="button" onClick={onBack} disabled={isSubmitting} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50">
            <ArrowLeft className="w-4 h-4"/>
            <span>Back to Step 3</span>
          </button>

          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-glow-blue transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50">
            {isSubmitting ? (<>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                <span>Generating Your Pass...</span>
              </>) : (<>
                <span>Submit &amp; Generate 200L Pass</span>
                <Rocket className="w-4 h-4"/>
              </>)}
          </button>
        </div>
      </form>
    </div>);
};
