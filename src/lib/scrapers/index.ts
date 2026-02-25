/**
 * Main scraper orchestrator
 * Fetches all sources in parallel, merges into unified team list.
 * If NET fails, falls back to BPI or Torvik as canonical list.
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

  const sourceStatus: Record<RankingSource, 'success' | 'error' | 'pending'> = {
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

  // Process NET
  let netTeams: { rank: number; team: string; conference: string; record: string }[] = [];
  if (netResult.status === 'fulfilled' && netResult.value.length > 20) {
    netTeams = netResult.value;
    sourceStatus.net = 'success';
    console.log(`[NET] Loaded ${netTeams.length} teams`);
  } else {
    sourceStatus.net = 'error';
    console.error('[NET] Failed');
  }

  // Process BPI
  let bpiTeams: { rank: number; team: string }[] = [];
  if (bpiResult.status === 'fulfilled' && bpiResult.value.length > 20) {
    bpiTeams = bpiResult.value;
    sourceStatus.bpi = 'success';
    console.log(`[BPI] Loaded ${bpiTeams.length} teams`);
  } else {
    sourceStatus.bpi = 'error';
    console.error('[BPI] Failed');
  }

  // Process Torvik
  let torkvikTeams: { rank: number; team: string; conference: string }[] = [];
  if (torkvikResult.status === 'fulfilled' && torkvikResult.value.length > 20) {
    torkvikTeams = torkvikResult.value;
    sourceStatus.torvik = 'success';
    console.log(`[Torvik] Loaded ${torkvikTeams.length} teams`);
  } else {
    sourceStatus.torvik = 'error';
    console.error('[Torvik] Failed');
  }

  // --- Build canonical team list from the best available source ---
  // Priority: NET → BPI → Torvik
  let canonicalList: string[] = [];
  const teamMap = new Map<string, TeamRanking>();

  if (netTeams.length > 20) {
    // Use NET as canonical (limit to 365)
    for (const t of netTeams.slice(0, 365)) {
      canonicalList.push(t.team);
      teamMap.set(t.team, {
        team: t.team,
        conference: t.conference,
        record: t.record,
        net: t.rank,
      });
    }
  } else if (bpiTeams.length > 20) {
    // Fallback to BPI as canonical
    console.warn('[Scraper] NET failed, using BPI as canonical list');
    for (const t of bpiTeams.slice(0, 365)) {
      canonicalList.push(t.team);
      teamMap.set(t.team, { team: t.team, bpi: t.rank });
    }
  } else if (torkvikTeams.length > 20) {
    // Fallback to Torvik as canonical
    console.warn('[Scraper] NET+BPI failed, using Torvik as canonical list');
    for (const t of torkvikTeams.slice(0, 365)) {
      canonicalList.push(t.team);
      teamMap.set(t.team, { team: t.team, conference: t.conference, torvik: t.rank });
    }
  } else {
    // Complete failure
    console.error('[Scraper] All primary sources failed');
    return {
      teams: [],
      lastUpdated: new Date().toISOString(),
      sourceStatus,
    };
  }

  // Helper: merge a source's data into the canonical map
  function mergeSource(
    sourceTeams: { rank: number; team: string }[],
    sourceKey: RankingSource
  ) {
    if (sourceTeams.length === 0) return;

    for (const srcTeam of sourceTeams) {
      const canonical = findCanonicalTeam(srcTeam.team, canonicalList);
      if (canonical && teamMap.has(canonical)) {
        teamMap.get(canonical)![sourceKey] = srcTeam.rank;
      } else {
        // Exact case-insensitive fallback
        const lower = srcTeam.team.toLowerCase().trim();
        let found: string | undefined;
        for (const name of canonicalList) {
          if (name.toLowerCase() === lower) { found = name; break; }
        }
        if (found && teamMap.has(found)) {
          teamMap.get(found)![sourceKey] = srcTeam.rank;
        }
      }
    }
  }

  // Merge all sources (skip whichever became canonical — already set above)
  if (netTeams.length > 20 && sourceStatus.bpi === 'success') mergeSource(bpiTeams, 'bpi');
  if (sourceStatus.torvik === 'success') mergeSource(torkvikTeams, 'torvik');

  // AP Poll
  if (apResult.status === 'fulfilled' && apResult.value.length > 0) {
    sourceStatus.ap = 'success';
    console.log(`[AP] Loaded ${apResult.value.length} teams`);
    mergeSource(apResult.value, 'ap');
  } else {
    sourceStatus.ap = 'error';
    console.error('[AP] Failed');
  }

  // Coaches Poll
  if (coachesResult.status === 'fulfilled' && coachesResult.value.length > 0) {
    sourceStatus.coaches = 'success';
    console.log(`[Coaches] Loaded ${coachesResult.value.length} teams`);
    mergeSource(coachesResult.value, 'coaches');
  } else {
    sourceStatus.coaches = 'error';
    console.error('[Coaches] Failed');
  }

  // Also merge NET into map if BPI/Torvik was canonical and NET eventually loaded
  if (netTeams.length > 20 && canonicalList[0] !== netTeams[0]?.team) {
    mergeSource(netTeams, 'net');
  }

  const teams = Array.from(teamMap.values());
  // Initial sort: NET → BPI → Torvik rank
  teams.sort(
    (a, b) =>
      (a.net ?? a.bpi ?? a.torvik ?? 999) - (b.net ?? b.bpi ?? b.torvik ?? 999)
  );

  return {
    teams,
    lastUpdated: new Date().toISOString(),
    sourceStatus,
  };
}
