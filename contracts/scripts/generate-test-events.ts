import { network } from 'hardhat';
import type { GameState } from '../types/ethers-contracts/GameState';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestEvents() {
  console.log('🎲 Generating Test Events\n');

  // Check multiple paths for CONTRACT_ADDRESS (Docker + local compatibility)
  const envPaths = [
    '/backend/.env.docker',                        // Docker: mounted volume
    '/backend/.env',                               // Docker: if using .env
    path.join(__dirname, '../../backend/.env'),    // Local: relative path to .env
    path.join(__dirname, '../../backend/.env.docker') // Local: relative path to .env.docker
  ];

  let CONTRACT_ADDRESS = '';
  let foundPath = '';

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const contractAddressMatch = envContent.match(/CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})/);
      
      if (contractAddressMatch) {
        CONTRACT_ADDRESS = contractAddressMatch[1];
        foundPath = envPath;
        break;
      }
    }
  }

  if (!CONTRACT_ADDRESS) {
    console.error('❌ CONTRACT_ADDRESS not found in any .env file');
    console.log('   Docker: Run "docker-compose exec hardhat npm run deploy-docker"');
    console.log('   Local:  Run "npm run deploy"');
    process.exit(1);
  }

  console.log(`✅ Found CONTRACT_ADDRESS in: ${foundPath}`);
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}\n`);

  const { ethers } = await network.connect();
  const GameStateFactory = await ethers.getContractFactory('GameState');
  const gameState = GameStateFactory.attach(CONTRACT_ADDRESS) as unknown as GameState;

  const signers = await ethers.getSigners();
  const players = signers.slice(0, 10);

  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Players: ${players.length}\n`);

  console.log('📍 Scenario 1: Players Joining\n');
  
  for (let i = 0; i < players.length; i++) {
    const tx = await gameState.connect(players[i]).joinGame();
    await tx.wait();
    console.log(`   ✅ Player ${i + 1} joined (${players[i].address.slice(0, 10)}...)`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📍 Scenario 2: Score Updates\n');
  
  for (let round = 1; round <= 3; round++) {
    console.log(`   Round ${round}:`);
    
    for (const player of players) {
      const randomScore = Math.floor(Math.random() * 900) + 100;
      const tx = await gameState.connect(player).updateScore(randomScore);
      await tx.wait();
      console.log(`     Player ${player.address.slice(0, 10)}... scored ${randomScore}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('');
  }

  console.log('📍 Scenario 3: Item Purchases\n');
  
  const items = [
    { id: 1, name: 'Power Boost', price: '0.01' },
    { id: 2, name: 'Shield', price: '0.02' },
    { id: 3, name: 'Speed Up', price: '0.015' },
  ];

  for (const item of items) {
    const buyer = players[Math.floor(Math.random() * players.length)];
    const tx = await gameState.connect(buyer).purchaseItem(
      item.id, 
      { value: ethers.parseEther(item.price) }
    );
    await tx.wait();
    console.log(`   ✅ ${item.name} purchased by ${buyer.address.slice(0, 10)}... for ${item.price} ETH`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📍 Scenario 4: More Activity\n');
  
  for (let i = 0; i < 5; i++) {
    const player = players[Math.floor(Math.random() * players.length)];
    const newScore = Math.floor(Math.random() * 1000);
    const tx = await gameState.connect(player).updateScore(newScore);
    await tx.wait();
    console.log(`   ✅ ${player.address.slice(0, 10)}... updated score to ${newScore}`);
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  console.log('\n📍 Scenario 5: Game Reset\n');
  
  const tx = await gameState.resetGame();
  await tx.wait();
  console.log('   ✅ Game reset completed\n');

  console.log('📍 Scenario 6: Rapid Fire Events\n');
  console.log('   Generating 20 events quickly to test batch processing...\n');

  const rapidTxs = [];
  for (let i = 0; i < 20; i++) {
    const player = players[i % players.length];
    const score = Math.floor(Math.random() * 500) + 500;
    rapidTxs.push(gameState.connect(player).updateScore(score));
  }

  const txResults = await Promise.all(rapidTxs);
  await Promise.all(txResults.map((tx: any) => tx.wait()));
  console.log('   ✅ 20 events generated simultaneously\n');

  console.log('='.repeat(60));
  console.log('📊 Event Generation Summary');
  console.log('='.repeat(60));
  console.log(`Total Events Generated: ~${players.length + (players.length * 3) + items.length + 5 + 1 + 20}`);
  console.log('   PlayerJoined: 10');
  console.log('   ScoreUpdated: 30 (rounds) + 5 (activity) + 20 (rapid) = 55');
  console.log('   ItemPurchased: 3');
  console.log('   GameReset: 1');
  console.log('='.repeat(60));
  console.log('\n✅ Test events generated successfully!');
  console.log('   Check backend logs for event indexing');
  console.log('   Visit http://localhost:3000 to see frontend updates\n');
}

generateTestEvents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });