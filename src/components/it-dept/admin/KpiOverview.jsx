'use client';
import React, { useMemo } from 'react';
import { Users, Award, BookOpen, Star, TrendingUp, Sparkles, CheckCircle2, Wallet, HeartHandshake } from 'lucide-react';
import { CLASS_COMMITTEES } from '@/components/it-dept/types/survey';
import { computeAdminKpiMetrics } from './adminUtils';

export const KpiOverview = ({ profiles = [], feedbacks = [], kpis: precomputedKpis, estimatedClassSize = 120 }) => {
  const kpis = useMemo(() => {
    return precomputedKpis || computeAdminKpiMetrics(profiles, feedbacks);
  }, [profiles, feedbacks, precomputedKpis]);

  const turnoutPercentage = useMemo(() => {
    if (estimatedClassSize <= 0) return 0;
    return Math.min(100, Math.round((kpis.totalSubmissions / estimatedClassSize) * 100));
  }, [kpis.totalSubmissions, estimatedClassSize]);

  const leadershipComposite = useMemo(() => {
    if (kpis.crCompositeScore === 0 && kpis.acrCompositeScore === 0) return 0;
    return Number(((kpis.crCompositeScore + kpis.acrCompositeScore) / 2).toFixed(2));
  }, [kpis.crCompositeScore, kpis.acrCompositeScore]);

  const getTierInfo = (score) => {
    if (score >= 4.5) return { label: 'Exceptional (Tier 1)', color: '#60A5FA' };
    if (score >= 4.0) return { label: 'Strong Performance', color: '#38BDF8' };
    if (score >= 3.0) return { label: 'Satisfactory', color: '#FBBF24' };
    return { label: 'Needs Improvement', color: '#F87171' };
  };

  const tier = getTierInfo(leadershipComposite);

  const crMetrics = [
    { label: 'Communication & Updates', val: kpis.crCommunicationAvg },
    { label: 'Course Materials & Slides', val: kpis.crMaterialsAvg },
    { label: 'Availability & Problem Solving', val: kpis.crAvailabilityAvg },
    { label: 'Empathy & Class Welfare', val: kpis.crWelfareAvg },
  ];

  const acrMetrics = [
    { label: 'Communication & Updates', val: kpis.acrCommunicationAvg },
    { label: 'Course Materials & Slides', val: kpis.acrMaterialsAvg },
    { label: 'Availability & Problem Solving', val: kpis.acrAvailabilityAvg },
    { label: 'Empathy & Class Welfare', val: kpis.acrWelfareAvg },
  ];

  const crYes = profiles.filter(p => p.crRecommendContinue === 'yes').length;
  const crNo = profiles.filter(p => p.crRecommendContinue === 'no').length;
  const crTotal = crYes + crNo + profiles.filter(p => p.crRecommendContinue === 'undecided').length;
  const crContinuePct = crTotal > 0 ? Math.round((crYes / crTotal) * 100) : 0;

  const acrYes = profiles.filter(p => p.acrRecommendContinue === 'yes').length;
  const acrNo = profiles.filter(p => p.acrRecommendContinue === 'no').length;
  const acrTotal = acrYes + acrNo + profiles.filter(p => p.acrRecommendContinue === 'undecided').length;
  const acrContinuePct = acrTotal > 0 ? Math.round((acrYes / acrTotal) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Primary KPI Cards Grid */}
      <div className="it-admin-kpi-grid">
        {/* Turnout */}
        <div className="it-admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Cohort Turnout
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <Users size={16} />
            </div>
          </div>
          <div className="it-admin-kpi-val" style={{ marginBottom: '6px' }}>
            {kpis.totalSubmissions}
            <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 400, marginLeft: '6px' }}>
              / {estimatedClassSize} students
            </span>
          </div>
          <div className="it-progress-track" style={{ height: '5px', marginBottom: '6px' }}>
            <div className="it-progress-fill" style={{ width: `${turnoutPercentage}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#94A3B8' }}>
            <span>{turnoutPercentage}% Target Reached</span>
            <span style={{ color: '#60A5FA' }}>Active Roster</span>
          </div>
        </div>

        {/* Leadership Satisfaction */}
        <div className="it-admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Leadership Satisfaction
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <Award size={16} />
            </div>
          </div>
          <div className="it-admin-kpi-val" style={{ marginBottom: '6px' }}>
            {leadershipComposite > 0 ? `${leadershipComposite} / 5.0` : 'N/A'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                fill={leadershipComposite >= star ? '#3B82F6' : 'none'}
                color={leadershipComposite >= star ? '#3B82F6' : '#475569'}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.6875rem', color: tier.color, fontWeight: 600 }}>
            {tier.label}
          </span>
        </div>

        {/* Leadership Support & Contributions */}
        <div className="it-admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Leadership Support
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <Wallet size={16} />
            </div>
          </div>
          <div className="it-admin-kpi-val" style={{ marginBottom: '6px', color: '#60A5FA' }}>
            ₦{Number(kpis.totalFundsPledged || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#94A3B8', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>{kpis.supportersCount || 0} student supporters</span>
            <span style={{ color: '#38BDF8', fontWeight: 600 }}>
              ₦{Number(kpis.totalFundsCollected || 0).toLocaleString()} paid
            </span>
          </div>
          <div className="it-progress-track" style={{ height: '5px' }}>
            <div
              className="it-progress-fill"
              style={{
                width: `${kpis.totalFundsPledged > 0 ? Math.min(100, Math.round((kpis.totalFundsCollected / kpis.totalFundsPledged) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Volunteer Talent Pool */}
        <div className="it-admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Volunteer Talent Pool
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <HeartHandshake size={16} />
            </div>
          </div>
          <div className="it-admin-kpi-val" style={{ marginBottom: '6px' }}>
            {kpis.volunteersCount || 0}
            <span style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 400, marginLeft: '6px' }}>
              talents
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#60A5FA', margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Top: {kpis.topCommittee?.name?.split(' (')[0] || 'Design / Tutorials'}
          </div>
          <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
            Ready across 8 creative teams
          </span>
        </div>

        {/* 100L Academic Rating */}
        <div className="it-admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              100L Academic Rating
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <BookOpen size={16} />
            </div>
          </div>
          <div className="it-admin-kpi-val" style={{ marginBottom: '6px' }}>
            {kpis.avgAcademicRating > 0 ? `${kpis.avgAcademicRating} / 5.0` : 'N/A'}
          </div>
          <div className="it-progress-track" style={{ height: '5px', marginBottom: '6px' }}>
            <div className="it-progress-fill" style={{ width: `${Math.round(((kpis.avgAcademicRating || 0) / 5) * 100)}%` }} />
          </div>
          <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>
            Cohort average retrospective
          </span>
        </div>

        {/* Top Tech Track */}
        <div className="it-admin-kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Top Tech Track
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {kpis.topTechTrack?.name?.split(' (')[0] || 'Software'}
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#60A5FA' }}>
            {kpis.topTechTrack?.count || 0} scholars enrolled
          </p>
          <div style={{ marginTop: '6px', fontSize: '0.6875rem', color: '#94A3B8' }}>
            {kpis.topTechTracks?.[1] ? `Next: ${kpis.topTechTracks[1].track.split(' (')[0]}` : 'IT 2025-2029'}
          </div>
        </div>
      </div>

      {/* Detailed CR vs ACR Evaluation Breakdowns */}
      <div className="it-admin-detail-grid">
        {/* Class Representative Card */}
        <div className="it-admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>
                Class Representative (CR) Evaluation
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#3B82F6' }}>Glory Adeniran</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                {kpis.crCompositeScore > 0 ? `${kpis.crCompositeScore} / 5.0` : 'N/A'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {crMetrics.map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#CBD5E1' }}>{m.label}</span>
                  <span style={{ color: '#60A5FA', fontWeight: 600 }}>{m.val > 0 ? `${m.val} / 5.0` : '—'}</span>
                </div>
                <div className="it-progress-track" style={{ height: '4px' }}>
                  <div className="it-progress-fill" style={{ width: `${(m.val / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* CR Continuation Recommendation KPI */}
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>200L Continuation Recommendation</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60A5FA' }}>{crTotal > 0 ? `${crContinuePct}% Yes` : 'Pending'}</span>
            </div>
            <div className="it-progress-track" style={{ height: '4px', marginBottom: '6px' }}>
              <div className="it-progress-fill" style={{ width: `${crContinuePct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
              <span>Endorsements: {crYes} Yes · {crNo} No</span>
              <span>{crTotal} responses</span>
            </div>
          </div>
        </div>

        {/* Assistant Class Representative Card */}
        <div className="it-admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>
                Assistant Class Representative (ACR) Evaluation
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#3B82F6' }}>Esther · Assistant Class Rep</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                {kpis.acrCompositeScore > 0 ? `${kpis.acrCompositeScore} / 5.0` : 'N/A'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {acrMetrics.map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: '#CBD5E1' }}>{m.label}</span>
                  <span style={{ color: '#60A5FA', fontWeight: 600 }}>{m.val > 0 ? `${m.val} / 5.0` : '—'}</span>
                </div>
                <div className="it-progress-track" style={{ height: '4px' }}>
                  <div className="it-progress-fill" style={{ width: `${(m.val / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* ACR Continuation Recommendation KPI */}
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>200L Continuation Recommendation</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60A5FA' }}>{acrTotal > 0 ? `${acrContinuePct}% Yes` : 'Pending'}</span>
            </div>
            <div className="it-progress-track" style={{ height: '4px', marginBottom: '6px' }}>
              <div className="it-progress-fill" style={{ width: `${acrContinuePct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
              <span>Endorsements: {acrYes} Yes · {acrNo} No</span>
              <span>{acrTotal} responses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default KpiOverview;
