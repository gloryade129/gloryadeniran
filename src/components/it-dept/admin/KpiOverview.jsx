'use client';
import React, { useMemo } from 'react';
import { Users, Award, BookOpen, Code, HeartHandshake, Star, TrendingUp, Sparkles, BarChart2, CheckCircle2, } from 'lucide-react';
import { CLASS_COMMITTEES } from '@/components/it-dept/types/survey';
import { computeAdminKpiMetrics } from './adminUtils';
export const KpiOverview = ({ profiles, feedbacks, kpis: precomputedKpis, estimatedClassSize = 120, }) => {
    const kpis = useMemo(() => {
        return precomputedKpis || computeAdminKpiMetrics(profiles, feedbacks);
    }, [profiles, feedbacks, precomputedKpis]);
    const turnoutPercentage = useMemo(() => {
        if (estimatedClassSize <= 0)
            return 0;
        return Math.min(100, Math.round((kpis.totalSubmissions / estimatedClassSize) * 100));
    }, [kpis.totalSubmissions, estimatedClassSize]);
    // Leadership composite status tier
    const leadershipComposite = useMemo(() => {
        if (kpis.crCompositeScore === 0 && kpis.acrCompositeScore === 0)
            return 0;
        return Number(((kpis.crCompositeScore + kpis.acrCompositeScore) / 2).toFixed(2));
    }, [kpis.crCompositeScore, kpis.acrCompositeScore]);
    const getTierInfo = (score) => {
        if (score >= 4.5) {
            return {
                label: 'Exceptional Leadership (Tier 1)',
                badgeClass: 'bg-blue-600/15 text-blue-400 border-blue-600/40',
                textClass: 'text-blue-400',
            };
        }
        if (score >= 4.0) {
            return {
                label: 'Strong Performance',
                badgeClass: 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40',
                textClass: 'text-cyber-cyan',
            };
        }
        if (score >= 3.0) {
            return {
                label: 'Satisfactory / Growing',
                badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
                textClass: 'text-amber-400',
            };
        }
        return {
            label: 'Needs Attention',
            badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
            textClass: 'text-rose-400',
        };
    };
    const tier = getTierInfo(leadershipComposite);
    // Committee display mapping helper
    const committeeNameMap = useMemo(() => {
        const map = {};
        CLASS_COMMITTEES.forEach(c => {
            map[c.id] = c.name;
        });
        return map;
    }, []);
    return (<div className="space-y-6 animate-fade-in">
      {/* Top 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Submissions & Turnout */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-blue-600/30 relative overflow-hidden group hover:border-blue-500/60 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-blue-600/20 transition-all"/>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Cohort Turnout
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4"/>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold font-mono text-white">
              {kpis.totalSubmissions}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              / {estimatedClassSize} students
            </span>
          </div>
          {/* Turnout Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-gray-900 border border-white/10 overflow-hidden">
              <div className="h-full bg-blue-600 shadow-glow-sm-blue transition-all duration-500 rounded-full" style={{ width: `${turnoutPercentage}%` }}/>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>{turnoutPercentage}% Target</span>
              <span className="text-blue-400 font-semibold">Active Directory</span>
            </div>
          </div>
        </div>

        {/* Card 2: Composite Leadership Satisfaction Score */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-blue-600/30 relative overflow-hidden group hover:border-blue-500/60 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-blue-600/20 transition-all"/>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Leadership Satisfaction
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-blue-300">
              <Award className="w-4 h-4"/>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold font-mono text-white">
              {leadershipComposite > 0 ? leadershipComposite.toFixed(2) : 'â€”'}
            </span>
            <span className="text-xs text-gray-400 font-mono">/ 5.00</span>
          </div>
          {/* Stars & Tier Badge */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-blue-300">
              {[1, 2, 3, 4, 5].map(starIndex => (<Star key={starIndex} className={`w-3.5 h-3.5 ${starIndex <= Math.round(leadershipComposite)
                ? 'fill-blue-400 text-blue-300'
                : 'text-gray-600'}`}/>))}
            </div>
            <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full border ${tier.badgeClass}`}>
              {tier.label}
            </span>
          </div>
        </div>

        {/* Card 3: 100L Academic Retrospective Score */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-cyber-cyan/30 relative overflow-hidden group hover:border-cyber-cyan/60 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-cyan/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyber-cyan/20 transition-all"/>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              100L Academic Retrospective
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">
              <BookOpen className="w-4 h-4"/>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold font-mono text-white">
              {kpis.averageOverallRating > 0 ? kpis.averageOverallRating.toFixed(2) : 'â€”'}
            </span>
            <span className="text-xs text-gray-400 font-mono">/ 5.00</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map(starIndex => (<Star key={starIndex} className={`w-3.5 h-3.5 ${starIndex <= Math.round(kpis.averageOverallRating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-600'}`}/>))}
            </div>
            <p className="text-[11px] font-mono text-gray-400">
              Cumulative foundation rating
            </p>
          </div>
        </div>

        {/* Card 4: Top Tech Track & Engagement */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Apex Tech Specialization
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-emerald-400">
              <Code className="w-4 h-4"/>
            </div>
          </div>
          <div className="mb-2">
            <div className="text-base sm:text-lg font-bold text-white truncate" title={kpis.topTechTracks[0]?.track || 'Pending'}>
              {kpis.topTechTracks[0]?.track || 'None Recorded'}
            </div>
            <div className="text-xs text-blue-400 font-mono mt-0.5">
              {kpis.topTechTracks[0]
            ? `${kpis.topTechTracks[0].count} scholars (${kpis.topTechTracks[0].percentage}%)`
            : 'Awaiting submissions'}
            </div>
          </div>
          <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-300"/>
            <span>{kpis.topTechTracks.length} active technology niches</span>
          </div>
        </div>
      </div>

      {/* Leadership Breakdown: Class Rep vs Assistant Class Rep */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Class Rep (CR) Metrics */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-blue-600/20">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-600/40 flex items-center justify-center text-blue-400 font-bold text-xs font-mono">
                CR
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  Class Representative (CR)
                </h3>
                <span className="text-[10px] text-gray-400 font-mono">
                  Primary Coordination & Administration
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-400 font-mono">
                â˜… {kpis.crCompositeScore > 0 ? kpis.crCompositeScore.toFixed(2) : 'â€”'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Communication</span>
              <span className="text-white font-mono font-semibold text-sm">
                ðŸ“¢ {kpis.crCompositeScore > 0 ? (kpis.crCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Course Materials</span>
              <span className="text-white font-mono font-semibold text-sm">
                ðŸ“š {kpis.crCompositeScore > 0 ? (kpis.crCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Availability</span>
              <span className="text-white font-mono font-semibold text-sm">
                âš¡ {kpis.crCompositeScore > 0 ? (kpis.crCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Welfare & Empathy</span>
              <span className="text-white font-mono font-semibold text-sm">
                â¤ï¸ {kpis.crCompositeScore > 0 ? (kpis.crCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
          </div>
        </div>

        {/* Assistant Class Rep (ACR) Metrics */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-blue-600/20">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-600/40 flex items-center justify-center text-blue-300 font-bold text-xs font-mono">
                ACR
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  Assistant Class Rep (ACR)
                </h3>
                <span className="text-[10px] text-gray-400 font-mono">
                  Support, Logistics & Academic Welfare
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-300 font-mono">
                â˜… {kpis.acrCompositeScore > 0 ? kpis.acrCompositeScore.toFixed(2) : 'â€”'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Communication</span>
              <span className="text-white font-mono font-semibold text-sm">
                ðŸ“¢ {kpis.acrCompositeScore > 0 ? (kpis.acrCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Course Materials</span>
              <span className="text-white font-mono font-semibold text-sm">
                ðŸ“š {kpis.acrCompositeScore > 0 ? (kpis.acrCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Availability</span>
              <span className="text-white font-mono font-semibold text-sm">
                âš¡ {kpis.acrCompositeScore > 0 ? (kpis.acrCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5">
              <span className="text-gray-400 block text-[11px]">Welfare & Empathy</span>
              <span className="text-white font-mono font-semibold text-sm">
                â¤ï¸ {kpis.acrCompositeScore > 0 ? (kpis.acrCompositeScore).toFixed(1) : 'â€”'} / 5
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Distributions: Tech Tracks & Committee Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tech Track Distribution */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400"/>
              <span>Tech Track Specialization Distribution</span>
            </h3>
            <span className="text-[11px] font-mono text-gray-400">
              {kpis.totalSubmissions} Scholars
            </span>
          </div>

          <div className="space-y-3">
            {kpis.topTechTracks.length === 0 ? (<p className="text-xs font-mono text-gray-500 py-4 text-center">
                No tech tracks recorded yet.
              </p>) : (kpis.topTechTracks.map((item, index) => (<div key={item.track} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-300 truncate max-w-[240px]">
                      {index + 1}. {item.track}
                    </span>
                    <span className="text-gray-400">
                      <strong className="text-white">{item.count}</strong> ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-900 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${index === 0
                ? 'bg-gradient-to-r from-blue-600 to-blue-400 shadow-glow-sm-blue'
                : index === 1
                    ? 'bg-blue-600'
                    : 'bg-cyber-cyan'}`} style={{ width: `${Math.max(item.percentage, 4)}%` }}/>
                  </div>
                </div>)))}
          </div>
        </div>

        {/* Committee Volunteer Demand */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-blue-300"/>
              <span>200L Committee Volunteer Demand</span>
            </h3>
            <span className="text-[11px] font-mono text-gray-400">
              5 Official Committees
            </span>
          </div>

          <div className="space-y-3">
            {kpis.topCommittees.length === 0 ? (<p className="text-xs font-mono text-gray-500 py-4 text-center">
                No committee volunteers recorded yet.
              </p>) : (kpis.topCommittees.map(item => {
            const displayName = committeeNameMap[item.committee] || item.committee;
            return (<div key={item.committee} className="p-3 rounded-xl bg-cyber-surface/60 border border-white/5 flex items-center justify-between hover:border-blue-600/30 transition-colors">
                    <div className="flex items-center gap-2.5 truncate">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0"/>
                      <span className="text-xs font-medium text-gray-200 truncate">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-600/15 border border-blue-600/30 text-blue-300 font-mono text-xs font-semibold">
                        {item.count} volunteers
                      </span>
                    </div>
                  </div>);
        }))}
          </div>
        </div>
      </div>

      {/* 100L Academic Rating Distribution */}
      <div className="glass-card-elevated rounded-2xl p-5 border border-white/10">
        <h3 className="text-sm font-bold text-white font-mono mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400"/>
          <span>100L Overall Academic Rating Breakdown (1â€“5 Stars)</span>
        </h3>
        <div className="grid grid-cols-5 gap-2 sm:gap-4 text-center">
          {kpis.ratingDistribution.map(item => {
            const pct = kpis.totalSubmissions > 0
                ? Math.round((item.count / kpis.totalSubmissions) * 100)
                : 0;
            return (<div key={item.rating} className="p-3 rounded-xl bg-cyber-surface/50 border border-white/5 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold mb-1">
                  <span>{item.rating}</span>
                  <Star className="w-3 h-3 fill-amber-400"/>
                </div>
                <div className="text-lg font-mono font-bold text-white mb-0.5">
                  {item.count}
                </div>
                <div className="text-[10px] font-mono text-gray-400">{pct}%</div>
              </div>);
        })}
        </div>
      </div>
    </div>);
};
export default KpiOverview;
