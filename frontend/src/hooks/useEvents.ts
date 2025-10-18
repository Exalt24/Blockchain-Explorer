import { useEffect, useState, useCallback, useRef } from 'react';
import { getEvents } from '../services/api';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import type { BlockchainEvent, EventFilters, PaginatedResponse } from '../types';

interface UseEventsReturn {
  events: BlockchainEvent[];
  loading: boolean;
  error: string | null;
  pagination: PaginatedResponse<BlockchainEvent>['pagination'] | null;
  refresh: () => Promise<void>;
}

export function useEvents(
  filters: EventFilters = {},
  enableRealtime: boolean = true
): UseEventsReturn {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<BlockchainEvent>['pagination'] | null>(null);
  const { lastMessage } = useWebSocketContext();
  const hasFetched = useRef(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getEvents(filters);
      
      setEvents(response.data || []);
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      console.error('Error fetching events:', err);
      setEvents([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, filters.eventType, filters.playerAddress, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchEvents();
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) {
      fetchEvents();
    }
  }, [fetchEvents]);

  useEffect(() => {
    if (enableRealtime && lastMessage?.type === 'newEvent' && lastMessage.data) {
      const newEvent = lastMessage.data;
      
      setEvents((prevEvents) => {
        const currentEvents = prevEvents || [];
        const exists = currentEvents.some((e) => e.id === newEvent.id);
        if (exists) return currentEvents;
        
        const updated = [newEvent, ...currentEvents];
        return updated.slice(0, filters.limit || 50);
      });
    }
  }, [lastMessage, enableRealtime, filters.limit]);

  return {
    events,
    loading,
    error,
    pagination,
    refresh: fetchEvents,
  };
}