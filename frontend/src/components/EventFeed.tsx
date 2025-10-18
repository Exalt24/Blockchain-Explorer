import { useEffect, useRef, useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import type { BlockchainEvent } from '../types';

const EVENT_COLORS: Record<string, string> = {
  PlayerJoined: 'bg-[--color-success] text-white',
  ScoreUpdated: 'bg-[--color-primary] text-white',
  ItemPurchased: 'bg-[--color-secondary] text-white',
  GameReset: 'bg-[--color-danger] text-white',
};

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

interface EventItemProps {
  event: BlockchainEvent;
}

function EventItem({ event }: EventItemProps) {
  const colorClass = EVENT_COLORS[event.event_name] || 'bg-gray-600 text-white';
  const player = event.decoded_data?.player;

  return (
    <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-lg p-4 hover:border-[#3d3d54] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
              {event.event_name}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(event.timestamp)}
            </span>
          </div>

          {player && (
            <div className="text-sm text-gray-300 mb-1">
              Player: <span className="font-mono text-[--color-primary]">{truncateAddress(player)}</span>
            </div>
          )}

          {event.event_name === 'ScoreUpdated' && event.decoded_data && (
            <div className="text-sm text-gray-400">
              {event.decoded_data.oldScore} → {event.decoded_data.newScore}
            </div>
          )}

          {event.event_name === 'ItemPurchased' && event.decoded_data && (
            <div className="text-sm text-gray-400">
              Item #{event.decoded_data.itemId} • Price: {event.decoded_data.price}
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            Block #{event.block_number} • Tx:{' '}
            <a
              href={`https://etherscan.io/tx/${event.transaction_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[--color-primary] hover:underline font-mono"
            >
              {truncateAddress(event.transaction_hash)}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventFeed() {
  const { events, loading, error } = useEvents({ limit: 50 }, true);
  const [autoScroll, setAutoScroll] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  const eventList = events || [];

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [eventList, autoScroll]);

  return (
    <div className="bg-[#16161f] border border-[#2d2d44] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#2d2d44] flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Live Event Feed</h2>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
      </div>

      <div
        ref={feedRef}
        className="p-6 space-y-3 overflow-y-auto"
        style={{ maxHeight: '600px' }}
      >
        {loading && eventList.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Loading events...
          </div>
        )}

        {error && (
          <div className="text-center text-[--color-danger] py-8">
            Error: {error}
          </div>
        )}

        {!loading && eventList.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No events yet. Waiting for blockchain activity...
          </div>
        )}

        {eventList.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}