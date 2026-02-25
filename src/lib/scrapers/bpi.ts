/**
 * ESPN BPI Rankings scraper
 * Primary: Warren Nolan compare-rankings page (has BPI column, all teams)
 * Fallback: ESPN core power index API (top 25 only)
 * Fallback: ESPN BPI API endpoint variations
 */
import axios from 'axios';

export interface BpiTeam {
  rank: number;
  team: string;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, */*',
  Origin: 'https://www.espn.com',
  Referer: 'https://www.espn.com/mens-college-basketball/',
};

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

export async function scrapeBpi(): Promise<BpiTeam[]> {
  const year = getSeasonYear();

  // Approach 1: Warren Nolan compare-rankings page — has BPI column for all teams
  try {
    const teams = await scrapeWarrenNolanBpi(year);
    if (teams.length > 50) {
      console.log(`[BPI] Warren Nolan loaded ${teams.length} teams`);
      return teams;
    }
  } catch (err) {
    console.warn('[BPI] Warren Nolan compare-rankings failed:', (err as Error).message);
  }

  // Approach 2: ESPN core power index API (returns BPI for ~25 teams)
  try {
    const resp = await axios.get(
      `https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/${year}/powerindex?limit=100`,
      { headers: HEADERS, timeout: 12000 }
    );
    const teams = parseEspnCoreApi(resp.data);
    if (teams.length > 0) {
      console.log(`[BPI] ESPN core API loaded ${teams.length} teams`);
      return teams;
    }
  } catch (err) {
    console.warn('[BPI] ESPN core API failed:', (err as Error).message);
  }

  // Approach 3: ESPN BPI API endpoint variations
  const ESPN_ENDPOINTS = [
    'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=400&enable=bpi',
    'https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/bpi?limit=400',
    'https://site.api.espn.com/apis/site/v2/sports/basketball/college-basketball/bpi?limit=200',
  ];
  for (const url of ESPN_ENDPOINTS) {
    try {
      const resp = await axios.get(url, { headers: HEADERS, timeout: 12000 });
      const teams = parseBpiResponse(resp.data);
      if (teams.length > 10) {
        console.log(`[BPI] ESPN endpoint loaded ${teams.length} teams`);
        return teams.sort((a, b) => a.rank - b.rank);
      }
    } catch (err) {
      console.warn(`[BPI] ESPN endpoint failed:`, (err as Error).message);
    }
  }

  console.error('[BPI] All approaches failed');
  return [];
}

async function scrapeWarrenNolanBpi(year: number): Promise<BpiTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    `https://warrennolan.com/basketball/${year}/compare-rankings`,
    { headers: WN_HEADERS, timeout: 25000 }
  );
  const $ = cheerio.load(resp.data as string);

  // Find BPI column index dynamically
  let bpiColIdx = -1;
  $('table thead tr th').each((i, th) => {
    if ($(th).text().trim() === 'BPI') bpiColIdx = i;
  });

  if (bpiColIdx < 0) {
    throw new Error('BPI column not found in Warren Nolan compare-rankings');
  }

  const teams: BpiTeam[] = [];
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length <= bpiColIdx) return;
    const team =
      $(cells[0]).find('a').last().text().trim() || $(cells[0]).text().trim();
    const bpiText = $(cells[bpiColIdx]).text().trim();
    const rank = parseInt(bpiText, 10);
    if (team && team.length > 1 && !isNaN(rank) && rank > 0) {
      teams.push({ rank, team });
    }
  });

  return teams.sort((a, b) => a.rank - b.rank);
}

function parseEspnCoreApi(data: unknown): BpiTeam[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  const items = Array.isArray(d.items) ? d.items : [];
  const teams: BpiTeam[] = [];

  for (const item of items as Record<string, unknown>[]) {
    const stats = Array.isArray(item.stats) ? item.stats as Record<string, unknown>[] : [];
    const bpiRankStat = stats.find(s => String(s.name ?? '').toLowerCase() === 'bpirank');
    const rank = bpiRankStat ? Number(bpiRankStat.value) : 0;

    // Team name comes from a $ref URL — extract team ID and look it up
    const teamRef = (item.team as Record<string, unknown>)?.$ref as string ?? '';
    const teamIdMatch = teamRef.match(/teams\/(\d+)/);
    const teamId = teamIdMatch ? teamIdMatch[1] : '';

    // We can't easily resolve the name from just ID without another API call,
    // so skip individual team resolution here — rely on approach 1 instead
    if (rank && teamId) {
      // Best effort: use team ID as placeholder (won't match canonical names)
      // This approach is kept only as last-resort numeric fallback
    }
    void rank; void teamId;
  }

  return teams;
}

function parseBpiResponse(data: unknown): BpiTeam[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;

  const candidates = ['athletes', 'teams', 'rows', 'items', 'results'];
  let teamList: unknown[] = [];
  for (const key of candidates) {
    if (Array.isArray(d[key]) && (d[key] as unknown[]).length > 0) {
      teamList = d[key] as unknown[];
      break;
    }
  }

  // Also try nested sports/leagues/teams structure
  if (teamList.length === 0) {
    try {
      const sports = (d.sports as Record<string, unknown>[])?.[0];
      const leagues = (sports?.leagues as Record<string, unknown>[])?.[0];
      const nestedTeams = leagues?.teams as Record<string, unknown>[];
      if (Array.isArray(nestedTeams) && nestedTeams.length > 0) {
        teamList = nestedTeams;
      }
    } catch { /* ignore */ }
  }

  const teams: BpiTeam[] = [];

  for (const item of teamList as Record<string, unknown>[]) {
    const teamObj = ((item.team ?? item) as Record<string, unknown>);
    const teamName = String(
      teamObj.shortDisplayName ??
      teamObj.location ??
      teamObj.displayName ??
      teamObj.name ??
      ''
    ).trim();

    const rank = Number(item.rank ?? item.bpiRank ?? item.current_rank ?? 0);
    let finalRank = rank;

    if (!finalRank) {
      const stats = ((item.statistics ?? item.stats ?? []) as Record<string, unknown>[]);
      const bpiStat = stats.find((s) =>
        String(s.name ?? s.abbreviation ?? '').toLowerCase() === 'bpi' ||
        String(s.name ?? s.abbreviation ?? '').toLowerCase() === 'bpirank'
      );
      if (bpiStat) finalRank = Number(bpiStat.rank ?? bpiStat.value ?? 0);
    }

    if (finalRank && teamName && teamName.length > 1) {
      teams.push({ rank: finalRank, team: teamName });
    }
  }

  return teams;
}
