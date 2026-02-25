'use client';

interface RefreshButtonProps {
  onRefresh: () => void;
  loading: boolean;
  lastUpdated?: string;
  cacheAgeMs?: number;
}

function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function RefreshButton({ onRefresh, loading, lastUpdated, cacheAgeMs }: RefreshButtonProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={onRefresh}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          loading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
        }`}
      >
        <svg
          className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {loading ? 'Refreshing…' : 'Refresh Rankings'}
      </button>

      {lastUpdated && !loading && (
        <span className="text-xs text-gray-500">
          Updated {cacheAgeMs !== undefined ? formatAge(cacheAgeMs) : formatTime(lastUpdated)}
          {' '}• {formatTime(lastUpdated)}
        </span>
      )}
    </div>
  );
}
