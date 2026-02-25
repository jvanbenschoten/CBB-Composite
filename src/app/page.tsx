'use client';

import { useState, useEffect, useCallback } from 'react';
import { RankingsData, TeamRanking, RankingSource, SOURCES } from '@/types';
import { calculateComposite } from '@/lib/composite';
import { RankingsTable } from '@/components/RankingsTable';
import { CompositeExplainer } from '@/components/CompositeExplainer';

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
    new Set<RankingSource>(['net', 'bpi', 'torvik', 'ap', 'coaches'])
  );

  const fetchRankings = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/rankings', {
        method: forceRefresh ? 'POST' : 'GET',
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

  const teams: TeamRanking[] = rawData
    ? calculateComposite(rawData.teams, Array.from(selectedSources))
    : [];

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
    <div className="min-h-screen" style={{ background: '#0a1931' }}>
      {/* ── Header ── */}
      <header style={{ background: '#0a1931', borderBottom: '3px solid #f97316' }}>
        <div className="max-w-screen-2xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Basketball icon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#f97316' }}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c1.65 0 3.19.41 4.54 1.12L4.12 16.54A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8zm0 16c-1.65 0-3.19-.41-4.54-1.12l12.42-12.42A7.94 7.94 0 0120 12c0 4.41-3.59 8-8 8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-none">
                CBB COMPOSITE
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#f97316' }}>
                Men's College Basketball — Aggregated Rankings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Source status pills */}
            {rawData && !loading && (
              <div className="hidden sm:flex items-center gap-1.5">
                {SOURCES.map((s) => {
                  const status = rawData.sourceStatus[s.id];
                  return (
                    <span
                      key={s.id}
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background:
                          status === 'success'
                            ? '#16a34a22'
                            : status === 'error'
                            ? '#dc262622'
                            : '#ffffff22',
                        color:
                          status === 'success'
                            ? '#4ade80'
                            : status === 'error'
                            ? '#f87171'
                            : '#94a3b8',
                        border: `1px solid ${
                          status === 'success'
                            ? '#16a34a44'
                            : status === 'error'
                            ? '#dc262644'
                            : '#ffffff22'
                        }`,
                      }}
                    >
                      {status === 'success' ? '✓' : status === 'error' ? '✗' : '…'} {s.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={() => fetchRankings(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: loading ? '#334155' : '#f97316',
                color: loading ? '#94a3b8' : '#ffffff',
              }}
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? 'Loading…' : 'Refresh'}
            </button>

            {rawData && !loading && cacheAgeMs !== undefined && (
              <span className="text-xs hidden sm:block" style={{ color: '#64748b' }}>
                {formatAge(cacheAgeMs)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Sub-bar: source toggles above table ── */}
      <div style={{ background: '#0f2645', borderBottom: '1px solid #1e3a5f' }}>
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest mr-1" style={{ color: '#64748b' }}>
            Composite:
          </span>
          {SOURCES.map((source) => {
            const active = selectedSources.has(source.id);
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: active ? source.color : 'transparent',
                  color: active ? '#ffffff' : '#64748b',
                  border: `2px solid ${active ? source.color : '#1e3a5f'}`,
                }}
              >
                {active && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {source.label}
                {!source.fullRanking && (
                  <span className="opacity-60 font-normal">25</span>
                )}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-3">
            {teams.length > 0 && (
              <span className="text-xs" style={{ color: '#64748b' }}>
                {successCount}/{SOURCES.length} sources · {teams.length} teams
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-screen-2xl mx-auto px-4 py-4">
        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg px-4 py-3 text-sm flex items-center gap-2"
            style={{ background: '#7f1d1d22', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Failed to fetch rankings: {error}</span>
            <button onClick={() => fetchRankings(true)} className="ml-auto underline text-xs">
              Retry
            </button>
          </div>
        )}

        {/* Source failure warning */}
        {failedSources.length > 0 && !loading && (
          <div className="mb-3 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2"
            style={{ background: '#78350f22', border: '1px solid #78350f44', color: '#fbbf24' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              Could not load: <strong>{failedSources.join(', ')}</strong> — composite calculated from remaining sources.
            </span>
          </div>
        )}

        {/* Composite explainer */}
        <div className="mb-3">
          <CompositeExplainer />
        </div>

        {/* Rankings table */}
        <RankingsTable
          teams={teams}
          selectedSources={selectedSources}
          loading={loading}
        />
      </main>

      <footer className="mt-8 py-5 text-center text-xs" style={{ color: '#334155', borderTop: '1px solid #1e3a5f' }}>
        CBB Composite Rankings · Not affiliated with NCAA, ESPN, AP, or any other organization ·
        Sources: NCAA NET · ESPN BPI · Barttorvik T-Rank · AP Top 25 · USA Today Coaches Poll
      </footer>
    </div>
  );
}
