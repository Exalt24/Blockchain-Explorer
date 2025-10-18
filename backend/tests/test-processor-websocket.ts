import http from 'http';
import { EventProcessor } from '../src/services/EventProcessor.js';
import { WebSocketServer } from '../src/websocket/server.js';
import { pool } from '../src/config/database.js';
import { io as ioClient, Socket } from 'socket.io-client';
import { contractAddress, contractABI } from '../src/config/blockchain.js';
import { ethers } from 'ethers';

async function testProcessorWebSocketIntegration() {
  console.log('🧪 Testing EventProcessor + WebSocket Integration...\n');

  if (!contractAddress) {
    console.error('❌ CONTRACT_ADDRESS not set in environment');
    process.exit(1);
  }

  const httpServer = http.createServer();
  const wsServer = new WebSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(4002, () => {
      console.log('✅ Test HTTP server started on port 4002');
      resolve();
    });
  });

  let client: Socket | undefined;

  try {
    await pool.query('DELETE FROM blockchain_events WHERE contract_address = $1', [contractAddress.toLowerCase()]);
    console.log('✅ Database cleaned for testing\n');

    const iface = new ethers.Interface(contractABI);
    const playerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const timestamp = 1697894827;

    const createMockLog = (txHash: string, blockNum: number, logIndex: number) => {
      const encodedData = iface.encodeEventLog(
        iface.getEvent('PlayerJoined')!,
        [playerAddress, timestamp]
      );

      return {
        blockNumber: blockNum,
        blockHash: `0xblockhash${blockNum}`,
        transactionHash: txHash,
        address: contractAddress,
        topics: encodedData.topics as string[],
        data: encodedData.data,
        index: logIndex,
        transactionIndex: 0,
        fragment: iface.getEvent('PlayerJoined'),
        args: [playerAddress, BigInt(timestamp)],
        getBlock: async () => ({
          number: blockNum,
          hash: `0xblockhash${blockNum}`,
          timestamp: 1697894827
        }),
        getTransaction: async () => ({
          hash: txHash
        })
      };
    };

    console.log('📝 Test 1: EventProcessor works without WebSocket');
    const processorNoWS = new EventProcessor(contractAddress);
    
    const mockLog1 = createMockLog('0xtxhash100', 12345, 0);
    await processorNoWS.processEvent(mockLog1 as any);
    
    const countResult = await pool.query('SELECT COUNT(*) as count FROM blockchain_events WHERE contract_address = $1', [contractAddress.toLowerCase()]);
    const eventCount = parseInt(countResult.rows[0].count);
    
    if (eventCount === 1) {
      console.log('✅ Test 1 PASSED: Event stored without WebSocket\n');
    } else {
      throw new Error(`Expected 1 event, got ${eventCount}`);
    }

    await pool.query('DELETE FROM blockchain_events WHERE contract_address = $1', [contractAddress.toLowerCase()]);

    console.log('📝 Test 2: EventProcessor broadcasts via WebSocket');
    const processorWithWS = new EventProcessor(contractAddress, wsServer);
    
    client = ioClient('http://localhost:4002', {
      transports: ['websocket']
    });

    await new Promise<void>((resolve) => {
      client!.on('connect', () => {
        console.log('✅ Test client connected');
        resolve();
      });
    });

    const eventPromise = new Promise<any>((resolve) => {
      client!.on('newEvent', (message) => {
        console.log(`✅ Received broadcast: ${message.data.event_name}`);
        resolve(message);
      });
    });

    const mockLog2 = createMockLog('0xtxhash200', 12346, 0);
    await processorWithWS.processEvent(mockLog2 as any);

    const receivedMessage = await Promise.race([
      eventPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout waiting for broadcast')), 3000)
      )
    ]);

    if (receivedMessage.type === 'newEvent' && receivedMessage.data.event_name === 'PlayerJoined') {
      console.log('✅ Test 2 PASSED: Event broadcast received\n');
    } else {
      throw new Error(`Invalid broadcast: expected PlayerJoined, got ${receivedMessage.data.event_name}`);
    }

    console.log('📝 Test 3: Verify broadcast message structure');
    const message: any = receivedMessage;
    
    const hasRequiredFields = 
      message.type === 'newEvent' &&
      message.timestamp > 0 &&
      message.data.id > 0 &&
      message.data.block_number &&
      message.data.transaction_hash === '0xtxhash200' &&
      message.data.event_name === 'PlayerJoined' &&
      message.data.decoded_data?.player;

    if (hasRequiredFields) {
      console.log('✅ Test 3 PASSED: Message structure correct');
      console.log('   Message type:', message.type);
      console.log('   Event name:', message.data.event_name);
      console.log('   Player:', message.data.decoded_data.player);
      console.log();
    } else {
      console.log('Message data:', JSON.stringify(message.data, null, 2));
      throw new Error('Message missing required fields');
    }

    console.log('📝 Test 4: Multiple events broadcast correctly');
    let receivedCount = 0;

    client.on('newEvent', () => {
      receivedCount++;
    });

    for (let i = 0; i < 3; i++) {
      const log = createMockLog(`0xtxhash${300 + i}`, 12350 + i, i);
      await processorWithWS.processEvent(log as any);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (receivedCount >= 3) {
      console.log(`✅ Test 4 PASSED: Received ${receivedCount} broadcasts\n`);
    } else {
      throw new Error(`Expected 3+ broadcasts, got ${receivedCount}`);
    }

    console.log('📝 Test 5: Database and WebSocket sync');
    const finalCount = await processorWithWS.getEventCount();
    console.log(`   Total events in database: ${finalCount}`);
    
    if (finalCount >= 4) {
      console.log('✅ Test 5 PASSED: All events stored and broadcast\n');
    } else {
      throw new Error(`Expected 4+ events, got ${finalCount}`);
    }

    console.log('✅ ALL PROCESSOR-WEBSOCKET INTEGRATION TESTS PASSED!\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    if (client?.connected) client.disconnect();
    
    wsServer.close();
    httpServer.close();
    await pool.end();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('🧹 Cleanup complete');
    process.exit(0);
  }
}

testProcessorWebSocketIntegration().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});