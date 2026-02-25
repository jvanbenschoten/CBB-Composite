'use client';

import { useState, useMemo } from 'react';
import { TeamRanking, RankingSource, SOURCES } from '@/types';

type SortKey = 'composite' | 'team' | RankingSource;
type SortDir = 'asc' | 'desc';

interface RankingsTableProps {
  teams: TeamRanking[];
  selectedSources: Set<RankingSource>;
  loading: boolean;
}

function getRankColor(rank: number | undefined, fullRanking: boolean): string {
  if (rank === undefined) return 'text-gray-300';
  if (rank <= 5) return 'text-amber-600 font-bold';
  if (rank <= 25) return 'text-blue-700 font-semibold';
  if (!fullRanking) return 'text-gray-400'; // shouldn't show for top-25-only polls
  return 'text-gray-700';
}

function getRankBg(compositeRank: number): string {
  if (compositeRank <= 5) return 'bg-amber-50';
  if (compositeRank <= 10) return 'bg-yellow-50';
  if (compositeRank <= 25) return 'bg-blue-50';
  return '';
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300">↕</span>;
  return <span className="text-blue-600">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function RankingsTable({ teams, selectedSources, loading }: RankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? teams.filter((t) => t.team.toLowerCase().includes(q) || t.conference?.toLowerCase().includes(q))
      : teams;
  }, [teams, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: number | string | undefined;
      let bVal: number | string | undefined;

      if (sortKey === 'team') {
        aVal = a.team;
        bVal = b.team;
      } else if (sortKey === 'composite') {
        aVal = a.composite ?? 9999;
        bVal = b.composite ?? 9999;
      } else {
        aVal = a[sortKey] ?? 9999;
        bVal = b[sortKey] ?? 9999;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const activeSources = SOURCES.filter((s) => selectedSources.has(s.id));

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <div className="inline-flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 font-medium">Scraping rankings from all sources…</p>
          <p className="text-xs text-gray-400">This may take 15–30 seconds on first load</p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <p className="text-gray-500">No rankings loaded yet. Click <strong>Refresh Rankings</strong> to fetch data.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search teams…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {filtered.length} team{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left w-10">
                <button className="table-header-btn" onClick={() => handleSort('composite')}>
                  # <SortIcon active={sortKey === 'composite'} dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2.5 text-left min-w-[180px]">
                <button className="table-header-btn" onClick={() => handleSort('team')}>
                  Team <SortIcon active={sortKey === 'team'} dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2.5 text-center">
                <button className="table-header-btn justify-center" onClick={() => handleSort('composite')}>
                  Composite <SortIcon active={sortKey === 'composite'} dir={sortDir} />
                </button>
              </th>
              {SOURCES.map((source) => (
                <th
                  key={source.id}
                  className={`px-3 py-2.5 text-center transition-opacity ${
                    selectedSources.has(source.id) ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <button
                    className="table-header-btn justify-center"
                    onClick={() => handleSort(source.id)}
                    style={{ color: selectedSources.has(source.id) ? source.color : undefined }}
                  >
                    {source.label} <SortIcon active={sortKey === source.id} dir={sortDir} />
                  </button>
                </th>
              ))}
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                Conf.
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                Record
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                Sources
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((team, idx) => {
              const compositeRank = (page - 1) * pageSize + idx + 1;
              const displayRank = sorted.indexOf(team) + 1;
              const rowBg = getRankBg(displayRank);

              return (
                <tr
                  key={team.team}
                  className={`hover:bg-blue-50/50 transition-colors ${rowBg}`}
                >
                  {/* Composite rank # */}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-sm font-bold ${
                      displayRank <= 5 ? 'text-amber-600' :
                      displayRank <= 25 ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {team.composite !== undefined ? displayRank : '—'}
                    </span>
                  </td>

                  {/* Team name */}
                  <td className="px-3 py-2">
                    <span className="font-medium text-gray-900">{team.team}</span>
                  </td>

                  {/* Composite score */}
                  <td className="px-3 py-2 text-center">
                    {team.composite !== undefined ? (
                      <span className={`font-bold tabular-nums ${
                        displayRank <= 5 ? 'text-amber-600 text-base' :
                        displayRank <= 25 ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {team.composite.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Individual source ranks */}
                  {SOURCES.map((source) => {
                    const rank = team[source.id];
                    const isSelected = selectedSources.has(source.id);
                    return (
                      <td
                        key={source.id}
                        className={`px-3 py-2 text-center tabular-nums transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-30'
                        }`}
                      >
                        {rank !== undefined ? (
                          <span className={getRankColor(rank, source.fullRanking)}>
                            {rank}
                          </span>
                        ) : (
                          <span className="text-gray-200 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Conference */}
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {team.conference || '—'}
                  </td>

                  {/* Record */}
                  <td className="px-3 py-2 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                    {team.record || '—'}
                  </td>

                  {/* Sources ranked count */}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      (team.sourcesRanked ?? 0) >= activeSources.length
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {team.sourcesRanked ?? 0}/{activeSources.length}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length} teams
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-gray-300 text-xs">…</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs rounded border transition-colors ${
                      page === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
