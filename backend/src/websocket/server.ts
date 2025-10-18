import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { throttle } from '../utils/throttle.js';

export class WebSocketServer {
  private io: SocketIOServer;
  private connectedClients: Set<string> = new Set();
  private throttledBlockUpdate: (blockNumber: bigint, blockHash: string) => void;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.throttledBlockUpdate = throttle(
      (blockNumber: bigint, blockHash: string) => {
        this.broadcast('blockUpdate', {
          blockNumber: blockNumber.toString(),
          blockHash,
        });
      },
      1000
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.connectedClients.add(socket.id);
      console.log(`✅ WebSocket client connected: ${socket.id} (Total: ${this.connectedClients.size})`);

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
        console.log(`❌ WebSocket client disconnected: ${socket.id} (Total: ${this.connectedClients.size})`);
      });

      socket.on('error', (error) => {
        console.error(`Socket error (ID: ${socket.id}):`, error);
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  broadcast(type: string, data: any): void {
    this.io.emit(type, data);
  }

  broadcastNewEvent(event: any): void {
    this.broadcast('newEvent', event);
  }

  broadcastStatsUpdate(stats: any): void {
    this.broadcast('statsUpdate', stats);
  }

  broadcastBlockUpdate(blockNumber: bigint, blockHash: string): void {
    this.throttledBlockUpdate(blockNumber, blockHash);
  }

  getConnectedClients(): number {
    return this.connectedClients.size;
  }

  close(): void {
    this.io.close();
    console.log('✅ WebSocket server closed');
  }
}