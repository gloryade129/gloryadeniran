'use client';
import React, { useState } from 'react';
import { VOLUNTEER_ROLES, CLASS_COMMITTEES } from '@/components/it-dept/types/survey';
import { Copy, Check, Users, Sparkles } from 'lucide-react';

export const CommitteeRoster = ({ profiles = [] }) => {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyNumbers = (filterFn, id) => {
    const matching = profiles.filter(filterFn);
    const phones = matching.map((p) => p.phone).filter(Boolean).join(', ');
    if (phones) {
      navigator.clipboard.writeText(phones);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Specialized Volunteer Talent Pool */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Sparkles size={18} color="#60A5FA" />
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
            Volunteer Talent Pool (By Specialized Role)
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {VOLUNTEER_ROLES.map((role) => {
            const volunteers = profiles.filter((p) => (p.volunteerRoles || []).includes(role.name));
            const isCopied = copiedId === role.id;

            return (
              <div key={role.id} className="it-admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>
                      {role.name}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#60A5FA', fontWeight: 600 }}>
                      {volunteers.length} Volunteer{volunteers.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyNumbers((p) => (p.volunteerRoles || []).includes(role.name), role.id)}
                    disabled={volunteers.length === 0}
                    className="it-admin-btn"
                    style={{ fontSize: '0.6875rem', padding: '5px 10px' }}
                    title="Copy numbers for WhatsApp group"
                  >
                    {isCopied ? <Check size={12} color="#34D399" /> : <Copy size={12} />}
                    <span>{isCopied ? 'Copied!' : 'Copy Numbers'}</span>
                  </button>
                </div>

                {volunteers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                    {volunteers.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.03)',
                        }}
                      >
                        <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{m.fullName}</span>
                        <span style={{ color: '#93C5FD', fontFamily: 'monospace' }}>{m.phone}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic', padding: '12px 0' }}>
                    No students have volunteered for this role yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default CommitteeRoster;
