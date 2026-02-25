# CBB Composite Rankings

A web dashboard that aggregates men's college basketball rankings from five sources into a single composite ranking. Toggle which sources contribute to the composite and explore rankings for all 365 D-I teams.

## Sources

| Source | Coverage | Type |
|--------|----------|------|
| **NET** (NCAA Evaluation Tool) | All ~365 D-I teams | Algorithmic |
| **ESPN BPI** (Basketball Power Index) | All ~365 D-I teams | Efficiency-based |
| **Torvik** (T-Rank) | All ~365 D-I teams | Tempo-adjusted efficiency |
| **AP Poll** | Top 25 only | Media voter poll |
| **Coaches Poll** (USA Today) | Top 25 only | Head coaches ballot |

## How Composite Works

For each team, the composite rank is the **average of all selected sources that ranked the team**. Teams not in a poll (e.g., rank 26+ in AP) are simply excluded from that poll's contribution — they are not penalized.

```
Composite = Sum of selected ranks ÷ Number of selected sources that ranked the team
```

## Features

- **Live scraping** — click "Refresh Rankings" to pull fresh data from all sources
- **Source toggles** — include/exclude any source from the composite calculation
- **Sortable table** — click any column header to sort
- **Search** — filter teams by name or conference
- **Pagination** — 50 teams per page for fast rendering
- **Color coding** — top 5 (gold), top 25 (blue), others (default)
- **Source status** — see which sources loaded successfully
- **In-memory cache** — data cached for 4 hours to avoid hammering source sites

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & run locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

## Deploying to Vercel (Recommended)

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) and import the GitHub repo
3. Vercel auto-detects Next.js — click **Deploy**

No environment variables needed. All data sources are public.

## Project Structure

```
src/
├── app/
│   ├── api/rankings/route.ts   # GET (cached) / POST (force refresh) scraping API
│   ├── page.tsx                # Main dashboard
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Tailwind styles
├── components/
│   ├── RankingsTable.tsx       # Sortable, filterable rankings table
│   ├── SourceSelector.tsx      # Composite source checkboxes
│   ├── CompositeExplainer.tsx  # Methodology explainer
│   └── RefreshButton.tsx       # Trigger re-scrape
├── lib/
│   ├── scrapers/               # Per-source scraper modules
│   │   ├── index.ts            # Orchestrator (scrapes all, merges)
│   │   ├── net.ts              # NCAA NET
│   │   ├── bpi.ts              # ESPN BPI
│   │   ├── torvik.ts           # Barttorvik T-Rank
│   │   ├── ap.ts               # AP Poll
│   │   └── coaches.ts          # Coaches Poll
│   ├── composite.ts            # Composite rank calculation
│   ├── cache.ts                # In-memory cache
│   └── teamNormalizer.ts       # Name alias resolution
└── types/index.ts              # Shared TypeScript types
```

## Notes

- Data is scraped from public websites and APIs. Some sources may occasionally be unavailable or change their structure — the app gracefully handles failures and shows which sources loaded successfully.
- Polling sites (AP, Coaches) only rank 25 teams. For composite purposes, unranked teams simply don't get a contribution from those polls.
- Team names are normalized across sources to prevent duplicates. The canonical team list is always pulled from the NET rankings (365 D-I teams).

## License

MIT — built for informational and educational purposes. Not affiliated with the NCAA, ESPN, AP, or any other organization.
