'use client';
import React from 'react';
import { MONTH_NAMES } from '@/components/it-dept/types/survey';
import { Calendar, Gift } from 'lucide-react';

export const BirthdayCalendar = ({ students = [] }) => {
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {MONTH_NAMES.map((month, idx) => {
          const monthNum = idx + 1;
          const matching = students
            .filter((s) => s.birthMonth === monthNum)
            .sort((a, b) => a.birthDay - b.birthDay);
          const isThisMonth = currentMonth === monthNum;

          return (
            <div
              key={month}
              className="it-admin-card"
              style={{
                borderColor: isThisMonth ? 'rgba(37, 99, 235, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                background: isThisMonth ? 'rgba(37, 99, 235, 0.06)' : 'rgba(12, 18, 32, 0.8)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color={isThisMonth ? '#60A5FA' : '#94A3B8'} />
                  <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {month}
                  </h3>
                </div>
                <span style={{ fontSize: '0.6875rem', color: '#93C5FD', fontWeight: 600 }}>
                  {matching.length} Birthday{matching.length === 1 ? '' : 's'}
                </span>
              </div>

              {matching.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {matching.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <span style={{ color: '#E2E8F0' }}>{s.fullName}</span>
                      <span style={{ color: '#60A5FA', fontWeight: 600, fontFamily: 'monospace' }}>
                        {s.birthDay} {month.slice(0, 3)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic', padding: '8px 0' }}>
                  No birthdays registered in {month}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default BirthdayCalendar;
