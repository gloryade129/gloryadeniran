'use client';
import React, { useState, useMemo } from 'react';
import { Users, Copy, Check, MessageCircle, ExternalLink, BookOpen, Laptop, HeartHandshake, Palette, Trophy, Search, Share2, } from 'lucide-react';
import { CLASS_COMMITTEES } from '@/components/it-dept/types/survey';
import { sanitizePhoneNumber, groupCommitteeRosters } from './adminUtils';
export const CommitteeRoster = ({ profiles }) => {
    const [selectedCommitteeId, setSelectedCommitteeId] = useState('academic');
    const [copiedState, setCopiedState] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const committeeGroups = useMemo(() => {
        return groupCommitteeRosters(profiles);
    }, [profiles]);
    const activeGroup = useMemo(() => {
        return committeeGroups.find(g => g.committeeId === selectedCommitteeId) || committeeGroups[0];
    }, [committeeGroups, selectedCommitteeId]);
    const filteredMembers = useMemo(() => {
        if (!activeGroup)
            return [];
        if (!searchQuery.trim())
            return activeGroup.members;
        const q = searchQuery.toLowerCase();
        return activeGroup.members.filter(m => m.fullName.toLowerCase().includes(q) ||
            m.matricNo.toLowerCase().includes(q) ||
            m.techTrack.toLowerCase().includes(q));
    }, [activeGroup, searchQuery]);
    // Copy Comma-Separated WhatsApp Phone Numbers
    const handleCopyNumbers = async () => {
        if (!activeGroup || activeGroup.members.length === 0)
            return;
        const numbers = activeGroup.members
            .map(m => sanitizePhoneNumber(m.phone).international)
            .filter(Boolean)
            .join(', ');
        try {
            await navigator.clipboard.writeText(numbers);
            setCopiedState('numbers');
            setTimeout(() => setCopiedState(null), 2500);
        }
        catch (e) {
            console.error('Failed to copy to clipboard:', e);
        }
    };
    // Copy Formatted Student Name & Phone List
    const handleCopyMemberList = async () => {
        if (!activeGroup || activeGroup.members.length === 0)
            return;
        const lines = activeGroup.members.map((m, idx) => {
            const phone = sanitizePhoneNumber(m.phone).international;
            return `${idx + 1}. ${m.fullName} (${m.matricNo}) - ${phone} [${m.techTrack}]`;
        });
        const text = `ðŸ“‹ ${activeGroup.committeeName} â€” Official Roster (2025â€“2029 Set)\n\n${lines.join('\n')}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedState('list');
            setTimeout(() => setCopiedState(null), 2500);
        }
        catch (e) {
            console.error('Failed to copy roster list:', e);
        }
    };
    const getCommitteeIcon = (id) => {
        switch (id) {
            case 'academic':
                return <BookOpen className="w-4 h-4"/>;
            case 'tech-projects':
                return <Laptop className="w-4 h-4"/>;
            case 'welfare-support':
                return <HeartHandshake className="w-4 h-4"/>;
            case 'media-publicity':
                return <Palette className="w-4 h-4"/>;
            case 'sports-socials':
                return <Trophy className="w-4 h-4"/>;
            default:
                return <Users className="w-4 h-4"/>;
        }
    };
    return (<div className="space-y-6 animate-fade-in">
      {/* Committee Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {CLASS_COMMITTEES.map(c => {
            const group = committeeGroups.find(g => g.committeeId === c.id);
            const count = group ? group.members.length : 0;
            const isSelected = selectedCommitteeId === c.id;
            return (<button key={c.id} onClick={() => {
                    setSelectedCommitteeId(c.id);
                    setSearchQuery('');
                }} className={`p-3.5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between ${isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-glow-sm-blue'
                    : 'bg-cyber-surface/70 hover:bg-cyber-surface border-white/5 text-gray-300 hover:text-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${isSelected
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-white/5 border-white/10 text-gray-400'}`}>
                  {getCommitteeIcon(c.id)}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${isSelected
                    ? 'bg-blue-600/20 text-blue-400 border-blue-600/40'
                    : 'bg-white/5 text-gray-400 border-white/10'}`}>
                  {count}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold font-mono block line-clamp-1">
                  {c.name.replace(' Committee', '').replace(' Team', '')}
                </span>
                <span className="text-[10px] text-gray-400 font-sans block line-clamp-1 mt-0.5">
                  {c.desc}
                </span>
              </div>
            </button>);
        })}
      </div>

      {/* Selected Committee Header & 1-Click Operations */}
      {activeGroup && (<div className="glass-card-elevated rounded-2xl p-5 border border-white/10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-mono">
                  {activeGroup.committeeName}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600/15 border border-blue-600/30 text-blue-400 text-xs font-mono font-semibold">
                  {activeGroup.members.length} Volunteers
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-1">
                Direct WhatsApp contact broadcast & roster management for the 200L transition committee.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* 1-Click Copy WhatsApp Numbers */}
              <button type="button" disabled={activeGroup.members.length === 0} onClick={handleCopyNumbers} className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${copiedState === 'numbers'
                ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-glow-sm-blue'
                : 'bg-gradient-to-r from-cyber-emerald to-emerald-500 hover:from-cyber-emerald-light hover:to-emerald-400 text-cyber-dark border-transparent shadow-glow-sm-blue'}`}>
                {copiedState === 'numbers' ? (<>
                    <Check className="w-4 h-4"/>
                    <span>âœ“ Copied {activeGroup.members.length} WhatsApp Numbers!</span>
                  </>) : (<>
                    <Copy className="w-4 h-4"/>
                    <span>Copy WhatsApp Numbers ({activeGroup.members.length})</span>
                  </>)}
              </button>

              {/* Secondary: Copy Formatted Member List */}
              <button type="button" disabled={activeGroup.members.length === 0} onClick={handleCopyMemberList} className={`px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 border transition-all duration-200 bg-cyber-surface hover:bg-cyber-elevated disabled:opacity-30 disabled:cursor-not-allowed ${copiedState === 'list'
                ? 'border-blue-500 text-blue-300'
                : 'border-white/10 text-gray-300 hover:text-white'}`}>
                {copiedState === 'list' ? (<>
                    <Check className="w-3.5 h-3.5 text-blue-300"/>
                    <span className="text-blue-300">List Copied!</span>
                  </>) : (<>
                    <Share2 className="w-3.5 h-3.5"/>
                    <span>Copy Full Roster</span>
                  </>)}
              </button>
            </div>
          </div>

          {/* Search within current committee */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search volunteer by name, matric, or track..." className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"/>
            </div>
            <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
              Showing {filteredMembers.length} of {activeGroup.members.length}
            </span>
          </div>

          {/* Members Grid */}
          {filteredMembers.length === 0 ? (<div className="p-8 rounded-xl bg-cyber-surface/40 border border-white/5 text-center text-xs font-mono text-gray-400">
              {searchQuery
                    ? 'No volunteers matched the search query.'
                    : 'No students have volunteered for this committee yet.'}
            </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMembers.map(member => {
                    const sanitized = sanitizePhoneNumber(member.phone);
                    const waNumber = sanitized.international.replace('+', '');
                    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${member.fullName}, this is the 200L IT Class Leadership reaching out regarding the ${activeGroup.committeeName}! `)}`;
                    return (<div key={member.matricNo} className="p-4 rounded-xl bg-cyber-surface/60 border border-white/5 hover:border-blue-600/30 transition-all duration-150 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white font-mono text-xs truncate">
                          {member.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-300 text-[10px] font-mono shrink-0">
                          {member.matricNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-1">
                        Track: <span className="text-gray-200">{member.techTrack || 'General'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs font-mono text-gray-300">
                        {sanitized.international || member.phone}
                      </span>
                      <a href={waUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-600/30 text-emerald-400 text-[11px] font-mono flex items-center gap-1.5 transition-colors" title="Chat with student on WhatsApp">
                        <MessageCircle className="w-3 h-3"/>
                        <span>Chat</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60"/>
                      </a>
                    </div>
                  </div>);
                })}
            </div>)}
        </div>)}
    </div>);
};
export default CommitteeRoster;
