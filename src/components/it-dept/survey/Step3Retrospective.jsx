'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Star, BookOpen, Plus, X } from 'lucide-react';

const COMMON_CHALLENGES = [
  'Course slides & syllabus accessibility',
  'Test & assignment collision schedules',
  'Practical lab access & equipment',
  'Large lecture theater sound & projector issues',
  'Past questions & tutorial coordination',
  'Late announcements & venue changes',
];

export const Step3Retrospective = ({ formData, onChange, onNext, onBack, showToast }) => {
  const [favoriteInput, setFavoriteInput] = useState('');
  const [toughestInput, setToughestInput] = useState('');

  const currentRating = formData.academicRating100L || 0;

  const handleAddCourse = (type, val) => {
    const clean = val.trim().toUpperCase();
    if (!clean) return;
    const field = type === 'favorite' ? 'favoriteCourses' : 'toughestCourses';
    const current = formData[field] || [];
    if (!current.includes(clean)) {
      onChange(field, [...current, clean]);
    }
    if (type === 'favorite') setFavoriteInput('');
    else setToughestInput('');
  };

  const handleRemoveCourse = (type, course) => {
    const field = type === 'favorite' ? 'favoriteCourses' : 'toughestCourses';
    const current = formData[field] || [];
    onChange(field, current.filter(c => c !== course));
  };

  const toggleChallenge = (item) => {
    const current = formData.challenges100L || [];
    if (current.includes(item)) {
      onChange('challenges100L', current.filter(c => c !== item));
    } else {
      onChange('challenges100L', [...current, item]);
    }
  };

  const handleContinue = () => {
    if (currentRating === 0) {
      showToast?.('Please tap a star to rate your overall 100-Level academic experience (1 to 5).', 'error');
      return;
    }
    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 3 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#EDEDED', margin: '6px 0 8px', letterSpacing: '-0.025em' }}>
          100-Level Retrospective
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>
          Reflect on your first year in the IT Department: highlight great courses and pinpoint areas for improvement.
        </p>
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
        {/* 1. Overall Rating */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '10px' }}>
            Overall 100-Level Academic Experience (Tap 1 to 5 Stars) *
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange('academicRating100L', star)}
                className={`it-star-btn ${currentRating >= star ? 'active' : ''}`}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: currentRating >= star ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: currentRating >= star ? '1px solid rgba(251, 191, 36, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                }}
                aria-label={`Rate ${star} star`}
              >
                <Star
                  size={24}
                  fill={currentRating >= star ? '#FBBF24' : 'none'}
                  color={currentRating >= star ? '#FBBF24' : '#52525B'}
                />
              </button>
            ))}
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: currentRating > 0 ? '#FBBF24' : '#71717A', marginLeft: '6px' }}>
              {currentRating > 0 ? `${currentRating} / 5 Stars` : 'Tap to rate'}
            </span>
          </div>
        </div>

        {/* 2. Favorite Courses */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '6px' }}>
            Most Rewarding / Favorite Courses
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="e.g. CSC111, MAT111, GNS111..."
              className="it-input"
              value={favoriteInput}
              onChange={(e) => setFavoriteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCourse('favorite', favoriteInput);
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleAddCourse('favorite', favoriteInput)}
              className="it-btn-secondary"
              style={{ flexShrink: 0, padding: '0 16px' }}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
          {(formData.favoriteCourses || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {formData.favoriteCourses.map((c) => (
                <span key={c} className="it-chip it-chip-selected" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                  <span>{c}</span>
                  <X size={13} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => handleRemoveCourse('favorite', c)} />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Toughest Courses */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '6px' }}>
            Toughest / Most Challenging Courses
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="e.g. PHY115, CHM111, MAT112..."
              className="it-input"
              value={toughestInput}
              onChange={(e) => setToughestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCourse('toughest', toughestInput);
                }
              }}
            />
            <button
              type="button"
              onClick={() => handleAddCourse('toughest', toughestInput)}
              className="it-btn-secondary"
              style={{ flexShrink: 0, padding: '0 16px' }}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
          {(formData.toughestCourses || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {formData.toughestCourses.map((c) => (
                <span key={c} className="it-chip" style={{ padding: '4px 10px', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#FCA5A5' }}>
                  <span>{c}</span>
                  <X size={13} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={() => handleRemoveCourse('toughest', c)} />
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Common Challenges */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#EDEDED', marginBottom: '10px' }}>
            Major 100-Level Academic Challenges (Select all that apply)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COMMON_CHALLENGES.map((ch) => {
              const isSelected = (formData.challenges100L || []).includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChallenge(ch)}
                  className={`it-chip ${isSelected ? 'it-chip-selected' : ''}`}
                  style={{ textAlign: 'left' }}
                >
                  <span>{ch}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minWidth: '160px' }}>
          <span>Next: Class Rep Review</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step3Retrospective;
