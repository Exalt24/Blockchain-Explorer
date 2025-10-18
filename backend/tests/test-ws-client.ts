import { io } from 'socket.io-client';

console.log('🔌 WebSocket Client Test\n');
console.log('Connecting to http://localhost:4000...\n');

const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`   Socket ID: ${socket.id}\n`);
});

socket.on('disconnect', (reason) => {
  console.log(`❌ Disconnected: ${reason}\n`);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('newEvent', (message) => {
  console.log('🔔 New Event Received:');
  console.log(`   Type: ${message.data.event_name}`);
  console.log(`   Block: ${message.data.block_number}`);
  console.log(`   Transaction: ${message.data.transaction_hash}`);
  if (message.data.decoded_data?.player) {
    console.log(`   Player: ${message.data.decoded_data.player}`);
  }
  console.log(`   Timestamp: ${message.timestamp}\n`);
});

socket.on('statsUpdate', (message) => {
  console.log('📊 Stats Update:');
  console.log(`   Total Events: ${message.data.totalEvents}`);
  console.log(`   Unique Players: ${message.data.uniquePlayers}`);
  console.log(`   Events (24h): ${message.data.eventsLast24h}`);
  console.log(`   Latest Block: ${message.data.latestBlock}`);
  console.log(`   Timestamp: ${message.timestamp}\n`);
});

socket.on('blockUpdate', (message) => {
  console.log('📦 Block Update:');
  console.log(`   Block Number: ${message.data.blockNumber}`);
  console.log(`   Block Hash: ${message.data.blockHash}`);
  console.log(`   Timestamp: ${message.timestamp}\n`);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

console.log('👂 Listening for real-time events...');
console.log('   Press Ctrl+C to exit\n');

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down client...');
  socket.disconnect();
  process.exit(0);
});