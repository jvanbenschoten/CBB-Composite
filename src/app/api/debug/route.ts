/**
 * Debug endpoint — tests each scraper individually and returns results.
 * Visit /api/debug in browser to diagnose scraping issues.
 */
import { NextResponse } from 'next/server';
import { scrapeNet } from '@/lib/scrapers/net';
import { scrapeBpi } from '@/lib/scrapers/bpi';
import { scrapeTorvik } from '@/lib/scrapers/torvik';
import { scrapeApPoll } from '@/lib/scrapers/ap';
import { scrapeCoachesPoll } from '@/lib/scrapers/coaches';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const results = await Promise.allSettled([
    scrapeNet(),
    scrapeBpi(),
    scrapeTorvik(),
    scrapeApPoll(),
    scrapeCoachesPoll(),
  ]);

  const [net, bpi, torvik, ap, coaches] = results;

  return NextResponse.json({
    net: {
      status: net.status,
      count: net.status === 'fulfilled' ? net.value.length : 0,
      sample: net.status === 'fulfilled' ? net.value.slice(0, 3) : [],
      error: net.status === 'rejected' ? String(net.reason) : null,
    },
    bpi: {
      status: bpi.status,
      count: bpi.status === 'fulfilled' ? bpi.value.length : 0,
      sample: bpi.status === 'fulfilled' ? bpi.value.slice(0, 3) : [],
      error: bpi.status === 'rejected' ? String(bpi.reason) : null,
    },
    torvik: {
      status: torvik.status,
      count: torvik.status === 'fulfilled' ? torvik.value.length : 0,
      sample: torvik.status === 'fulfilled' ? torvik.value.slice(0, 3) : [],
      error: torvik.status === 'rejected' ? String(torvik.reason) : null,
    },
    ap: {
      status: ap.status,
      count: ap.status === 'fulfilled' ? ap.value.length : 0,
      sample: ap.status === 'fulfilled' ? ap.value.slice(0, 3) : [],
      error: ap.status === 'rejected' ? String(ap.reason) : null,
    },
    coaches: {
      status: coaches.status,
      count: coaches.status === 'fulfilled' ? coaches.value.length : 0,
      sample: coaches.status === 'fulfilled' ? coaches.value.slice(0, 3) : [],
      error: coaches.status === 'rejected' ? String(coaches.reason) : null,
    },
  });
}
