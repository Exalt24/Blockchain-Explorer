import { pool } from '../config/database.js';
import { cacheService } from './CacheService.js';
import type { PlatformStats, LeaderboardEntry, EventDistribution, TimelineData } from '../types/stats.js';

export class StatsService {
  async getPlatformStats(): Promise<PlatformStats> {
    const cacheKey = 'platform_stats';
    const cached = cacheService.get<PlatformStats>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const totalEventsQuery = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM blockchain_events'
      );

      const uniquePlayersQuery = await pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT decoded_data->>'player') as count 
         FROM blockchain_events 
         WHERE decoded_data->>'player' IS NOT NULL`
      );

      const eventsLast24hQuery = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM blockchain_events 
         WHERE timestamp >= NOW() - INTERVAL '24 hours'`
      );

      const latestBlockQuery = await pool.query<{ block_number: string }>(
        'SELECT MAX(block_number) as block_number FROM blockchain_events'
      );

      const stats: PlatformStats = {
        totalEvents: parseInt(totalEventsQuery.rows[0]?.count || '0', 10),
        uniquePlayers: parseInt(uniquePlayersQuery.rows[0]?.count || '0', 10),
        eventsLast24h: parseInt(eventsLast24hQuery.rows[0]?.count || '0', 10),
        latestBlock: latestBlockQuery.rows[0]?.block_number || '0',
      };

      cacheService.set(cacheKey, stats, 5);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching platform stats:', error);
      throw error;
    }
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard_${limit}`;
    const cached = cacheService.get<LeaderboardEntry[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const result = await pool.query<{
        player: string;
        event_count: string;
        last_activity: Date;
      }>(
        `SELECT 
          decoded_data->>'player' as player,
          COUNT(*) as event_count,
          MAX(timestamp) as last_activity
         FROM blockchain_events
         WHERE decoded_data->>'player' IS NOT NULL
         GROUP BY decoded_data->>'player'
         ORDER BY event_count DESC, last_activity DESC
         LIMIT $1`,
        [limit]
      );

      const leaderboard = result.rows.map((row) => ({
        player: row.player,
        eventCount: parseInt(row.event_count, 10),
        lastActivity: row.last_activity,
      }));

      cacheService.set(cacheKey, leaderboard, 30);
      return leaderboard;
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      throw error;
    }
  }

  async getEventDistribution(): Promise<EventDistribution[]> {
    const cacheKey = 'event_distribution';
    const cached = cacheService.get<EventDistribution[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const totalQuery = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM blockchain_events'
      );
      const total = parseInt(totalQuery.rows[0]?.count || '1', 10);

      const result = await pool.query<{
        event_name: string;
        count: string;
      }>(
        `SELECT 
          event_name,
          COUNT(*) as count
         FROM blockchain_events
         GROUP BY event_name
         ORDER BY count DESC`
      );

      const distribution = result.rows.map((row) => {
        const count = parseInt(row.count, 10);
        return {
          eventName: row.event_name,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0,
        };
      });

      cacheService.set(cacheKey, distribution, 60);
      return distribution;
    } catch (error) {
      console.error('❌ Error fetching event distribution:', error);
      throw error;
    }
  }

  async getActivityTimeline(hours: number = 24): Promise<TimelineData[]> {
    if (hours > 168) hours = 168;

    const cacheKey = `timeline_${hours}`;
    const cached = cacheService.get<TimelineData[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const result = await pool.query<{
        hour: string;
        count: string;
      }>(
        `SELECT 
          TO_CHAR(DATE_TRUNC('hour', timestamp), 'YYYY-MM-DD HH24:00') as hour,
          COUNT(*) as count
         FROM blockchain_events
         WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
         GROUP BY DATE_TRUNC('hour', timestamp)
         ORDER BY DATE_TRUNC('hour', timestamp) ASC`
      );

      const timeline = result.rows.map((row) => ({
        hour: row.hour,
        count: parseInt(row.count, 10),
      }));

      cacheService.set(cacheKey, timeline, 60);
      return timeline;
    } catch (error) {
      console.error('❌ Error fetching activity timeline:', error);
      throw error;
    }
  }

  async getEventsByPlayer(player: string, limit: number = 50): Promise<any[]> {
    const cacheKey = `player_events_${player}_${limit}`;
    const cached = cacheService.get<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const result = await pool.query(
        `SELECT 
          id,
          block_number,
          transaction_hash,
          event_name,
          decoded_data,
          timestamp
         FROM blockchain_events
         WHERE decoded_data->>'player' = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [player, limit]
      );

      cacheService.set(cacheKey, result.rows, 30);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching events by player:', error);
      throw error;
    }
  }

  async getTotalEventsByType(eventType: string): Promise<number> {
    const cacheKey = `event_type_${eventType}`;
    const cached = cacheService.get<number>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM blockchain_events WHERE event_name = $1',
        [eventType]
      );

      const count = parseInt(result.rows[0]?.count || '0', 10);
      cacheService.set(cacheKey, count, 60);
      return count;
    } catch (error) {
      console.error('❌ Error fetching events by type:', error);
      throw error;
    }
  }

  clearCache(): void {
    cacheService.clear();
  }
}