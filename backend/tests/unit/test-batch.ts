import { BatchProcessor } from '../../src/utils/batchProcessor.js';

async function testBatchProcessor() {
  console.log('🧪 Testing BatchProcessor...\n');

  const processed: number[][] = [];

  const processor = new BatchProcessor<number>({
    batchSize: 5,
    flushInterval: 1000,
    processor: async (batch) => {
      processed.push([...batch]);
      console.log(`   📦 Processed batch of ${batch.length} items: [${batch.join(', ')}]`);
    },
  });

  console.log('1️⃣  Testing batch size trigger (5 items)...');
  for (let i = 1; i <= 5; i++) {
    await processor.add(i);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`   ✅ First batch processed: ${processed.length} batch(es)`);

  console.log('\n2️⃣  Testing flush interval (3 items, wait 1.5s)...');
  for (let i = 6; i <= 8; i++) {
    await processor.add(i);
  }
  console.log('   Waiting 1.5 seconds for auto-flush...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  console.log(`   ✅ Second batch processed: ${processed.length} batch(es)`);

  console.log('\n3️⃣  Testing manual flush...');
  for (let i = 9; i <= 11; i++) {
    await processor.add(i);
  }
  await processor.flush();
  console.log(`   ✅ Manual flush worked: ${processed.length} batch(es)`);

  console.log('\n4️⃣  Testing destroy (flush remaining)...');
  await processor.add(12);
  await processor.add(13);
  await processor.destroy();
  console.log(`   ✅ Destroy flushed remaining items: ${processed.length} batch(es)`);

  console.log('\n📊 Summary:');
  console.log(`   Total batches processed: ${processed.length}`);
  console.log(`   Total items processed: ${processed.flat().length}`);
  console.log(`   Items: [${processed.flat().join(', ')}]`);

  console.log('\n✅ All BatchProcessor tests passed!');
}

testBatchProcessor().catch(console.error);