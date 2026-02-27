export type RankingSource =
  | 'net'
  | 'bpi'
  | 'torvik'
  | 'elo'
  | 'kpi'
  | 'sor'
  | 'wab'
  | 'pom'
  | 'sag'
  | 'ap'
  | 'coaches';

export interface TeamRanking {
  // Canonical team name (from Warren Nolan / NET)
  team: string;
  // Conference
  conference?: string;
  // Record (wins-losses)
  record?: string;
  // Algorithmic full-ranking sources
  net?: number;
  bpi?: number;
  torvik?: number;
  elo?: number;
  kpi?: number;
  sor?: number;
  wab?: number;
  pom?: number;
  sag?: number;
  // Poll-based top-25 sources
  ap?: number;
  coaches?: number;
  // Barttorvik efficiency stats
  adjO?: number; // Adjusted offensive efficiency (points per 100 possessions)
  adjD?: number; // Adjusted defensive efficiency (points allowed per 100)
  // Calculated composite score (weighted percentile, 0–100; higher = better)
  composite?: number;
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
  fullRanking: boolean; // true = ranks all ~365 teams, false = top 25 only
  color: string;
  weight: number; // relative weight in composite (higher = more influential)
}

export const SOURCES: SourceConfig[] = [
  {
    id: 'net',
    label: 'NET',
    description: 'NCAA Evaluation Tool — official NCAA committee metric',
    fullRanking: true,
    color: '#003087',
    weight: 20,
  },
  {
    id: 'pom',
    label: 'KenPom',
    description: 'KenPom — adjusted efficiency margin rating',
    fullRanking: true,
    color: '#2563eb',
    weight: 18,
  },
  {
    id: 'torvik',
    label: 'Torvik',
    description: 'Bart Torvik T-Rank — tempo-adjusted efficiency rating',
    fullRanking: true,
    color: '#E8820C',
    weight: 15,
  },
  {
    id: 'bpi',
    label: 'ESPN BPI',
    description: 'ESPN Basketball Power Index — predictive efficiency rating',
    fullRanking: true,
    color: '#D00',
    weight: 12,
  },
  {
    id: 'sor',
    label: 'SOR',
    description: "Strength of Record — quality of wins relative to schedule difficulty",
    fullRanking: true,
    color: '#0e7490',
    weight: 10,
  },
  {
    id: 'kpi',
    label: 'KPI',
    description: 'Kevin Pauga Index — comprehensive team strength rating',
    fullRanking: true,
    color: '#7c3aed',
    weight: 8,
  },
  {
    id: 'elo',
    label: 'ELO',
    description: 'ELO Rating — game-by-game adaptive rating system',
    fullRanking: true,
    color: '#0f766e',
    weight: 7,
  },
  {
    id: 'sag',
    label: 'Sagarin',
    description: "Dr. Jeff Sagarin's comprehensive predictive rating",
    fullRanking: true,
    color: '#65a30d',
    weight: 5,
  },
  {
    id: 'wab',
    label: 'WAB',
    description: 'Wins Above Bubble — wins relative to bubble-level opponent strength',
    fullRanking: true,
    color: '#b45309',
    weight: 5,
  },
  {
    id: 'ap',
    label: 'AP Poll',
    description: 'Associated Press Top 25 — media voter poll (top 25 only)',
    fullRanking: false,
    color: '#1A1A1A',
    weight: 4,
  },
  {
    id: 'coaches',
    label: 'Coaches',
    description: "USA Today Coaches Poll — D-I head coaches' ballot (top 25 only)",
    fullRanking: false,
    color: '#555',
    weight: 3,
  },
];
