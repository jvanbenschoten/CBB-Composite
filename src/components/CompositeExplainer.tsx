'use client';

import { useState } from 'react';
import { SOURCES } from '@/types';

export function CompositeExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#ffffff' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#f8fafc', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
          How is the Composite calculated?
        </span>
        <svg
          style={{ width: 14, height: 14, color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 8px' }}>
            The <strong style={{ color: '#f97316' }}>Composite</strong> normalizes each source to
            the same 365-team scale before averaging, so AP #1 and NET #1 carry equal weight.
            Teams unranked in a poll are excluded from that poll&apos;s contribution rather than
            penalized. <strong>Lower composite rank = better.</strong>
          </p>
          <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9', borderRadius: 4, padding: '6px 12px', color: '#1d4ed8', margin: '8px 0' }}>
            score = (365 − rank + 1) / 365 per source → average scores → rank by score
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SOURCES.map((s) => (
              <div key={s.id} style={{ fontSize: 12, color: '#64748b' }}>
                <strong style={{ color: '#1e293b' }}>{s.label}</strong> — {s.description}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
