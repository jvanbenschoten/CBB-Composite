/**
 * USA Today Coaches Poll scraper
 * Source: NCAA rankings page (coaches poll) or USA Today
 * Only ranks top 25 teams
 */
import axios from 'axios';

export interface CoachesPollTeam {
  rank: number;
  team: string;
  points?: number;
  firstPlaceVotes?: number;
}

const NCAA_COACHES_URL =
  'https://www.ncaa.com/rankings/basketball-men/d1/usa-today-coaches';

const USAT_URL =
  'https://sportsdata.usatoday.com/basketball/ncaab/polls/coaches';

export async function scrapeCoachesPoll(): Promise<CoachesPollTeam[]> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  // Try NCAA Coaches Poll page first
  try {
    const resp = await axios.get(NCAA_COACHES_URL, { headers, timeout: 15000 });
    const teams = await parseCoachesHtml(resp.data);
    if (teams.length > 0) return teams;
  } catch (err) {
    console.warn('[Coaches] NCAA URL failed, trying USA Today...', err);
  }

  // Try USA Today
  try {
    const resp = await axios.get(USAT_URL, { headers, timeout: 15000 });
    const teams = await parseCoachesHtml(resp.data);
    if (teams.length > 0) return teams;
  } catch (err) {
    console.error('[Coaches] USA Today also failed:', err);
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
    const teamLink = teamCell.find('a').first().text().trim();
    const team = teamLink || teamCell.text().trim().split('\n')[0].trim();
    const points = parseInt($(cells[cells.length - 1]).text().trim().replace(',', ''), 10);

    if (!isNaN(rank) && rank >= 1 && rank <= 25 && team && team.length > 1) {
      teams.push({
        rank,
        team,
        points: isNaN(points) ? undefined : points,
      });
    }
  });

  // Fallback: div-based layouts
  if (teams.length === 0) {
    $('.rankings-table tr, .poll-table tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length < 2) return;
      const rank = parseInt($(cells[0]).text(), 10);
      const team = $(cells[1]).text().trim().split('\n')[0].trim();
      if (!isNaN(rank) && rank >= 1 && rank <= 25 && team) {
        teams.push({ rank, team });
      }
    });
  }

  return teams.slice(0, 25);
}
