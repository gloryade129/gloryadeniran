'use client';
import React, { useState } from 'react';
import { ShieldCheck, EyeOff, Eye, Star, ArrowRight, ArrowLeft, MessageSquare, AlertCircle, ThumbsUp, Wrench, Lock } from 'lucide-react';
const CR_METRICS = [
    {
        key: 'crRatingCommunication',
        label: 'Communication & Timely Announcements',
        desc: 'Clarity, speed, and reliability of WhatsApp & lecture notices'
    },
    {
        key: 'crRatingMaterials',
        label: 'Course Material & Past Question Distribution',
        desc: 'Sharing lecture slides, textbook PDFs, and exam revision materials'
    },
    {
        key: 'crRatingAvailability',
        label: 'Availability & Problem Resolution',
        desc: 'Resolving test clashes, venue issues, and lecturer liaising'
    },
    {
        key: 'crRatingWelfare',
        label: 'Empathy & Class Welfare Advocacy',
        desc: 'Listening to student complaints and advocating fairly for everyone'
    },
];
const ACR_METRICS = [
    {
        key: 'acrRatingCommunication',
        label: 'Support & Announcement Coordination',
        desc: 'Backing up communication and coordinating class groups'
    },
    {
        key: 'acrRatingMaterials',
        label: 'Course Material & Notes Sourcing',
        desc: 'Assisting in sourcing tutorial notes and assignment briefs'
    },
    {
        key: 'acrRatingAvailability',
        label: 'Availability & Peer Guidance',
        desc: 'Approachable, responsive, and supportive to classmates'
    },
    {
        key: 'acrRatingWelfare',
        label: 'Welfare & Inclusive Class Representation',
        desc: 'Checking in on student morale and group harmony'
    },
];
export const Step3Leadership = ({ formData, onChange, onNext, onBack, }) => {
    const [errorMsg, setErrorMsg] = useState('');
    const [hoveredStar, setHoveredStar] = useState(null);
    const isAnonymized = formData.isAnonymousLeadership;
    const validateLeadershipRatings = () => {
        // Verify all 8 metrics have at least 1 star
        const missingCr = CR_METRICS.find(m => formData[m.key] < 1);
        if (missingCr) {
            setErrorMsg(`Please rate the Class Rep on "${missingCr.label}".`);
            return false;
        }
        const missingAcr = ACR_METRICS.find(m => formData[m.key] < 1);
        if (missingAcr) {
            setErrorMsg(`Please rate the Assistant Class Rep on "${missingAcr.label}".`);
            return false;
        }
        setErrorMsg('');
        return true;
    };
    const handleContinue = (e) => {
        if (e)
            e.preventDefault();
        if (validateLeadershipRatings()) {
            onNext();
        }
    };
    const renderStarSelector = (fieldKey) => {
        const currentVal = formData[fieldKey] || 0;
        return (<div className="flex items-center gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
                const hoverKey = `${String(fieldKey)}-${star}`;
                const isHovered = hoveredStar?.startsWith(String(fieldKey)) &&
                    parseInt(hoveredStar.split('-')[1], 10) >= star;
                const isFilled = isHovered || (!hoveredStar?.startsWith(String(fieldKey)) && star <= currentVal);
                return (<button key={star} type="button" onClick={() => {
                        onChange(fieldKey, star);
                        if (errorMsg)
                            setErrorMsg('');
                    }} onMouseEnter={() => setHoveredStar(hoverKey)} onMouseLeave={() => setHoveredStar(null)} className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer focus:outline-none" title={`${star} star${star > 1 ? 's' : ''}`}>
              <Star className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${isFilled
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                        : 'text-gray-600 hover:text-gray-400'}`}/>
            </button>);
            })}
        <span className="text-xs font-mono font-bold text-gray-400 ml-2 w-8">
          {currentVal > 0 ? `${currentVal}/5` : 'â€”'}
        </span>
      </div>);
    };
    return (<div className="w-full max-w-3xl mx-auto py-2 sm:py-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-600/10 text-blue-400 border border-blue-600/30">
            STEP 03 / 04
          </span>
          <span className="text-xs font-mono text-gray-400">CLASS LEADERSHIP PERFORMANCE EVALUATION</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Transparent Leadership Review
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          Evaluate your Class Representative (CR) and Assistant Class Representative (ACR). Honest feedback drives genuine improvement in 200L.
        </p>
      </div>

      {/* Prominent Anonymity Toggle Card */}
      <div className={`rounded-2xl p-5 sm:p-6 mb-8 transition-all duration-300 border ${isAnonymized
            ? 'bg-cyber-elevated/90 border-blue-500 shadow-glow-blue'
            : 'glass-card border-white/10'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 transition-colors ${isAnonymized
            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
            : 'bg-cyber-surface border-white/10 text-gray-400'}`}>
              {isAnonymized ? <EyeOff className="w-6 h-6"/> : <Eye className="w-6 h-6"/>}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                  Submit Leadership Critique Anonymously
                </h3>
                {isAnonymized && (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-600/20 text-blue-300 border border-blue-500/40">
                    <Lock className="w-3 h-3"/> Stealth Mode
                  </span>)}
              </div>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed max-w-xl">
                {isAnonymized ? (<span className="text-blue-300 font-medium">
                    ðŸ›¡ï¸Verified Guarantee: Your name, matric number, and contact details are completely decoupled from your ratings and comments. Only pure feedback reaches the review pool.
                  </span>) : (<span>
                    When toggled ON, your ratings and comments will be stored completely detached from your personal student identity.
                  </span>)}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button type="button" role="switch" aria-checked={isAnonymized} onClick={() => onChange('isAnonymousLeadership', !isAnonymized)} className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 relative focus:outline-none ${isAnonymized ? 'bg-blue-600 shadow-glow-sm-blue' : 'bg-gray-700'}`}>
            <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center ${isAnonymized ? 'translate-x-6' : 'translate-x-0'}`}>
              {isAnonymized ? (<ShieldCheck className="w-3.5 h-3.5 text-blue-400"/>) : (<span className="w-2 h-2 rounded-full bg-gray-400"/>)}
            </div>
          </button>
        </div>
      </div>

      {errorMsg && (<div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5"/>
          <p className="text-xs text-red-300">{errorMsg}</p>
        </div>)}

      <form onSubmit={handleContinue} className="space-y-8">
        {/* Section A: Class Representative (CR) */}
        <div className="glass-card-elevated rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                LEADERSHIP METRIC 01
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                Class Representative (CR) Performance
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-blue-600/10 text-blue-400 border border-blue-600/30">
              4 Dimensions
            </span>
          </div>

          <div className="space-y-4">
            {CR_METRICS.map((metric) => (<div key={String(metric.key)} className="p-3.5 rounded-xl bg-cyber-surface/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/15 transition-colors">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-200">
                    {metric.label}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {metric.desc}
                  </p>
                </div>
                <div>
                  {renderStarSelector(metric.key)}
                </div>
              </div>))}
          </div>
        </div>

        {/* Section B: Assistant Class Representative (ACR) */}
        <div className="glass-card-elevated rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-300 font-bold">
                LEADERSHIP METRIC 02
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                Assistant Class Representative (ACR) Performance
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-blue-600/10 text-blue-300 border border-blue-600/30">
              4 Dimensions
            </span>
          </div>

          <div className="space-y-4">
            {ACR_METRICS.map((metric) => (<div key={String(metric.key)} className="p-3.5 rounded-xl bg-cyber-surface/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/15 transition-colors">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-200">
                    {metric.label}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {metric.desc}
                  </p>
                </div>
                <div>
                  {renderStarSelector(metric.key)}
                </div>
              </div>))}
          </div>
        </div>

        {/* Section C: Qualitative Feedback Textareas */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-400"/>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-200">
              Constructive Written Feedback
            </h3>
          </div>

          {/* Question 1: What went well? */}
          <div>
            <label htmlFor="leadershipWellDone" className="block text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <ThumbsUp className="w-3.5 h-3.5 text-blue-400"/>
              What did the Class Rep and Assistant Class Rep do exceptionally well in 100L?
            </label>
            <textarea id="leadershipWellDone" rows={3} value={formData.leadershipWellDone} onChange={(e) => onChange('leadershipWellDone', e.target.value)} placeholder="e.g. Promptly sharing test venue updates, advocating for us during timetable clashes, creating helpful revision groups..." className="w-full px-4 py-3 rounded-xl glass-input text-white text-xs sm:text-sm placeholder-gray-500 focus:border-blue-600"/>
          </div>

          {/* Question 2: What should improve? */}
          <div>
            <label htmlFor="leadershipCriticalAreas" className="block text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400"/>
              What critical areas or processes should leadership improve in 200L?
            </label>
            <textarea id="leadershipCriticalAreas" rows={3} value={formData.leadershipCriticalAreas} onChange={(e) => onChange('leadershipCriticalAreas', e.target.value)} placeholder="e.g. Setting up earlier tutorial schedules, maintaining a centralized Google Drive for slides, more frequent check-ins..." className="w-full px-4 py-3 rounded-xl glass-input text-white text-xs sm:text-sm placeholder-gray-500 focus:border-blue-600"/>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4"/>
            <span>Back to Step 2</span>
          </button>

          <button type="submit" className="flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-600-light text-gray-950 font-bold text-sm shadow-glow-blue transition-all duration-200 cursor-pointer active:scale-95">
            <span>Proceed to 200L Committees</span>
            <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      </form>
    </div>);
};
