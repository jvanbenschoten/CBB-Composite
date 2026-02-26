'use client';

import { useState, useMemo } from 'react';
import { TeamRanking, RankingSource, SOURCES } from '@/types';
import { getTeamColor } from '@/data/teamColors';

type SortKey = 'composite' | 'team' | 'record' | 'conference' | RankingSource;
type SortDir = 'asc' | 'desc';

interface RankingsTableProps {
  teams: TeamRanking[];
  selectedSources: Set<RankingSource>;
  loading: boolean;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ fontSize: 10, marginLeft: 3, color: active ? '#f97316' : '#cbd5e1' }}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

export function RankingsTable({ teams, selectedSources, loading }: RankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('composite');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q
      ? teams.filter(
          (t) =>
            t.team.toLowerCase().includes(q) ||
            (t.conference ?? '').toLowerCase().includes(q)
        )
      : teams;
  }, [teams, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortKey === 'team') { aVal = a.team; bVal = b.team; }
      else if (sortKey === 'conference') { aVal = a.conference ?? ''; bVal = b.conference ?? ''; }
      else if (sortKey === 'record') { aVal = a.record ?? ''; bVal = b.record ?? ''; }
      else if (sortKey === 'composite') { aVal = a.composite ?? 9999; bVal = b.composite ?? 9999; }
      else { aVal = a[sortKey] ?? 9999; bVal = b[sortKey] ?? 9999; }

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filtered, sortKey, sortDir]);

  // Styles
  const th: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#64748b',
    background: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
  };
  const thC: React.CSSProperties = { ...th, textAlign: 'center' };

  if (loading) {
    return (
      <div style={{
        background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0',
        padding: '60px 24px', textAlign: 'center',
      }}>
        <svg style={{ width: 32, height: 32, color: '#f97316', animation: 'spin 1s linear infinite', display: 'inline-block' }} fill="none" viewBox="0 0 24 24">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p style={{ marginTop: 12, fontWeight: 600, color: '#1e293b', fontSize: 15 }}>Scraping rankings…</p>
        <p style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>Fetching all 5 sources in parallel — may take up to 30 seconds</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{
        background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0',
        padding: '60px 24px', textAlign: 'center',
      }}>
        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>No rankings loaded</p>
        <p style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>Click Refresh Data to fetch rankings</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Search + count bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
      }}>
        <div style={{ position: 'relative', flex: '0 0 260px' }}>
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94a3b8' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search teams or conference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 30, paddingRight: 10,
              paddingTop: 6, paddingBottom: 6, fontSize: 13,
              border: '1px solid #e2e8f0', borderRadius: 6,
              background: '#ffffff', color: '#1e293b', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
          {filtered.length} of {teams.length} teams
        </span>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {/* Rank # */}
              <th style={{ ...thC, width: 46 }} onClick={() => handleSort('composite')}>
                # <SortIcon active={sortKey === 'composite'} dir={sortDir} />
              </th>
              {/* Team */}
              <th style={{ ...th, minWidth: 190 }} onClick={() => handleSort('team')}>
                Team <SortIcon active={sortKey === 'team'} dir={sortDir} />
              </th>
              {/* Record */}
              <th style={{ ...thC, width: 70 }} onClick={() => handleSort('record')}>
                W-L <SortIcon active={sortKey === 'record'} dir={sortDir} />
              </th>
              {/* Conference */}
              <th style={{ ...th, minWidth: 90 }} onClick={() => handleSort('conference')}>
                Conf <SortIcon active={sortKey === 'conference'} dir={sortDir} />
              </th>
              {/* Composite */}
              <th style={{ ...thC, minWidth: 100, color: '#f97316' }} onClick={() => handleSort('composite')}>
                Composite <SortIcon active={sortKey === 'composite'} dir={sortDir} />
              </th>
              {/* Individual sources */}
              {SOURCES.map((source) => (
                <th
                  key={source.id}
                  style={{
                    ...thC,
                    minWidth: 80,
                    color: selectedSources.has(source.id) ? '#1e3a5f' : '#cbd5e1',
                  }}
                  onClick={() => handleSort(source.id)}
                >
                  <div>
                    {source.label} <SortIcon active={sortKey === source.id} dir={sortDir} />
                    {!source.fullRanking && (
                      <div style={{ fontSize: 9, fontWeight: 400, color: '#94a3b8', marginTop: 1 }}>TOP 25</div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, idx) => {
              const displayRank = idx + 1;
              const teamColor = getTeamColor(team.team);
              const isTop5 = displayRank <= 5;
              const isTop25 = displayRank <= 25;

              return (
                <tr
                  key={team.team}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  {/* Rank number */}
                  <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: isTop25 ? 14 : 13,
                      fontWeight: isTop5 ? 800 : isTop25 ? 700 : 400,
                      color: isTop5 ? '#1e3a5f' : isTop25 ? '#1d4ed8' : '#94a3b8',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {team.composite !== undefined ? displayRank : '—'}
                    </span>
                  </td>

                  {/* Team name */}
                  <td style={{ padding: '9px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 3, height: 26, borderRadius: 2,
                        background: teamColor, flexShrink: 0,
                      }} />
                      <span style={{
                        fontWeight: isTop25 ? 700 : 500,
                        color: isTop5 ? '#0f172a' : isTop25 ? '#1e293b' : '#334155',
                        whiteSpace: 'nowrap',
                      }}>
                        {team.team}
                      </span>
                    </div>
                  </td>

                  {/* Record */}
                  <td style={{ padding: '9px 14px', textAlign: 'center', fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {team.record || '—'}
                  </td>

                  {/* Conference */}
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {team.conference || '—'}
                  </td>

                  {/* Composite rank */}
                  <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                    {team.composite !== undefined ? (
                      <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: isTop5 ? 800 : 700,
                        fontSize: isTop5 ? 15 : 13,
                        color: isTop5 ? '#f97316' : isTop25 ? '#1d4ed8' : '#475569',
                      }}>
                        {team.composite}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>

                  {/* Individual source ranks */}
                  {SOURCES.map((source) => {
                    const rank = team[source.id];
                    const isActive = selectedSources.has(source.id);
                    return (
                      <td key={source.id} style={{
                        padding: '9px 14px', textAlign: 'center',
                        fontVariantNumeric: 'tabular-nums',
                        opacity: isActive ? 1 : 0.4,
                      }}>
                        {rank !== undefined ? (
                          <span style={{
                            fontSize: 13,
                            fontWeight: rank <= 5 ? 700 : rank <= 25 ? 600 : 400,
                            color: rank <= 5 ? '#1e3a5f' : rank <= 25 ? '#1d4ed8' : '#64748b',
                          }}>
                            {rank}
                          </span>
                        ) : (
                          <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Row count footer */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid #e2e8f0',
        background: '#f8fafc', fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        {sorted.length} teams displayed
      </div>
    </div>
  );
}
