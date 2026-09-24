'use client';
import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Star, Plus, X } from 'lucide-react';

const CHALLENGES_LIST = [
  'Venue congestion & lecture acoustics',
  'Compressed test and exam schedules',
  'Course slides and material distribution',
  'General science courses (Math/Physics/Chemistry)',
  'Group assignments and project coordination',
  'Timely departmental announcements',
];

export const Step2Retrospective = ({ formData, onChange, onNext, onBack }) => {
  const [favInput, setFavInput] = useState('');
  const [toughInput, setToughInput] = useState('');

  const addFavoriteCourse = () => {
    const val = favInput.trim().toUpperCase();
    if (!val) return;
    const current = formData.favoriteCourses || [];
    // Support comma separated entries
    const items = val.split(',').map(s => s.trim()).filter(Boolean);
    const newItems = items.filter(item => !current.includes(item));
    if (newItems.length > 0) {
      onChange('favoriteCourses', [...current, ...newItems]);
    }
    setFavInput('');
  };

  const removeFavoriteCourse = (course) => {
    const current = formData.favoriteCourses || [];
    onChange('favoriteCourses', current.filter(c => c !== course));
  };

  const addToughestCourse = () => {
    const val = toughInput.trim().toUpperCase();
    if (!val) return;
    const current = formData.toughestCourses || [];
    const items = val.split(',').map(s => s.trim()).filter(Boolean);
    const newItems = items.filter(item => !current.includes(item));
    if (newItems.length > 0) {
      onChange('toughestCourses', [...current, ...newItems]);
    }
    setToughInput('');
  };

  const removeToughestCourse = (course) => {
    const current = formData.toughestCourses || [];
    onChange('toughestCourses', current.filter(c => c !== course));
  };

  const toggleChallenge = (challenge) => {
    const current = formData.challenges100L || [];
    if (current.includes(challenge)) {
      onChange('challenges100L', current.filter(c => c !== challenge));
    } else {
      onChange('challenges100L', [...current, challenge]);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '20px' }}>
        <span className="it-badge" style={{ marginBottom: '6px' }}>STEP 2 OF 4</span>
        <h2 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 6px' }}>
          100-Level Academic Retrospective
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
          Reflect on your 100L academic experience to help us improve 200L course tutorial support.
        </p>
      </div>

      <div className="it-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
        {/* Rating */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            Overall 100-Level Academic Experience Rating
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onChange('academicRating100L', star)}
                  className={`it-star-btn ${(formData.academicRating100L || 0) >= star && formData.academicRating100L > 0 ? 'active' : ''}`}
                  aria-label={`${star} Stars`}
                >
                  <Star
                    size={28}
                    fill={(formData.academicRating100L || 0) >= star && formData.academicRating100L > 0 ? '#3B82F6' : 'none'}
                    color={(formData.academicRating100L || 0) >= star && formData.academicRating100L > 0 ? '#3B82F6' : '#475569'}
                  />
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.8125rem', color: '#94A3B8', marginLeft: '6px', fontFamily: 'JetBrains Mono, monospace' }}>
              {formData.academicRating100L > 0 ? `${formData.academicRating100L} of 5 Stars` : 'Tap to rate (1 to 5)'}
            </span>
          </div>
        </div>

        {/* Favorite Courses (Add Themselves) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Favorite / Most Rewarding Course(s)
          </label>
          <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 8px' }}>
            Type your course code(s) (e.g. CSC 111, MAT 112) and click Add or press Enter:
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              className="it-input"
              placeholder="e.g. CSC 111"
              value={favInput}
              onChange={(e) => setFavInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFavoriteCourse();
                }
              }}
              style={{ textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
            />
            <button
              type="button"
              onClick={addFavoriteCourse}
              className="it-btn-primary"
              style={{ padding: '0 16px', flexShrink: 0 }}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
          {(formData.favoriteCourses || []).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {formData.favoriteCourses.map((course) => (
                <span
                  key={course}
                  className="it-chip it-chip-selected"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{course}</span>
                  <X
                    size={14}
                    style={{ cursor: 'pointer', opacity: 0.8 }}
                    onClick={() => removeFavoriteCourse(course)}
                  />
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
              No favorite courses added yet.
            </span>
          )}
        </div>

        {/* Toughest Courses (Add Themselves) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
            Toughest / Most Challenging Course(s)
          </label>
          <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 8px' }}>
            Type your course code(s) (e.g. PHY 115, CHM 111) and click Add or press Enter:
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              className="it-input"
              placeholder="e.g. PHY 115"
              value={toughInput}
              onChange={(e) => setToughInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addToughestCourse();
                }
              }}
              style={{ textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}
            />
            <button
              type="button"
              onClick={addToughestCourse}
              className="it-btn-primary"
              style={{ padding: '0 16px', flexShrink: 0 }}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
          {(formData.toughestCourses || []).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {formData.toughestCourses.map((course) => (
                <span
                  key={course}
                  className="it-chip"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#FCA5A5', background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{course}</span>
                  <X
                    size={14}
                    style={{ cursor: 'pointer', opacity: 0.8 }}
                    onClick={() => removeToughestCourse(course)}
                  />
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
              No challenging courses added yet.
            </span>
          )}
        </div>

        {/* Challenges */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            Major Challenges Faced in 100L (Select all that apply)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CHALLENGES_LIST.map((challenge) => {
              const isSelected = (formData.challenges100L || []).includes(challenge);
              return (
                <div
                  key={challenge}
                  onClick={() => toggleChallenge(challenge)}
                  className={`it-card-interactive ${isSelected ? 'it-card-selected' : ''}`}
                  style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8125rem' }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ accentColor: '#2563EB', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                  />
                  <span style={{ color: isSelected ? '#93C5FD' : '#E2E8F0' }}>{challenge}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="it-nav-actions">
        <button type="button" onClick={onBack} className="it-btn-secondary">
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="button" onClick={onNext} className="it-btn-primary">
          <span>Continue</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
export default Step2Retrospective;
