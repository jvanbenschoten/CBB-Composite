/**
 * ESPN BPI Rankings scraper
 */
import axios from 'axios';

export interface BpiTeam {
  rank: number;
  team: string;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Origin: 'https://www.espn.com',
  Referer: 'https://www.espn.com/mens-college-basketball/bpi',
};

const ENDPOINTS = [
  'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/bpi?limit=200&page=1',
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/bpi?limit=200',
  'https://site.web.api.espn.com/apis/fpi/v1/teams/rankings?sports=basketball-mens-college-basketball&limit=400',
];

export async function scrapeBpi(): Promise<BpiTeam[]> {
  for (const url of ENDPOINTS) {
    try {
      const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const teams = parseBpiResponse(resp.data);
      if (teams.length > 50) {
        // Also try page 2
        try {
          const resp2 = await axios.get(
            url.includes('page=1') ? url.replace('page=1', 'page=2') : url + '&page=2',
            { headers: HEADERS, timeout: 10000 }
          );
          const teams2 = parseBpiResponse(resp2.data);
          const combined = [...teams, ...teams2];
          const seen = new Set<string>();
          return combined
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
    } catch (err) {
      console.warn(`[BPI] ${url} failed:`, (err as Error).message);
    }
  }

  // Fallback: scrape HTML page
  try {
    return await scrapeBpiHtml();
  } catch (err) {
    console.error('[BPI] All approaches failed:', (err as Error).message);
    return [];
  }
}

function parseBpiResponse(data: unknown): BpiTeam[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;

  const teamList =
    (d.teams as unknown[]) ??
    (d.athletes as unknown[]) ??
    (d.rows as unknown[]) ??
    [];

  const teams: BpiTeam[] = [];

  for (const item of teamList as Record<string, unknown>[]) {
    const teamInfo = (item.team ?? item) as Record<string, unknown>;
    const teamName = String(
      teamInfo.displayName ?? teamInfo.name ?? teamInfo.shortDisplayName ?? ''
    ).trim();

    // Find rank from statistics array or direct field
    let rank = Number(item.rank ?? item.bpiRank ?? item.current_rank ?? 0);

    if (!rank) {
      const stats = (item.statistics ?? item.stats ?? []) as Record<string, unknown>[];
      const rankStat = stats.find(
        (s) =>
          String(s.name ?? s.abbreviation ?? '')
            .toLowerCase()
            .includes('rank')
      );
      if (rankStat) rank = Number(rankStat.value ?? rankStat.displayValue ?? 0);
    }

    if (rank && teamName && teamName.length > 1) {
      teams.push({ rank, team: teamName });
    }
  }

  return teams;
}

async function scrapeBpiHtml(): Promise<BpiTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    'https://www.espn.com/mens-college-basketball/bpi/_/view/bpi',
    {
      headers: {
        ...HEADERS,
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      timeout: 20000,
    }
  );
  const $ = cheerio.load(resp.data as string);
  const teams: BpiTeam[] = [];
  let rank = 1;

  $('table tbody tr, .Table__TR--sm').each((_, row) => {
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
