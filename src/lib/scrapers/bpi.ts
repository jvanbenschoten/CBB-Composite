/**
 * ESPN BPI Rankings scraper
 * Uses multiple ESPN API endpoint variations + warrennolan.com fallback
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

// ESPN API endpoint variations (different versions/paths to try)
const ESPN_ENDPOINTS = [
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=400&enable=bpi',
  'https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/bpi?limit=400',
  'https://site.api.espn.com/apis/site/v2/sports/basketball/college-basketball/bpi?limit=200',
  'https://site.web.api.espn.com/apis/fpi/v1/teams/rankings?sports=basketball-mens-college-basketball&limit=400',
];

export async function scrapeBpi(): Promise<BpiTeam[]> {
  // Try ESPN API variants
  for (const url of ESPN_ENDPOINTS) {
    try {
      const resp = await axios.get(url, { headers: HEADERS, timeout: 12000 });
      const teams = parseBpiResponse(resp.data);
      if (teams.length > 50) {
        // If paginated, try page 2
        if (url.includes('limit=200') || url.includes('limit=400')) {
          try {
            const url2 = url.includes('page=') ? url : url + '&page=2';
            const resp2 = await axios.get(url2.replace('page=1', 'page=2'), {
              headers: HEADERS,
              timeout: 10000,
            });
            const page2 = parseBpiResponse(resp2.data);
            const all = [...teams, ...page2];
            const seen = new Set<string>();
            return all
              .filter((t) => {
                if (seen.has(t.team)) return false;
                seen.add(t.team);
                return true;
              })
              .sort((a, b) => a.rank - b.rank);
          } catch {
            return teams.sort((a, b) => a.rank - b.rank);
          }
        }
        return teams.sort((a, b) => a.rank - b.rank);
      }
      if (teams.length > 0) return teams.sort((a, b) => a.rank - b.rank);
    } catch (err) {
      console.warn(`[BPI] ESPN endpoint failed:`, (err as Error).message);
    }
  }

  // Fallback: Warren Nolan (aggregates ESPN BPI, accessible HTML)
  try {
    return await scrapeWarrenNolan();
  } catch (err) {
    console.warn('[BPI] Warren Nolan failed:', (err as Error).message);
  }

  // Last resort: ESPN BPI HTML page embedded JSON
  try {
    return await scrapeEspnBpiPage();
  } catch (err) {
    console.error('[BPI] All approaches failed:', (err as Error).message);
    return [];
  }
}

function parseBpiResponse(data: unknown): BpiTeam[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;

  // Try every common ESPN response key (use first non-empty array)
  const candidates = ['athletes', 'teams', 'rows', 'items', 'results'];
  let teamList: unknown[] = [];
  for (const key of candidates) {
    if (Array.isArray(d[key]) && (d[key] as unknown[]).length > 0) {
      teamList = d[key] as unknown[];
      break;
    }
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

    // BPI rank
    const rank = Number(item.rank ?? item.bpiRank ?? item.current_rank ?? 0);

    // Also try stats array
    let finalRank = rank;
    if (!finalRank) {
      const stats = ((item.statistics ?? item.stats ?? []) as Record<string, unknown>[]);
      const bpiStat = stats.find((s) =>
        String(s.name ?? s.abbreviation ?? '').toLowerCase() === 'bpi'
      );
      if (bpiStat) finalRank = Number(bpiStat.rank ?? bpiStat.value ?? 0);
    }

    if (finalRank && teamName && teamName.length > 1) {
      teams.push({ rank: finalRank, team: teamName });
    }
  }

  return teams;
}

async function scrapeWarrenNolan(): Promise<BpiTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get('https://warrennolan.com/basketball/bpi', {
    headers: { ...HEADERS, Accept: 'text/html,*/*' },
    timeout: 15000,
  });
  const $ = cheerio.load(resp.data as string);
  const teams: BpiTeam[] = [];

  $('table tbody tr, .net-table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const rank = parseInt($(cells[0]).text().trim(), 10);
    const team = $(cells[1]).text().trim().split('\n')[0].replace(/\s+/g, ' ').trim();
    if (!isNaN(rank) && rank > 0 && team && team.length > 1) {
      teams.push({ rank, team });
    }
  });

  return teams;
}

async function scrapeEspnBpiPage(): Promise<BpiTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    'https://www.espn.com/mens-college-basketball/bpi/_/view/bpi',
    { headers: { ...HEADERS, Accept: 'text/html,*/*' }, timeout: 20000 }
  );
  const $ = cheerio.load(resp.data as string);
  const teams: BpiTeam[] = [];
  let rank = 1;

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const possibleRank = parseInt($(cells[0]).text().trim(), 10);
    const team = $(cells[1]).text().trim().split('\n')[0].trim();
    if (team && team.length > 1) {
      teams.push({ rank: isNaN(possibleRank) ? rank++ : possibleRank, team });
    }
  });

  return teams;
}
