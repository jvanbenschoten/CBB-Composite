'use client';

import { useState, useEffect, useCallback } from 'react';
import { RankingsData, TeamRanking, RankingSource, SOURCES } from '@/types';
import { calculateComposite } from '@/lib/composite';
import { RankingsTable } from '@/components/RankingsTable';
import { SourceSelector } from '@/components/SourceSelector';
import { CompositeExplainer } from '@/components/CompositeExplainer';
import { RefreshButton } from '@/components/RefreshButton';

export default function HomePage() {
  const [rawData, setRawData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheAgeMs, setCacheAgeMs] = useState<number | undefined>();
  const [selectedSources, setSelectedSources] = useState<Set<RankingSource>>(
    new Set<RankingSource>(['net', 'bpi', 'torvik', 'ap', 'coaches'])
  );

  // Fetch rankings (GET = use cache, POST = force refresh)
  const fetchRankings = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/rankings', {
        method: forceRefresh ? 'POST' : 'GET',
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${resp.status}`);
      }
      const data = await resp.json() as RankingsData & { cacheAgeMs?: number };
      setCacheAgeMs(data.cacheAgeMs);
      setRawData(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount (use cache if available)
  useEffect(() => {
    fetchRankings(false);
  }, [fetchRankings]);

  // Recalculate composite whenever sources or raw data change
  const teams: TeamRanking[] = rawData
    ? calculateComposite(rawData.teams, Array.from(selectedSources))
    : [];

  function toggleSource(source: RankingSource) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }

  const successCount = rawData
    ? Object.values(rawData.sourceStatus).filter((s) => s === 'success').length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-7 h-7 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c1.65 0 3.19.41 4.54 1.12L4.12 16.54A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8zm0 16c-1.65 0-3.19-.41-4.54-1.12l12.42-12.42A7.94 7.94 0 0120 12c0 4.41-3.59 8-8 8z" />
                </svg>
                <h1 className="text-2xl font-bold tracking-tight">CBB Composite Rankings</h1>
              </div>
              <p className="text-blue-200 text-sm mt-0.5">
                Men's college basketball — aggregated from {SOURCES.length} ranking systems
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <RefreshButton
                onRefresh={() => fetchRankings(true)}
                loading={loading}
                lastUpdated={rawData?.lastUpdated}
                cacheAgeMs={cacheAgeMs}
              />
              {rawData && !loading && (
                <span className="text-xs text-blue-300">
                  {successCount}/{SOURCES.length} sources loaded
                  {rawData.teams.length > 0 && ` · ${rawData.teams.length} teams`}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <strong>Error fetching rankings:</strong> {error}
              <button
                onClick={() => fetchRankings(true)}
                className="ml-2 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Source status warnings */}
        {rawData && !loading && (
          <SourceStatusBanner sourceStatus={rawData.sourceStatus} />
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
            <SourceSelector
              selectedSources={selectedSources}
              onToggle={toggleSource}
              sourceStatus={rawData?.sourceStatus}
            />
            <CompositeExplainer />

            {/* Quick stats */}
            {teams.length > 0 && !loading && (
              <QuickStats teams={teams} selectedSources={selectedSources} />
            )}
          </aside>

          {/* Main table */}
          <div className="flex-1 min-w-0">
            <RankingsTable
              teams={teams}
              selectedSources={selectedSources}
              loading={loading}
            />
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
        <p>
          CBB Composite Rankings — aggregating public ranking data for informational purposes.
          Not affiliated with the NCAA, ESPN, AP, or any other organization.
        </p>
        <p className="mt-1">
          Sources: NCAA NET · ESPN BPI · Barttorvik T-Rank · AP Top 25 · USA Today Coaches Poll
        </p>
      </footer>
    </div>
  );
}

// Source status warning banner
function SourceStatusBanner({
  sourceStatus,
}: {
  sourceStatus: Record<RankingSource, 'success' | 'error' | 'pending'>;
}) {
  const failed = Object.entries(sourceStatus)
    .filter(([, status]) => status === 'error')
    .map(([id]) => SOURCES.find((s) => s.id === id)?.label ?? id);

  if (failed.length === 0) return null;

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700 flex items-start gap-2">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>
        Could not load: <strong>{failed.join(', ')}</strong>. These sources may be temporarily
        unavailable or blocking automated requests. Composite rankings still calculated from
        available sources.
      </span>
    </div>
  );
}

// Quick summary stats
function QuickStats({
  teams,
  selectedSources,
}: {
  teams: TeamRanking[];
  selectedSources: Set<RankingSource>;
}) {
  const rankedCount = teams.filter((t) => t.composite !== undefined).length;
  const fullyCoveredCount = teams.filter(
    (t) => (t.sourcesRanked ?? 0) === selectedSources.size
  ).length;
  const top25 = teams.slice(0, 25);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
        Quick Stats
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Total teams</span>
          <span className="font-semibold">{teams.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">With composite rank</span>
          <span className="font-semibold">{rankedCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fully covered</span>
          <span className="font-semibold text-green-600">{fullyCoveredCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Active sources</span>
          <span className="font-semibold">{selectedSources.size}/{SOURCES.length}</span>
        </div>
      </div>

      {top25.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
            Top 5 Composite
          </p>
          <ol className="space-y-1">
            {top25.slice(0, 5).map((t, i) => (
              <li key={t.team} className="flex items-center gap-2 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-amber-400 text-amber-900' :
                  i === 1 ? 'bg-gray-300 text-gray-700' :
                  i === 2 ? 'bg-orange-300 text-orange-900' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {i + 1}
                </span>
                <span className="font-medium text-gray-800 truncate">{t.team}</span>
                <span className="ml-auto text-gray-400 tabular-nums">
                  {t.composite?.toFixed(1)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
