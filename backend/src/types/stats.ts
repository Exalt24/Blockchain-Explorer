export interface PlatformStats {
  totalEvents: number;
  uniquePlayers: number;
  eventsLast24h: number;
  latestBlock: string;
}

export interface LeaderboardEntry {
  player: string;
  eventCount: number;
  lastActivity: Date;
}

export interface EventDistribution {
  eventName: string;
  count: number;
  percentage: number;
}

export interface TimelineData {
  hour: string;
  count: number;
}