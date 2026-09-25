'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Palette, Film, Share2, BookOpen, Terminal, Heart, Calendar, Camera, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { VOLUNTEER_ROLES } from '@/components/it-dept/types/survey';

const ROLE_ICONS = {
  Palette, Film, Share2, BookOpen, Terminal, Heart, Calendar, Camera
};

export const Step6VolunteerRoles = ({
  formData,
  onChange,
  onNext,
  onBack,
  showToast,
  isUpdateMode = false,
  onUpdateSubmit,
  isSubmitting = false,
}) => {
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
                      background: isSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#60A5FA' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: isSelected ? '#60A5FA' : '#EDEDED' }}>
                      {role.name}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#94A3B8' }}>
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
                    background: isSelected ? '#3B82F6' : 'transparent',
                    color: '#FFFFFF',
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
            value={formData.vision200L || formData.suggestions200L || ''}
            onChange={(e) => {
              onChange('vision200L', e.target.value);
              onChange('suggestions200L', e.target.value);
            }}
          />
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions" style={{ flexDirection: isUpdateMode ? 'column' : 'row', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
          <button type="button" onClick={onBack} disabled={isSubmitting} className="it-btn-secondary">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {isUpdateMode ? (
            <button
              type="button"
              onClick={onUpdateSubmit}
              disabled={isSubmitting}
              className="it-btn-primary"
              style={{ minWidth: '200px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="it-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit Updated Review</span>
                </>
              )}
            </button>
          ) : (
            <button type="button" onClick={onNext} className="it-btn-primary" style={{ minWidth: '180px' }}>
              <span>Next: Leadership Support</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {isUpdateMode && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#60A5FA',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px',
              }}
            >
              Want to review leadership contribution options? Continue to Step 7 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default Step6VolunteerRoles;
