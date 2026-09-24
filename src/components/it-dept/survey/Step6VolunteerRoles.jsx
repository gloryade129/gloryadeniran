'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Palette, Film, Share2, BookOpen, Terminal, Heart, Calendar, Camera, Check } from 'lucide-react';
import { VOLUNTEER_ROLES } from '@/components/it-dept/types/survey';

const ROLE_ICONS = {
  Palette, Film, Share2, BookOpen, Terminal, Heart, Calendar, Camera
};

export const Step6VolunteerRoles = ({ formData, onChange, onNext, onBack }) => {
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
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>
          Department Volunteer Recruitment
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
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
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #2563EB' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(37, 99, 235, 0.14)' : 'rgba(12, 18, 32, 0.75)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#FFFFFF' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#93C5FD' : '#FFFFFF' }}>
                      {role.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
                      {role.desc}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isSelected ? 'none' : '1px solid #475569',
                    background: isSelected ? '#2563EB' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: '8px',
                  }}
                >
                  {isSelected && <Check size={12} color="#FFFFFF" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom role */}
        <div className="it-card" style={{ padding: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Have another specialized skill or talent? (Optional)
          </label>
          <input
            type="text"
            className="it-input"
            placeholder="e.g., 3D Animator, Sound Engineer, Public Speaking, Content Writing..."
            value={formData.customVolunteerRole || ''}
            onChange={(e) => onChange('customVolunteerRole', e.target.value)}
            style={{ padding: '10px 14px', fontSize: '0.875rem' }}
          />
        </div>

        {/* Ideas & Suggestions */}
        <div className="it-card" style={{ padding: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Suggestions or Ideas for our Class in 200 Level
          </label>
          <textarea
            className="it-input"
            rows={3}
            placeholder="Share events, tutorials, welfare, or tech projects ideas..."
            value={formData.suggestions200L || ''}
            onChange={(e) => onChange('suggestions200L', e.target.value)}
            style={{ padding: '12px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary" style={{ minHeight: '44px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={onNext} className="it-btn-primary" style={{ minHeight: '44px', minWidth: '150px' }}>
          <span>Next: Leadership Support</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step6VolunteerRoles;
