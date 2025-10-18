async function testLoad() {
  console.log('🧪 Load Test\n');
  console.log('Testing API performance under concurrent load...\n');

  const endpoints = [
    { path: '/api/stats', name: 'Stats' },
    { path: '/api/events?page=1&limit=20', name: 'Events (paginated)' },
    { path: '/api/leaderboard?limit=10', name: 'Leaderboard' },
    { path: '/api/stats/distribution', name: 'Distribution' },
    { path: '/api/stats/timeline?hours=24', name: 'Timeline' },
  ];

  const CONCURRENT_REQUESTS = 50;
  const ITERATIONS = 5;

  console.log(`Configuration:`);
  console.log(`   Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log(`   Iterations: ${ITERATIONS}`);
  console.log(`   Total requests per endpoint: ${CONCURRENT_REQUESTS * ITERATIONS}\n`);

  for (const endpoint of endpoints) {
    console.log(`📍 Testing ${endpoint.name}`);
    console.log(`   ${endpoint.path}\n`);

    const results: number[] = [];
    let errors = 0;

    for (let iteration = 1; iteration <= ITERATIONS; iteration++) {
      const requests: Promise<number>[] = [];

      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        requests.push(
          (async () => {
            const start = Date.now();
            try {
              const response = await fetch(`http://localhost:4000${endpoint.path}`);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              await response.json();
              return Date.now() - start;
            } catch (error) {
              errors++;
              return -1;
            }
          })()
        );
      }

      const iterationStart = Date.now();
      const durations = await Promise.all(requests);
      const iterationDuration = Date.now() - iterationStart;

      const successfulDurations = durations.filter(d => d > 0);
      results.push(...successfulDurations);

      const avgDuration = successfulDurations.reduce((a, b) => a + b, 0) / successfulDurations.length;
      const requestsPerSecond = (CONCURRENT_REQUESTS / (iterationDuration / 1000)).toFixed(1);

      console.log(`   Iteration ${iteration}:`);
      console.log(`     Total time: ${iterationDuration}ms`);
      console.log(`     Avg response: ${avgDuration.toFixed(1)}ms`);
      console.log(`     Throughput: ${requestsPerSecond} req/s`);
      console.log(`     Errors: ${durations.filter(d => d === -1).length}`);
    }

    if (results.length > 0) {
      results.sort((a, b) => a - b);

      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      const min = results[0];
      const max = results[results.length - 1];
      const p50 = results[Math.floor(results.length * 0.5)];
      const p95 = results[Math.floor(results.length * 0.95)];
      const p99 = results[Math.floor(results.length * 0.99)];

      console.log(`\n   📊 Summary (${results.length} requests):`);
      console.log(`     Average: ${avg.toFixed(1)}ms`);
      console.log(`     Min: ${min}ms`);
      console.log(`     Max: ${max}ms`);
      console.log(`     P50 (median): ${p50}ms`);
      console.log(`     P95: ${p95}ms`);
      console.log(`     P99: ${p99}ms`);
      console.log(`     Total errors: ${errors}`);
      console.log(`     Success rate: ${((results.length / (CONCURRENT_REQUESTS * ITERATIONS)) * 100).toFixed(1)}%\n`);
    }
  }

  console.log('='.repeat(60));
  console.log('🔥 Stress Test - Maximum Throughput');
  console.log('='.repeat(60));
  console.log('Hammering /api/stats with 100 concurrent requests...\n');

  const stressRequests: Promise<number>[] = [];
  const stressStart = Date.now();

  for (let i = 0; i < 100; i++) {
    stressRequests.push(
      (async () => {
        const start = Date.now();
        try {
          const response = await fetch('http://localhost:4000/api/stats');
          await response.json();
          return Date.now() - start;
        } catch {
          return -1;
        }
      })()
    );
  }

  const stressDurations = await Promise.all(stressRequests);
  const stressTotalTime = Date.now() - stressStart;
  const stressSuccessful = stressDurations.filter(d => d > 0);

  console.log(`Results:`);
  console.log(`   Total time: ${stressTotalTime}ms`);
  console.log(`   Successful: ${stressSuccessful.length}/100`);
  console.log(`   Throughput: ${(100 / (stressTotalTime / 1000)).toFixed(1)} req/s`);
  console.log(`   Avg response: ${(stressSuccessful.reduce((a, b) => a + b, 0) / stressSuccessful.length).toFixed(1)}ms`);

  console.log('\n='.repeat(60));
  console.log('📊 Load Test Complete');
  console.log('='.repeat(60));
  console.log('✅ All endpoints tested under concurrent load');
  console.log('   Review response times and error rates above');
  console.log('='.repeat(60));

  process.exit(0);
}

testLoad().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});