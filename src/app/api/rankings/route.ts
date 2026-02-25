import { NextResponse } from 'next/server';
import { scrapeAllRankings } from '@/lib/scrapers';
import { getCachedRankings, setCachedRankings, clearCache, getCacheAge } from '@/lib/cache';

// GET /api/rankings — return cached data (or scrape if cache is empty)
export async function GET() {
  try {
    const cached = getCachedRankings();
    if (cached) {
      const ageMs = getCacheAge() ?? 0;
      return NextResponse.json({
        ...cached,
        cacheAgeMs: ageMs,
        fromCache: true,
      });
    }

    // No cache — scrape fresh data
    const data = await scrapeAllRankings();
    setCachedRankings(data);

    return NextResponse.json({ ...data, cacheAgeMs: 0, fromCache: false });
  } catch (err) {
    console.error('[API /rankings GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch rankings', details: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/rankings — force refresh (clears cache and re-scrapes)
export async function POST() {
  try {
    clearCache();
    const data = await scrapeAllRankings();
    setCachedRankings(data);

    return NextResponse.json({ ...data, cacheAgeMs: 0, fromCache: false });
  } catch (err) {
    console.error('[API /rankings POST]', err);
    return NextResponse.json(
      { error: 'Failed to refresh rankings', details: String(err) },
      { status: 500 }
    );
  }
}
