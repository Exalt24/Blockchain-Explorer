import type {
  BlockchainEvent,
  Stats,
  LeaderboardEntry,
  EventDistribution,
  TimelineData,
  PaginatedResponse,
  EventFilters,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

export async function getEvents(filters: EventFilters = {}): Promise<PaginatedResponse<BlockchainEvent>> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.eventType) params.append('eventType', filters.eventType);
  if (filters.playerAddress) params.append('playerAddress', filters.playerAddress);
  if (filters.fromDate) params.append('fromDate', filters.fromDate);
  if (filters.toDate) params.append('toDate', filters.toDate);

  const queryString = params.toString();
  const response = await fetchAPI<any>(
    `/events${queryString ? `?${queryString}` : ''}`
  );
  
  return {
    data: response.events || response.data || [],
    pagination: response.pagination
  };
}

export async function getEventsByTransaction(hash: string): Promise<BlockchainEvent[]> {
  return fetchAPI<BlockchainEvent[]>(`/events/tx/${hash}`);
}

export async function getEventsByBlock(block: number | string): Promise<BlockchainEvent[]> {
  return fetchAPI<BlockchainEvent[]>(`/events/block/${block}`);
}

export async function getStats(): Promise<Stats> {
  return fetchAPI<Stats>('/stats');
}

export async function getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const response = await fetchAPI<any>(`/leaderboard?limit=${limit}`);
  
  let data: any[] = [];
  
  if (Array.isArray(response)) {
    data = response;
  } else if (response && typeof response === 'object' && 'leaderboard' in response) {
    data = response.leaderboard;
  } else {
    return [];
  }
  
  return data.map((item: any) => ({
    player: item.player,
    event_count: item.event_count ?? item.eventCount ?? 0,
    last_activity: item.last_activity ?? item.lastActivity ?? new Date().toISOString()
  }));
}

export async function getEventDistribution(): Promise<EventDistribution[]> {
  const response = await fetchAPI<{ distribution: any[] }>('/stats/distribution');
  return response.distribution.map(item => ({
    event_name: item.eventName || item.event_name,
    count: item.count,
    percentage: item.percentage
  }));
}

export async function getTimeline(hours: number = 24): Promise<TimelineData[]> {
  const response = await fetchAPI<{ timeline: TimelineData[] }>(`/stats/timeline?hours=${hours}`);
  return response.timeline;
}

export async function getHealth(): Promise<any> {
  return fetchAPI<any>('/health');
}