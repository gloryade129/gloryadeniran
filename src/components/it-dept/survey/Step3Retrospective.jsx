'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Star, BookOpen, AlertCircle, Plus, X } from 'lucide-react';

const COMMON_CHALLENGES = [
  'Course slides & syllabus accessibility',
  'Test & assignment collision schedules',
  'Practical lab access & equipment',
  'Large lecture theater sound & projector issues',
  'Past questions & tutorial coordination',
  'Late announcements & schedule changes',
];

export const Step3Retrospective = ({ formData, onChange, onNext, onBack }) => {
  const [favoriteInput, setFavoriteInput] = useState('');
  const [toughestInput, setToughestInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('Please tap a star to rate your overall 100-Level academic experience (1 to 5).');
      return;
    }
    setErrorMsg('');
    onNext();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 3 OF 7</span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 4.5vw, 1.85rem)', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>
          100-Level Academic Retrospective
        </h2>
        <p style={{ fontSize: '0.9375rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
          Reflect on your 100-level coursework, highlight your wins, and document key challenges.
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '20px' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        {/* Overall Rating */}
        <div className="it-card" style={{ padding: '22px' }}>
          <label style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            Overall 100-Level Experience *
          </label>
          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', margin: '0 0 14px' }}>
            How would you rate your entire 100-level academic and social journey?
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  onChange('academicRating100L', star);
                  setErrorMsg('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Star
                  size={32}
                  fill={currentRating >= star ? '#FBBF24' : 'none'}
                  color={currentRating >= star ? '#FBBF24' : '#475569'}
                  strokeWidth={2}
                />
              </button>
            ))}
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: currentRating > 0 ? '#FBBF24' : '#94A3B8', marginLeft: '6px' }}>
              {currentRating === 0 ? 'Tap to rate (1 to 5)' : `${currentRating} of 5 Stars`}
            </span>
          </div>
        </div>

        {/* Favorite & Toughest Courses */}
        <div className="it-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Favorite */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
              Favorite / Most Rewarding Course(s)
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                className="it-input"
                placeholder="e.g. IFT 101, CSC 101, MTH 101..."
                value={favoriteInput}
                onChange={(e) => setFavoriteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCourse('favorite', favoriteInput);
                  }
                }}
                style={{ padding: '10px 14px', fontSize: '0.875rem' }}
              />
              <button
                type="button"
                onClick={() => handleAddCourse('favorite', favoriteInput)}
                className="it-btn-primary"
                style={{ padding: '0 16px', minHeight: '42px' }}
              >
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(formData.favoriteCourses || []).map((c) => (
                <span key={c} className="it-chip it-chip-selected" style={{ fontSize: '0.8125rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>{c}</span>
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveCourse('favorite', c)} />
                </span>
              ))}
            </div>
          </div>

          {/* Toughest */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
              Toughest / Most Challenging Course(s)
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                className="it-input"
                placeholder="e.g. PHY 102, CHM 101, MTH 102..."
                value={toughestInput}
                onChange={(e) => setToughestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCourse('toughest', toughestInput);
                  }
                }}
                style={{ padding: '10px 14px', fontSize: '0.875rem' }}
              />
              <button
                type="button"
                onClick={() => handleAddCourse('toughest', toughestInput)}
                className="it-btn-primary"
                style={{ padding: '0 16px', minHeight: '42px' }}
              >
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(formData.toughestCourses || []).map((c) => (
                <span key={c} className="it-chip" style={{ fontSize: '0.8125rem', padding: '5px 10px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#FCA5A5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>{c}</span>
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveCourse('toughest', c)} />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Challenges */}
        <div className="it-card" style={{ padding: '22px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
            Major 100-Level Challenges Experienced
          </label>
          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', margin: '0 0 12px' }}>
            Tap all that applied during your first year:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COMMON_CHALLENGES.map((item) => {
              const isSelected = (formData.challenges100L || []).includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleChallenge(item)}
                  className={`it-chip ${isSelected ? 'it-chip-selected' : ''}`}
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary" style={{ minHeight: '44px' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={handleContinue} className="it-btn-primary" style={{ minHeight: '44px', minWidth: '150px' }}>
          <span>Next: Leadership Review</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step3Retrospective;
