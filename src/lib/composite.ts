import { TeamRanking, RankingSource } from '@/types';

/**
 * Calculates composite rankings for all teams given selected sources.
 *
 * Rules:
 * - For each team, average the ranks from ONLY the sources that ranked them.
 * - If a team appears in zero selected sources, composite = undefined.
 * - Lower composite = better (like golf scoring).
 * - Tiebreaker: teams ranked by more sources rank higher than teams ranked by fewer.
 */
export function calculateComposite(
  teams: TeamRanking[],
  selectedSources: RankingSource[]
): TeamRanking[] {
  if (selectedSources.length === 0) {
    return teams.map((t) => ({ ...t, composite: undefined, sourcesRanked: 0 }));
  }

  const withComposite = teams.map((team) => {
    const ranks: number[] = [];

    for (const source of selectedSources) {
      const rank = team[source];
      if (rank !== undefined && rank !== null) {
        ranks.push(rank);
      }
    }

    const sourcesRanked = ranks.length;
    const composite =
      sourcesRanked > 0
        ? ranks.reduce((sum, r) => sum + r, 0) / sourcesRanked
        : undefined;

    return { ...team, composite, sourcesRanked };
  });

  // Sort: teams with a composite rank first (ascending), then unranked teams
  withComposite.sort((a, b) => {
    if (a.composite === undefined && b.composite === undefined) return 0;
    if (a.composite === undefined) return 1;
    if (b.composite === undefined) return -1;

    // Primary sort: composite score (lower = better)
    if (a.composite !== b.composite) return a.composite - b.composite;

    // Tiebreaker: more sources ranked = better
    return (b.sourcesRanked ?? 0) - (a.sourcesRanked ?? 0);
  });

  return withComposite;
}
