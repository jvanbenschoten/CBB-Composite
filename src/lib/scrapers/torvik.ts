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

// Year is current season start year
const YEAR = new Date().getMonth() >= 10 ? new Date().getFullYear() : new Date().getFullYear() - 1;

const JSON_URL = `https://barttorvik.com/getjson.php?year=${YEAR}&tvalue=100&conlimit=All&state=All&begin=${YEAR}1101&end=${YEAR + 1}0501&top=0&revquad=0&site=All&type=All&quad=5&sortby=2`;

export async function scrapeTorvik(): Promise<TorkvikTeam[]> {
  // Approach 1: JSON endpoint
  try {
    const resp = await axios.get(JSON_URL, { headers: HEADERS, timeout: 15000 });
    if (Array.isArray(resp.data) && resp.data.length > 50) {
      return parseTorkvikJson(resp.data);
    }
  } catch (err) {
    console.warn('[Torvik] JSON endpoint failed:', (err as Error).message);
  }

  // Approach 2: Try alternate year
  try {
    const altYear = YEAR - 1;
    const altUrl = `https://barttorvik.com/getjson.php?year=${altYear}&tvalue=100&conlimit=All&state=All&begin=${altYear}1101&end=${altYear + 1}0501&top=0&revquad=0&site=All&type=All&quad=5&sortby=2`;
    const resp = await axios.get(altUrl, { headers: HEADERS, timeout: 15000 });
    if (Array.isArray(resp.data) && resp.data.length > 50) {
      return parseTorkvikJson(resp.data);
    }
  } catch (err) {
    console.warn('[Torvik] Alt-year JSON failed:', (err as Error).message);
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
      // Torvik JSON format: [adjOE, adjDE, team, conf, record, barthag_rank, ...]
      // Indices can vary — team name is usually index 0 or 2
      let team = '';
      let conf = '';

      // Try to find the team name (a string that's not a number and looks like a team name)
      for (let j = 0; j < Math.min(row.length, 8); j++) {
        const val = String(row[j] ?? '').trim();
        if (val && isNaN(Number(val)) && val.length > 2 && !val.includes('%') && !val.includes('-')) {
          if (!team) team = val;
          else if (!conf && val.length <= 20) conf = val;
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
