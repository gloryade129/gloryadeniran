'use client';
import React, { useState, useMemo } from 'react';
import { Calendar, Cake, MessageCircle, ExternalLink, Search, Filter, Sparkles, } from 'lucide-react';
import { MONTH_NAMES } from '@/components/it-dept/types/survey';
import { calculateUpcomingBirthdays, sanitizePhoneNumber } from './adminUtils';
export const BirthdayCalendar = ({ profiles, referenceDate, }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('all');
    // Compute upcoming birthdays chronologically
    const upcomingBirthdays = useMemo(() => {
        return calculateUpcomingBirthdays(profiles, referenceDate);
    }, [profiles, referenceDate]);
    // Today's celebrants
    const todayCelebrants = useMemo(() => {
        return upcomingBirthdays.filter(b => b.isToday || b.daysRemaining === 0);
    }, [upcomingBirthdays]);
    // This week's celebrants (1-7 days)
    const thisWeekCelebrants = useMemo(() => {
        return upcomingBirthdays.filter(b => b.daysRemaining > 0 && b.daysRemaining <= 7);
    }, [upcomingBirthdays]);
    // Filtered entries for main list
    const filteredEntries = useMemo(() => {
        return upcomingBirthdays.filter(item => {
            // Month filter
            if (selectedMonth !== 'all') {
                const monthNum = parseInt(selectedMonth, 10);
                if (item.birthMonth !== monthNum)
                    return false;
            }
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (item.fullName.toLowerCase().includes(q) ||
                    item.matricNo.toLowerCase().includes(q) ||
                    item.monthName.toLowerCase().includes(q));
            }
            return true;
        });
    }, [upcomingBirthdays, selectedMonth, searchQuery]);
    const getGreetingUrl = (entry) => {
        const sanitized = sanitizePhoneNumber(entry.phone);
        const waNumber = sanitized.international.replace('+', '');
        const message = `Happy Birthday ${entry.fullName}! Wishing you a phenomenal, impactful, and academically prosperous 200L from the IT Department (2025-2029 Set) Leadership and Welfare Team!`;
        return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    };
    return (<div className="space-y-6 animate-fade-in">
      {/* 1. "Today's Celebrants" Banner (if any) */}
      {todayCelebrants.length > 0 && (<div className="relative glass-card-elevated rounded-3xl p-6 sm:p-7 border border-blue-600/40 overflow-hidden shadow-glow-blue">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"/>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 text-2xl shadow-glow-sm-blue">
                <Calendar className="w-7 h-7 text-blue-400"/>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono text-xs font-bold uppercase tracking-wider">
                    TODAY'S BIRTHDAY CELEBRANT!
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">
                  {todayCelebrants.map(c => c.fullName).join(' & ')}
                </h3>
                <p className="text-xs text-blue-300 font-sans mt-0.5">
                  Today is an official IT Class Celebrant day! Send leadership congratulations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {todayCelebrants.map(c => (<a key={c.matricNo} href={getGreetingUrl(c)} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs flex items-center gap-2 shadow-glow-sm-blue transition-all">
                  <MessageCircle className="w-4 h-4"/>
                  <span>Send Birthday Wishes ({c.fullName.split(' ')[0]})</span>
                  <ExternalLink className="w-3 h-3 opacity-60"/>
                </a>))}
            </div>
          </div>
        </div>)}

      {/* 2. "Upcoming This Week" Callout (if any) */}
      {thisWeekCelebrants.length > 0 && (<div className="glass-card-elevated rounded-2xl p-5 border border-blue-600/30">
          <div className="flex items-center gap-2 text-blue-300 font-mono text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-4 h-4"/>
            <span>Upcoming Celebrants This Week ({thisWeekCelebrants.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {thisWeekCelebrants.map(c => (<div key={c.matricNo} className="p-3.5 rounded-xl bg-cyber-surface/70 border border-blue-600/20 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs font-mono block">
                    {c.fullName}
                  </span>
                  <span className="text-[11px] text-blue-300 font-mono">
                    {c.monthName} {c.birthDay} - in {c.daysRemaining} day
                    {c.daysRemaining === 1 ? '' : 's'}
                  </span>
                </div>
                <a href={getGreetingUrl(c)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 transition-colors" title="Prepare WhatsApp greeting">
                  <MessageCircle className="w-3.5 h-3.5"/>
                </a>
              </div>))}
          </div>
        </div>)}

      {/* 3. Search & Month Filters */}
      <div className="glass-card-elevated rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search celebrant by name or matric..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"/>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-3 py-2 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500">
              <option value="all">All Months</option>
              {MONTH_NAMES.map((name, index) => (<option key={name} value={String(index + 1)}>
                  {name}
                </option>))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Chronological Upcoming Birthdays Grid */}
      {filteredEntries.length === 0 ? (<div className="glass-card-elevated rounded-2xl p-10 text-center border border-white/10 space-y-2">
          <Cake className="w-10 h-10 mx-auto text-gray-600"/>
          <h3 className="text-base font-bold text-white font-mono">No Celebrants Found</h3>
          <p className="text-xs text-gray-400 font-sans">
            No student birthdays match the selected criteria or month.
          </p>
        </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredEntries.map(entry => {
                const isToday = entry.isToday || entry.daysRemaining === 0;
                const isSoon = entry.daysRemaining > 0 && entry.daysRemaining <= 14;
                return (<div key={entry.matricNo} className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${isToday
                        ? 'bg-blue-600/10 border-blue-600/40 shadow-glow-sm-blue'
                        : isSoon
                            ? 'bg-cyber-surface/80 border-blue-600/30 hover:border-blue-500/50'
                            : 'bg-cyber-surface/60 border-white/5 hover:border-white/15'}`}>
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-white font-mono text-sm truncate">
                      {entry.fullName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${isToday
                        ? 'bg-blue-600 text-white border-blue-500'
                        : isSoon
                            ? 'bg-blue-600/20 text-blue-300 border-blue-600/40'
                            : 'bg-white/5 text-gray-400 border-white/10'}`}>
                      {isToday
                        ? 'TODAY!'
                        : entry.daysRemaining === 1
                            ? 'Tomorrow'
                            : `In ${entry.daysRemaining} days`}
                    </span>
                  </div>

                  <div className="text-xs text-gray-300 font-mono flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400"/>
                    <span>
                      {entry.monthName} {entry.birthDay}
                    </span>
                    <span className="text-gray-500">-</span>
                    <span className="text-gray-400">{entry.matricNo}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[11px] text-gray-400 font-mono">
                    {entry.phone}
                  </span>
                  <a href={getGreetingUrl(entry)} target="_blank" rel="noopener noreferrer" className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors border ${isToday
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30'
                        : 'bg-cyber-surface border-white/10 text-gray-300 hover:text-white hover:border-blue-600/40'}`}>
                    <MessageCircle className="w-3 h-3"/>
                    <span>Wish on WhatsApp</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60"/>
                  </a>
                </div>
              </div>);
            })}
        </div>)}
    </div>);
};
export default BirthdayCalendar;
