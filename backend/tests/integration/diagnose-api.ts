async function diagnoseAPI() {
  console.log('🔍 API Response Diagnostic\n');

  const endpoints = [
    { name: 'Events API', url: 'http://localhost:4000/api/events?page=1&limit=5' },
    { name: 'Leaderboard API', url: 'http://localhost:4000/api/leaderboard?limit=5' },
    { name: 'Event Distribution API', url: 'http://localhost:4000/api/stats/distribution' },
    { name: 'Stats API', url: 'http://localhost:4000/api/stats' },
  ];

  for (const endpoint of endpoints) {
    console.log(`📍 ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}\n`);

    try {
      const response = await fetch(endpoint.url);
      const data = await response.json();

      console.log(`   Status: ${response.status}`);
      console.log(`   Response Type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
      
      if (Array.isArray(data)) {
        console.log(`   Array Length: ${data.length}`);
        if (data.length > 0) {
          console.log(`   First Item Keys: ${Object.keys(data[0]).join(', ')}`);
          console.log(`   First Item Sample:`, JSON.stringify(data[0], null, 2).slice(0, 200));
        }
      } else {
        console.log(`   Top-Level Keys: ${Object.keys(data).join(', ')}`);
        console.log(`   Full Response:`, JSON.stringify(data, null, 2).slice(0, 500));
      }

      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}\n`);
    }
  }
}

diagnoseAPI().catch(console.error);