'use client';
import React, { useState } from 'react';
import { Star, FileText, Clock, Users, FlaskConical, Megaphone, MapPin, Zap, ArrowRight, ArrowLeft, Flame, AlertTriangle, Plus, X, Check, Sparkles, AlertCircle } from 'lucide-react';
const POPULAR_100L_COURSES = [
    'CSC 101 (Intro to CS)',
    'CSC 102 (Intro to Problem Solving)',
    'MTH 101 (Elementary Mathematics I)',
    'MTH 102 (Elementary Mathematics II)',
    'PHY 101 (General Physics I)',
    'PHY 102 (General Physics II)',
    'CHM 101 (General Chemistry I)',
    'GST 111 (Communication in English)',
    'GST 112 (Nigerian Peoples & Culture)',
    'IFT 101 (Intro to Information Technology)'
];
const CHALLENGES_OPTIONS = [
    { id: 'materials', label: 'Late or Missing Lecture Slides / Notes', icon: FileText },
    { id: 'clashes', label: 'Clashing Timetables & Abrupt Test Dates', icon: Clock },
    { id: 'groups', label: 'Unequal Contribution in Group Projects', icon: Users },
    { id: 'labs', label: 'Insufficient Practical Computer Lab Time', icon: FlaskConical },
    { id: 'comms', label: 'Delayed Departmental Notice Broadcasts', icon: Megaphone },
    { id: 'venues', label: 'Overcrowded Venues & Classroom Logistics', icon: MapPin },
    { id: 'power', label: 'Campus Power & Internet Connectivity Issues', icon: Zap },
];
const RATING_DESCRIPTIONS = {
    1: { label: 'Brutal / Overwhelming', color: 'text-red-400', desc: 'Difficult adjustment, major academic friction' },
    2: { label: 'Tough / Rocky', color: 'text-amber-400', desc: 'Manageable with struggle, several painful hurdles' },
    3: { label: 'Average / Fair', color: 'text-yellow-400', desc: 'Standard transition year with balanced ups and downs' },
    4: { label: 'Solid / Rewarding', color: 'text-blue-300', desc: 'Great growth, acquired strong foundational knowledge' },
    5: { label: 'Phenomenal / Legendary', color: 'text-blue-400', desc: 'Exceptional academic experience and high achievement' },
};
export const Step2Retrospective = ({ formData, onChange, onNext, onBack, }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const [customFav, setCustomFav] = useState('');
    const [customTough, setCustomTough] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const toggleCourse = (course, type) => {
        if (type === 'favorite') {
            const exists = formData.favoriteCourses.includes(course);
            const updated = exists
                ? formData.favoriteCourses.filter(c => c !== course)
                : [...formData.favoriteCourses, course];
            onChange('favoriteCourses', updated);
        }
        else {
            const exists = formData.toughestCourses.includes(course);
            const updated = exists
                ? formData.toughestCourses.filter(c => c !== course)
                : [...formData.toughestCourses, course];
            onChange('toughestCourses', updated);
        }
    };
    const addCustomCourse = (type) => {
        const val = (type === 'favorite' ? customFav : customTough).trim();
        if (!val)
            return;
        if (type === 'favorite') {
            if (!formData.favoriteCourses.includes(val)) {
                onChange('favoriteCourses', [...formData.favoriteCourses, val]);
            }
            setCustomFav('');
        }
        else {
            if (!formData.toughestCourses.includes(val)) {
                onChange('toughestCourses', [...formData.toughestCourses, val]);
            }
            setCustomTough('');
        }
    };
    const toggleChallenge = (challengeText) => {
        const exists = formData.challenges100L.includes(challengeText);
        const updated = exists
            ? formData.challenges100L.filter(c => c !== challengeText)
            : [...formData.challenges100L, challengeText];
        onChange('challenges100L', updated);
    };
    const handleContinue = (e) => {
        if (e)
            e.preventDefault();
        if (formData.academicRating100L < 1) {
            setErrorMsg('Please select an overall 100L rating (1 to 5 stars).');
            return;
        }
        setErrorMsg('');
        onNext();
    };
    const currentDisplayRating = hoverRating || formData.academicRating100L;
    return (<div className="w-full max-w-3xl mx-auto py-2 sm:py-6 animate-fade-in">
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-600/10 text-blue-400 border border-blue-600/30">
            STEP 02 / 04
          </span>
          <span className="text-xs font-mono text-gray-400">100-LEVEL ACADEMIC RETROSPECTIVE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          How was your 100-Level journey?
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          Your authentic feedback helps the academic committee optimize tutorial tracks and course guides for incoming freshmen and our 200L session.
        </p>
      </div>

      {errorMsg && (<div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5"/>
          <p className="text-xs text-red-300">{errorMsg}</p>
        </div>)}

      <form onSubmit={handleContinue} className="space-y-6">
        {/* Star Rating Card */}
        <div className="glass-card-elevated rounded-2xl p-6 border border-white/10 text-center relative overflow-hidden">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"/>
          
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300 block mb-2">
            Overall 100L Academic &amp; Social Experience <span className="text-blue-400">*</span>
          </span>
          <p className="text-xs text-gray-400 mb-6">
            Rate your overall experience across academics, lecturer engagement, and campus adaptation.
          </p>

          {/* Stars Container */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
            {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= currentDisplayRating;
            return (<button key={star} type="button" onClick={() => {
                    onChange('academicRating100L', star);
                    if (errorMsg)
                        setErrorMsg('');
                }} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-1.5 sm:p-2.5 rounded-xl transition-all duration-150 cursor-pointer hover:scale-110 active:scale-95 group focus:outline-none" aria-label={`Rate ${star} star`}>
                  <Star className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'text-gray-600 hover:text-gray-400'}`}/>
                </button>);
        })}
          </div>

          {/* Contextual Description */}
          <div className="h-10 flex flex-col items-center justify-center">
            {currentDisplayRating > 0 ? (<div className="animate-fade-in text-center">
                <span className={`text-sm font-bold font-mono ${RATING_DESCRIPTIONS[currentDisplayRating].color}`}>
                  {currentDisplayRating} Star{currentDisplayRating > 1 ? 's' : ''}: {RATING_DESCRIPTIONS[currentDisplayRating].label}
                </span>
                <p className="text-xs text-gray-400">
                  {RATING_DESCRIPTIONS[currentDisplayRating].desc}
                </p>
              </div>) : (<span className="text-xs font-mono text-gray-500">
                Click a star to record your rating
              </span>)}
          </div>
        </div>

        {/* Favorite & Toughest Courses Two-Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Favorite Courses */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-400"/>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-200">
                Favorite / Most Rewarding Course(s)
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Which courses were genuinely engaging or well-taught?
            </p>

            {/* Badges Grid */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {POPULAR_100L_COURSES.map((course) => {
            const isSelected = formData.favoriteCourses.includes(course);
            const code = course.split(' ')[0] + ' ' + course.split(' ')[1];
            return (<button key={course} type="button" onClick={() => toggleCourse(course, 'favorite')} className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${isSelected
                    ? 'bg-blue-600/20 border-blue-600 text-blue-300 shadow-glow-sm-emerald font-semibold'
                    : 'bg-cyber-surface border-white/10 text-gray-300 hover:border-white/30'}`} title={course}>
                    {isSelected && <Check className="w-3 h-3"/>}
                    <span>{code}</span>
                  </button>);
        })}
            </div>

            {/* Custom Course Adder */}
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={customFav} onChange={(e) => setCustomFav(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCustomCourse('favorite');
            }
        }} placeholder="Add other course..." className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs text-white placeholder-gray-500"/>
              <button type="button" onClick={() => addCustomCourse('favorite')} className="px-2.5 py-1.5 rounded-lg bg-cyber-surface hover:bg-cyber-elevated border border-white/20 text-xs font-mono text-gray-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5"/>
                <span>Add</span>
              </button>
            </div>

            {/* Custom items display */}
            {formData.favoriteCourses.filter(c => !POPULAR_100L_COURSES.includes(c)).length > 0 && (<div className="flex flex-wrap gap-1 mt-2">
                {formData.favoriteCourses.filter(c => !POPULAR_100L_COURSES.includes(c)).map((item) => (<span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 text-xs border border-blue-600/30">
                    {item}
                    <button type="button" onClick={() => toggleCourse(item, 'favorite')}>
                      <X className="w-3 h-3 hover:text-white"/>
                    </button>
                  </span>))}
              </div>)}
          </div>

          {/* Toughest Courses */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-amber-400"/>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-200">
                Toughest / Most Challenging Course(s)
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Which courses required the most grueling effort?
            </p>

            {/* Badges Grid */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {POPULAR_100L_COURSES.map((course) => {
            const isSelected = formData.toughestCourses.includes(course);
            const code = course.split(' ')[0] + ' ' + course.split(' ')[1];
            return (<button key={course} type="button" onClick={() => toggleCourse(course, 'toughest')} className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-semibold'
                    : 'bg-cyber-surface border-white/10 text-gray-300 hover:border-white/30'}`} title={course}>
                    {isSelected && <Check className="w-3 h-3"/>}
                    <span>{code}</span>
                  </button>);
        })}
            </div>

            {/* Custom Course Adder */}
            <div className="flex items-center gap-2 mt-2">
              <input type="text" value={customTough} onChange={(e) => setCustomTough(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCustomCourse('toughest');
            }
        }} placeholder="Add other course..." className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs text-white placeholder-gray-500"/>
              <button type="button" onClick={() => addCustomCourse('toughest')} className="px-2.5 py-1.5 rounded-lg bg-cyber-surface hover:bg-cyber-elevated border border-white/20 text-xs font-mono text-gray-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5"/>
                <span>Add</span>
              </button>
            </div>

            {/* Custom items display */}
            {formData.toughestCourses.filter(c => !POPULAR_100L_COURSES.includes(c)).length > 0 && (<div className="flex flex-wrap gap-1 mt-2">
                {formData.toughestCourses.filter(c => !POPULAR_100L_COURSES.includes(c)).map((item) => (<span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-xs border border-amber-500/30">
                    {item}
                    <button type="button" onClick={() => toggleCourse(item, 'toughest')}>
                      <X className="w-3 h-3 hover:text-white"/>
                    </button>
                  </span>))}
              </div>)}
          </div>
        </div>

        {/* Major Challenges Faced */}
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-blue-300"/>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-200">
              Major Challenges Faced in 100L (Multi-Select)
            </h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Select all friction points that affected your academic performance or student wellbeing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CHALLENGES_OPTIONS.map((item) => {
            const Icon = item.icon;
            const isChecked = formData.challenges100L.includes(item.label);
            return (<button key={item.id} type="button" onClick={() => toggleChallenge(item.label)} className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all duration-150 cursor-pointer ${isChecked
                    ? 'bg-blue-600/20 border-blue-600 text-white shadow-glow-sm-blue'
                    : 'bg-cyber-surface/60 border-white/5 text-gray-300 hover:bg-cyber-surface hover:border-white/20'}`}>
                  <Icon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5"/>
                  <div className="flex-1">
                    <p className="text-xs font-medium leading-snug">{item.label}</p>
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/30'}`}>
                    {isChecked && <Check className="w-3 h-3"/>}
                  </div>
                </button>);
        })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4"/>
            <span>Back to Step 1</span>
          </button>

          <button type="submit" className="flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-600-light text-gray-950 font-bold text-sm shadow-glow-blue transition-all duration-200 cursor-pointer active:scale-95">
            <span>Proceed to Leadership Review</span>
            <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      </form>
    </div>);
};
