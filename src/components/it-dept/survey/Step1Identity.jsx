'use client';
import React, { useState } from 'react';
import { User, CreditCard, Phone, Mail, Calendar, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Code, Server, Cpu, Shield, Layout, Cloud, Smartphone, Compass } from 'lucide-react';
import { TECH_TRACKS, MONTH_NAMES } from '@/components/it-dept/types/survey';
const ICON_MAP = {
    Code,
    Server,
    Cpu,
    Shield,
    Layout,
    Cloud,
    Smartphone,
    Compass,
};
export const Step1Identity = ({ formData, onChange, onNext, onBack, }) => {
    const [touched, setTouched] = useState({});
    const [errorMsg, setErrorMsg] = useState('');
    const matricRegex = /^[A-Z0-9/]{6,16}$/;
    const isMatricValid = matricRegex.test(formData.matricNo.trim().toUpperCase());
    const cleanPhone = formData.phone.replace(/[\s-]/g, '');
    const isPhoneValid = /^(?:\+234|0)[789][01]\d{8}$/.test(cleanPhone) || cleanPhone.length >= 10;
    const isNameValid = formData.fullName.trim().length >= 3;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    const isBirthdayValid = formData.birthDay >= 1 && formData.birthDay <= 31 && formData.birthMonth >= 1 && formData.birthMonth <= 12;
    const isTechTrackValid = Boolean(formData.techTrack);
    const validateStep = () => {
        if (!isNameValid) {
            setErrorMsg('Please enter your full official name (at least 3 characters).');
            return false;
        }
        if (!isMatricValid) {
            setErrorMsg('Please enter a valid Matriculation Number (e.g., IT/2024/042 or 24/52HA042).');
            return false;
        }
        if (!isEmailValid) {
            setErrorMsg('Please enter a valid email address. This is required for confirmation emails.');
            return false;
        }
        if (!isPhoneValid) {
            setErrorMsg('Please enter a valid WhatsApp phone number (e.g., 08012345678 or +234...).');
            return false;
        }
        if (!isBirthdayValid) {
            setErrorMsg('Please select your birth day and month.');
            return false;
        }
        if (!isTechTrackValid) {
            setErrorMsg('Please select your preferred Tech Track / Career Interest.');
            return false;
        }
        setErrorMsg('');
        return true;
    };
    const handleContinue = (e) => {
        if (e)
            e.preventDefault();
        setTouched({
            fullName: true,
            matricNo: true,
            email: true,
            phone: true,
            birthDay: true,
            techTrack: true,
        });
        if (validateStep()) {
            onNext();
        }
    };
    const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);
    return (<div className="w-full max-w-3xl mx-auto py-2 sm:py-6 animate-fade-in">
      {/* Header Info */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-600/10 text-blue-400 border border-blue-600/30">
            STEP 01 / 04
          </span>
          <span className="text-xs font-mono text-gray-400">STUDENT IDENTITY &amp; TECH PROFILE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Who is leveling up today?
        </h2>
        <p className="text-sm text-gray-300 mt-1">
          Your details will be used to generate your official 200L Scholar Pass and update the class directory.
        </p>
      </div>

      {errorMsg && (<div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-400 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold">Action Required</p>
            <p className="text-xs text-red-300 mt-0.5">{errorMsg}</p>
          </div>
        </div>)}

      <form onSubmit={handleContinue} className="space-y-6">
        {/* Full Name */}
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <label htmlFor="fullName" className="block text-xs font-mono font-bold uppercase tracking-wider text-gray-300 mb-2">
            Full Name (Surname First or Official Order) <span className="text-blue-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <User className="w-4 h-4"/>
            </div>
            <input id="fullName" type="text" required value={formData.fullName} onChange={(e) => {
            onChange('fullName', e.target.value);
            if (errorMsg)
                setErrorMsg('');
        }} onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))} placeholder="e.g. ADEYEMI Chukwuebuka David" className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-500"/>
          </div>
          {touched.fullName && !isNameValid && (<p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5"/> Minimum 3 characters required.
            </p>)}
        </div>

        {/* Matriculation & Phone Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Matric Number */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="matricNo" className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
                Matriculation Number <span className="text-blue-400">*</span>
              </label>
              {formData.matricNo.trim() && (isMatricValid ? (<span className="flex items-center gap-1 text-[11px] font-mono text-blue-400">
                    <CheckCircle2 className="w-3.5 h-3.5"/> Valid Format
                  </span>) : (<span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5"/> e.g. IT/2024/042
                  </span>))}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <CreditCard className="w-4 h-4"/>
              </div>
              <input id="matricNo" type="text" required value={formData.matricNo} onChange={(e) => {
            onChange('matricNo', e.target.value.toUpperCase().replace(/\s/g, ''));
            if (errorMsg)
                setErrorMsg('');
        }} onBlur={() => setTouched(prev => ({ ...prev, matricNo: true }))} placeholder="e.g. IT/2024/042" className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-white text-sm font-mono tracking-wider uppercase placeholder-gray-500 focus:border-blue-600"/>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Must match your official university matric format.
            </p>
          </div>

          {/* WhatsApp Phone */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="phone" className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
                WhatsApp Phone Number <span className="text-blue-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-blue-300">For Broadcasts</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Phone className="w-4 h-4"/>
              </div>
              <input id="phone" type="tel" inputMode="tel" required value={formData.phone} onChange={(e) => {
            onChange('phone', e.target.value);
            if (errorMsg)
                setErrorMsg('');
        }} onBlur={() => setTouched(prev => ({ ...prev, phone: true }))} placeholder="e.g. 08012345678 or +234..." className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:border-blue-600"/>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Nigerian numbers (08..., 09..., 07...) or full international format.
            </p>
          </div>
        </div>

        {/* Email Address */}
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="email" className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
              Email Address <span className="text-blue-400">*</span>
            </label>
            {formData.email && (isEmailValid ? (<span className="flex items-center gap-1 text-[11px] font-mono text-blue-400">
                  <CheckCircle2 className="w-3.5 h-3.5"/> Valid
                </span>) : (<span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5"/> Check format
                </span>))}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4"/>
            </div>
            <input id="email" type="email" inputMode="email" required value={formData.email} onChange={(e) => {
            onChange('email', e.target.value.trim().toLowerCase());
            if (errorMsg)
                setErrorMsg('');
        }} onBlur={() => setTouched(prev => ({ ...prev, email: true }))} placeholder="e.g. yourname@gmail.com" className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-white text-sm placeholder-gray-500 focus:border-blue-500"/>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            You will receive a confirmation email and important class updates at this address.
          </p>
        </div>

        {/* Birthday Picker */}
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400"/>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
              Birthday (Day &amp; Month) <span className="text-blue-400">*</span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Used exclusively for Welfare Committee birthday shouts &amp; class celebrations. Year omitted for privacy.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="birthDay" className="sr-only">Day</label>
              <select id="birthDay" value={formData.birthDay} onChange={(e) => onChange('birthDay', parseInt(e.target.value, 10))} className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm bg-cyber-surface focus:border-blue-600">
                {daysArray.map((day) => (<option key={day} value={day} className="bg-cyber-surface text-white">
                    Day {day}
                  </option>))}
              </select>
            </div>
            <div>
              <label htmlFor="birthMonth" className="sr-only">Month</label>
              <select id="birthMonth" value={formData.birthMonth} onChange={(e) => onChange('birthMonth', parseInt(e.target.value, 10))} className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm bg-cyber-surface focus:border-blue-600">
                {MONTH_NAMES.map((name, idx) => (<option key={name} value={idx + 1} className="bg-cyber-surface text-white">
                    {name}
                  </option>))}
              </select>
            </div>
          </div>
        </div>

        {/* Tech Track / Career Interest Cards */}
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
              Primary Tech Track / Career Interest <span className="text-blue-400">*</span>
            </span>
            <span className="text-xs text-blue-300 font-mono">Select One</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            This will be printed on your official 200L Scholar Pass and group you with relevant peers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TECH_TRACKS.map((track) => {
            const Icon = ICON_MAP[track.icon] || Code;
            const isSelected = formData.techTrack === track.name;
            return (<button key={track.id} type="button" onClick={() => {
                    onChange('techTrack', track.name);
                    if (errorMsg)
                        setErrorMsg('');
                }} className={`p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between ${isSelected
                    ? 'bg-blue-600/15 border-blue-600 shadow-glow-sm-blue ring-1 ring-blue-500'
                    : 'bg-cyber-surface/60 border-white/5 hover:border-white/20 hover:bg-cyber-surface'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-gray-950 font-bold' : 'bg-cyber-surface text-blue-300 border border-white/10'}`}>
                      <Icon className="w-4 h-4"/>
                    </div>
                    {isSelected && (<CheckCircle2 className="w-4 h-4 text-blue-400 animate-fade-in"/>)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white mb-1">
                      {track.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 line-clamp-2">
                      {track.desc}
                    </p>
                  </div>
                </button>);
        })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button type="button" onClick={onBack} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4"/>
            <span>Back to Intro</span>
          </button>

          <button type="submit" className="flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-600-light text-gray-950 font-bold text-sm shadow-glow-blue transition-all duration-200 cursor-pointer active:scale-95">
            <span>Continue to 100L Review</span>
            <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
      </form>
    </div>);
};
