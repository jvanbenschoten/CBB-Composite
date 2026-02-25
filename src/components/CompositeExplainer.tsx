'use client';

import { useState } from 'react';
import { SOURCES } from '@/types';

export function CompositeExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid #1e3a5f' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
        style={{ background: '#0f2645' }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: '#f97316' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
            How is the composite calculated?
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: '#475569' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="px-4 pb-4 pt-3 space-y-3 text-sm"
          style={{ background: '#0a1931', borderTop: '1px solid #1e3a5f', color: '#94a3b8' }}
        >
          <p>
            The <strong style={{ color: '#f97316' }}>Composite</strong> is the average rank across
            all selected sources for a given team. <strong style={{ color: '#e2e8f0' }}>Lower = better.</strong>
          </p>

          <div
            className="rounded-lg p-3 font-mono text-xs"
            style={{ background: '#0f2645', color: '#60a5fa' }}
          >
            Composite = Sum of selected ranks ÷ Number of selected polls that ranked the team
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>Example:</p>
            <p>
              Team ranked <strong style={{ color: '#fbbf24' }}>#3 NET</strong>,{' '}
              <strong style={{ color: '#ef4444' }}>#5 BPI</strong>,{' '}
              <strong style={{ color: '#fb923c' }}>#4 Torvik</strong>, not in AP or Coaches Poll →{' '}
              <strong style={{ color: '#f97316' }}>(3+5+4) ÷ 3 = 4.0</strong>
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>Unranked teams:</p>
            <p>
              Teams not in a poll (e.g., AP only ranks top 25) are{' '}
              <strong style={{ color: '#e2e8f0' }}>excluded</strong> from that poll's contribution —
              not penalized.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {SOURCES.map((s) => (
              <div key={s.id} className="flex items-start gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                  style={{
                    background: s.color + '22',
                    color: s.color,
                    border: `1px solid ${s.color}44`,
                  }}
                >
                  {s.label}
                </span>
                <span className="text-xs leading-snug">{s.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
