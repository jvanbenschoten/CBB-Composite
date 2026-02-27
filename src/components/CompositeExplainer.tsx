'use client';

import { useState } from 'react';
import { SOURCES } from '@/types';

export function CompositeExplainer() {
  const [open, setOpen] = useState(false);

  const algorithmicSources = SOURCES.filter((s) => s.fullRanking);
  const pollSources = SOURCES.filter((s) => !s.fullRanking);

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
          How is the Composite Score calculated?
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
            The <strong style={{ color: '#f97316' }}>Composite Score</strong> is a weighted average of
            percentile scores across all selected sources (0–100, higher = better).
            Each source converts a team&apos;s rank into a percentile, then contributions
            are weighted by source reliability. Teams unranked in a source are excluded
            from that source&apos;s contribution rather than penalized.
          </p>

          <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9', borderRadius: 4, padding: '8px 12px', color: '#1d4ed8', margin: '8px 0', lineHeight: 1.7 }}>
            <div>percentile = (365 − rank + 1) / 365</div>
            <div>score = Σ(weight × percentile) / Σ(weights for ranked sources) × 100</div>
          </div>

          <p style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Algorithmic Sources (default on)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {algorithmicSources.map((s) => (
              <div key={s.id} style={{
                fontSize: 12, padding: '3px 10px', borderRadius: 4,
                background: '#f1f5f9', border: '1px solid #e2e8f0',
              }}>
                <strong style={{ color: '#1e293b' }}>{s.label}</strong>
                <span style={{ color: '#64748b' }}> ·{s.weight}%</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}> — {s.description}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Poll Sources (default off — top 25 only)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {pollSources.map((s) => (
              <div key={s.id} style={{
                fontSize: 12, padding: '3px 10px', borderRadius: 4,
                background: '#f1f5f9', border: '1px solid #e2e8f0',
              }}>
                <strong style={{ color: '#1e293b' }}>{s.label}</strong>
                <span style={{ color: '#64748b' }}> ·{s.weight}%</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}> — {s.description}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>
            AdjO / AdjD columns show Barttorvik adjusted offensive and defensive efficiency
            (points per 100 possessions, tempo-adjusted). Higher AdjO = better offense; lower AdjD = better defense.
            These are display-only and do not affect the composite score.
          </p>
        </div>
      )}
    </div>
  );
}
