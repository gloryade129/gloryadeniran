'use client';
import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, BookOpen, Laptop, HeartHandshake, Palette, Trophy } from 'lucide-react';
import { CLASS_COMMITTEES } from '@/components/it-dept/types/survey';

const COMMITTEE_ICON_MAP = {
  BookOpen,
  Laptop,
  HeartHandshake,
  Palette,
  Trophy,
};

export const Step4VisionCommittees = ({ formData, onChange, onSubmit, onBack, isSubmitting }) => {
  const toggleCommittee = (commName) => {
    const current = formData.committees || [];
    if (current.includes(commName)) {
      onChange('committees', current.filter(c => c !== commName));
    } else {
      onChange('committees', [...current, commName]);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 4 OF 4</span>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 8px' }}>
          200L Committees & Vision
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
          Sign up for 200L class committees to contribute your skills and share ideas for our set.
        </p>
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '10px' }}>
            Select Committee Interests (Join 1 or more)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {CLASS_COMMITTEES.map(comm => {
              const isSelected = (formData.committees || []).includes(comm.name);
              const IconComp = COMMITTEE_ICON_MAP[comm.icon] || Sparkles;
              return (
                <div
                  key={comm.id}
                  onClick={() => toggleCommittee(comm.name)}
                  className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
                  style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.05)', color: isSelected ? '#FFFFFF' : '#94A3B8' }}>
                      <IconComp size={18} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: isSelected ? '#93C5FD' : '#FFFFFF' }}>
                        {comm.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                        {comm.desc}
                      </p>
                    </div>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? 'none' : '1px solid #475569', background: isSelected ? '#2563EB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <Check size={12} color="#FFFFFF" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Suggestions or Ideas for a Legendary 200 Level
          </label>
          <textarea
            className="it-input"
            rows={3}
            placeholder="Events, tutorials, hackathons, welfare ideas..."
            value={formData.suggestions200L}
            onChange={(e) => onChange('suggestions200L', e.target.value)}
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} disabled={isSubmitting} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="it-btn-primary"
          style={{ minWidth: '200px' }}
        >
          {isSubmitting ? (
            <span>Generating Pass...</span>
          ) : (
            <>
              <span>Complete & Unlock Pass</span>
              <Sparkles size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default Step4VisionCommittees;
