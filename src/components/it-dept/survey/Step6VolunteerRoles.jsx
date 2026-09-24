'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Palette, Film, Share2, BookOpen, Terminal, Heart, Calendar, Camera, Check } from 'lucide-react';
import { VOLUNTEER_ROLES } from '@/components/it-dept/types/survey';

const ROLE_ICONS = {
  Palette, Film, Share2, BookOpen, Terminal, Heart, Calendar, Camera
};

export const Step6VolunteerRoles = ({ formData, onChange, onNext, onBack, showToast }) => {
  const toggleRole = (name) => {
    const current = formData.volunteerRoles || [];
    if (current.includes(name)) {
      onChange('volunteerRoles', current.filter(r => r !== name));
    } else {
      onChange('volunteerRoles', [...current, name]);
    }
  };

  return (
    <div style={{ maxWidth: '660px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 6 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#EDEDED', margin: '6px 0 8px', letterSpacing: '-0.025em' }}>
          Department Volunteer Recruitment
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
          Which department committee or talent role would you love to volunteer for to help our class excel?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        {/* Roles list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {VOLUNTEER_ROLES.map((role) => {
            const IconComp = ROLE_ICONS[role.icon] || Heart;
            const isSelected = (formData.volunteerRoles || []).includes(role.name);
            return (
              <div
                key={role.id}
                onClick={() => toggleRole(role.name)}
                className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(62, 207, 142, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#3ECF8E' : '#A1A1AA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: isSelected ? '#3ECF8E' : '#EDEDED' }}>
                      {role.name}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#71717A' }}>
                      {role.desc}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    background: isSelected ? '#3ECF8E' : 'transparent',
                    color: '#09090B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 200L Suggestions */}
        <div className="it-card" style={{ padding: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '6px' }}>
            Open Suggestions for 200 Level
          </label>
          <textarea
            className="it-input"
            rows={2}
            placeholder="Share any fresh ideas, events, hackathons, or study structures..."
            value={formData.vision200L || ''}
            onChange={(e) => onChange('vision200L', e.target.value)}
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={onNext} className="it-btn-primary" style={{ minWidth: '180px' }}>
          <span>Next: Leadership Support</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step6VolunteerRoles;
