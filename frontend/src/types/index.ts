export interface BlockchainEvent {
  id: number;
  block_number: string;
  block_hash: string;
  transaction_hash: string;
  log_index: number;
  contract_address: string;
  event_name: string;
  event_data: Record<string, any>;
  decoded_data?: {
    player?: string;
    oldScore?: string;
    newScore?: string;
    itemId?: string;
    price?: string;
    timestamp?: string;
    playerCount?: string;
  };
  timestamp: string;
  created_at: string;
}

export interface Stats {
  totalEvents: number;
  uniquePlayers: number;
  eventsLast24h: number;
  latestBlock: string;
}

export interface LeaderboardEntry {
  player: string;
  event_count: number;
  last_activity: string;
}

export interface EventDistribution {
  event_name: string;
  count: number;
  percentage: number;
}

export interface TimelineData {
  hour: string;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventFilters {
  page?: number;
  limit?: number;
  eventType?: string;
  playerAddress?: string;
  fromDate?: string;
  toDate?: string;
}

export interface WebSocketMessage {
  type: 'newEvent' | 'statsUpdate' | 'blockUpdate';
  data: any;
  timestamp: number;
}