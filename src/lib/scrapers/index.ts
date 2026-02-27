/**
 * Main scraper orchestrator — fetches all sources in parallel and merges.
 *
 * Warren Nolan compare-rankings is the single source for NET, BPI, T-Rank,
 * ELO, KPI, SOR, WAB, KenPom, and Sagarin — one fetch gives us all 9 ranks.
 * AP/Coaches come from ESPN. Conference data comes from NCAA.com.
 * AdjO/AdjD efficiency values come from the Barttorvik JSON API.
 */
import axios from 'axios';
import { RankingsData, TeamRanking, RankingSource } from '@/types';
import { scrapeApPoll } from './ap';
import { scrapeCoachesPoll } from './coaches';
import { scrapeNcaaConferences } from './net';
import { findCanonicalTeam } from '../teamNormalizer';

const WN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,*/*',
  Referer: 'https://warrennolan.com/',
};

function getSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
}

interface WnTeam {
  team: string;
  record: string;
  net?: number;
  bpi?: number;
  torvik?: number;
  elo?: number;
  kpi?: number;
  sor?: number;
  wab?: number;
  pom?: number;
  sag?: number;
}

/**
 * Fetches Warren Nolan compare-rankings once and extracts all available
 * rank columns in a single pass (NET, BPI, T-Rank, ELO, KPI, SOR, WAB, POM, SAG).
 */
async function scrapeWarrenNolan(year: number): Promise<WnTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    `https://warrennolan.com/basketball/${year}/compare-rankings`,
    { headers: WN_HEADERS, timeout: 25000 }
  );
  const $ = cheerio.load(resp.data as string);

  // Find column indices dynamically by header label
  const colIdx: Record<string, number> = {};
  $('table thead tr th').each((i, th) => {
    const label = $(th).text().trim();
    if (label === 'NET') colIdx.net = i;
    else if (label === 'BPI') colIdx.bpi = i;
    else if (label === 'T-Rank') colIdx.torvik = i;
    else if (label === 'ELO') colIdx.elo = i;
    else if (label === 'KPI') colIdx.kpi = i;
    else if (label === 'SOR') colIdx.sor = i;
    else if (label === 'WAB') colIdx.wab = i;
    else if (label === 'POM') colIdx.pom = i;
    else if (label === 'SAG') colIdx.sag = i;
  });

  if (colIdx.net === undefined) {
    throw new Error('NET column not found in WN compare-rankings');
  }

  const teams: WnTeam[] = [];
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    const team =
      $(cells[0]).find('a').last().text().trim() || $(cells[0]).text().trim();
    const record = $(cells[1]).text().trim();
    if (!team || team.length < 2) return;

    function parseRank(key: string): number {
      if (colIdx[key] === undefined) return NaN;
      return parseInt($(cells[colIdx[key]]).text().trim(), 10);
    }

    const entry: WnTeam = { team, record };
    const net = parseRank('net');
    const bpi = parseRank('bpi');
    const torvik = parseRank('torvik');
    const elo = parseRank('elo');
    const kpi = parseRank('kpi');
    const sor = parseRank('sor');
    const wab = parseRank('wab');
    const pom = parseRank('pom');
    const sag = parseRank('sag');

    if (!isNaN(net) && net > 0) entry.net = net;
    if (!isNaN(bpi) && bpi > 0) entry.bpi = bpi;
    if (!isNaN(torvik) && torvik > 0) entry.torvik = torvik;
    if (!isNaN(elo) && elo > 0) entry.elo = elo;
    if (!isNaN(kpi) && kpi > 0) entry.kpi = kpi;
    if (!isNaN(sor) && sor > 0) entry.sor = sor;
    if (!isNaN(wab) && wab > 0) entry.wab = wab;
    if (!isNaN(pom) && pom > 0) entry.pom = pom;
    if (!isNaN(sag) && sag > 0) entry.sag = sag;
    teams.push(entry);
  });

  return teams.sort((a, b) => (a.net ?? 999) - (b.net ?? 999));
}

interface TrvkEff {
  adjO: number;
  adjD: number;
}

/**
 * Fetches Barttorvik JSON API for adjusted offensive and defensive efficiency.
 * Returns a map from team name → { adjO, adjD }.
 */
async function fetchBarttorvik(year: number): Promise<Map<string, TrvkEff>> {
  const begin = `${year - 1}1101`;
  const end = `${year}0501`;
  const resp = await axios.get(
    `https://barttorvik.com/trank.php?year=${year}&sort=&top=0&conlimit=All&venue=All&type=All&begin=${begin}&end=${end}&csv=0`,
    { headers: WN_HEADERS, timeout: 20000 }
  );
  const data = resp.data as unknown[][];
  const result = new Map<string, TrvkEff>();
  for (const row of data) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const team = String(row[0]).trim();
    const adjO = parseFloat(String(row[3]));
    const adjD = parseFloat(String(row[4]));
    if (team && !isNaN(adjO) && !isNaN(adjD)) {
      result.set(team, {
        adjO: Math.round(adjO * 10) / 10,
        adjD: Math.round(adjD * 10) / 10,
      });
    }
  }
  return result;
}

export async function scrapeAllRankings(): Promise<RankingsData> {
  const year = getSeasonYear();
  console.log('[Scraper] Starting all ranking scrapes...');

  const [wnResult, apResult, coachesResult, confResult, trvkResult] =
    await Promise.allSettled([
      scrapeWarrenNolan(year),
      scrapeApPoll(),
      scrapeCoachesPoll(),
      scrapeNcaaConferences(),
      fetchBarttorvik(year),
    ]);

  const sourceStatus: Record<RankingSource, 'success' | 'error' | 'pending'> = {
    net: 'error',
    bpi: 'error',
    torvik: 'error',
    elo: 'error',
    kpi: 'error',
    sor: 'error',
    wab: 'error',
    pom: 'error',
    sag: 'error',
    ap: 'error',
    coaches: 'error',
  };

  if (wnResult.status !== 'fulfilled' || wnResult.value.length < 50) {
    console.error(
      '[WN] Warren Nolan compare-rankings failed:',
      wnResult.status === 'rejected' ? wnResult.reason : 'too few teams'
    );
    return { teams: [], lastUpdated: new Date().toISOString(), sourceStatus };
  }

  const wnTeams = wnResult.value;
  console.log(`[WN] Loaded ${wnTeams.length} teams`);

  // Mark which sources WN provided
  if (wnTeams.some((t) => t.net !== undefined)) sourceStatus.net = 'success';
  if (wnTeams.some((t) => t.bpi !== undefined)) sourceStatus.bpi = 'success';
  if (wnTeams.some((t) => t.torvik !== undefined)) sourceStatus.torvik = 'success';
  if (wnTeams.some((t) => t.elo !== undefined)) sourceStatus.elo = 'success';
  if (wnTeams.some((t) => t.kpi !== undefined)) sourceStatus.kpi = 'success';
  if (wnTeams.some((t) => t.sor !== undefined)) sourceStatus.sor = 'success';
  if (wnTeams.some((t) => t.wab !== undefined)) sourceStatus.wab = 'success';
  if (wnTeams.some((t) => t.pom !== undefined)) sourceStatus.pom = 'success';
  if (wnTeams.some((t) => t.sag !== undefined)) sourceStatus.sag = 'success';

  // Build canonical team list (up to 365 teams)
  const canonicalList: string[] = [];
  const teamMap = new Map<string, TeamRanking>();

  for (const t of wnTeams.slice(0, 365)) {
    canonicalList.push(t.team);
    const entry: TeamRanking = { team: t.team, record: t.record };
    if (t.net) entry.net = t.net;
    if (t.bpi) entry.bpi = t.bpi;
    if (t.torvik) entry.torvik = t.torvik;
    if (t.elo) entry.elo = t.elo;
    if (t.kpi) entry.kpi = t.kpi;
    if (t.sor) entry.sor = t.sor;
    if (t.wab) entry.wab = t.wab;
    if (t.pom) entry.pom = t.pom;
    if (t.sag) entry.sag = t.sag;
    teamMap.set(t.team, entry);
  }

  // Enrich with conference data from NCAA.com
  const ncaaConf =
    confResult.status === 'fulfilled' ? confResult.value : new Map<string, string>();
  for (const entry of Array.from(teamMap.values())) {
    if (!entry.conference) {
      const conf = ncaaConf.get(entry.team.toLowerCase());
      if (conf) entry.conference = conf;
    }
  }

  // Merge Barttorvik efficiency (AdjO / AdjD)
  if (trvkResult.status === 'fulfilled') {
    console.log(`[Torvik eff] Loaded ${trvkResult.value.size} teams`);
    for (const [trvkName, eff] of Array.from(trvkResult.value.entries())) {
      const canonical = findCanonicalTeam(trvkName, canonicalList);
      if (canonical && teamMap.has(canonical)) {
        const entry = teamMap.get(canonical)!;
        entry.adjO = eff.adjO;
        entry.adjD = eff.adjD;
      }
    }
  } else {
    console.error('[Torvik eff] Failed:', (trvkResult as PromiseRejectedResult).reason);
  }

  // Merge AP Poll
  if (apResult.status === 'fulfilled' && apResult.value.length > 0) {
    sourceStatus.ap = 'success';
    console.log(`[AP] Loaded ${apResult.value.length} teams`);
    for (const t of apResult.value) {
      const canonical = findCanonicalTeam(t.team, canonicalList);
      if (canonical && teamMap.has(canonical)) teamMap.get(canonical)!.ap = t.rank;
    }
  } else {
    console.error('[AP] Failed');
  }

  // Merge Coaches Poll
  if (coachesResult.status === 'fulfilled' && coachesResult.value.length > 0) {
    sourceStatus.coaches = 'success';
    console.log(`[Coaches] Loaded ${coachesResult.value.length} teams`);
    for (const t of coachesResult.value) {
      const canonical = findCanonicalTeam(t.team, canonicalList);
      if (canonical && teamMap.has(canonical)) teamMap.get(canonical)!.coaches = t.rank;
    }
  } else {
    console.error('[Coaches] Failed');
  }

  const teams = Array.from(teamMap.values());
  teams.sort(
    (a, b) => (a.net ?? a.bpi ?? a.torvik ?? 999) - (b.net ?? b.bpi ?? b.torvik ?? 999)
  );

  return { teams, lastUpdated: new Date().toISOString(), sourceStatus };
}
