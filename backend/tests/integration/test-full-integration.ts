import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from '../../src/websocket/server.js';
import { EventProcessor } from '../../src/services/EventProcessor.js';
import { StatsService } from '../../src/services/StatsService.js';
import { pool } from '../../src/config/database.js';
import { io as ioClient, Socket } from 'socket.io-client';
import { contractAddress, contractABI } from '../../src/config/blockchain.js';
import { ethers } from 'ethers';
import router from '../../src/api/routes.js';

async function testFullIntegration() {
  console.log('🧪 Testing Full Server Integration...\n');

  if (!contractAddress) {
    console.error('❌ CONTRACT_ADDRESS not set in environment');
    process.exit(1);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', router);

  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer(httpServer);
  const processor = new EventProcessor(contractAddress, wsServer);
  const statsService = new StatsService();

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      blockchain: 'connected',
      eventListener: {
        isListening: false,
        lastProcessedBlock: '0'
      },
      websocket: {
        enabled: true,
        connectedClients: wsServer.getConnectedClients()
      }
    });
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(4003, () => {
      console.log('✅ Test server started on port 4003');
      resolve();
    });
  });

  let client1: Socket | undefined;
  let client2: Socket | undefined;

  try {
    await pool.query('DELETE FROM blockchain_events WHERE contract_address = $1', [contractAddress.toLowerCase()]);
    await pool.query('DELETE FROM sync_status WHERE contract_address = $1', [contractAddress.toLowerCase()]);
    console.log('✅ Database cleaned for testing\n');

    console.log('📝 Test 1: Multiple clients can connect');
    client1 = ioClient('http://localhost:4003', { transports: ['websocket'] });
    client2 = ioClient('http://localhost:4003', { transports: ['websocket'] });

    await Promise.all([
      new Promise<void>((resolve) => client1!.on('connect', () => resolve())),
      new Promise<void>((resolve) => client2!.on('connect', () => resolve()))
    ]);

    console.log(`✅ Connected clients: ${wsServer.getConnectedClients()}`);
    if (wsServer.getConnectedClients() === 2) {
      console.log('✅ Test 1 PASSED: Multiple clients connected\n');
    } else {
      throw new Error(`Expected 2 clients, got ${wsServer.getConnectedClients()}`);
    }

    console.log('📝 Test 2: Events broadcast to all clients');
    const iface = new ethers.Interface(contractABI);
    const playerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    
    const encodedData = iface.encodeEventLog(
      iface.getEvent('PlayerJoined')!,
      [playerAddress, 1697894827]
    );

    const mockLog = {
      blockNumber: 100,
      blockHash: '0xblock100',
      transactionHash: '0xtx100',
      address: contractAddress,
      topics: encodedData.topics as string[],
      data: encodedData.data,
      index: 0,
      transactionIndex: 0,
      fragment: iface.getEvent('PlayerJoined'),
      args: [playerAddress, BigInt(1697894827)],
      getBlock: async () => ({ number: 100, hash: '0xblock100', timestamp: 1697894827 }),
      getTransaction: async () => ({ hash: '0xtx100' })
    };

    let client1Received = false;
    let client2Received = false;

    const broadcastPromise = new Promise<void>((resolve) => {
      client1!.on('newEvent', () => {
        console.log('✅ Client 1 received newEvent');
        client1Received = true;
        if (client1Received && client2Received) resolve();
      });

      client2!.on('newEvent', () => {
        console.log('✅ Client 2 received newEvent');
        client2Received = true;
        if (client1Received && client2Received) resolve();
      });
    });

    await processor.processEvent(mockLog as any);
    await broadcastPromise;

    if (client1Received && client2Received) {
      console.log('✅ Test 2 PASSED: All clients received broadcast\n');
    } else {
      throw new Error('Not all clients received broadcast');
    }

    console.log('📝 Test 3: Stats broadcasting');
    const statsPromise = new Promise<any>((resolve) => {
      client1!.once('statsUpdate', (message) => {
        console.log('✅ Received stats update');
        resolve(message);
      });
    });

    const stats = await statsService.getPlatformStats();
    wsServer.broadcastStatsUpdate(stats);

    const statsMessage = await statsPromise;

    if (statsMessage.type === 'statsUpdate' && statsMessage.data.totalEvents >= 1) {
      console.log('✅ Test 3 PASSED: Stats broadcast working');
      console.log(`   Total events: ${statsMessage.data.totalEvents}`);
      console.log(`   Unique players: ${statsMessage.data.uniquePlayers}\n`);
    } else {
      throw new Error('Invalid stats message');
    }

    console.log('📝 Test 4: Block update broadcasting');
    const blockPromise = new Promise<any>((resolve) => {
      client1!.once('blockUpdate', (message) => {
        console.log('✅ Received block update');
        resolve(message);
      });
    });

    wsServer.broadcastBlockUpdate(12345n, '0xblockhash12345');
    const blockMessage = await blockPromise;

    if (blockMessage.type === 'blockUpdate' && blockMessage.data.blockNumber === '12345') {
      console.log('✅ Test 4 PASSED: Block updates working');
      console.log(`   Block number: ${blockMessage.data.blockNumber}`);
      console.log(`   Block hash: ${blockMessage.data.blockHash}\n`);
    } else {
      throw new Error('Invalid block update message');
    }

    console.log('📝 Test 5: REST API + WebSocket integration');
    const response = await fetch('http://localhost:4003/api/events?limit=10');
    const data = await response.json();

    if (response.ok && data.events && data.events.length > 0) {
      console.log('✅ Test 5 PASSED: REST API working');
      console.log(`   Retrieved ${data.events.length} event(s)`);
      console.log(`   Event: ${data.events[0].event_name}\n`);
    } else {
      throw new Error('API request failed');
    }

    console.log('📝 Test 6: Health endpoint with WebSocket status');
    const healthResponse = await fetch('http://localhost:4003/health');
    const healthData = await healthResponse.json();

    if (
      healthResponse.ok &&
      healthData.status === 'ok' &&
      healthData.websocket?.enabled &&
      healthData.websocket.connectedClients === 2
    ) {
      console.log('✅ Test 6 PASSED: Health endpoint includes WebSocket status');
      console.log(`   Status: ${healthData.status}`);
      console.log(`   Connected clients: ${healthData.websocket.connectedClients}\n`);
    } else {
      console.log('Health data:', JSON.stringify(healthData, null, 2));
      throw new Error('Health endpoint validation failed');
    }

    console.log('📝 Test 7: Client disconnect handling');
    client1.disconnect();
    await new Promise(resolve => setTimeout(resolve, 200));

    if (wsServer.getConnectedClients() === 1) {
      console.log('✅ Test 7 PASSED: Disconnect handled correctly');
      console.log(`   Remaining clients: ${wsServer.getConnectedClients()}\n`);
    } else {
      throw new Error(`Expected 1 client after disconnect, got ${wsServer.getConnectedClients()}`);
    }

    console.log('✅ ALL FULL INTEGRATION TESTS PASSED!\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    
    wsServer.close();
    httpServer.close();
    await pool.end();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('🧹 Cleanup complete');
    process.exit(0);
  }
}

testFullIntegration().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});