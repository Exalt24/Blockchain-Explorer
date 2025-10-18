import { pool } from '../../src/config/database.js';
import { getProvider } from '../../src/config/blockchain.js';
import { io, Socket } from 'socket.io-client';

interface TestResults {
  passed: number;
  failed: number;
  tests: Array<{ name: string; status: 'PASS' | 'FAIL'; duration: number; error?: string }>;
}

async function testE2EFlow() {
  console.log('🧪 End-to-End Integration Test\n');
  console.log('Testing complete flow: Contract Event → Indexing → API → WebSocket\n');

  const results: TestResults = { passed: 0, failed: 0, tests: [] };
  
  async function runTest(name: string, testFn: () => Promise<void>) {
    const start = Date.now();
    try {
      await testFn();
      const duration = Date.now() - start;
      results.tests.push({ name, status: 'PASS', duration });
      results.passed++;
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.tests.push({ name, status: 'FAIL', duration, error: errorMsg });
      results.failed++;
      console.log(`❌ ${name} (${duration}ms)`);
      console.log(`   Error: ${errorMsg}`);
    }
  }

  await runTest('1. Database Connection', async () => {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
  });

  await runTest('2. Blockchain Connection', async () => {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    if (blockNumber < 0) throw new Error('Invalid block number');
  });

  await runTest('3. Database Tables Exist', async () => {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('blockchain_events', 'sync_status')
    `);
    if (result.rows.length !== 2) throw new Error('Missing required tables');
  });

  let eventCount = 0;
  await runTest('4. Query Existing Events', async () => {
    const result = await pool.query('SELECT COUNT(*) as count FROM blockchain_events');
    eventCount = parseInt(result.rows[0].count);
    console.log(`   Found ${eventCount} events in database`);
  });

  await runTest('5. Stats API Endpoint', async () => {
    const response = await fetch('http://localhost:4000/api/stats');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (typeof data.totalEvents !== 'number') throw new Error('Invalid stats format');
    console.log(`   Total Events: ${data.totalEvents}`);
  });

  await runTest('6. Events API with Pagination', async () => {
    const response = await fetch('http://localhost:4000/api/events?page=1&limit=10');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.events)) throw new Error('Invalid response format');
    console.log(`   Retrieved ${data.events.length} events`);
  });

  await runTest('7. Leaderboard API', async () => {
    const response = await fetch('http://localhost:4000/api/leaderboard?limit=5');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.leaderboard)) throw new Error('Invalid leaderboard format');
    console.log(`   Top ${data.leaderboard.length} players retrieved`);
  });

  await runTest('8. Event Distribution API', async () => {
    const response = await fetch('http://localhost:4000/api/stats/distribution');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.distribution)) throw new Error('Invalid distribution format');
    console.log(`   ${data.distribution.length} event types`);
  });

  await runTest('9. Health Check Endpoint', async () => {
    const response = await fetch('http://localhost:4000/health');
    if (!response.ok && response.status !== 503) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.services) throw new Error('Invalid health format');
    console.log(`   Overall Status: ${data.status}`);
    console.log(`   Database: ${data.services.database.status}`);
    console.log(`   Blockchain: ${data.services.blockchain.status}`);
  });

  let socket: Socket | undefined;
  await runTest('10. WebSocket Connection', async () => {
    return new Promise((resolve, reject) => {
      socket = io('http://localhost:4000', {
        transports: ['websocket'],
      });

      const timeout = setTimeout(() => {
        if (socket) socket.close();
        reject(new Error('Connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log(`   Socket ID: ${socket!.id}`);
        resolve();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  });

  await runTest('11. WebSocket Stats Updates', async () => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('No stats update received within 15 seconds'));
      }, 15000);

      socket!.on('statsUpdate', (data) => {
        clearTimeout(timeout);
        if (data.totalEvents !== undefined) {
          console.log(`   Received stats update: ${data.totalEvents} events`);
          resolve();
        } else {
          reject(new Error('Invalid stats update format'));
        }
      });
    });
  });

  if (socket) socket.close();

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  const totalDuration = results.tests.reduce((sum, t) => sum + t.duration, 0);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`   - ${t.name}`);
        console.log(`     ${t.error}`);
      });
  }

  console.log('\n' + (results.failed === 0 ? '✅ All tests passed!' : `⚠️  ${results.failed} test(s) failed`));
  
  process.exit(results.failed > 0 ? 1 : 0);
}

testE2EFlow().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});