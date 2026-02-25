/**
 * AP Top 25 Poll scraper
 * Primary: ESPN rankings API (official, JSON)
 * Fallback: NCAA HTML page
 */
import axios from 'axios';

export interface ApPollTeam {
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

// ESPN rankings API — returns AP + Coaches Poll in one call
const ESPN_RANKINGS_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings';

export async function scrapeApPoll(): Promise<ApPollTeam[]> {
  // Approach 1: ESPN rankings JSON API
  try {
    const resp = await axios.get(ESPN_RANKINGS_URL, { headers: HEADERS, timeout: 12000 });
    const teams = parseEspnRankings(resp.data, 'ap');
    if (teams.length > 0) return teams;
  } catch (err) {
    console.warn('[AP] ESPN API failed:', (err as Error).message);
  }

  // Approach 2: NCAA HTML page
  try {
    const resp = await axios.get(
      'https://www.ncaa.com/rankings/basketball-men/d1/associated-press',
      { headers: { ...HEADERS, Accept: 'text/html,*/*' }, timeout: 15000 }
    );
    const teams = await parseRankingsHtml(resp.data as string);
    if (teams.length > 0) return teams;
  } catch (err) {
    console.warn('[AP] NCAA page failed:', (err as Error).message);
  }

  return [];
}

export function parseEspnRankings(
  data: unknown,
  type: 'ap' | 'coaches'
): ApPollTeam[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  const rankings = Array.isArray(d.rankings) ? d.rankings : [];

  // Find the right poll
  const poll = rankings.find((r: unknown) => {
    const rr = r as Record<string, unknown>;
    const name = String(rr.name ?? rr.shortName ?? rr.type ?? '').toLowerCase();
    const typeField = String(rr.type ?? '').toLowerCase();
    if (type === 'ap') {
      return typeField === 'ap' || name.includes('associated press') || name.includes('ap top');
    } else {
      return (
        typeField === 'coaches' ||
        typeField === 'usatoday' ||
        name.includes('coaches') ||
        name.includes('usa today')
      );
    }
  }) as Record<string, unknown> | undefined;

  if (!poll) return [];

  const ranks = Array.isArray(poll.ranks) ? poll.ranks : [];
  const teams: ApPollTeam[] = [];

  for (const entry of ranks as Record<string, unknown>[]) {
    const rank = Number(entry.current ?? entry.rank ?? 0);
    const teamObj = (entry.team ?? {}) as Record<string, unknown>;
    const teamName = String(
      teamObj.shortDisplayName ??
      teamObj.location ??
      teamObj.displayName ??
      teamObj.name ??
      ''
    ).trim();
    const points = Number(entry.points ?? 0);

    if (rank && teamName && teamName.length > 1) {
      teams.push({ rank, team: teamName, points: points || undefined });
    }
  }

  return teams.sort((a, b) => a.rank - b.rank).slice(0, 25);
}

async function parseRankingsHtml(html: string): Promise<ApPollTeam[]> {
  const cheerio = await import('cheerio');
  const $ = cheerio.load(html);
  const teams: ApPollTeam[] = [];

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
