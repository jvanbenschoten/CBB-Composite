/**
 * NCAA NET Rankings scraper
 * Source: NCAA official ratings API
 * Returns all D1 teams (the authoritative 365-team list)
 */
import axios from 'axios';

export interface NetTeam {
  rank: number;
  team: string;
  conference: string;
  record: string;
  netRating?: number;
}

const NCAA_API_URL =
  'https://ratings.ncaa.com/national_team_rankings?week=&year=&ranking_period_id=&division_id=1&sport_code=MBB';

// Fallback: try the casablanca API
const NCAA_CASABLANCA_URL =
  'https://data.ncaa.com/casablanca/rankings/basketball-men/d1/current/rankings.json';

export async function scrapeNet(): Promise<NetTeam[]> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    Referer: 'https://www.ncaa.com/',
  };

  // Try primary NCAA ratings API
  try {
    const resp = await axios.get(NCAA_API_URL, { headers, timeout: 15000 });
    const data = resp.data;

    // The API returns an array of ranking objects
    if (Array.isArray(data) && data.length > 0) {
      return parseNcaaRatingsApi(data);
    }
  } catch (err) {
    console.warn('[NET] Primary API failed, trying fallback...', err);
  }

  // Try casablanca fallback
  try {
    const resp = await axios.get(NCAA_CASABLANCA_URL, { headers, timeout: 15000 });
    const data = resp.data;
    if (data?.rankings) {
      return parseCasablancaRankings(data.rankings);
    }
  } catch (err) {
    console.warn('[NET] Casablanca API failed, trying scrape...', err);
  }

  // Final fallback: scrape the HTML page
  return scrapeNetHtml();
}

function parseNcaaRatingsApi(data: Record<string, unknown>[]): NetTeam[] {
  const teams: NetTeam[] = [];

  for (const item of data) {
    const rank = Number(item.ranking_period_rank ?? item.rank ?? item.net_rank);
    const teamName =
      (item.team_name as string) ||
      (item.name as string) ||
      String(item.team ?? '');
    const conference = String(item.conf_name ?? item.conference ?? '');
    const wins = item.wins ?? item.team_wins ?? '';
    const losses = item.losses ?? item.team_losses ?? '';
    const record = wins !== '' && losses !== '' ? `${wins}-${losses}` : '';

    if (rank && teamName) {
      teams.push({ rank, team: teamName, conference, record });
    }
  }

  // Sort by rank
  teams.sort((a, b) => a.rank - b.rank);
  return teams;
}

function parseCasablancaRankings(rankings: Record<string, unknown>[]): NetTeam[] {
  const teams: NetTeam[] = [];

  for (const item of rankings) {
    const rank = Number(item.rank ?? item.current_rank);
    const teamName = String(
      (item.team as Record<string, unknown>)?.name ??
        (item.team as Record<string, unknown>)?.shortName ??
        item.teamName ??
        ''
    );
    const conference = String(
      (item.conference as Record<string, unknown>)?.name ??
        item.conference ??
        ''
    );
    const record = String(item.record ?? '');

    if (rank && teamName) {
      teams.push({ rank, team: teamName, conference, record });
    }
  }

  teams.sort((a, b) => a.rank - b.rank);
  return teams;
}

async function scrapeNetHtml(): Promise<NetTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    'https://www.ncaa.com/rankings/basketball-men/d1/NCAA_Men_Basketball_Net_Rankings',
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 20000,
    }
  );

  const $ = cheerio.load(resp.data);
  const teams: NetTeam[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const rank = parseInt($(cells[0]).text().trim(), 10);
    const team = $(cells[1]).text().trim().replace(/\s+/g, ' ');
    const conference = $(cells[2]).text().trim();
    const record = $(cells[3])?.text().trim() ?? '';

    if (!isNaN(rank) && team) {
      teams.push({ rank, team, conference, record });
    }
  });

  teams.sort((a, b) => a.rank - b.rank);
  return teams;
}
