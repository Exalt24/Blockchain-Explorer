import { HealthMonitor } from '../../src/services/HealthMonitor.js';
import { closePool } from '../../src/config/database.js';
import { getProvider } from '../../src/config/blockchain.js';

async function testHealthMonitor() {
  console.log('🧪 Testing HealthMonitor...\n');

  const monitor = new HealthMonitor();
  
  console.log('1️⃣  Getting health status...');
  const health = await monitor.getHealth();
  
  console.log('\n📊 Health Status:');
  console.log(`   Overall Status: ${health.status}`);
  console.log(`   Timestamp: ${health.timestamp}`);
  console.log(`   Uptime: ${health.uptime}s`);
  
  console.log('\n🔍 Service Statuses:');
  console.log(`   Database: ${health.services.database.status} (${health.services.database.latency}ms)`);
  console.log(`   Blockchain: ${health.services.blockchain.status} (${health.services.blockchain.latency}ms)`);
  console.log(`   EventListener: ${health.services.eventListener.status}`);
  console.log(`   WebSocket: ${health.services.websocket.status}`);

  console.log('\n2️⃣  Testing multiple calls...');
  const health2 = await monitor.getHealth();
  console.log(`   Second call completed in ${health2.services.database.latency}ms`);

  console.log('\n✅ HealthMonitor tests passed!');
}

testHealthMonitor()
  .catch((error) => {
    console.error('❌ HealthMonitor test failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Release the DB pool and blockchain provider so the process exits promptly
    // instead of lingering on an idle socket / provider timer.
    try {
      await closePool();
    } catch {
      /* ignore teardown errors */
    }
    getProvider().destroy();
  });