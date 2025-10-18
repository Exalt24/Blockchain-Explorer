import { useEffect, useState, useCallback } from 'react';
import { getStats } from '../services/api';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import type { Stats } from '../types';

interface UseStatsReturn {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStats(enableRealtime: boolean = true): UseStatsReturn {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lastMessage } = useWebSocketContext();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (enableRealtime && lastMessage?.type === 'statsUpdate') {
      console.log('📊 Updating stats from WebSocket:', lastMessage.data);
      setStats(lastMessage.data);
    }
  }, [lastMessage, enableRealtime]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}