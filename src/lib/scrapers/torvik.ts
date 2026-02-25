/**
 * Barttorvik T-Rank (Torvik) scraper
 * Source: barttorvik.com
 * Ranks all D1 teams by efficiency rating
 */
import axios from 'axios';

export interface TorkvikTeam {
  rank: number;
  team: string;
  conference?: string;
}

const TORVIK_URL = 'https://barttorvik.com/trank.php';
const TORVIK_JSON_URL = 'https://barttorvik.com/getjson.php?year=2025&tvalue=100&conlimit=All&state=All&begin=20241101&end=20260501&top=0&revquad=0&site=All&type=All&quad=5&sortby=2';

export async function scrapeTorvik(): Promise<TorkvikTeam[]> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    Referer: 'https://barttorvik.com/',
  };

  // Try JSON endpoint first (cleaner)
  try {
    const resp = await axios.get(TORVIK_JSON_URL, {
      headers: { ...headers, Accept: 'application/json, */*' },
      timeout: 15000,
    });

    if (Array.isArray(resp.data) && resp.data.length > 0) {
      return parseTorkvikJson(resp.data);
    }
  } catch (err) {
    console.warn('[Torvik] JSON endpoint failed, trying HTML...', err);
  }

  // Fall back to HTML scraping
  try {
    const resp = await axios.get(TORVIK_URL, { headers, timeout: 20000 });
    return parseTorkvikHtml(resp.data);
  } catch (err) {
    console.error('[Torvik] HTML scrape failed:', err);
    return [];
  }
}

// Torvik JSON: array of arrays — [rank, team, conf, ...]
function parseTorkvikJson(data: unknown[]): TorkvikTeam[] {
  const teams: TorkvikTeam[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      // Format: [adjOE, adjDE, teamName, conf, record, rank, ...]
      // Or sometimes the rank is derived from position
      const team = String(row[0] ?? row[1] ?? row[2] ?? '').trim();
      const conf = String(row[1] ?? row[3] ?? '').trim();

      // Try to find rank — might be in position 5 or implicit by array index
      let rank = Number(row[5] ?? row[6] ?? 0);
      if (!rank || isNaN(rank)) rank = i + 1;

      if (team && team.length > 1 && !team.includes('Team')) {
        teams.push({ rank, team, conference: conf });
      }
    } else if (typeof row === 'object' && row !== null) {
      const r = row as Record<string, unknown>;
      const team = String(r.team ?? r.teamName ?? r.name ?? '').trim();
      const rank = Number(r.rank ?? r.rk ?? i + 1);
      const conference = String(r.conf ?? r.conference ?? '');

      if (team && team.length > 1) {
        teams.push({ rank, team, conference });
      }
    }
  }

  // Sort by rank and assign sequential ranks if needed
  teams.sort((a, b) => a.rank - b.rank);
  return teams.map((t, i) => ({ ...t, rank: i + 1 }));
}

async function parseTorkvikHtml(html: string): Promise<TorkvikTeam[]> {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  const teams: TorkvikTeam[] = [];

  // Torvik's main table has class 'main-table' or similar
  $('table tbody tr, #main-table tbody tr').each((idx, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const firstCell = $(cells[0]).text().trim();
    const rank = parseInt(firstCell, 10);

    // Team name is usually in cell 1 or 2
    let team = $(cells[1]).text().trim();
    if (!team || team.length < 2) team = $(cells[2]).text().trim();
    const conference = $(cells[2]).text().trim();

    if (!isNaN(rank) && team && team.length > 1) {
      teams.push({ rank, team, conference });
    } else if (team && team.length > 1) {
      // Rank not found in first cell, use index
      teams.push({ rank: idx + 1, team, conference });
    }
  });

  return teams;
}
