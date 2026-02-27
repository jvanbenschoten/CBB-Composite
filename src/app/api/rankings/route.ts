import { NextResponse } from 'next/server';
import { scrapeAllRankings } from '@/lib/scrapers';
import { calculateComposite } from '@/lib/composite';
import { getCachedRankings, setCachedRankings, clearCache, getCacheAge } from '@/lib/cache';
import { SOURCES, RankingSource } from '@/types';

// Extend Vercel serverless function timeout to 30s (free plan max)
export const maxDuration = 30;

// Never let the browser cache the API response — always fetch fresh from the server.
const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// Pre-compute composite using the 9 algorithmic (full-ranking) sources,
// which is the default selection shown on page load.
const DEFAULT_SOURCES = SOURCES.filter((s) => s.fullRanking).map((s) => s.id) as RankingSource[];

function respond(data: ReturnType<typeof getCachedRankings>, extra: Record<string, unknown>) {
  if (!data) return NextResponse.json({ error: 'No data' }, { status: 500, headers: NO_CACHE });
  // Pre-compute composite server-side so the browser gets integer-exact ranks
  // on first load without running a potentially stale client bundle.
  const teamsWithComposite = calculateComposite(data.teams, DEFAULT_SOURCES);
  return NextResponse.json(
    { ...data, teams: teamsWithComposite, ...extra },
    { headers: NO_CACHE }
  );
}

// GET /api/rankings — return cached data (or scrape if cache is empty)
export async function GET() {
  try {
    let cached = getCachedRankings();
    if (!cached) {
      const data = await scrapeAllRankings();
      setCachedRankings(data);
      cached = data;
    }
    return respond(cached, { cacheAgeMs: getCacheAge() ?? 0, fromCache: true });
  } catch (err) {
    console.error('[API /rankings GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch rankings', details: String(err) },
      { status: 500, headers: NO_CACHE }
    );
  }
}

// POST /api/rankings — force refresh (clears cache and re-scrapes)
export async function POST() {
  try {
    clearCache();
    const data = await scrapeAllRankings();
    setCachedRankings(data);
    return respond(data, { cacheAgeMs: 0, fromCache: false });
  } catch (err) {
    console.error('[API /rankings POST]', err);
    return NextResponse.json(
      { error: 'Failed to refresh rankings', details: String(err) },
      { status: 500, headers: NO_CACHE }
    );
  }
}
