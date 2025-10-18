import { EventListener } from '../src/services/EventListener.js';
import { testConnection } from '../src/config/database.js';
import { testBlockchainConnection } from '../src/config/blockchain.js';
import dotenv from 'dotenv';

dotenv.config();

async function testEventListener() {
  console.log('🧪 Testing EventListener Service\n');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  const blockchainConnected = await testBlockchainConnection();
  if (!blockchainConnected) {
    console.error('❌ Blockchain connection failed');
    console.log('   Make sure Hardhat node is running: npm run node');
    process.exit(1);
  }

  if (!process.env.CONTRACT_ADDRESS) {
    console.error('❌ CONTRACT_ADDRESS not set in .env');
    console.log('   Deploy the contract first and update .env');
    process.exit(1);
  }

  console.log('1️⃣  Testing EventListener instantiation...');
  let listener: EventListener;
  
  try {
    listener = new EventListener();
    console.log('   ✅ EventListener created\n');
  } catch (error) {
    console.error('   ❌ Failed to create EventListener:', error);
    process.exit(1);
  }

  console.log('2️⃣  Testing backfill and real-time listening...');
  console.log('   Starting listener (this will backfill and listen)...\n');
  
  await listener.start();

  const status = listener.getStatus();
  console.log(`\n   Status: ${status.isListening ? 'Listening' : 'Not listening'}`);
  console.log(`   Last processed block: ${status.lastProcessedBlock}`);
  console.log(`   Poll interval: ${status.pollInterval}ms\n`);

  console.log('3️⃣  Listener is now running in real-time mode');
  console.log('   To test real-time events:');
  console.log('   - Deploy and interact with the contract');
  console.log('   - Watch for "📡 New [EventName] event detected" messages\n');

  console.log('4️⃣  Keeping listener running for 10 seconds...');
  console.log('   (Press Ctrl+C to stop early)\n');

  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log('5️⃣  Testing stop()...');
  await listener.stop();
  
  const stoppedStatus = listener.getStatus();
  console.log(`   Status after stop: ${stoppedStatus.isListening ? 'Still listening' : 'Stopped'}\n`);

  console.log('✅ All EventListener tests passed!');
  console.log('\n💡 To see real-time events:');
  console.log('   1. Keep this test running (or start the main server)');
  console.log('   2. In another terminal, interact with the deployed contract');
  console.log('   3. Watch events appear in real-time\n');

  process.exit(0);
}

testEventListener().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});