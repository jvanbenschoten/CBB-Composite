/**
 * NCAA NET Rankings scraper
 * Step 1: fetch current ranking period ID → Step 2: fetch rankings for that period
 * Multiple fallbacks included
 */
import axios from 'axios';

export interface NetTeam {
  rank: number;
  team: string;
  conference: string;
  record: string;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.ncaa.com/',
  Origin: 'https://www.ncaa.com',
};

export async function scrapeNet(): Promise<NetTeam[]> {
  // Approach 1: Get current ranking period, then fetch rankings
  try {
    const periodsResp = await axios.get(
      'https://ratings.ncaa.com/ranking_periods?sport_code=MBB&division_id=1',
      { headers: HEADERS, timeout: 10000 }
    );
    const periods = periodsResp.data;
    if (Array.isArray(periods) && periods.length > 0) {
      const latest = periods[0] as Record<string, unknown>;
      const periodId = latest.ranking_period_id ?? latest.id ?? latest.rankingPeriodId;
      if (periodId) {
        const rankResp = await axios.get(
          `https://ratings.ncaa.com/national_team_rankings?week=&year=&ranking_period_id=${periodId}&division_id=1&sport_code=MBB`,
          { headers: HEADERS, timeout: 15000 }
        );
        if (Array.isArray(rankResp.data) && rankResp.data.length > 20) {
          return parseNcaaApi(rankResp.data);
        }
      }
    }
  } catch (err) {
    console.warn('[NET] Period-based API failed:', (err as Error).message);
  }

  // Approach 2: Direct API without period
  try {
    const resp = await axios.get(
      'https://ratings.ncaa.com/national_team_rankings?week=&year=&ranking_period_id=&division_id=1&sport_code=MBB',
      { headers: HEADERS, timeout: 15000 }
    );
    if (Array.isArray(resp.data) && resp.data.length > 20) {
      return parseNcaaApi(resp.data);
    }
  } catch (err) {
    console.warn('[NET] Direct API failed:', (err as Error).message);
  }

  // Approach 3: HTML scrape
  try {
    return await scrapeNetHtml();
  } catch (err) {
    console.error('[NET] All approaches failed:', (err as Error).message);
    return [];
  }
}

function parseNcaaApi(data: Record<string, unknown>[]): NetTeam[] {
  const teams: NetTeam[] = [];
  for (const item of data) {
    const rank = Number(
      item.ranking_period_rank ?? item.rank ?? item.net_rank ?? item.current_rank
    );
    const teamName = String(
      item.team_name ?? item.name ?? item.teamName ?? item.team ?? ''
    ).trim();
    const conference = String(item.conf_name ?? item.conference_name ?? item.conference ?? '');
    const wins = item.wins ?? item.team_wins ?? '';
    const losses = item.losses ?? item.team_losses ?? '';
    const record =
      wins !== '' && losses !== '' ? `${wins}-${losses}` : String(item.record ?? '');
    if (rank && teamName) teams.push({ rank, team: teamName, conference, record });
  }
  teams.sort((a, b) => a.rank - b.rank);
  return teams;
}

async function scrapeNetHtml(): Promise<NetTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    'https://www.ncaa.com/rankings/basketball-men/d1/NCAA_Men_Basketball_Net_Rankings',
    {
      headers: { ...HEADERS, Accept: 'text/html,application/xhtml+xml,*/*' },
      timeout: 20000,
    }
  );
  const $ = cheerio.load(resp.data as string);
  const teams: NetTeam[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;
    const rank = parseInt($(cells[0]).text().trim(), 10);
    const teamCell = $(cells[1]);
    const team = (teamCell.find('a').first().text().trim() || teamCell.text().trim())
      .replace(/\s+/g, ' ')
      .trim();
    const conference = $(cells[2]).text().trim();
    const record = cells.length > 3 ? $(cells[3]).text().trim() : '';
    if (!isNaN(rank) && team) teams.push({ rank, team, conference, record });
  });

  teams.sort((a, b) => a.rank - b.rank);
  return teams;
}
