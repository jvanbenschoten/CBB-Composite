import { RankingsData } from '@/types';

interface CacheEntry {
  data: RankingsData;
  timestamp: number;
}

// Module-level cache — survives across requests in the same server process
let cache: CacheEntry | null = null;

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function getCachedRankings(): RankingsData | null {
  if (!cache) return null;
  const age = Date.now() - cache.timestamp;
  if (age > CACHE_TTL_MS) {
    cache = null;
    return null;
  }
  return cache.data;
}

export function setCachedRankings(data: RankingsData): void {
  cache = {
    data,
    timestamp: Date.now(),
  };
}

export function clearCache(): void {
  cache = null;
}

export function getCacheAge(): number | null {
  if (!cache) return null;
  return Date.now() - cache.timestamp;
}
