'use client';

import { useState } from 'react';
import { SOURCES } from '@/types';

export function CompositeExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">How is the composite calculated?</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 text-sm text-gray-600 space-y-3 pt-3">
          <p>
            The <strong>Composite Rank</strong> is the average of all selected ranking systems
            for a given team. Lower is better.
          </p>

          <div className="bg-blue-50 rounded-lg p-3 font-mono text-xs">
            Composite = (Sum of selected ranks) ÷ (Number of selected polls that ranked the team)
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-1">Example:</p>
            <p>
              If a team is ranked <strong>#3 NET</strong>, <strong>#5 BPI</strong>,{' '}
              <strong>#4 Torvik</strong>, and is <strong>not in the AP or Coaches Poll</strong>,
              the composite = (3 + 5 + 4) ÷ 3 = <strong>4.00</strong>
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-1">Unranked teams:</p>
            <p>
              Teams not appearing in a poll (e.g., teams ranked #26+ in the AP Top 25) are{' '}
              <strong>excluded from that poll's contribution</strong> — they are not penalized,
              the poll simply doesn't factor in.
            </p>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-2">Ranking sources:</p>
            <div className="space-y-1.5">
              {SOURCES.map((s) => (
                <div key={s.id} className="flex items-start gap-2">
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: s.color + '22', color: s.color }}
                  >
                    {s.label}
                  </span>
                  <span className="text-xs text-gray-600">{s.description}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 italic">
            Data is scraped from public sources and updated on demand. Refresh to get the latest rankings.
          </p>
        </div>
      )}
    </div>
  );
}
