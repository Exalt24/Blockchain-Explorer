import http from 'http';
import { WebSocketServer } from '../src/websocket/server.js';
import { io as ioClient, Socket } from 'socket.io-client';

async function testWebSocketServer() {
  console.log('🧪 Testing WebSocket Server...\n');

  const httpServer = http.createServer();
  const wsServer = new WebSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(4001, () => {
      console.log('✅ Test HTTP server started on port 4001');
      resolve();
    });
  });

  let client1: Socket | undefined;
  let client2: Socket | undefined;

  try {
    console.log('\n📝 Test 1: Client Connection');
    client1 = ioClient('http://localhost:4001', {
      transports: ['websocket']
    });

    await new Promise<void>((resolve) => {
      client1?.on('connect', () => {
        console.log('✅ Client 1 connected');
        resolve();
      });
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const connectedCount = wsServer.getConnectedClients();
    console.log(`   Connected clients: ${connectedCount}`);
    if (connectedCount === 1) {
      console.log('✅ Test 1 PASSED: Client count correct\n');
    } else {
      throw new Error(`Expected 1 client, got ${connectedCount}`);
    }

    console.log('📝 Test 2: Multiple Client Connections');
    client2 = ioClient('http://localhost:4001', {
      transports: ['websocket']
    });

    await new Promise<void>((resolve) => {
      client2?.on('connect', () => {
        console.log('✅ Client 2 connected');
        resolve();
      });
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    const multiClientCount = wsServer.getConnectedClients();
    console.log(`   Connected clients: ${multiClientCount}`);
    if (multiClientCount === 2) {
      console.log('✅ Test 2 PASSED: Multiple clients connected\n');
    } else {
      throw new Error(`Expected 2 clients, got ${multiClientCount}`);
    }

    console.log('📝 Test 3: Broadcast New Event');
    const testEvent = {
      event_name: 'PlayerJoined',
      block_number: '12345',
      transaction_hash: '0xtest123',
      decoded_data: { player: '0xPlayer1' }
    };

    let client1Received = false;
    let client2Received = false;

    const messagePromise = new Promise<void>((resolve) => {
      client1?.on('newEvent', (message) => {
        console.log(`✅ Client 1 received newEvent:`, message.data.event_name);
        client1Received = true;
        if (client1Received && client2Received) resolve();
      });

      client2?.on('newEvent', (message) => {
        console.log(`✅ Client 2 received newEvent:`, message.data.event_name);
        client2Received = true;
        if (client1Received && client2Received) resolve();
      });
    });

    wsServer.broadcastNewEvent(testEvent);
    await messagePromise;
    console.log('✅ Test 3 PASSED: Broadcast received by all clients\n');

    console.log('📝 Test 4: Broadcast Stats Update');
    const testStats = {
      totalEvents: 100,
      uniquePlayers: 25,
      latestBlock: '12346'
    };

    const statsPromise = new Promise<void>((resolve) => {
      let statsCount = 0;
      const checkComplete = () => {
        statsCount++;
        if (statsCount === 2) resolve();
      };

      client1?.once('statsUpdate', (message) => {
        console.log(`✅ Client 1 received statsUpdate`);
        checkComplete();
      });

      client2?.once('statsUpdate', (message) => {
        console.log(`✅ Client 2 received statsUpdate`);
        checkComplete();
      });
    });

    wsServer.broadcastStatsUpdate(testStats);
    await statsPromise;
    console.log('✅ Test 4 PASSED: Stats broadcast working\n');

    console.log('📝 Test 5: Broadcast Block Update');
    const blockPromise = new Promise<void>((resolve) => {
      let blockCount = 0;
      const checkComplete = () => {
        blockCount++;
        if (blockCount === 2) resolve();
      };

      client1?.once('blockUpdate', (message) => {
        console.log(`✅ Client 1 received blockUpdate: Block ${message.data.blockNumber}`);
        checkComplete();
      });

      client2?.once('blockUpdate', (message) => {
        console.log(`✅ Client 2 received blockUpdate: Block ${message.data.blockNumber}`);
        checkComplete();
      });
    });

    wsServer.broadcastBlockUpdate(12347n, '0xblockhash123');
    await blockPromise;
    console.log('✅ Test 5 PASSED: Block update broadcast working\n');

    console.log('📝 Test 6: Client Disconnection');
    client1.disconnect();
    await new Promise(resolve => setTimeout(resolve, 100));
    const afterDisconnect = wsServer.getConnectedClients();
    console.log(`   Connected clients after disconnect: ${afterDisconnect}`);
    if (afterDisconnect === 1) {
      console.log('✅ Test 6 PASSED: Client disconnection handled\n');
    } else {
      throw new Error(`Expected 1 client after disconnect, got ${afterDisconnect}`);
    }

    console.log('✅ ALL WEBSOCKET TESTS PASSED!\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    
    wsServer.close();
    httpServer.close();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('🧹 Cleanup complete');
    process.exit(0);
  }
}

testWebSocketServer().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});