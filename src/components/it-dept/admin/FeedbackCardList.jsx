'use client';
import React, { useState, useMemo } from 'react';
import { MessageSquare, Search, Filter, Star, ThumbsUp, AlertCircle, EyeOff, UserCheck, Calendar, ArrowUpDown, } from 'lucide-react';
export const FeedbackCardList = ({ feedbacks, profiles = [], }) => {
    const [anonymityFilter, setAnonymityFilter] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    // Create a profile lookup map for attributed reviews if studentId matches
    const profileMap = useMemo(() => {
        const map = new Map();
        profiles.forEach(p => {
            if (p.id)
                map.set(p.id, p);
        });
        return map;
    }, [profiles]);
    // Counts for filter pills
    const totalCount = feedbacks.length;
    const anonCount = useMemo(() => feedbacks.filter(f => f.isAnonymous || !f.studentId).length, [feedbacks]);
    const attributedCount = totalCount - anonCount;
    // Filtered & Sorted Feedbacks
    const filteredFeedbacks = useMemo(() => {
        return feedbacks
            .filter(item => {
            const isAnon = item.isAnonymous || !item.studentId;
            // 1. Anonymity Filter
            if (anonymityFilter === 'anonymous' && !isAnon)
                return false;
            if (anonymityFilter === 'attributed' && isAnon)
                return false;
            // 2. Rating Tier Filter
            const avgRating = (item.crCommunication +
                item.crMaterials +
                item.crAvailability +
                item.crWelfare +
                item.acrCommunication +
                item.acrMaterials +
                item.acrAvailability +
                item.acrWelfare) /
                8;
            if (ratingFilter === '5' && avgRating < 4.8)
                return false;
            if (ratingFilter === '4' && (avgRating < 3.8 || avgRating >= 4.8))
                return false;
            if (ratingFilter === '3' && avgRating >= 3.8)
                return false;
            // 3. Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesWellDone = item.wellDone?.toLowerCase().includes(q);
                const matchesCritical = item.criticalAreas?.toLowerCase().includes(q);
                const matchesStudentName = !isAnon && item.studentName?.toLowerCase().includes(q);
                const matchesMatric = !isAnon && item.studentMatric?.toLowerCase().includes(q);
                if (!matchesWellDone && !matchesCritical && !matchesStudentName && !matchesMatric) {
                    return false;
                }
            }
            return true;
        })
            .sort((a, b) => {
            const scoreA = (a.crCommunication +
                a.crMaterials +
                a.crAvailability +
                a.crWelfare +
                a.acrCommunication +
                a.acrMaterials +
                a.acrAvailability +
                a.acrWelfare) /
                8;
            const scoreB = (b.crCommunication +
                b.crMaterials +
                b.crAvailability +
                b.crWelfare +
                b.acrCommunication +
                b.acrMaterials +
                b.acrAvailability +
                b.acrWelfare) /
                8;
            if (sortOrder === 'highest')
                return scoreB - scoreA;
            if (sortOrder === 'lowest')
                return scoreA - scoreB;
            if (sortOrder === 'oldest') {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
            }
            // Default newest
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    }, [feedbacks, anonymityFilter, ratingFilter, searchQuery, sortOrder]);
    const renderStars = (rating) => {
        return (<div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map(idx => (<Star key={idx} className={`w-3 h-3 ${idx <= Math.round(rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-600'}`}/>))}
      </div>);
    };
    return (<div className="space-y-6 animate-fade-in">
      {/* Top Controls: Search, Filters & Sorting */}
      <div className="glass-card-elevated rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4">
        {/* Search Bar & Sorter */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search feedback keywords, areas for improvement..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"/>
            {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white">
                âœ•
              </button>)}
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-blue-300 shrink-0"/>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="px-3 py-2 rounded-xl bg-cyber-surface border border-white/10 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>

        {/* Filter Badges & Anonymity Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          {/* Anonymity Filter Group */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3"/> Filter:
            </span>
            <button onClick={() => setAnonymityFilter('all')} className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors border ${anonymityFilter === 'all'
            ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
            : 'bg-cyber-surface/60 border-white/5 text-gray-400 hover:text-white'}`}>
              All ({totalCount})
            </button>
            <button onClick={() => setAnonymityFilter('anonymous')} className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors border flex items-center gap-1.5 ${anonymityFilter === 'anonymous'
            ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
            : 'bg-cyber-surface/60 border-white/5 text-gray-400 hover:text-white'}`}>
              <EyeOff className="w-3 h-3"/>
              <span>Anonymous ({anonCount})</span>
            </button>
            <button onClick={() => setAnonymityFilter('attributed')} className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors border flex items-center gap-1.5 ${anonymityFilter === 'attributed'
            ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-semibold'
            : 'bg-cyber-surface/60 border-white/5 text-gray-400 hover:text-white'}`}>
              <UserCheck className="w-3 h-3"/>
              <span>Attributed ({attributedCount})</span>
            </button>
          </div>

          {/* Rating Filter Group */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setRatingFilter('all')} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border ${ratingFilter === 'all'
            ? 'bg-white/10 border-white/30 text-white'
            : 'bg-cyber-surface/40 border-white/5 text-gray-500 hover:text-gray-300'}`}>
              All Stars
            </button>
            <button onClick={() => setRatingFilter('5')} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border ${ratingFilter === '5'
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            : 'bg-cyber-surface/40 border-white/5 text-gray-500 hover:text-gray-300'}`}>
              â˜… 5 Stars
            </button>
            <button onClick={() => setRatingFilter('4')} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border ${ratingFilter === '4'
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            : 'bg-cyber-surface/40 border-white/5 text-gray-500 hover:text-gray-300'}`}>
              â˜… 4+ Stars
            </button>
            <button onClick={() => setRatingFilter('3')} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border ${ratingFilter === '3'
            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            : 'bg-cyber-surface/40 border-white/5 text-gray-500 hover:text-gray-300'}`}>
              â˜… â‰¤ 3 Stars
            </button>
          </div>
        </div>
      </div>

      {/* Cards List or Empty State */}
      {filteredFeedbacks.length === 0 ? (<div className="glass-card-elevated rounded-2xl p-10 text-center border border-white/10 space-y-3">
          <MessageSquare className="w-10 h-10 mx-auto text-gray-600"/>
          <h3 className="text-base font-bold text-white font-mono">
            No Feedback Matches Criteria
          </h3>
          <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto">
            Try adjusting your search query, anonymity filter, or rating tier to display reviews.
          </p>
          <button onClick={() => {
                setSearchQuery('');
                setAnonymityFilter('all');
                setRatingFilter('all');
            }} className="px-4 py-2 rounded-xl bg-cyber-surface hover:bg-cyber-elevated border border-white/10 text-xs font-mono text-blue-300 transition-colors">
            Reset Filters
          </button>
        </div>) : (<div className="grid grid-cols-1 gap-5">
          {filteredFeedbacks.map((item, index) => {
                const isAnon = item.isAnonymous || !item.studentId;
                const linkedProfile = item.studentId ? profileMap.get(item.studentId) : undefined;
                const studentDisplayName = isAnon
                    ? 'ðŸ•¶ï¸Anonymous IT Scholar'
                    : item.studentName || linkedProfile?.fullName || 'Verified IT Scholar';
                const studentMatric = !isAnon
                    ? item.studentMatric || linkedProfile?.matricNo || ''
                    : '';
                const crAvg = (item.crCommunication +
                    item.crMaterials +
                    item.crAvailability +
                    item.crWelfare) /
                    4;
                const acrAvg = (item.acrCommunication +
                    item.acrMaterials +
                    item.acrAvailability +
                    item.acrWelfare) /
                    4;
                const overallComposite = ((crAvg + acrAvg) / 2).toFixed(2);
                return (<div key={item.id || `feedback-${index}`} className="glass-card-elevated rounded-2xl p-5 sm:p-6 border border-white/10 hover:border-blue-600/30 transition-all duration-200 space-y-4">
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-mono text-sm font-bold ${isAnon
                        ? 'bg-blue-600/20 border-blue-600/40 text-blue-300'
                        : 'bg-blue-600/20 border-blue-600/40 text-blue-400'}`}>
                      {isAnon ? <EyeOff className="w-5 h-5"/> : <UserCheck className="w-5 h-5"/>}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm sm:text-base">
                          {studentDisplayName}
                        </span>
                        {isAnon ? (<span className="px-2 py-0.5 rounded-full bg-blue-600/15 border border-blue-600/30 text-blue-300 text-[10px] font-mono">
                            ðŸ•¶ï¸ Confidential Feedback
                          </span>) : (<span className="px-2 py-0.5 rounded-full bg-blue-600/15 border border-blue-600/30 text-blue-400 text-[10px] font-mono">
                            âœ“ Verified Scholar {studentMatric ? `â€¢ ${studentMatric}` : ''}
                          </span>)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-500"/>
                        <span>
                          {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        })
                        : '2025â€“2029 Set Retrospective'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Composite Rating Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <div className="px-3 py-1 rounded-xl bg-cyber-surface border border-white/10 flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400"/>
                      <span className="text-white font-mono font-bold text-sm">
                        {overallComposite}
                      </span>
                      <span className="text-gray-400 text-xs font-mono">/ 5.0</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Ratings Grid: CR & ACR 4-metric breakdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* CR Ratings */}
                  <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <span className="text-blue-400 font-semibold">
                        Class Rep (CR) Metrics
                      </span>
                      <span className="text-gray-300 font-bold">â˜… {crAvg.toFixed(1)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-400 block">Communication</span>
                        {renderStars(item.crCommunication)}
                      </div>
                      <div>
                        <span className="text-gray-400 block">Course Materials</span>
                        {renderStars(item.crMaterials)}
                      </div>
                      <div>
                        <span className="text-gray-400 block">Availability</span>
                        {renderStars(item.crAvailability)}
                      </div>
                      <div>
                        <span className="text-gray-400 block">Welfare & Empathy</span>
                        {renderStars(item.crWelfare)}
                      </div>
                    </div>
                  </div>

                  {/* ACR Ratings */}
                  <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <span className="text-blue-300 font-semibold">
                        Assistant Class Rep (ACR) Metrics
                      </span>
                      <span className="text-gray-300 font-bold">â˜… {acrAvg.toFixed(1)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-400 block">Communication</span>
                        {renderStars(item.acrCommunication)}
                      </div>
                      <div>
                        <span className="text-gray-400 block">Course Materials</span>
                        {renderStars(item.acrMaterials)}
                      </div>
                      <div>
                        <span className="text-gray-400 block">Availability</span>
                        {renderStars(item.acrAvailability)}
                      </div>
                      <div>
                        <span className="text-gray-400 block">Welfare & Empathy</span>
                        {renderStars(item.acrWelfare)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Qualitative Comments */}
                <div className="space-y-3 pt-2">
                  {/* What went well */}
                  {item.wellDone && (<div className="p-3.5 rounded-xl bg-emerald-500/10 border-l-4 border-blue-500 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-400 font-mono font-semibold">
                        <ThumbsUp className="w-3.5 h-3.5"/>
                        <span>What Leadership Did Well:</span>
                      </div>
                      <p className="text-gray-200 leading-relaxed font-sans pl-5">
                        "{item.wellDone}"
                      </p>
                    </div>)}

                  {/* Areas to improve */}
                  {item.criticalAreas && (<div className="p-3.5 rounded-xl bg-amber-500/10 border-l-4 border-amber-400 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-300 font-mono font-semibold">
                        <AlertCircle className="w-3.5 h-3.5"/>
                        <span>Critical Areas to Improve for 200L:</span>
                      </div>
                      <p className="text-gray-200 leading-relaxed font-sans pl-5">
                        "{item.criticalAreas}"
                      </p>
                    </div>)}

                  {!item.wellDone && !item.criticalAreas && (<div className="text-[11px] text-gray-500 italic font-mono">
                      No additional qualitative comments submitted.
                    </div>)}
                </div>
              </div>);
            })}
        </div>)}
    </div>);
};
export default FeedbackCardList;
