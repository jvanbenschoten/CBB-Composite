export type RankingSource = 'net' | 'bpi' | 'torvik' | 'ap' | 'coaches';

export interface TeamRanking {
  // Canonical team name (from NET)
  team: string;
  // Conference
  conference?: string;
  // Record (wins-losses)
  record?: string;
  // Individual source rankings (undefined = unranked in that source)
  net?: number;
  bpi?: number;
  torvik?: number;
  ap?: number;
  coaches?: number;
  // Calculated composite rank
  composite?: number;
  // Number of sources that ranked this team
  sourcesRanked?: number;
}

export interface RankingsData {
  teams: TeamRanking[];
  lastUpdated: string; // ISO timestamp
  sourceStatus: Record<RankingSource, 'success' | 'error' | 'pending'>;
}

export interface SourceConfig {
  id: RankingSource;
  label: string;
  description: string;
  fullRanking: boolean; // true = ranks all ~365 teams, false = only top 25
  color: string;
}

export const SOURCES: SourceConfig[] = [
  {
    id: 'net',
    label: 'NET',
    description: 'NCAA Evaluation Tool — algorithmic ranking used by the NCAA selection committee',
    fullRanking: true,
    color: '#003087',
  },
  {
    id: 'bpi',
    label: 'ESPN BPI',
    description: 'ESPN Basketball Power Index — predictive efficiency-based rating',
    fullRanking: true,
    color: '#D00',
  },
  {
    id: 'torvik',
    label: 'Torvik',
    description: 'Bart Torvik T-Rank — tempo-adjusted efficiency ratings',
    fullRanking: true,
    color: '#E8820C',
  },
  {
    id: 'ap',
    label: 'AP Poll',
    description: 'Associated Press Top 25 — media voter poll (top 25 only)',
    fullRanking: false,
    color: '#1A1A1A',
  },
  {
    id: 'coaches',
    label: 'Coaches Poll',
    description: "USA Today Coaches Poll — Division I head coaches' ballot (top 25 only)",
    fullRanking: false,
    color: '#555',
  },
];
