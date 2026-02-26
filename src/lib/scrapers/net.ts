/**
 * NCAA NET Rankings scraper
 * Primary: Warren Nolan NET page (consistent team names with WN compare-rankings)
 * Secondary: NCAA.com HTML (authoritative, but uses abbreviated names like "Iowa St.")
 * Tertiary: ratings.ncaa.com JSON API (may be blocked on cloud)
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
  Accept: 'text/html,application/xhtml+xml,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.ncaa.com/',
};

const WN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,*/*',
  Referer: 'https://warrennolan.com/',
};

function getSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
}

export async function scrapeNet(): Promise<NetTeam[]> {
  const year = getSeasonYear();

  // Approach 1: Warren Nolan NET page
  // Uses the SAME team name style as WN compare-rankings (BPI/Torvik source),
  // so all three sources share consistent names and match without aliases.
  try {
    const teams = await scrapeWarrenNolanNet(year);
    if (teams.length > 50) {
      console.log(`[NET] Warren Nolan loaded ${teams.length} teams`);
      return teams;
    }
  } catch (err) {
    console.warn('[NET] Warren Nolan failed:', (err as Error).message);
  }

  // Approach 2: NCAA.com HTML (authoritative but uses abbreviations like "Iowa St.")
  try {
    const teams = await scrapeNcaaCom();
    if (teams.length > 50) {
      console.log(`[NET] NCAA.com loaded ${teams.length} teams`);
      return teams;
    }
  } catch (err) {
    console.warn('[NET] NCAA.com failed:', (err as Error).message);
  }

  // Approach 3: ratings.ncaa.com JSON API (may be blocked on cloud IPs)
  try {
    const resp = await axios.get(
      'https://ratings.ncaa.com/national_team_rankings?week=&year=&ranking_period_id=&division_id=1&sport_code=MBB',
      { headers: { ...HEADERS, Accept: 'application/json, */*' }, timeout: 15000 }
    );
    if (Array.isArray(resp.data) && resp.data.length > 20) {
      const teams = parseNcaaApi(resp.data);
      if (teams.length > 50) return teams;
    }
  } catch (err) {
    console.warn('[NET] ratings.ncaa.com API failed:', (err as Error).message);
  }

  console.error('[NET] All approaches failed');
  return [];
}

/**
 * Also export a function that scrapes NCAA.com conference data only.
 * Used by the orchestrator to enrich teams with conference information
 * when the canonical list comes from Warren Nolan (which lacks conference).
 */
export async function scrapeNcaaConferences(): Promise<Map<string, string>> {
  const confMap = new Map<string, string>();
  try {
    // Import normalizer lazily to avoid circular deps
    const { normalizeTeamName } = await import('../teamNormalizer');
    const teams = await scrapeNcaaCom();
    for (const t of teams) {
      if (!t.conference) continue;
      // Store under the normalized canonical name (e.g. "Iowa St." → "Iowa State")
      // so the orchestrator can look up conference using WN canonical names.
      const canonical = normalizeTeamName(t.team);
      confMap.set(canonical.toLowerCase(), t.conference);
      // Also store under the raw NCAA.com name as fallback
      confMap.set(t.team.toLowerCase(), t.conference);
    }
  } catch {
    // Best-effort — not critical
  }
  return confMap;
}

async function scrapeWarrenNolanNet(year: number): Promise<NetTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    `https://warrennolan.com/basketball/${year}/net`,
    { headers: WN_HEADERS, timeout: 20000 }
  );
  const $ = cheerio.load(resp.data as string);
  const teams: NetTeam[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    // Team name is inside an anchor in the first column
    const team = $(cells[0]).find('a').last().text().trim();
    const record = cells.length > 1 ? $(cells[1]).text().trim() : '';
    // NET rank is in the cell with class 'cell-right-black' or 3rd column
    const rankCell = $(row).find('td.cell-right-black');
    const rankText = rankCell.length > 0 ? rankCell.first().text().trim() : $(cells[2]).text().trim();
    const rank = parseInt(rankText, 10);
    if (team && team.length > 1 && !isNaN(rank) && rank > 0) {
      teams.push({ rank, team, conference: '', record });
    }
  });

  teams.sort((a, b) => a.rank - b.rank);
  return teams;
}

async function scrapeNcaaCom(): Promise<NetTeam[]> {
  const cheerio = await import('cheerio');
  const resp = await axios.get(
    'https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings',
    { headers: HEADERS, timeout: 20000 }
  );
  const $ = cheerio.load(resp.data as string);
  const teams: NetTeam[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;
    const rank = parseInt($(cells[0]).text().trim(), 10);
    const teamCell = $(cells[1]);
    const team = (teamCell.find('a').first().text().trim() || teamCell.text().trim())
      .replace(/\s+/g, ' ')
      .trim();
    // NCAA.com columns: 0=Rank, 1=School, 2=Record, 3=Conf, 4=Road, ...
    const record = cells.length > 2 ? $(cells[2]).text().trim() : '';
    const conference = cells.length > 3 ? $(cells[3]).text().trim() : '';
    if (!isNaN(rank) && rank > 0 && team && team.length > 1) {
      teams.push({ rank, team, conference, record });
    }
  });

  teams.sort((a, b) => a.rank - b.rank);
  return teams;
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
