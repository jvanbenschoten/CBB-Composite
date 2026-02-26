import { TeamRanking, RankingSource, SOURCES } from '@/types';

/**
 * How many teams each source effectively ranks.
 * Full-ranking sources (NET, BPI, Torvik) rank all ~365 D1 teams.
 * Poll-only sources (AP, Coaches) rank exactly 25 teams.
 * We normalize ALL sources to the same 365-team scale so that
 * AP #1 = percentile score of 365/365 (same elite tier as NET #1)
 * AP #25 = percentile score of 341/365 (~93rd percentile — still excellent)
 * This prevents raw-rank averaging from unduly penalizing teams that
 * appear in polls (small scale) vs algorithmic ratings (full scale).
 */
const TOTAL_TEAMS = 365;

const SOURCE_CONFIG: Record<RankingSource, { denominator: number }> = {
  net: { denominator: TOTAL_TEAMS },
  bpi: { denominator: TOTAL_TEAMS },
  torvik: { denominator: TOTAL_TEAMS },
  ap: { denominator: TOTAL_TEAMS },     // treat #1 in AP as #1 of 365
  coaches: { denominator: TOTAL_TEAMS },
};

/**
 * Calculates composite rankings for all teams given selected sources.
 *
 * Method: percentile normalization
 * - For each selected source that ranked the team:
 *     score = (denominator - rank + 1) / denominator
 *     e.g. NET #1 → 365/365 = 1.0 (best possible)
 *          NET #100 → 266/365 = 0.729
 *          AP #1 → 365/365 = 1.0 (elite)
 *          AP #25 → 341/365 = 0.934 (still excellent)
 * - Composite percentile = average of included scores
 * - Sort descending by composite percentile
 * - Assign integer composite rank (1 = best)
 *
 * Teams unranked in a poll are excluded from that poll's average
 * (not penalized) — same behavior as before.
 */
export function calculateComposite(
  teams: TeamRanking[],
  selectedSources: RankingSource[]
): TeamRanking[] {
  if (selectedSources.length === 0) {
    return teams.map((t) => ({ ...t, composite: undefined, sourcesRanked: 0 }));
  }

  // Compute percentile scores
  const withScores = teams.map((team) => {
    const scores: number[] = [];

    for (const source of selectedSources) {
      const rank = team[source];
      if (rank !== undefined && rank !== null && rank > 0) {
        const { denominator } = SOURCE_CONFIG[source];
        scores.push((denominator - rank + 1) / denominator);
      }
    }

    const sourcesRanked = scores.length;
    const avgScore =
      sourcesRanked > 0
        ? scores.reduce((sum, s) => sum + s, 0) / sourcesRanked
        : -1;

    return { team, sourcesRanked, avgScore };
  });

  // Sort: highest avgScore first (= best team); unranked (avgScore=-1) go last
  withScores.sort((a, b) => {
    if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
    // Tiebreaker: more sources ranked = higher confidence = better rank
    return b.sourcesRanked - a.sourcesRanked;
  });

  // Assign integer composite rank positions
  return withScores.map(({ team, sourcesRanked, avgScore }, idx) => ({
    ...team,
    composite: avgScore >= 0 ? idx + 1 : undefined,
    sourcesRanked,
  }));
}
