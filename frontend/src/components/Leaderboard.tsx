import { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/api';
import type { LeaderboardEntry } from '../types';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchLeaderboard();
  }, [limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLeaderboard(limit);
      
      if (Array.isArray(data)) {
        setLeaderboard(data);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🏆 Leaderboard
          </h2>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-gray-700/50 rounded">
              <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-24"></div>
              </div>
              <div className="h-6 w-16 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          🏆 Leaderboard
        </h2>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">❌ {error}</p>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          🏆 Leaderboard
        </h2>
        <div className="text-center py-8 text-gray-400">
          No player activity yet. Be the first to join the game!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🏆 Leaderboard
        </h2>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          aria-label="Select number of players to display"
          className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm hover:bg-gray-600 transition-colors"
        >
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-3 pl-3 font-medium">Rank</th>
              <th className="pb-3 font-medium">Player</th>
              <th className="pb-3 font-medium text-right">Events</th>
              <th className="pb-3 pr-3 font-medium text-right">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {Array.isArray(leaderboard) && leaderboard.map((entry, index) => {
              const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
              const rankColor = index < 3 ? rankColors[index] : 'text-gray-500';
              const rankEmojis = ['🥇', '🥈', '🥉'];
              const rankEmoji = index < 3 ? rankEmojis[index] : '';
              
              const eventCount = (entry as any).event_count ?? (entry as any).eventCount ?? 0;
              const lastActivity = (entry as any).last_activity ?? (entry as any).lastActivity ?? new Date().toISOString();

              return (
                <tr key={entry.player || index} className="hover:bg-gray-700/50 transition-colors">
                  <td className="py-3 pl-3">
                    <span className={`font-bold ${rankColor} text-lg`}>
                      {rankEmoji} #{index + 1}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {entry.player ? entry.player.slice(2, 4).toUpperCase() : '??'}
                      </div>
                      <div>
                        <div className="font-mono text-sm text-white">
                          {formatAddress(entry.player)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {entry.player}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 font-semibold text-sm">
                      {eventCount.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right text-sm text-gray-400">
                    {formatTimestamp(lastActivity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Array.isArray(leaderboard) && leaderboard.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
          Showing top {leaderboard.length} players
        </div>
      )}
    </div>
  );
}