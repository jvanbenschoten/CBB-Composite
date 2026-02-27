'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RankingsData, TeamRanking, RankingSource, SOURCES } from '@/types';
import { calculateComposite } from '@/lib/composite';
import { RankingsTable } from '@/components/RankingsTable';
import { CompositeExplainer } from '@/components/CompositeExplainer';

// The 9 algorithmic full-ranking sources — default selection on page load.
// These match what the server pre-computes so we can use the server result directly.
const DEFAULT_SOURCE_IDS = SOURCES.filter((s) => s.fullRanking).map((s) => s.id as RankingSource);
const DEFAULT_SOURCES_SET = new Set<RankingSource>(DEFAULT_SOURCE_IDS);

function setsEqual(a: Set<RankingSource>, b: Set<RankingSource>) {
  if (a.size !== b.size) return false;
  return Array.from(b).every((id) => a.has(id));
}

function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function HomePage() {
  const [rawData, setRawData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheAgeMs, setCacheAgeMs] = useState<number | undefined>();
  const [selectedSources, setSelectedSources] = useState<Set<RankingSource>>(
    new Set<RankingSource>(DEFAULT_SOURCE_IDS)
  );

  const fetchRankings = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/rankings', {
        method: forceRefresh ? 'POST' : 'GET',
        cache: 'no-store',
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${resp.status}`);
      }
      const data = (await resp.json()) as RankingsData & { cacheAgeMs?: number };
      setCacheAgeMs(data.cacheAgeMs);
      setRawData(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings(false);
  }, [fetchRankings]);

  // When the default 9 algorithmic sources are selected, use the server-precomputed
  // composite directly (avoids running a potentially stale client bundle on first load).
  // When the user toggles sources, re-compute client-side instantly.
  const teams: TeamRanking[] = useMemo(() => {
    if (!rawData) return [];
    if (setsEqual(selectedSources, DEFAULT_SOURCES_SET)) return rawData.teams;
    return calculateComposite(rawData.teams, Array.from(selectedSources));
  }, [rawData, selectedSources]);

  function toggleSource(source: RankingSource) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  const successCount = rawData
    ? Object.values(rawData.sourceStatus).filter((s) => s === 'success').length
    : 0;

  const failedSources = rawData
    ? Object.entries(rawData.sourceStatus)
        .filter(([, s]) => s === 'error')
        .map(([id]) => SOURCES.find((s) => s.id === id)?.label ?? id)
    : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{ background: '#1e3a5f', borderBottom: '4px solid #f97316' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              CBB Composite Rankings
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#93c5fd', fontWeight: 400 }}>
              Men&apos;s D-I Basketball · Aggregated from {SOURCES.length} sources
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Source status badges */}
            {rawData && !loading && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {SOURCES.map((s) => {
                  const status = rawData.sourceStatus[s.id];
                  return (
                    <span
                      key={s.id}
                      style={{
                        fontSize: 10,
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontWeight: 600,
                        background: status === 'success' ? '#dcfce7' : status === 'error' ? '#fee2e2' : '#f1f5f9',
                        color: status === 'success' ? '#15803d' : status === 'error' ? '#b91c1c' : '#64748b',
                      }}
                    >
                      {status === 'success' ? '✓' : status === 'error' ? '✗' : '…'} {s.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={() => fetchRankings(true)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 6, fontSize: 13,
                fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                background: loading ? '#94a3b8' : '#f97316',
                color: '#ffffff', border: 'none',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <svg
                style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Loading…' : 'Refresh Data'}
            </button>

            {rawData && !loading && cacheAgeMs !== undefined && (
              <span style={{ fontSize: 11, color: '#93c5fd' }}>
                Updated {formatAge(cacheAgeMs)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Source toggles ── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 4, whiteSpace: 'nowrap' }}>
            Include in composite:
          </span>
          {SOURCES.map((source) => {
            const active = selectedSources.has(source.id);
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                title={`${source.description} · weight ${source.weight}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 4,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: active ? '#1e3a5f' : '#ffffff',
                  color: active ? '#ffffff' : '#475569',
                  border: `1px solid ${active ? '#1e3a5f' : '#cbd5e1'}`,
                  transition: 'all 0.15s',
                }}
              >
                {active ? (
                  <svg style={{ width: 10, height: 10 }} viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg style={{ width: 10, height: 10 }} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="1" width="10" height="10" rx="1.5" />
                  </svg>
                )}
                {source.label}
                {!source.fullRanking && (
                  <span style={{ fontSize: 9, fontWeight: 400, color: active ? '#93c5fd' : '#94a3b8' }}>TOP25</span>
                )}
                {source.fullRanking && (
                  <span style={{ fontSize: 9, fontWeight: 400, color: active ? '#93c5fd' : '#94a3b8' }}>{source.weight}%</span>
                )}
              </button>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {teams.length > 0 && (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {successCount}/{SOURCES.length} sources · {teams.length} teams
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '16px 24px' }}>
        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 12, padding: '10px 16px', borderRadius: 6,
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>Failed to fetch rankings: {error}</span>
            <button onClick={() => fetchRankings(true)}
              style={{ marginLeft: 'auto', fontSize: 12, color: '#b91c1c', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {/* Source failure warning */}
        {failedSources.length > 0 && !loading && (
          <div style={{
            marginBottom: 12, padding: '8px 16px', borderRadius: 6,
            background: '#fffbeb', border: '1px solid #fde68a',
            color: '#92400e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Could not load: <strong>{failedSources.join(', ')}</strong> — composite uses remaining sources.
          </div>
        )}

        {/* Methodology */}
        <div style={{ marginBottom: 12 }}>
          <CompositeExplainer />
        </div>

        {/* Table */}
        <RankingsTable
          teams={teams}
          selectedSources={selectedSources}
          loading={loading}
        />
      </main>

      <footer style={{ marginTop: 32, padding: '20px 24px', textAlign: 'center', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
        CBB Composite Rankings · Not affiliated with the NCAA, ESPN, AP, or any organization ·
        Sources: NCAA NET · KenPom · Bart Torvik T-Rank · ESPN BPI · SOR · KPI · ELO · Sagarin · WAB · AP Top 25 · USA Today Coaches Poll
      </footer>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
