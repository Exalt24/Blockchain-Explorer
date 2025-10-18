import { StatsService } from '../src/services/StatsService.js';
import { testConnection } from '../src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function testStatsService() {
  console.log('🧪 Testing StatsService\n');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  const statsService = new StatsService();

  console.log('1️⃣  Testing getPlatformStats()...');
  const platformStats = await statsService.getPlatformStats();
  console.log('   Platform Stats:');
  console.log(`   - Total Events: ${platformStats.totalEvents}`);
  console.log(`   - Unique Players: ${platformStats.uniquePlayers}`);
  console.log(`   - Events (Last 24h): ${platformStats.eventsLast24h}`);
  console.log(`   - Latest Block: ${platformStats.latestBlock}\n`);

  console.log('2️⃣  Testing getLeaderboard()...');
  const leaderboard = await statsService.getLeaderboard(5);
  console.log(`   Leaderboard (Top ${leaderboard.length}):`);
  leaderboard.forEach((entry, index) => {
    console.log(`   ${index + 1}. ${entry.player.slice(0, 10)}... - ${entry.eventCount} events`);
  });
  console.log();

  console.log('3️⃣  Testing getEventDistribution()...');
  const distribution = await statsService.getEventDistribution();
  console.log('   Event Distribution:');
  distribution.forEach((item) => {
    console.log(`   - ${item.eventName}: ${item.count} (${item.percentage}%)`);
  });
  console.log();

  console.log('4️⃣  Testing getActivityTimeline()...');
  const timeline = await statsService.getActivityTimeline(24);
  console.log(`   Activity Timeline (Last 24h): ${timeline.length} hours with activity`);
  if (timeline.length > 0) {
    console.log('   Recent activity:');
    timeline.slice(-5).forEach((item) => {
      console.log(`   - ${item.hour}: ${item.count} events`);
    });
  } else {
    console.log('   No activity in the last 24 hours');
  }
  console.log();

  if (leaderboard.length > 0) {
    const topPlayer = leaderboard[0].player;
    console.log('5️⃣  Testing getEventsByPlayer()...');
    const playerEvents = await statsService.getEventsByPlayer(topPlayer, 5);
    console.log(`   Events for ${topPlayer.slice(0, 10)}...: ${playerEvents.length} events`);
    playerEvents.forEach((event: any) => {
      console.log(`   - ${event.event_name} at block ${event.block_number}`);
    });
    console.log();
  }

  console.log('6️⃣  Testing getTotalEventsByType()...');
  if (distribution.length > 0) {
    const eventType = distribution[0].eventName;
    const count = await statsService.getTotalEventsByType(eventType);
    console.log(`   ${eventType} events: ${count}\n`);
  }

  console.log('✅ All StatsService tests passed!');
  console.log('\n💡 Stats are based on events currently in the database.');
  console.log('   Generate more events to see different statistics.\n');

  process.exit(0);
}

testStatsService().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});