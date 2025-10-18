import { network } from "hardhat";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Deploying GameState contract...\n');

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log(`   Deployer address: ${deployer.address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}\n`);

  const GameState = await ethers.getContractFactory('GameState');
  const gameState = await GameState.deploy();
  await gameState.waitForDeployment();

  const contractAddress = await gameState.getAddress();
  console.log(`✅ GameState deployed to: ${contractAddress}\n`);

  const envPath = path.join(__dirname, '../../backend/.env');
  
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
    console.log(`✅ Updated backend/.env with CONTRACT_ADDRESS\n`);
  } else {
    console.warn('⚠️  backend/.env not found, creating new file...');
    fs.writeFileSync(envPath, `CONTRACT_ADDRESS=${contractAddress}\n`);
    console.log(`✅ Created backend/.env with CONTRACT_ADDRESS\n`);
  }

  console.log('📋 Next steps:');
  console.log('   1. Start or restart your backend server');
  console.log('   2. The Event Listener will automatically start indexing');
  console.log('   3. Generate some events by interacting with the contract\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });