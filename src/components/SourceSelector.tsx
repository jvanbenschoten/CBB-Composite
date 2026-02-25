'use client';

import { SOURCES, SourceConfig, RankingSource } from '@/types';

interface SourceSelectorProps {
  selectedSources: Set<RankingSource>;
  onToggle: (source: RankingSource) => void;
  sourceStatus?: Record<RankingSource, 'success' | 'error' | 'pending'>;
}

const STATUS_ICONS: Record<string, string> = {
  success: '✓',
  error: '✗',
  pending: '…',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'text-green-600',
  error: 'text-red-500',
  pending: 'text-yellow-500',
};

export function SourceSelector({
  selectedSources,
  onToggle,
  sourceStatus,
}: SourceSelectorProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
        Composite Sources
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Select which rankings to include in the composite average. Teams not in a selected
        poll are excluded from that poll's contribution.
      </p>
      <div className="flex flex-col gap-3">
        {SOURCES.map((source) => (
          <SourceToggle
            key={source.id}
            source={source}
            selected={selectedSources.has(source.id)}
            status={sourceStatus?.[source.id]}
            onToggle={() => onToggle(source.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface SourceToggleProps {
  source: SourceConfig;
  selected: boolean;
  status?: 'success' | 'error' | 'pending';
  onToggle: () => void;
}

function SourceToggle({ source, selected, status, onToggle }: SourceToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="mt-0.5 relative flex-shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          onClick={onToggle}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'border-blue-600 bg-blue-600'
              : 'border-gray-300 bg-white group-hover:border-blue-400'
          }`}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: selected ? source.color : '#6b7280' }}
          >
            {source.label}
          </span>
          {!source.fullRanking && (
            <span className="text-xs text-gray-400 font-normal">(Top 25 only)</span>
          )}
          {status && (
            <span className={`text-xs font-medium ${STATUS_COLORS[status]}`}>
              {STATUS_ICONS[status]}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-snug">{source.description}</p>
      </div>
    </label>
  );
}
