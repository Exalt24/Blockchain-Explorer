import dotenv from 'dotenv';

dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 4000}/api`;

async function testAPI() {
  console.log('🧪 Testing REST API Endpoints\n');
  console.log(`   API Base URL: ${API_URL}\n`);

  try {
    console.log('1️⃣  Testing GET /api/health...');
    const healthRes = await fetch(`${API_URL}/health`);
    const healthData = await healthRes.json();
    console.log(`   Status: ${healthData.status}`);
    console.log(`   Response: ${JSON.stringify(healthData, null, 2)}\n`);

    console.log('2️⃣  Testing GET /api/stats...');
    const statsRes = await fetch(`${API_URL}/stats`);
    const statsData = await statsRes.json();
    console.log(`   Total Events: ${statsData.totalEvents}`);
    console.log(`   Unique Players: ${statsData.uniquePlayers}`);
    console.log(`   Events (24h): ${statsData.eventsLast24h}`);
    console.log(`   Latest Block: ${statsData.latestBlock}\n`);

    console.log('3️⃣  Testing GET /api/leaderboard...');
    const leaderboardRes = await fetch(`${API_URL}/leaderboard?limit=5`);
    const leaderboardData = await leaderboardRes.json();
    console.log(`   Leaderboard entries: ${leaderboardData.leaderboard.length}`);
    if (leaderboardData.leaderboard.length > 0) {
      console.log('   Top 3:');
      leaderboardData.leaderboard.slice(0, 3).forEach((entry: any, idx: number) => {
        console.log(`   ${idx + 1}. ${entry.player.slice(0, 10)}... - ${entry.eventCount} events`);
      });
    }
    console.log();

    console.log('4️⃣  Testing GET /api/stats/distribution...');
    const distributionRes = await fetch(`${API_URL}/stats/distribution`);
    const distributionData = await distributionRes.json();
    console.log(`   Event types: ${distributionData.distribution.length}`);
    distributionData.distribution.forEach((item: any) => {
      console.log(`   - ${item.eventName}: ${item.count} (${item.percentage}%)`);
    });
    console.log();

    console.log('5️⃣  Testing GET /api/stats/timeline...');
    const timelineRes = await fetch(`${API_URL}/stats/timeline?hours=24`);
    const timelineData = await timelineRes.json();
    console.log(`   Timeline entries: ${timelineData.timeline.length}`);
    if (timelineData.timeline.length > 0) {
      console.log('   Recent activity:');
      timelineData.timeline.slice(-3).forEach((item: any) => {
        console.log(`   - ${item.hour}: ${item.count} events`);
      });
    }
    console.log();

    console.log('6️⃣  Testing GET /api/events...');
    const eventsRes = await fetch(`${API_URL}/events?page=1&limit=10`);
    const eventsData = await eventsRes.json();
    console.log(`   Events returned: ${eventsData.events.length}`);
    console.log(`   Total events: ${eventsData.pagination.total}`);
    console.log(`   Pages: ${eventsData.pagination.totalPages}`);
    if (eventsData.events.length > 0) {
      console.log('   Latest event:');
      const latest = eventsData.events[0];
      console.log(`   - ${latest.event_name} at block ${latest.block_number}`);
      console.log(`   - TX: ${latest.transaction_hash.slice(0, 20)}...`);
    }
    console.log();

    console.log('7️⃣  Testing GET /api/events with filters...');
    if (distributionData.distribution.length > 0) {
      const eventType = distributionData.distribution[0].eventName;
      const filteredRes = await fetch(`${API_URL}/events?eventType=${eventType}&limit=5`);
      const filteredData = await filteredRes.json();
      console.log(`   Filtered by ${eventType}: ${filteredData.events.length} events`);
    }
    console.log();

    if (eventsData.events.length > 0) {
      const testEvent = eventsData.events[0];

      console.log('8️⃣  Testing GET /api/events/tx/:hash...');
      const txRes = await fetch(`${API_URL}/events/tx/${testEvent.transaction_hash}`);
      const txData = await txRes.json();
      console.log(`   Events in transaction: ${txData.events.length}`);
      console.log();

      console.log('9️⃣  Testing GET /api/events/block/:block...');
      const blockRes = await fetch(`${API_URL}/events/block/${testEvent.block_number}`);
      const blockData = await blockRes.json();
      console.log(`   Events in block ${testEvent.block_number}: ${blockData.events.length}`);
      console.log();
    }

    console.log('🔟  Testing 404 handling...');
    const notFoundRes = await fetch(`${API_URL}/nonexistent`);
    const notFoundData = await notFoundRes.json();
    console.log(`   Status: ${notFoundRes.status}`);
    console.log(`   Error message: ${notFoundData.error.message}\n`);

    console.log('✅ All REST API tests passed!');
    console.log('\n💡 You can now test these endpoints in:');
    console.log('   - Browser: http://localhost:4000/api/stats');
    console.log('   - Postman or Thunder Client');
    console.log('   - curl: curl http://localhost:4000/api/events\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n⚠️  Make sure the backend server is running:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
}

testAPI();