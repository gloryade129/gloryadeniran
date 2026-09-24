'use client';
import React from 'react';
import { ArrowRight, ArrowLeft, Star } from 'lucide-react';

const COMMON_COURSES = ['CSC 111', 'CSC 112', 'MAT 111', 'MAT 112', 'PHY 111', 'PHY 112', 'PHY 191', 'CHM 111', 'GNS 111', 'STA 111'];
const CHALLENGES_LIST = [
  'Venue congestion & lecture acoustics',
  'Compressed test and exam schedules',
  'Course slides and material distribution',
  'General science courses (Math/Physics/Chemistry)',
  'Group assignments and project coordination',
  'Timely departmental announcements',
];

export const Step2Retrospective = ({ formData, onChange, onNext, onBack }) => {
  const toggleCourse = (field, course) => {
    const current = formData[field] || [];
    if (current.includes(course)) {
      onChange(field, current.filter(c => c !== course));
    } else {
      onChange(field, [...current, course]);
    }
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
    <div style={{ maxWidth: '680px', margin: '0 auto' }} className="it-animate-fade">
      <div style={{ marginBottom: '24px' }}>
        <span className="it-badge" style={{ marginBottom: '8px' }}>STEP 2 OF 4</span>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', margin: '4px 0 8px' }}>
          100-Level Academic Retrospective
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>
          Reflect on your 100L academic experience to help us improve 200L course tutorial support.
        </p>
      </div>

      <div className="it-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
        {/* Rating */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            Overall 100-Level Experience Rating
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange('academicRating100L', star)}
                className={`it-star-btn ${(formData.academicRating100L || 5) >= star ? 'active' : ''}`}
              >
                <Star size={26} fill={(formData.academicRating100L || 5) >= star ? '#3B82F6' : 'none'} color={(formData.academicRating100L || 5) >= star ? '#3B82F6' : '#475569'} />
              </button>
            ))}
            <span style={{ fontSize: '0.8125rem', color: '#94A3B8', marginLeft: '8px', fontFamily: 'JetBrains Mono, monospace' }}>
              {formData.academicRating100L || 5} of 5 Stars
            </span>
          </div>
        </div>

        {/* Favorite Courses */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            Favorite / Most Rewarding Courses
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COMMON_COURSES.map(course => {
              const isSelected = (formData.favoriteCourses || []).includes(course);
              return (
                <button
                  key={course}
                  type="button"
                  onClick={() => toggleCourse('favoriteCourses', course)}
                  className={`it-chip ${isSelected ? 'it-chip-selected' : ''}`}
                >
                  {course}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toughest Courses */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            Toughest / Most Challenging Courses
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COMMON_COURSES.map(course => {
              const isSelected = (formData.toughestCourses || []).includes(course);
              return (
                <button
                  key={course}
                  type="button"
                  onClick={() => toggleCourse('toughestCourses', course)}
                  className={`it-chip ${isSelected ? 'it-chip-selected' : ''}`}
                >
                  {course}
                </button>
              );
            })}
          </div>
        </div>

        {/* Challenges */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '8px' }}>
            Major Challenges Faced in 100L
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CHALLENGES_LIST.map(challenge => {
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
                    style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                  <span>{challenge}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
