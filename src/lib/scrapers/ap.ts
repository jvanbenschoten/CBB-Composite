/**
 * AP Top 25 Poll scraper
 * Source: NCAA rankings page (AP poll) or sports-reference
 * Only ranks top 25 teams
 */
import axios from 'axios';

export interface ApPollTeam {
  rank: number;
  team: string;
  points?: number;
  firstPlaceVotes?: number;
}

// NCAA hosts the AP poll
const NCAA_AP_URL =
  'https://www.ncaa.com/rankings/basketball-men/d1/associated-press';

// Sports Reference AP Poll
const SPORTS_REF_URL =
  'https://www.sports-reference.com/cbb/polls/ap-men.html';

export async function scrapeApPoll(): Promise<ApPollTeam[]> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  // Try NCAA AP poll page
  try {
    const resp = await axios.get(NCAA_AP_URL, { headers, timeout: 15000 });
    const teams = await parseApHtml(resp.data);
    if (teams.length > 0) return teams;
  } catch (err) {
    console.warn('[AP] NCAA AP URL failed, trying Sports Reference...', err);
  }

  // Try Sports Reference
  try {
    const resp = await axios.get(SPORTS_REF_URL, { headers, timeout: 15000 });
    const teams = await parseSportsRefApHtml(resp.data);
    if (teams.length > 0) return teams;
  } catch (err) {
    console.error('[AP] Sports Reference also failed:', err);
  }

  return [];
}

async function parseApHtml(html: string): Promise<ApPollTeam[]> {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  const teams: ApPollTeam[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    const rank = parseInt($(cells[0]).text().trim(), 10);
    // Team name might have extra text (record, etc.) — grab just the link text if possible
    const teamCell = $(cells[1]);
    const teamLink = teamCell.find('a').first().text().trim();
    const team = teamLink || teamCell.text().trim().split('\n')[0].trim();
    const points = parseInt($(cells[cells.length - 1]).text().trim().replace(',', ''), 10);

    if (!isNaN(rank) && rank >= 1 && rank <= 25 && team) {
      teams.push({
        rank,
        team,
        points: isNaN(points) ? undefined : points,
      });
    }
  });

  // Fallback: try list items if no table
  if (teams.length === 0) {
    let rank = 1;
    $('.rankings-table tr, .poll-rankings tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length < 2) return;
      const possibleRank = parseInt($(cells[0]).text(), 10);
      const team = $(cells[1]).text().trim().split('\n')[0].trim();
      if (!isNaN(possibleRank) && team) {
        teams.push({ rank: possibleRank, team });
        rank = possibleRank + 1;
      }
    });
  }

  return teams.slice(0, 25);
}

async function parseSportsRefApHtml(html: string): Promise<ApPollTeam[]> {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  const teams: ApPollTeam[] = [];

  // Sports-reference has a specific table structure
  $('#polls-men tbody tr, table#poll tbody tr').each((_, row) => {
    const cells = $(row).find('td, th');
    if (cells.length < 2) return;

    const rank = parseInt($(cells[0]).text().trim(), 10);
    const team = $(cells[1]).text().trim();

    if (!isNaN(rank) && rank >= 1 && rank <= 25 && team && team.length > 1) {
      teams.push({ rank, team });
    }
  });

  return teams.slice(0, 25);
}
