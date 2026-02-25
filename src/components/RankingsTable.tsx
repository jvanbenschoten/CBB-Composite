'use client';

import { useState, useMemo } from 'react';
import { TeamRanking, RankingSource, SOURCES } from '@/types';
import { getTeamColor } from '@/data/teamColors';

type SortKey = 'composite' | 'team' | RankingSource;
type SortDir = 'asc' | 'desc';

interface RankingsTableProps {
  teams: TeamRanking[];
  selectedSources: Set<RankingSource>;
  loading: boolean;
}

function rankBadgeStyle(rank: number | undefined): React.CSSProperties {
  if (rank === undefined) return { color: '#334155' };
  if (rank <= 5) return { color: '#fbbf24', fontWeight: 800 };
  if (rank <= 25) return { color: '#60a5fa', fontWeight: 700 };
  return { color: '#94a3b8', fontWeight: 500 };
}

function compositeBg(displayRank: number): React.CSSProperties {
  if (displayRank === 1) return { background: '#fbbf2412' };
  if (displayRank <= 5) return { background: '#fbbf2408' };
  if (displayRank <= 25) return { background: '#3b82f608' };
  return {};
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ color: '#334155', fontSize: 10 }}>↕</span>;
  return <span style={{ color: '#f97316', fontSize: 10 }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function RankingsTable({ teams, selectedSources, loading }: RankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? teams.filter(
          (t) =>
            t.team.toLowerCase().includes(q) ||
            t.conference?.toLowerCase().includes(q)
        )
      : teams;
  }, [teams, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortKey === 'team') { aVal = a.team; bVal = b.team; }
      else if (sortKey === 'composite') { aVal = a.composite ?? 9999; bVal = b.composite ?? 9999; }
      else { aVal = a[sortKey] ?? 9999; bVal = b[sortKey] ?? 9999; }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const activeSources = SOURCES.filter((s) => selectedSources.has(s.id));

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#64748b',
    background: '#0f2645',
    borderBottom: '1px solid #1e3a5f',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const thCenter: React.CSSProperties = { ...thStyle, textAlign: 'center' };

  if (loading) {
    return (
      <div
        className="rounded-xl flex flex-col items-center justify-center py-20 gap-4"
        style={{ background: '#0f2645', border: '1px solid #1e3a5f' }}
      >
        <svg className="animate-spin w-8 h-8" style={{ color: '#f97316' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <div className="text-center">
          <p className="font-bold text-white">Scraping rankings…</p>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>
            Fetching from all 5 sources in parallel — 15–30 seconds
          </p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div
        className="rounded-xl flex flex-col items-center justify-center py-20 gap-3"
        style={{ background: '#0f2645', border: '1px solid #1e3a5f' }}
      >
        <svg className="w-10 h-10" style={{ color: '#f97316' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="font-semibold text-white">No rankings loaded yet</p>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Click <strong className="text-orange-400">Refresh</strong> in the header to fetch data
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a5f' }}>
      {/* Search bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: '#0f2645', borderBottom: '1px solid #1e3a5f' }}
      >
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: '#64748b' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search teams or conference…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg"
            style={{
              background: '#0a1931',
              border: '1px solid #1e3a5f',
              color: '#e2e8f0',
              outline: 'none',
            }}
          />
        </div>
        <span className="text-xs ml-auto" style={{ color: '#475569' }}>
          {filtered.length} teams
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ background: '#0a1931' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...thCenter, width: 42 }} onClick={() => handleSort('composite')}>
                <div className="flex items-center justify-center gap-1">
                  # <SortArrow active={sortKey === 'composite'} dir={sortDir} />
                </div>
              </th>
              <th style={{ ...thStyle, minWidth: 180 }} onClick={() => handleSort('team')}>
                <div className="flex items-center gap-1">
                  Team <SortArrow active={sortKey === 'team'} dir={sortDir} />
                </div>
              </th>
              <th
                style={{ ...thCenter, minWidth: 80, color: '#f97316' }}
                onClick={() => handleSort('composite')}
              >
                <div className="flex items-center justify-center gap-1">
                  Composite <SortArrow active={sortKey === 'composite'} dir={sortDir} />
                </div>
              </th>
              {SOURCES.map((source) => (
                <th
                  key={source.id}
                  style={{
                    ...thCenter,
                    color: selectedSources.has(source.id) ? source.color : '#334155',
                    opacity: selectedSources.has(source.id) ? 1 : 0.5,
                  }}
                  onClick={() => handleSort(source.id)}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                      {source.label}
                      <SortArrow active={sortKey === source.id} dir={sortDir} />
                    </div>
                    {!source.fullRanking && (
                      <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 400, letterSpacing: 0 }}>
                        TOP 25
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ ...thStyle, color: '#334155' }}>Conf</th>
              <th style={{ ...thCenter, color: '#334155' }}>W-L</th>
              <th style={{ ...thCenter, color: '#334155', fontSize: 10 }}>Srcs</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((team) => {
              const displayRank = sorted.indexOf(team) + 1;
              const teamColor = getTeamColor(team.team);
              const rowBg = compositeBg(displayRank);

              return (
                <tr
                  key={team.team}
                  style={{
                    ...rowBg,
                    borderBottom: '1px solid #0f2645',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = '#0f2645';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      rowBg.background as string ?? '';
                  }}
                >
                  {/* Rank # */}
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: team.composite !== undefined && displayRank <= 9 ? 15 : 13,
                        fontWeight: displayRank <= 5 ? 800 : displayRank <= 25 ? 700 : 500,
                        color:
                          displayRank <= 5
                            ? '#fbbf24'
                            : displayRank <= 25
                            ? '#60a5fa'
                            : '#475569',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {team.composite !== undefined ? displayRank : '—'}
                    </span>
                  </td>

                  {/* Team name with color accent */}
                  <td style={{ padding: '8px 12px' }}>
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: 4,
                          height: 28,
                          borderRadius: 2,
                          background: teamColor,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: displayRank <= 25 ? 700 : 500,
                          color: displayRank <= 5 ? '#f1f5f9' : '#cbd5e1',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {team.team}
                      </span>
                    </div>
                  </td>

                  {/* Composite score */}
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {team.composite !== undefined ? (
                      <span
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: displayRank <= 5 ? 800 : 700,
                          fontSize: displayRank <= 5 ? 15 : 13,
                          color:
                            displayRank <= 5
                              ? '#fbbf24'
                              : displayRank <= 25
                              ? '#60a5fa'
                              : '#94a3b8',
                        }}
                      >
                        {team.composite.toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: '#1e3a5f' }}>—</span>
                    )}
                  </td>

                  {/* Individual source ranks */}
                  {SOURCES.map((source) => {
                    const rank = team[source.id];
                    const isActive = selectedSources.has(source.id);
                    return (
                      <td
                        key={source.id}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          opacity: isActive ? 1 : 0.3,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {rank !== undefined ? (
                          <span style={rankBadgeStyle(rank)}>{rank}</span>
                        ) : (
                          <span style={{ color: '#1e3a5f', fontSize: 11 }}>—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Conference */}
                  <td
                    style={{
                      padding: '8px 12px',
                      fontSize: 11,
                      color: '#475569',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {team.conference || '—'}
                  </td>

                  {/* Record */}
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      fontSize: 11,
                      color: '#475569',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {team.record || '—'}
                  </td>

                  {/* Sources count */}
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 999,
                        background:
                          (team.sourcesRanked ?? 0) >= activeSources.length
                            ? '#16a34a22'
                            : '#334155',
                        color:
                          (team.sourcesRanked ?? 0) >= activeSources.length
                            ? '#4ade80'
                            : '#64748b',
                      }}
                    >
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
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: '#0f2645', borderTop: '1px solid #1e3a5f' }}
        >
          <span className="text-xs" style={{ color: '#475569' }}>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of{' '}
            {sorted.length}
          </span>
          <div className="flex gap-1">
            <PagBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ←
            </PagBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ color: '#334155', padding: '0 4px', fontSize: 11 }}>…</span>
                  )}
                  <PagBtn onClick={() => setPage(p)} active={page === p}>
                    {p}
                  </PagBtn>
                </span>
              ))}
            <PagBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              →
            </PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function PagBtn({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28,
        height: 28,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        background: active ? '#f97316' : 'transparent',
        color: active ? '#fff' : disabled ? '#1e3a5f' : '#64748b',
        border: `1px solid ${active ? '#f97316' : '#1e3a5f'}`,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.1s',
        padding: '0 6px',
      }}
    >
      {children}
    </button>
  );
}
