import pool from '../config/database.js';
import { getProvider } from '../config/blockchain.js';
import type { EventListener } from './EventListener.js';
import type { WebSocketServer } from '../websocket/server.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    blockchain: ServiceHealth;
    eventListener: ServiceHealth;
    websocket: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  message?: string;
  details?: any;
}

export class HealthMonitor {
  private startTime: number;
  private eventListener?: EventListener;
  private wsServer?: WebSocketServer;

  constructor(eventListener?: EventListener, wsServer?: WebSocketServer) {
    this.startTime = Date.now();
    this.eventListener = eventListener;
    this.wsServer = wsServer;
  }

  async getHealth(): Promise<HealthStatus> {
    const [database, blockchain, eventListener, websocket] = await Promise.all([
      this.checkDatabase(),
      this.checkBlockchain(),
      this.checkEventListener(),
      this.checkWebSocket(),
    ]);

    const services = { database, blockchain, eventListener, websocket };
    const status = this.determineOverallStatus(services);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      services,
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      const start = Date.now();
      const client = await pool.connect();
      
      try {
        await client.query('SELECT 1');
        const latency = Date.now() - start;
        
        return {
          status: 'up',
          latency,
          message: 'Database connection healthy',
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        status: 'down',
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkBlockchain(): Promise<ServiceHealth> {
    try {
      const start = Date.now();
      const provider = getProvider();
      const blockNumber = await provider.getBlockNumber();
      const latency = Date.now() - start;

      return {
        status: 'up',
        latency,
        message: 'Blockchain connection healthy',
        details: { latestBlock: blockNumber },
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Blockchain connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkEventListener(): Promise<ServiceHealth> {
    if (!this.eventListener) {
      return {
        status: 'unknown',
        message: 'EventListener not configured',
      };
    }

    try {
      const status = this.eventListener.getStatus();
      
      if (!status.isListening) {
        return {
          status: 'down',
          message: 'EventListener not running',
          details: status,
        };
      }

      if (status.consecutiveErrors > 0) {
        return {
          status: 'down',
          message: `EventListener experiencing errors (${status.consecutiveErrors} consecutive)`,
          details: status,
        };
      }

      return {
        status: 'up',
        message: 'EventListener running normally',
        details: status,
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Failed to check EventListener status',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkWebSocket(): Promise<ServiceHealth> {
    if (!this.wsServer) {
      return {
        status: 'unknown',
        message: 'WebSocket server not configured',
      };
    }

    try {
      const connectedClients = this.wsServer.getConnectedClients();
      
      return {
        status: 'up',
        message: 'WebSocket server running',
        details: { connectedClients },
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'WebSocket server check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services);
    
    const downCount = statuses.filter(s => s.status === 'down').length;
    const upCount = statuses.filter(s => s.status === 'up').length;
    
    if (downCount === 0 && upCount === statuses.length) {
      return 'healthy';
    }
    
    if (services.database.status === 'down' || services.blockchain.status === 'down') {
      return 'unhealthy';
    }
    
    if (downCount > 0) {
      return 'degraded';
    }
    
    return 'degraded';
  }
}