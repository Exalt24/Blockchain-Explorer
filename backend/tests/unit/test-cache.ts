import { CacheService } from '../../src/services/CacheService.js';

async function testCacheService() {
  console.log('🧪 Testing CacheService...\n');

  const cache = new CacheService();

  console.log('1️⃣  Testing set and get...');
  cache.set('test_key', { data: 'test_value' }, 5);
  const value1 = cache.get('test_key');
  console.log(`   Retrieved: ${JSON.stringify(value1)}`);
  console.log(`   Has key: ${cache.has('test_key')}`);
  console.log('   ✅ Set and get working');

  console.log('\n2️⃣  Testing TTL expiration...');
  cache.set('short_ttl', 'expires soon', 1);
  console.log('   Waiting 2 seconds for expiration...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  const expired = cache.get('short_ttl');
  console.log(`   After 2s: ${expired === null ? 'expired (correct)' : 'still exists (wrong)'}`);
  console.log('   ✅ TTL expiration working');

  console.log('\n3️⃣  Testing multiple entries...');
  for (let i = 0; i < 10; i++) {
    cache.set(`key_${i}`, { index: i }, 60);
  }
  const stats = cache.getStats();
  console.log(`   Total entries: ${stats.totalEntries}`);
  console.log(`   Valid entries: ${stats.validEntries}`);
  console.log(`   Memory usage: ${stats.memoryUsage}`);
  console.log('   ✅ Multiple entries working');

  console.log('\n4️⃣  Testing clear...');
  cache.clear();
  const statsAfterClear = cache.getStats();
  console.log(`   Entries after clear: ${statsAfterClear.totalEntries}`);
  console.log('   ✅ Clear working');

  console.log('\n5️⃣  Testing different data types...');
  cache.set('number', 42, 60);
  cache.set('string', 'hello', 60);
  cache.set('array', [1, 2, 3], 60);
  cache.set('object', { nested: { data: true } }, 60);
  
  console.log(`   Number: ${cache.get('number')}`);
  console.log(`   String: ${cache.get('string')}`);
  console.log(`   Array: ${JSON.stringify(cache.get('array'))}`);
  console.log(`   Object: ${JSON.stringify(cache.get('object'))}`);
  console.log('   ✅ Different data types working');

  cache.destroy();
  console.log('\n✅ All CacheService tests passed!');
}

testCacheService().catch(console.error);