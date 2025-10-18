import { pool } from '../../src/config/database.js';
import { io, Socket } from 'socket.io-client';

async function testConcurrentEvents() {
  console.log('🧪 Concurrent Events Test\n');
  console.log('Testing system behavior under concurrent load...\n');

  const sockets: Socket[] = [];
  const receivedEvents: Array<{ socketId: string; eventName: string; timestamp: number }> = [];

  try {
    console.log('1️⃣  Connecting 10 WebSocket clients...');
    
    for (let i = 0; i < 10; i++) {
      await new Promise<void>((resolve, reject) => {
        const socket = io('http://localhost:4000', {
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          sockets.push(socket);
          
          socket.on('newEvent', (event) => {
            receivedEvents.push({
              socketId: socket.id!,
              eventName: event.event_name,
              timestamp: Date.now(),
            });
          });

          resolve();
        });

        socket.on('connect_error', reject);

        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
    }

    console.log(`✅ ${sockets.length} clients connected\n`);

    console.log('2️⃣  Querying initial event count...');
    const beforeResult = await pool.query('SELECT COUNT(*) as count FROM blockchain_events');
    const eventsBefore = parseInt(beforeResult.rows[0].count);
    console.log(`   Events before: ${eventsBefore}\n`);

    console.log('3️⃣  Waiting for new events (15 seconds)...');
    console.log('   Generate events using: npx hardhat console --network localhost');
    console.log('   Then run: await (await ethers.getContractAt("GameState", "YOUR_ADDRESS")).joinGame()\n');

    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('4️⃣  Checking results...');
    const afterResult = await pool.query('SELECT COUNT(*) as count FROM blockchain_events');
    const eventsAfter = parseInt(afterResult.rows[0].count);
    const newEvents = eventsAfter - eventsBefore;

    console.log(`   Events after: ${eventsAfter}`);
    console.log(`   New events: ${newEvents}\n`);

    console.log('5️⃣  Analyzing WebSocket broadcasts...');
    console.log(`   Total broadcasts received: ${receivedEvents.length}`);
    
    const eventsBySocket = new Map<string, number>();
    for (const event of receivedEvents) {
      eventsBySocket.set(event.socketId, (eventsBySocket.get(event.socketId) || 0) + 1);
    }

    console.log(`   Unique sockets that received events: ${eventsBySocket.size}/${sockets.length}`);
    
    if (newEvents > 0) {
      const expectedBroadcasts = newEvents * sockets.length;
      const receivedPercentage = (receivedEvents.length / expectedBroadcasts * 100).toFixed(1);
      console.log(`   Expected broadcasts: ${expectedBroadcasts}`);
      console.log(`   Received: ${receivedPercentage}%`);
    }

    console.log('\n6️⃣  Testing concurrent API requests...');
    const apiRequests = [];
    const startTime = Date.now();

    for (let i = 0; i < 20; i++) {
      apiRequests.push(
        fetch('http://localhost:4000/api/stats').then(r => r.json())
      );
    }

    const apiResults = await Promise.all(apiRequests);
    const apiDuration = Date.now() - startTime;

    console.log(`   20 concurrent API requests completed in ${apiDuration}ms`);
    console.log(`   Average: ${(apiDuration / 20).toFixed(1)}ms per request`);
    
    const allSame = apiResults.every(r => r.totalEvents === apiResults[0].totalEvents);
    console.log(`   Data consistency: ${allSame ? '✅ All responses identical' : '⚠️  Responses differ'}`);

    console.log('\n7️⃣  Testing batch processing...');
    const batchTestStart = Date.now();
    
    const lastEvents = await pool.query(
      `SELECT event_name, COUNT(*) as count 
       FROM blockchain_events 
       WHERE created_at >= NOW() - INTERVAL '30 seconds'
       GROUP BY event_name`
    );
    
    console.log('   Recent events (last 30s):');
    for (const row of lastEvents.rows) {
      console.log(`     ${row.event_name}: ${row.count}`);
    }

    console.log('\n8️⃣  Closing WebSocket connections...');
    
    // Close sockets and wait for them to disconnect
    await Promise.all(
      sockets.map(socket => 
        new Promise<void>(resolve => {
          socket.on('disconnect', () => resolve());
          socket.close();
          // Timeout fallback
          setTimeout(resolve, 1000);
        })
      )
    );
    
    console.log(`   Closed ${sockets.length} connections\n`);

    console.log('9️⃣  Closing database pool...');
    await pool.end();
    console.log('   Database connections closed\n');

    console.log('='.repeat(60));
    console.log('📊 Concurrent Events Test Summary');
    console.log('='.repeat(60));
    console.log(`New Events Indexed: ${newEvents}`);
    console.log(`WebSocket Clients: ${sockets.length}`);
    console.log(`Total Broadcasts: ${receivedEvents.length}`);
    console.log(`Concurrent API Requests: 20 in ${apiDuration}ms`);
    console.log(`Data Consistency: ${allSame ? 'Passed' : 'Failed'}`);
    console.log('='.repeat(60));

    console.log('\n✅ Concurrent events test completed!');
    
    // Allow event loop to clear before exit
    await new Promise(resolve => setTimeout(resolve, 100));

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Cleanup on error
    console.log('\n🧹 Cleaning up...');
    for (const socket of sockets) {
      socket.close();
    }
    await pool.end().catch(() => {});
    
    process.exit(1);
  }
  
  // Natural exit (exit code 0)
}

testConcurrentEvents();