import { TeamRanking, RankingSource, SOURCES } from '@/types';

/**
 * How many teams each source ranks.
 * Full-ranking algorithmic sources cover all ~365 D-I teams.
 * Polls (AP, Coaches) rank exactly 25 — but we normalize to 365
 * so AP #1 and NET #1 carry the same raw percentile (1.0).
 */
const TOTAL_TEAMS = 365;

// Build weight lookup from the SOURCES config so weights live in one place.
const SOURCE_WEIGHTS = new Map<RankingSource, number>(
  SOURCES.map((s) => [s.id, s.weight])
);

/**
 * Calculates composite rankings using a weighted percentile formula.
 *
 * Method:
 *   For each selected source where the team has a rank:
 *     percentile = (365 − rank + 1) / 365   → 1.0 (best) … ~0.003 (worst)
 *     contribution = sourceWeight × percentile
 *   compositeScore = (Σ contributions / Σ weights of ranked sources) × 100
 *
 * Weights (from SOURCES config, higher = more influential):
 *   NET 20 · KenPom 18 · Torvik 15 · BPI 12 · SOR 10 · KPI 8 · ELO 7
 *   Sagarin 5 · WAB 5 · AP Poll 4 · Coaches Poll 3
 *
 * Score range: 0–100, one decimal place (higher = better team).
 * Teams unranked in a source have that source excluded from their average
 * — weight is redistributed among sources that did rank them.
 * Tiebreaker: more sources ranked → higher confidence → better composite.
 */
export function calculateComposite(
  teams: TeamRanking[],
  selectedSources: RankingSource[]
): TeamRanking[] {
  if (selectedSources.length === 0) {
    return teams.map((t) => ({ ...t, composite: undefined, sourcesRanked: 0 }));
  }

  const withScores = teams.map((team) => {
    let weightedSum = 0;
    let totalWeight = 0;
    let sourcesRanked = 0;

    for (const source of selectedSources) {
      const rank = team[source];
      if (rank !== undefined && rank !== null && rank > 0) {
        const percentile = (TOTAL_TEAMS - rank + 1) / TOTAL_TEAMS;
        const weight = SOURCE_WEIGHTS.get(source) ?? 1;
        weightedSum += weight * percentile;
        totalWeight += weight;
        sourcesRanked++;
      }
    }

    const avgScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : -1;
    return { team, sourcesRanked, avgScore };
  });

  // Sort: highest score first (= best team); unranked (avgScore = -1) go last
  withScores.sort((a, b) => {
    if (a.avgScore !== b.avgScore) return b.avgScore - a.avgScore;
    // Tiebreaker: more sources ranked → higher confidence
    return b.sourcesRanked - a.sourcesRanked;
  });

  return withScores.map(({ team, sourcesRanked, avgScore }) => ({
    ...team,
    composite: avgScore >= 0 ? Math.round(avgScore * 10) / 10 : undefined,
    sourcesRanked,
  }));
}
