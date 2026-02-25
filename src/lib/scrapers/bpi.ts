/**
 * ESPN BPI Rankings scraper
 * Source: ESPN unofficial API
 */
import axios from 'axios';

export interface BpiTeam {
  rank: number;
  team: string;
  bpiScore?: number;
}

// ESPN BPI API — returns paginated results, we request all at once
const ESPN_BPI_URL =
  'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/bpi?limit=200&page=1';

const ESPN_BPI_URL_P2 =
  'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/bpi?limit=200&page=2';

export async function scrapeBpi(): Promise<BpiTeam[]> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json',
    Origin: 'https://www.espn.com',
    Referer: 'https://www.espn.com/',
  };

  try {
    // Fetch both pages in parallel
    const [resp1, resp2] = await Promise.all([
      axios.get(ESPN_BPI_URL, { headers, timeout: 15000 }),
      axios.get(ESPN_BPI_URL_P2, { headers, timeout: 15000 }).catch(() => ({ data: null })),
    ]);

    const teams: BpiTeam[] = [];
    teams.push(...parseBpiResponse(resp1.data));
    if (resp2.data) {
      teams.push(...parseBpiResponse(resp2.data));
    }

    // Deduplicate and sort by BPI rank
    const seen = new Set<string>();
    const deduped = teams.filter((t) => {
      if (seen.has(t.team)) return false;
      seen.add(t.team);
      return true;
    });

    deduped.sort((a, b) => a.rank - b.rank);
    return deduped;
  } catch (err) {
    console.error('[BPI] ESPN API failed:', err);
    return tryBpiAlternative();
  }
}

function parseBpiResponse(data: Record<string, unknown>): BpiTeam[] {
  const teams: BpiTeam[] = [];

  if (!data) return teams;

  // ESPN BPI API structure: { teams: [{ id, team: { displayName }, statistics: [...] }] }
  const teamList =
    (data as { teams?: unknown[] }).teams ??
    (data as { rows?: unknown[] }).rows ??
    [];

  for (const item of teamList as Record<string, unknown>[]) {
    const teamInfo = (item.team ?? item) as Record<string, unknown>;
    const teamName =
      String(teamInfo.displayName ?? teamInfo.name ?? teamInfo.shortDisplayName ?? '');

    // BPI rank is usually in statistics or a rank field
    const statistics = (item.statistics ?? item.stats ?? []) as Record<string, unknown>[];
    const bpiStat = statistics.find(
      (s) => String(s.name ?? s.abbreviation ?? '').toLowerCase() === 'bpi'
    );
    const bpiScore = bpiStat ? Number(bpiStat.value ?? bpiStat.rank) : undefined;

    const rank = Number(item.rank ?? item.bpiRank ?? item.current_rank ?? 0);

    if (rank && teamName) {
      teams.push({ rank, team: teamName, bpiScore });
    }
  }

  return teams;
}

async function tryBpiAlternative(): Promise<BpiTeam[]> {
  // Alternative: try scraping the BPI HTML page
  try {
    const cheerio = await import('cheerio');
    const resp = await axios.get(
      'https://www.espn.com/mens-college-basketball/bpi/_/view/bpi',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 20000,
      }
    );

    const $ = cheerio.load(resp.data);
    const teams: BpiTeam[] = [];

    // Try to find JSON data embedded in page
    const scripts = $('script[type="application/json"]');
    scripts.each((_, el) => {
      try {
        const json = JSON.parse($(el).html() ?? '{}');
        // Recursively search for BPI data
        const found = findBpiInJson(json);
        if (found.length > 0) {
          teams.push(...found);
        }
      } catch {
        // ignore parse errors
      }
    });

    if (teams.length > 0) {
      teams.sort((a, b) => a.rank - b.rank);
      return teams;
    }

    // Last resort: parse table rows
    let rank = 1;
    $('table tbody tr, .Table__TR').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const team = $(cells[1]).text().trim();
      if (team && team.length > 1) {
        teams.push({ rank: rank++, team });
      }
    });

    return teams;
  } catch (err) {
    console.error('[BPI] Alternative scrape also failed:', err);
    return [];
  }
}

function findBpiInJson(obj: unknown, depth = 0): BpiTeam[] {
  if (depth > 10 || !obj || typeof obj !== 'object') return [];

  const teams: BpiTeam[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      teams.push(...findBpiInJson(item, depth + 1));
    }
  } else {
    const o = obj as Record<string, unknown>;
    if (o.displayName && o.rank && String(o.displayName).length > 1) {
      teams.push({
        rank: Number(o.rank),
        team: String(o.displayName),
      });
    }
    for (const val of Object.values(o)) {
      teams.push(...findBpiInJson(val, depth + 1));
    }
  }

  return teams;
}
