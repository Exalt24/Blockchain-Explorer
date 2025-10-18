async function testAPIIntegration() {
  console.log('🧪 API Integration Test\n');
  console.log('Testing all REST API endpoints...\n');

  const BASE_URL = 'http://localhost:4000';
  let totalTests = 0;
  let passedTests = 0;

  async function testEndpoint(
    name: string, 
    path: string, 
    validate: (data: any) => void,
    expectedStatus: number = 200
  ) {
    totalTests++;
    const start = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}${path}`);
      const duration = Date.now() - start;
      
      if (response.status !== expectedStatus) {
        throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
      }

      const data = await response.json();
      validate(data);
      
      passedTests++;
      console.log(`✅ ${name} (${duration}ms)`);
      return data;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  console.log('📍 Testing Core Endpoints\n');

  const stats = await testEndpoint(
    'GET /api/stats',
    '/api/stats',
    (data) => {
      if (typeof data.totalEvents !== 'number') throw new Error('Invalid totalEvents');
      if (typeof data.uniquePlayers !== 'number') throw new Error('Invalid uniquePlayers');
      if (typeof data.eventsLast24h !== 'number') throw new Error('Invalid eventsLast24h');
      if (typeof data.latestBlock !== 'string') throw new Error('Invalid latestBlock');
    }
  );

  console.log(`   Total Events: ${stats.totalEvents}`);
  console.log(`   Unique Players: ${stats.uniquePlayers}`);
  console.log(`   Events (24h): ${stats.eventsLast24h}`);
  console.log(`   Latest Block: ${stats.latestBlock}\n`);

  console.log('📍 Testing Events Endpoints\n');

  const events = await testEndpoint(
    'GET /api/events (default pagination)',
    '/api/events',
    (data) => {
      if (!Array.isArray(data.events)) throw new Error('Events should be array');
      if (typeof data.pagination !== 'object') throw new Error('Missing pagination');
      if (typeof data.pagination.total !== 'number') throw new Error('Invalid total');
    }
  );

  console.log(`   Retrieved ${events.events.length} events`);
  console.log(`   Total: ${events.pagination.total}\n`);

  await testEndpoint(
    'GET /api/events (custom pagination)',
    '/api/events?page=1&limit=5',
    (data) => {
      if (data.events.length > 5) throw new Error('Limit not respected');
      if (data.pagination.page !== 1) throw new Error('Wrong page');
    }
  );

  await testEndpoint(
    'GET /api/events (filter by event type)',
    '/api/events?eventType=PlayerJoined',
    (data) => {
      if (data.events.some((e: any) => e.event_name !== 'PlayerJoined')) {
        throw new Error('Filter not working');
      }
    }
  );

  if (events.events.length > 0) {
    const txHash = events.events[0].transaction_hash;
    await testEndpoint(
      'GET /api/events/tx/:hash',
      `/api/events/tx/${txHash}`,
      (data) => {
        const eventsArray = Array.isArray(data) ? data : data.events;
        if (!Array.isArray(eventsArray)) throw new Error('Should return array or events wrapper');
        if (eventsArray.length === 0) throw new Error('Should return events');
      }
    );

    const blockNum = events.events[0].block_number;
    await testEndpoint(
      'GET /api/events/block/:block',
      `/api/events/block/${blockNum}`,
      (data) => {
        const eventsArray = Array.isArray(data) ? data : data.events;
        if (!Array.isArray(eventsArray)) throw new Error('Should return array or events wrapper');
        if (eventsArray.length === 0) throw new Error('Should return events');
      }
    );
  }

  console.log('\n📍 Testing Stats Endpoints\n');

  await testEndpoint(
    'GET /api/leaderboard (default)',
    '/api/leaderboard',
    (data) => {
      if (!Array.isArray(data.leaderboard)) throw new Error('Leaderboard should be array');
      if (data.leaderboard.length > 10) throw new Error('Default limit not respected');
      if (data.leaderboard.length > 0) {
        if (!data.leaderboard[0].player) throw new Error('Missing player field');
        if (typeof data.leaderboard[0].eventCount !== 'number') throw new Error('Missing eventCount');
      }
    }
  );

  await testEndpoint(
    'GET /api/leaderboard (custom limit)',
    '/api/leaderboard?limit=5',
    (data) => {
      if (data.leaderboard.length > 5) throw new Error('Limit not respected');
    }
  );

  const distribution = await testEndpoint(
    'GET /api/stats/distribution',
    '/api/stats/distribution',
    (data) => {
      if (!Array.isArray(data.distribution)) throw new Error('Distribution should be array');
      if (data.distribution.length > 0) {
        if (!data.distribution[0].eventName) throw new Error('Missing eventName');
        if (typeof data.distribution[0].count !== 'number') throw new Error('Missing count');
        if (typeof data.distribution[0].percentage !== 'number') throw new Error('Missing percentage');
      }
    }
  );

  console.log(`   Event types: ${distribution.distribution.length}`);
  if (distribution.distribution.length > 0) {
    console.log(`   Most common: ${distribution.distribution[0].eventName} (${distribution.distribution[0].percentage}%)\n`);
  }

  await testEndpoint(
    'GET /api/stats/timeline (24h)',
    '/api/stats/timeline',
    (data) => {
      const timeline = Array.isArray(data) ? data : data.timeline;
      if (!Array.isArray(timeline)) throw new Error('Timeline should be array');
      if (timeline.length > 0) {
        if (!timeline[0].hour) throw new Error('Missing hour field');
        if (typeof timeline[0].count !== 'number') throw new Error('Missing count');
      }
    }
  );

  await testEndpoint(
    'GET /api/stats/timeline (custom hours)',
    '/api/stats/timeline?hours=48',
    (data) => {
      const timeline = Array.isArray(data) ? data : data.timeline;
      if (!Array.isArray(timeline)) throw new Error('Timeline should be array');
    }
  );

  console.log('\n📍 Testing Error Handling\n');

  // FIXED: Expect 404 for invalid transaction hash
  await testEndpoint(
    'GET /api/events/tx/:hash (invalid hash)',
    '/api/events/tx/0xinvalid',
    (data) => {
      // Should be error response with 404
      if (!data.error) throw new Error('Should have error field');
    },
    404  // ← CHANGED: Now expects 404 status
  );

  // FIXED: Expect 404 for non-existent block
  await testEndpoint(
    'GET /api/events/block/:block (invalid block)',
    '/api/events/block/999999999',
    (data) => {
      // Should be error response with 404
      if (!data.error) throw new Error('Should have error field');
    },
    404  // ← CHANGED: Now expects 404 status
  );

  totalTests++;
  try {
    const response = await fetch(`${BASE_URL}/api/nonexistent`);
    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
    passedTests++;
    console.log('✅ 404 handling for unknown routes');
  } catch (error) {
    console.log('❌ 404 handling failed');
  }

  console.log('\n📍 Testing Response Times\n');

  const timings: Array<{ endpoint: string; duration: number }> = [];

  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await fetch(`${BASE_URL}/api/stats`);
    timings.push({ endpoint: '/api/stats', duration: Date.now() - start });
  }

  const avgTime = timings.reduce((sum, t) => sum + t.duration, 0) / timings.length;
  const minTime = Math.min(...timings.map(t => t.duration));
  const maxTime = Math.max(...timings.map(t => t.duration));

  console.log(`   /api/stats (5 requests):`);
  console.log(`   Average: ${avgTime.toFixed(1)}ms`);
  console.log(`   Min: ${minTime}ms`);
  console.log(`   Max: ${maxTime}ms`);

  console.log('\n📍 Testing Health Endpoint\n');

  await testEndpoint(
    'GET /health',
    '/health',
    (data) => {
      if (!['healthy', 'degraded', 'unhealthy'].includes(data.status)) {
        throw new Error('Invalid status');
      }
      if (!data.services) throw new Error('Missing services');
      if (typeof data.uptime !== 'number') throw new Error('Missing uptime');
    }
  );

  console.log('\n' + '='.repeat(60));
  console.log('📊 API Integration Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log('='.repeat(60));

  if (passedTests === totalTests) {
    console.log('\n✅ All API integration tests passed!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed`);
    process.exit(1);
  }
}

testAPIIntegration().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});