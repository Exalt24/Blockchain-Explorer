import { io, Socket } from 'socket.io-client';

async function testWebSocketStress() {
  console.log('🧪 WebSocket Stress Test\n');
  console.log('Testing WebSocket server under load...\n');

  const TARGET_CLIENTS = 50;
  const RAMP_UP_DELAY = 50;
  const TEST_DURATION = 20000;

  const sockets: Socket[] = [];
  const stats = {
    connected: 0,
    disconnected: 0,
    errors: 0,
    messagesReceived: 0,
    messagesByType: new Map<string, number>(),
  };

  console.log(`1️⃣  Connecting ${TARGET_CLIENTS} clients (ramp up: ${RAMP_UP_DELAY}ms between)...\n`);

  for (let i = 0; i < TARGET_CLIENTS; i++) {
    const clientNum = i + 1;
    
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = io('http://localhost:4000', {
          transports: ['websocket'],
          reconnection: false,
        });

        const timeout = setTimeout(() => {
          socket.close();
          reject(new Error('Connection timeout'));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          stats.connected++;
          sockets.push(socket);

          socket.on('newEvent', () => {
            stats.messagesReceived++;
            stats.messagesByType.set('newEvent', (stats.messagesByType.get('newEvent') || 0) + 1);
          });

          socket.on('statsUpdate', () => {
            stats.messagesReceived++;
            stats.messagesByType.set('statsUpdate', (stats.messagesByType.get('statsUpdate') || 0) + 1);
          });

          socket.on('blockUpdate', () => {
            stats.messagesReceived++;
            stats.messagesByType.set('blockUpdate', (stats.messagesByType.get('blockUpdate') || 0) + 1);
          });

          socket.on('disconnect', () => {
            stats.disconnected++;
          });

          socket.on('error', (error) => {
            stats.errors++;
            console.error(`   ⚠️  Socket ${clientNum} error:`, error.message);
          });

          resolve();
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          stats.errors++;
          reject(error);
        });
      });

      if (clientNum % 10 === 0) {
        console.log(`   ✅ ${clientNum}/${TARGET_CLIENTS} clients connected`);
      }

      await new Promise(resolve => setTimeout(resolve, RAMP_UP_DELAY));
    } catch (error) {
      console.log(`   ❌ Failed to connect client ${clientNum}`);
    }
  }

  console.log(`\n✅ Connection phase complete`);
  console.log(`   Connected: ${stats.connected}/${TARGET_CLIENTS}`);
  console.log(`   Failed: ${TARGET_CLIENTS - stats.connected}\n`);

  console.log(`2️⃣  Monitoring for ${TEST_DURATION / 1000} seconds...\n`);

  const monitoringStart = Date.now();
  const snapshots: Array<{ time: number; messages: number }> = [];

  const monitorInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - monitoringStart) / 1000);
    snapshots.push({ time: elapsed, messages: stats.messagesReceived });
    
    if (elapsed % 5 === 0) {
      console.log(`   ${elapsed}s: ${stats.messagesReceived} total messages received`);
    }
  }, 1000);

  await new Promise(resolve => setTimeout(resolve, TEST_DURATION));
  clearInterval(monitorInterval);

  console.log('\n3️⃣  Test results:\n');

  const totalDuration = Date.now() - monitoringStart;
  const messagesPerSecond = (stats.messagesReceived / (totalDuration / 1000)).toFixed(2);

  console.log(`   Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`   Total messages: ${stats.messagesReceived}`);
  console.log(`   Messages/second: ${messagesPerSecond}`);
  console.log(`   Messages per client: ${(stats.messagesReceived / stats.connected).toFixed(1)}`);

  console.log('\n   Message breakdown:');
  for (const [type, count] of stats.messagesByType.entries()) {
    const percentage = ((count / stats.messagesReceived) * 100).toFixed(1);
    console.log(`     ${type}: ${count} (${percentage}%)`);
  }

  console.log('\n4️⃣  Connection health:\n');
  console.log(`   Active connections: ${stats.connected - stats.disconnected}`);
  console.log(`   Disconnects: ${stats.disconnected}`);
  console.log(`   Errors: ${stats.errors}`);
  
  const healthPercentage = (((stats.connected - stats.disconnected) / stats.connected) * 100).toFixed(1);
  console.log(`   Health: ${healthPercentage}%`);

  console.log('\n5️⃣  Throughput analysis:\n');

  if (snapshots.length > 1) {
    const intervals = [];
    for (let i = 1; i < snapshots.length; i++) {
      const msgDiff = snapshots[i].messages - snapshots[i - 1].messages;
      intervals.push(msgDiff);
    }

    const avgMsgPerInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const maxMsgPerInterval = Math.max(...intervals);
    const minMsgPerInterval = Math.min(...intervals);

    console.log(`   Average throughput: ${avgMsgPerInterval.toFixed(1)} msg/s`);
    console.log(`   Peak throughput: ${maxMsgPerInterval} msg/s`);
    console.log(`   Min throughput: ${minMsgPerInterval} msg/s`);
  }

  console.log('\n6️⃣  Closing all connections...\n');

  for (const socket of sockets) {
    socket.close();
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('='.repeat(60));
  console.log('📊 WebSocket Stress Test Summary');
  console.log('='.repeat(60));
  console.log(`Target Clients: ${TARGET_CLIENTS}`);
  console.log(`Successful Connections: ${stats.connected} (${((stats.connected / TARGET_CLIENTS) * 100).toFixed(1)}%)`);
  console.log(`Total Messages: ${stats.messagesReceived}`);
  console.log(`Messages/Second: ${messagesPerSecond}`);
  console.log(`Connection Health: ${healthPercentage}%`);
  console.log(`Errors: ${stats.errors}`);
  console.log('='.repeat(60));

  const success = stats.connected >= TARGET_CLIENTS * 0.95 && parseFloat(healthPercentage) >= 95;
  
  if (success) {
    console.log('\n✅ WebSocket stress test passed!');
    console.log('   System handled load well with minimal errors');
    process.exit(0);
  } else {
    console.log('\n⚠️  WebSocket stress test had issues');
    console.log('   Review connection stability and error rates');
    process.exit(1);
  }
}

testWebSocketStress().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});