/**
 * Barttorvik T-Rank scraper
 * Primary: Warren Nolan compare-rankings page (aggregates T-Rank, no bot protection)
 * Fallback: barttorvik.com JSON API (may be bot-protected on cloud IPs)
 * Fallback: barttorvik.com HTML scrape
 */
import axios from 'axios';

export interface TorkvikTeam {
  rank: number;
  team: string;
  conference: string;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, */*',
  Referer: 'https://barttorvik.com/',
};

const WN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,*/*',
  Referer: 'https://warrennolan.com/',
};

/**
 * Season end year: the year the tournament is held.
 * 2025-26 season → YEAR = 2026
 */
function getSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
}

export async function scrapeTorvik(): Promise<TorkvikTeam[]> {
  const YEAR = getSeasonYear();
  const PREV = YEAR - 1;

  // Approach 1: Warren Nolan compare-rankings page (aggregates T-Rank from barttorvik)
  // This avoids barttorvik.com's bot protection entirely
  try {
    const teams = await scrapeWarrenNolanTrank(YEAR);
    if (teams.length > 50) {
      console.log(`[Torvik] Warren Nolan T-Rank loaded ${teams.length} teams`);
      return teams;
    }
  } catch (err) {
    console.warn('[Torvik] Warren Nolan T-Rank failed:', (err as Error).message);
  }

  // Approach 2: barttorvik.com JSON API (current season)
  try {
    const url = `https://barttorvik.com/getjson.php?year=${YEAR}&tvalue=100&conlimit=All&state=All&begin=${PREV}1101&end=${YEAR}0601&top=0&revquad=0&site=All&type=All&quad=5&sortby=2`;
    const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    if (Array.isArray(resp.data) && resp.data.length > 50) {
      return parseTorkvikJson(resp.data);
    }
  } catch (err) {
    console.warn('[Torvik] Current-year JSON failed:', (err as Error).message);
  }

  // Approach 3: barttorvik.com JSON API (previous season fallback)
  try {
    const url = `https://barttorvik.com/getjson.php?year=${PREV}&tvalue=100&conlimit=All&state=All&begin=${PREV - 1}1101&end=${PREV}0601&top=0&revquad=0&site=All&type=All&quad=5&sortby=2`;
    const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    if (Array.isArray(resp.data) && resp.data.length > 50) {
      return parseTorkvikJson(resp.data);
    }
  } catch (err) {
    console.warn('[Torvik] Previous-year JSON failed:', (err as Error).message);
  }

  // Approach 4: barttorvik.com HTML scrape
  try {
    return await scrapeTorkvikHtml();
  } catch (err) {
    console.error('[Torvik] All approaches failed:', (err as Error).message);
    return [];
  }
}

async function scrapeWarrenNolanTrank(year: number): Promise<TorkvikTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    `https://warrennolan.com/basketball/${year}/compare-rankings`,
    { headers: WN_HEADERS, timeout: 25000 }
  );
  const $ = cheerio.load(resp.data as string);

  // Find T-Rank column index from header row
  let trankColIdx = -1;
  $('table thead tr th').each((i, th) => {
    if ($(th).text().trim() === 'T-Rank') trankColIdx = i;
  });

  if (trankColIdx < 0) {
    throw new Error('T-Rank column not found in Warren Nolan compare-rankings');
  }

  const teams: TorkvikTeam[] = [];
  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length <= trankColIdx) return;
    // Team name is in an anchor in the first column
    const team =
      $(cells[0]).find('a').last().text().trim() || $(cells[0]).text().trim();
    const trankText = $(cells[trankColIdx]).text().trim();
    const rank = parseInt(trankText, 10);
    if (team && team.length > 1 && !isNaN(rank) && rank > 0) {
      teams.push({ rank, team, conference: '' });
    }
  });

  return teams.sort((a, b) => a.rank - b.rank);
}

function parseTorkvikJson(data: unknown[]): TorkvikTeam[] {
  const teams: TorkvikTeam[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    if (Array.isArray(row)) {
      let team = '';
      let conf = '';

      for (let j = 0; j < Math.min(row.length, 10); j++) {
        const val = String(row[j] ?? '').trim();
        if (
          val &&
          val.length > 2 &&
          isNaN(Number(val)) &&
          !val.includes('%') &&
          !val.match(/^\d+-\d+$/)
        ) {
          if (!team) team = val;
          else if (!conf && val.length <= 15) conf = val;
        }
      }

      if (team && team.length > 1) {
        teams.push({ rank: i + 1, team, conference: conf });
      }
    } else if (typeof row === 'object' && row !== null) {
      const r = row as Record<string, unknown>;
      const team = String(r.team ?? r.teamName ?? r.name ?? '').trim();
      const rank = Number(r.rank ?? r.rk ?? i + 1);
      const conference = String(r.conf ?? r.conference ?? '');
      if (team && team.length > 1) teams.push({ rank, team, conference });
    }
  }

  return teams.map((t, i) => ({ ...t, rank: i + 1 }));
}

async function scrapeTorkvikHtml(): Promise<TorkvikTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get('https://barttorvik.com/trank.php', {
    headers: { ...HEADERS, Accept: 'text/html,*/*' },
    timeout: 20000,
  });
  const $ = cheerio.load(resp.data as string);
  const teams: TorkvikTeam[] = [];

  $('table tbody tr').each((idx, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;
    const rankText = $(cells[0]).text().trim();
    const rank = parseInt(rankText, 10);
    const team = $(cells[1]).text().trim().replace(/\s+/g, ' ');
    const conference = $(cells[2]).text().trim();
    if (team && team.length > 1) {
      teams.push({ rank: isNaN(rank) ? idx + 1 : rank, team, conference });
    }
  });

  return teams;
}
