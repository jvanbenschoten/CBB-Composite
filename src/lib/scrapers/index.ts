/**
 * Main scraper orchestrator — fetches all sources in parallel and merges.
 *
 * Warren Nolan compare-rankings is the single source for NET, BPI, and T-Rank.
 * One fetch gives us team names, records, and all three ranks simultaneously.
 * AP/Coaches come from ESPN. Conference data comes from NCAA.com.
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
}

/**
 * Fetches Warren Nolan compare-rankings once and extracts Team, Record,
 * NET rank, BPI rank, and T-Rank in a single pass.
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
  });

  if (colIdx.net === undefined && colIdx.bpi === undefined) {
    throw new Error('Required columns not found in WN compare-rankings');
  }

  const teams: WnTeam[] = [];
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    const team =
      $(cells[0]).find('a').last().text().trim() || $(cells[0]).text().trim();
    const record = $(cells[1]).text().trim();
    if (!team || team.length < 2) return;

    const net =
      colIdx.net !== undefined ? parseInt($(cells[colIdx.net]).text().trim(), 10) : NaN;
    const bpi =
      colIdx.bpi !== undefined ? parseInt($(cells[colIdx.bpi]).text().trim(), 10) : NaN;
    const torvik =
      colIdx.torvik !== undefined
        ? parseInt($(cells[colIdx.torvik]).text().trim(), 10)
        : NaN;

    const entry: WnTeam = { team, record };
    if (!isNaN(net) && net > 0) entry.net = net;
    if (!isNaN(bpi) && bpi > 0) entry.bpi = bpi;
    if (!isNaN(torvik) && torvik > 0) entry.torvik = torvik;
    teams.push(entry);
  });

  return teams.sort((a, b) => (a.net ?? 999) - (b.net ?? 999));
}

export async function scrapeAllRankings(): Promise<RankingsData> {
  const year = getSeasonYear();
  console.log('[Scraper] Starting all ranking scrapes...');

  const [wnResult, apResult, coachesResult, confResult] = await Promise.allSettled([
    scrapeWarrenNolan(year),
    scrapeApPoll(),
    scrapeCoachesPoll(),
    scrapeNcaaConferences(),
  ]);

  const sourceStatus: Record<RankingSource, 'success' | 'error' | 'pending'> = {
    net: 'error',
    bpi: 'error',
    torvik: 'error',
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

  // Build canonical team list (up to 365 teams)
  const canonicalList: string[] = [];
  const teamMap = new Map<string, TeamRanking>();

  for (const t of wnTeams.slice(0, 365)) {
    canonicalList.push(t.team);
    const entry: TeamRanking = { team: t.team, record: t.record };
    if (t.net) entry.net = t.net;
    if (t.bpi) entry.bpi = t.bpi;
    if (t.torvik) entry.torvik = t.torvik;
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
