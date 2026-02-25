/**
 * Main scraper orchestrator
 * Fetches all ranking sources in parallel and merges them into a unified team list.
 */
import { RankingsData, TeamRanking, RankingSource } from '@/types';
import { scrapeNet } from './net';
import { scrapeBpi } from './bpi';
import { scrapeTorvik } from './torvik';
import { scrapeApPoll } from './ap';
import { scrapeCoachesPoll } from './coaches';
import { findCanonicalTeam } from '../teamNormalizer';

export async function scrapeAllRankings(): Promise<RankingsData> {
  console.log('[Scraper] Starting all ranking scrapes...');

  const sourceStatus: Record<RankingSource, 'success' | 'error' | 'pending'> =
    {
      net: 'pending',
      bpi: 'pending',
      torvik: 'pending',
      ap: 'pending',
      coaches: 'pending',
    };

  // Scrape all sources in parallel
  const [netResult, bpiResult, torkvikResult, apResult, coachesResult] =
    await Promise.allSettled([
      scrapeNet(),
      scrapeBpi(),
      scrapeTorvik(),
      scrapeApPoll(),
      scrapeCoachesPoll(),
    ]);

  // --- Process NET (authoritative team list) ---
  let netTeams: Awaited<ReturnType<typeof scrapeNet>> = [];
  if (netResult.status === 'fulfilled' && netResult.value.length > 0) {
    netTeams = netResult.value;
    sourceStatus.net = 'success';
    console.log(`[NET] Loaded ${netTeams.length} teams`);
  } else {
    sourceStatus.net = 'error';
    console.error('[NET] Failed to load rankings');
  }

  // Build canonical team list from NET (limit to 365)
  const canonicalList = netTeams.slice(0, 365).map((t) => t.team);

  // Initialize team map with NET data
  const teamMap = new Map<string, TeamRanking>();
  for (const t of netTeams.slice(0, 365)) {
    teamMap.set(t.team, {
      team: t.team,
      conference: t.conference,
      record: t.record,
      net: t.rank,
    });
  }

  // If NET failed entirely, we have no team list — return empty
  if (canonicalList.length === 0) {
    return {
      teams: [],
      lastUpdated: new Date().toISOString(),
      sourceStatus,
    };
  }

  // --- Helper: merge a source's rankings into the team map ---
  function mergeSource(
    result: PromiseSettledResult<{ rank: number; team: string }[]>,
    sourceKey: RankingSource
  ) {
    if (result.status === 'rejected') {
      sourceStatus[sourceKey] = 'error';
      console.error(`[${sourceKey.toUpperCase()}] Scrape failed:`, result.reason);
      return;
    }

    const sourceTeams = result.value;
    if (sourceTeams.length === 0) {
      sourceStatus[sourceKey] = 'error';
      return;
    }

    sourceStatus[sourceKey] = 'success';
    console.log(`[${sourceKey.toUpperCase()}] Loaded ${sourceTeams.length} teams`);

    for (const srcTeam of sourceTeams) {
      // Try to find a match in our canonical list
      const canonical = findCanonicalTeam(srcTeam.team, canonicalList);
      if (canonical && teamMap.has(canonical)) {
        const entry = teamMap.get(canonical)!;
        entry[sourceKey] = srcTeam.rank;
      } else {
        // Try case-insensitive exact match
        const lower = srcTeam.team.toLowerCase().trim();
        let found: string | undefined;
        for (const name of canonicalList) {
          if (name.toLowerCase() === lower) {
            found = name;
            break;
          }
        }
        if (found && teamMap.has(found)) {
          teamMap.get(found)![sourceKey] = srcTeam.rank;
        } else {
          console.debug(
            `[${sourceKey.toUpperCase()}] No canonical match for: "${srcTeam.team}"`
          );
        }
      }
    }
  }

  mergeSource(bpiResult, 'bpi');
  mergeSource(torkvikResult, 'torvik');
  mergeSource(apResult, 'ap');
  mergeSource(coachesResult, 'coaches');

  const teams = Array.from(teamMap.values());

  // Sort by NET rank for initial display
  teams.sort((a, b) => (a.net ?? 999) - (b.net ?? 999));

  return {
    teams,
    lastUpdated: new Date().toISOString(),
    sourceStatus,
  };
}
