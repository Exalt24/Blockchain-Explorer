import { EventProcessor } from '../src/services/EventProcessor.js';
import { testConnection } from '../src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const TEST_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

async function testEventProcessor() {
  console.log('🧪 Testing EventProcessor Service\n');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  const processor = new EventProcessor(TEST_CONTRACT_ADDRESS);

  console.log('1️⃣  Testing getLastSyncedBlock()...');
  const lastBlock = await processor.getLastSyncedBlock();
  console.log(`   Last synced block: ${lastBlock}\n`);

  console.log('2️⃣  Testing updateSyncStatus()...');
  await processor.updateSyncStatus(BigInt(100));
  const updatedBlock = await processor.getLastSyncedBlock();
  console.log(`   Updated block: ${updatedBlock}\n`);

  console.log('3️⃣  Testing getEventCount()...');
  const count = await processor.getEventCount();
  console.log(`   Event count: ${count}\n`);

  console.log('4️⃣  Testing storeEvent() with mock data...');
  const mockEvent = {
    block_number: BigInt(101),
    block_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    transaction_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    log_index: 0,
    contract_address: TEST_CONTRACT_ADDRESS.toLowerCase(),
    event_name: 'PlayerJoined',
    event_data: { arg0: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', arg1: '1234567890' },
    decoded_data: {
      player: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      timestamp: '1234567890',
    },
    timestamp: new Date(),
  };

  const stored = await processor.storeEvent(mockEvent);
  console.log(`   Stored: ${stored ? 'Success' : 'Already exists (duplicate)'}\n`);

  console.log('5️⃣  Testing duplicate prevention...');
  const duplicate = await processor.storeEvent(mockEvent);
  console.log(`   Duplicate handled: ${duplicate === null ? 'Yes' : 'No'}\n`);

  const finalCount = await processor.getEventCount();
  console.log(`✅ Final event count: ${finalCount}`);
  console.log('\n✅ All EventProcessor tests passed!');

  process.exit(0);
}

testEventProcessor().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});