/**
 * Barttorvik T-Rank scraper
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

/**
 * Season end year: the year the tournament is held.
 * 2025-26 season → YEAR = 2026
 * Formula: if month >= 10 (Nov/Dec) we're in next year's season, else current year's.
 */
function getSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
}

export async function scrapeTorvik(): Promise<TorkvikTeam[]> {
  const YEAR = getSeasonYear();         // e.g. 2026 for 2025-26 season
  const PREV = YEAR - 1;                // e.g. 2025

  // Approach 1: current season JSON
  try {
    const url = `https://barttorvik.com/getjson.php?year=${YEAR}&tvalue=100&conlimit=All&state=All&begin=${PREV}1101&end=${YEAR}0601&top=0&revquad=0&site=All&type=All&quad=5&sortby=2`;
    const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    if (Array.isArray(resp.data) && resp.data.length > 50) {
      return parseTorkvikJson(resp.data);
    }
  } catch (err) {
    console.warn('[Torvik] Current-year JSON failed:', (err as Error).message);
  }

  // Approach 2: previous season JSON (fallback)
  try {
    const url = `https://barttorvik.com/getjson.php?year=${PREV}&tvalue=100&conlimit=All&state=All&begin=${PREV - 1}1101&end=${PREV}0601&top=0&revquad=0&site=All&type=All&quad=5&sortby=2`;
    const resp = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    if (Array.isArray(resp.data) && resp.data.length > 50) {
      return parseTorkvikJson(resp.data);
    }
  } catch (err) {
    console.warn('[Torvik] Previous-year JSON failed:', (err as Error).message);
  }

  // Approach 3: HTML scrape
  try {
    return await scrapeTorkvikHtml();
  } catch (err) {
    console.error('[Torvik] All approaches failed:', (err as Error).message);
    return [];
  }
}

function parseTorkvikJson(data: unknown[]): TorkvikTeam[] {
  const teams: TorkvikTeam[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    if (Array.isArray(row)) {
      // Torvik JSON format varies by year. Row is typically an array.
      // Scan for a string that looks like a team name (not a number, not short)
      let team = '';
      let conf = '';

      for (let j = 0; j < Math.min(row.length, 10); j++) {
        const val = String(row[j] ?? '').trim();
        if (
          val &&
          val.length > 2 &&
          isNaN(Number(val)) &&
          !val.includes('%') &&
          !val.match(/^\d+-\d+$/) // not a record like "24-5"
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
