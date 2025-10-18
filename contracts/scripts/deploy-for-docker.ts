import { network } from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Deploying GameState contract for Docker environment...\n');

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  
  console.log(`   Deployer address: ${deployer.address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}\n`);

  const GameState = await ethers.getContractFactory('GameState');
  const gameState = await GameState.deploy();
  await gameState.waitForDeployment();
  
  const contractAddress = await gameState.getAddress();
  console.log(`✅ GameState deployed to: ${contractAddress}\n`);

  const envPath = path.join(__dirname, '../../backend/.env.docker');
  
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated backend/.env.docker with CONTRACT_ADDRESS\n`);
  } else {
    console.warn('⚠️  backend/.env.docker not found, creating new file...');
    fs.writeFileSync(envPath, `CONTRACT_ADDRESS=${contractAddress}\n`);
    console.log(`✅ Created backend/.env.docker with CONTRACT_ADDRESS\n`);
  }
  
  console.log('📋 Next steps:');
  console.log('   1. Restart backend container: docker-compose restart backend');
  console.log('   2. Backend will auto-start event listener');
  console.log('   3. Generate events: docker-compose exec hardhat npm run generate-events\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });