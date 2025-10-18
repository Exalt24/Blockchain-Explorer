import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { testConnection, closePool } from './config/database.js';
import { testBlockchainConnection, contractAddress } from './config/blockchain.js';
import { EventListener } from './services/EventListener.js';
import { StatsService } from './services/StatsService.js';
import { HealthMonitor } from './services/HealthMonitor.js';
import { cacheService } from './services/CacheService.js';
import { WebSocketServer } from './websocket/server.js';
import router from './api/routes.js';
import { errorHandler, notFoundHandler } from './api/middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const wsServer = new WebSocketServer(httpServer);

let eventListener: EventListener | null = null;
let statsInterval: NodeJS.Timeout | null = null;
let healthMonitor: HealthMonitor;

async function startStatsBroadcasting() {
  const broadcastStats = async () => {
    try {
      const statsService = new StatsService();
      const stats = await statsService.getPlatformStats();
      wsServer.broadcastStatsUpdate(stats);
    } catch (error) {
      console.error('❌ Failed to broadcast stats:', error);
    }
  };

  await broadcastStats();
  statsInterval = setInterval(broadcastStats, 10000);
  console.log('📊 Stats broadcasting started (every 10 seconds)');
}

app.get('/health', async (req, res) => {
  try {
    const health = await healthMonitor.getHealth();
    const cacheStats = cacheService.getStats();
    
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500;
    res.status(statusCode).json({
      ...health,
      cache: cacheStats,
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.use('/api', router);
app.use(notFoundHandler);
app.use(errorHandler);

async function startup() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     Blockchain Explorer Backend Starting...         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('⚠️  Database unavailable - some features may not work');
  }

  const blockchainConnected = await testBlockchainConnection();
  if (!blockchainConnected) {
    console.error('⚠️  Blockchain unavailable - event indexing disabled');
  }

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`   HTTP API: http://localhost:${PORT}/api`);
    console.log(`   WebSocket: http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });

  if (contractAddress && blockchainConnected && dbConnected) {
    try {
      eventListener = new EventListener(wsServer);
      await eventListener.start();
      await startStatsBroadcasting();
    } catch (error) {
      console.error('❌ Failed to start EventListener:', error);
      console.error('   Event indexing will be disabled');
    }
  } else {
    if (!contractAddress) {
      console.log('ℹ️  CONTRACT_ADDRESS not set - event indexing disabled');
    }
  }

  healthMonitor = new HealthMonitor(eventListener || undefined, wsServer);
  console.log('✅ Health monitoring initialized');
  console.log('✅ Cache service initialized\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Ready to accept connections!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  logPerformanceInfo();
}

function logPerformanceInfo(): void {
  const memUsage = process.memoryUsage();
  console.log('\n📊 Performance Info:');
  console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Cache: In-memory with 60s cleanup interval`);
  console.log(`   Batch Processing: 50 events per batch, 1s flush interval`);
  console.log(`   WebSocket Throttle: Block updates throttled to 1/second\n`);
}

async function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');

  if (statsInterval) {
    clearInterval(statsInterval);
    console.log('✅ Stats broadcasting stopped');
  }

  if (eventListener) {
    eventListener.stop();
  }

  cacheService.destroy();
  console.log('✅ Cache service destroyed');

  wsServer.close();

  await closePool();

  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  shutdown();
});

startup().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});