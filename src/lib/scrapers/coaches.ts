/**
 * USA Today Coaches Poll scraper
 * Primary: ESPN rankings API (same endpoint as AP, filtered for coaches poll)
 * Fallback: NCAA HTML page
 */
import axios from 'axios';
import { parseEspnRankings } from './ap';

export interface CoachesPollTeam {
  rank: number;
  team: string;
  points?: number;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, */*',
  Origin: 'https://www.espn.com',
  Referer: 'https://www.espn.com/mens-college-basketball/',
};

const ESPN_RANKINGS_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings';

export async function scrapeCoachesPoll(): Promise<CoachesPollTeam[]> {
  // Approach 1: ESPN rankings JSON API
  try {
    const resp = await axios.get(ESPN_RANKINGS_URL, { headers: HEADERS, timeout: 12000 });
    const teams = parseEspnRankings(resp.data, 'coaches');
    if (teams.length > 0) return teams;
  } catch (err) {
    console.warn('[Coaches] ESPN API failed:', (err as Error).message);
  }

  // Approach 2: NCAA HTML page
  try {
    const resp = await axios.get(
      'https://www.ncaa.com/rankings/basketball-men/d1/usa-today-coaches',
      { headers: { ...HEADERS, Accept: 'text/html,*/*' }, timeout: 15000 }
    );
    const teams = await parseCoachesHtml(resp.data as string);
    if (teams.length > 0) return teams;
  } catch (err) {
    console.warn('[Coaches] NCAA page failed:', (err as Error).message);
  }

  return [];
}

async function parseCoachesHtml(html: string): Promise<CoachesPollTeam[]> {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  const teams: CoachesPollTeam[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const rank = parseInt($(cells[0]).text().trim(), 10);
    const teamCell = $(cells[1]);
    const team = (teamCell.find('a').first().text().trim() || teamCell.text().trim())
      .split('\n')[0].trim();
    if (!isNaN(rank) && rank >= 1 && rank <= 25 && team && team.length > 1) {
      teams.push({ rank, team });
    }
  });

  return teams.slice(0, 25);
}
