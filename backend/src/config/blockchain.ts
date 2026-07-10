import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { retry } from '../utils/retry.js';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const START_BLOCK = Number(process.env.START_BLOCK || '0');
const CHAIN_ID = Number(process.env.CHAIN_ID || '31337');

export const rpcUrl = RPC_URL;
export const contractAddress = CONTRACT_ADDRESS;
export const startBlock = START_BLOCK;

export const contractABI = [
  'event PlayerJoined(address indexed player, uint256 timestamp)',
  'event ScoreUpdated(address indexed player, uint256 oldScore, uint256 newScore, uint256 timestamp)',
  'event GameReset(uint256 timestamp, uint256 playerCount)',
  'event ItemPurchased(address indexed player, uint256 itemId, uint256 price, uint256 timestamp)',
];

let provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    // Pin the network as static so a down/unreachable RPC fails fast instead of
    // looping forever in ethers' network auto-detection ("failed to detect
    // network ... retry in 1s"), which never rejects and hangs the process.
    const network = ethers.Network.from(CHAIN_ID);
    provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });
  }
  return provider;
}

export async function testBlockchainConnection(): Promise<boolean> {
  try {
    const result = await retry(
      async () => {
        const prov = getProvider();
        const network = await prov.getNetwork();
        const blockNumber = await prov.getBlockNumber();
        return { network, blockNumber };
      },
      {
        maxAttempts: 5,
        delayMs: 1000,
        backoff: 'exponential',
        onRetry: (attempt, error) => {
          console.log(`⚠️  Blockchain connection attempt ${attempt} failed: ${error.message}`);
          console.log(`   Retrying in ${Math.pow(2, attempt - 1)} seconds...`);
        }
      }
    );

    console.log('✅ Blockchain connected successfully');
    console.log(`   Network: ${result.network.name} (Chain ID: ${result.network.chainId})`);
    console.log(`   Latest block: ${result.blockNumber}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to blockchain after multiple attempts:', error);
    return false;
  }
}

export function getContract(): ethers.Contract {
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS not set in environment');
  }
  return new ethers.Contract(contractAddress, contractABI, getProvider());
}

export async function getBlockWithRetry(blockNumber: number): Promise<ethers.Block | null> {
  try {
    return await retry(
      async () => {
        const prov = getProvider();
        return await prov.getBlock(blockNumber);
      },
      {
        maxAttempts: 3,
        delayMs: 500,
        backoff: 'exponential',
        onRetry: (attempt) => {
          console.warn(`⚠️  getBlock retry attempt ${attempt} for block ${blockNumber}`);
        }
      }
    );
  } catch (error) {
    console.error(`❌ Failed to get block ${blockNumber} after retries:`, error);
    return null;
  }
}

export async function getLogsWithRetry(filter: ethers.Filter): Promise<ethers.Log[]> {
  try {
    return await retry(
      async () => {
        const prov = getProvider();
        return await prov.getLogs(filter);
      },
      {
        maxAttempts: 3,
        delayMs: 500,
        backoff: 'exponential',
        onRetry: (attempt) => {
          console.warn(`⚠️  getLogs retry attempt ${attempt}`);
        }
      }
    );
  } catch (error) {
    console.error('❌ Failed to get logs after retries:', error);
    return [];
  }
}