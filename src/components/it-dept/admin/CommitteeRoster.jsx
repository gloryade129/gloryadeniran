'use client';
import React, { useState } from 'react';
import { CLASS_COMMITTEES } from '@/components/it-dept/types/survey';
import { Copy, Check, Users } from 'lucide-react';

export const CommitteeRoster = ({ profiles = [] }) => {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyNumbers = (commName, id) => {
    const matching = profiles.filter((p) => (p.committees || []).includes(commName));
    const phones = matching.map((p) => p.phone).filter(Boolean).join(', ');
    if (phones) {
      navigator.clipboard.writeText(phones);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {CLASS_COMMITTEES.map((comm) => {
          const members = profiles.filter((p) => (p.committees || []).includes(comm.name));
          const isCopied = copiedId === comm.id;

          return (
            <div key={comm.id} className="it-admin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {comm.name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#60A5FA' }}>
                    {members.length} Volunteer{members.length === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyNumbers(comm.name, comm.id)}
                  disabled={members.length === 0}
                  className="it-admin-btn"
                  style={{ fontSize: '0.6875rem', padding: '5px 10px' }}
                  title="Copy comma-separated phone numbers for WhatsApp group"
                >
                  {isCopied ? <Check size={12} color="#34D399" /> : <Copy size={12} />}
                  <span>{isCopied ? 'Copied!' : 'Copy Numbers'}</span>
                </button>
              </div>

              {members.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {members.map((m, idx) => (
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
                  No volunteers registered for this committee yet.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default CommitteeRoster;
