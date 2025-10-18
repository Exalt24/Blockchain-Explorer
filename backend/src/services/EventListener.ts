import { getProvider, getContract, contractAddress, startBlock, getLogsWithRetry } from '../config/blockchain.js';
import { EventProcessor } from './EventProcessor.js';
import type { WebSocketServer } from '../websocket/server.js';

export class EventListener {
  private contract: ReturnType<typeof getContract>;
  private processor: EventProcessor;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isListening = false;
  private lastProcessedBlock: number;
  private consecutiveErrors = 0;
  private readonly maxConsecutiveErrors = 10;
  private readonly pollingIntervalMs = 2000;
  private wsServer?: WebSocketServer;

  constructor(wsServer?: WebSocketServer) {
    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS not set in environment');
    }
    this.contract = getContract();
    this.processor = new EventProcessor(contractAddress, wsServer);
    this.lastProcessedBlock = startBlock;
    this.wsServer = wsServer;
  }

  async start(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️  EventListener already running');
      return;
    }

    console.log('🎧 Starting EventListener...');
    
    const lastSynced = await this.processor.getLastSyncedBlock();
    if (lastSynced > this.lastProcessedBlock) {
      this.lastProcessedBlock = Number(lastSynced);
      console.log(`📍 Resuming from block ${this.lastProcessedBlock}`);
    }

    await this.backfillEvents();
    
    this.isListening = true;
    this.startPolling();
    console.log('✅ EventListener started successfully');
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForEvents();
        this.consecutiveErrors = 0;
      } catch (error) {
        this.consecutiveErrors++;
        console.error(`❌ Polling error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error);
        
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          console.error('🚨 Too many consecutive errors, stopping EventListener');
          this.stop();
          setTimeout(() => {
            console.log('🔄 Attempting to restart EventListener...');
            this.consecutiveErrors = 0;
            this.start().catch(err => {
              console.error('❌ Failed to restart EventListener:', err);
            });
          }, 5000);
        }
      }
    }, this.pollingIntervalMs);
  }

  private async pollForEvents(): Promise<void> {
    const provider = getProvider();
    const currentBlock = await provider.getBlockNumber();

    if (currentBlock > this.lastProcessedBlock) {
      const fromBlock = this.lastProcessedBlock + 1;
      const toBlock = currentBlock;

      const logs = await getLogsWithRetry({
        address: contractAddress,
        fromBlock,
        toBlock,
      });

      if (logs.length > 0) {
        console.log(`📦 Processing ${logs.length} events from blocks ${fromBlock}-${toBlock}`);
        
        for (const log of logs) {
          await this.processor.processEvent(log);
        }
      }

      this.lastProcessedBlock = currentBlock;
      await this.processor.updateSyncStatus(BigInt(currentBlock));

      if (this.wsServer) {
        const block = await provider.getBlock(currentBlock);
        if (block) {
          this.wsServer.broadcastBlockUpdate(BigInt(currentBlock), block.hash || '');
        }
      }
    }
  }

  private async backfillEvents(): Promise<void> {
    const provider = getProvider();
    const currentBlock = await provider.getBlockNumber();
    
    if (this.lastProcessedBlock >= currentBlock) {
      console.log('✅ Already synced to latest block');
      return;
    }

    console.log(`⏳ Backfilling events from block ${this.lastProcessedBlock} to ${currentBlock}...`);
    const chunkSize = 1000;
    let processedBlocks = 0;
    let totalEvents = 0;

    for (let from = this.lastProcessedBlock; from <= currentBlock; from += chunkSize) {
      const to = Math.min(from + chunkSize - 1, currentBlock);
      
      try {
        const logs = await getLogsWithRetry({
          address: contractAddress,
          fromBlock: from,
          toBlock: to,
        });

        if (logs.length > 0) {
          console.log(`📦 Found ${logs.length} events in blocks ${from}-${to}`);
          
          for (const log of logs) {
            await this.processor.processEvent(log);
          }
          
          totalEvents += logs.length;
        }

        processedBlocks = to - this.lastProcessedBlock;
        this.lastProcessedBlock = to;
        await this.processor.updateSyncStatus(BigInt(to));

        if (processedBlocks % 5000 === 0) {
          console.log(`   Progress: ${processedBlocks}/${currentBlock - startBlock} blocks processed (${totalEvents} events)`);
        }
      } catch (error) {
        console.error(`❌ Error processing blocks ${from}-${to}:`, error);
        throw error;
      }
    }

    console.log(`✅ Backfill complete: ${totalEvents} events indexed across ${processedBlocks} blocks`);
  }

  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isListening = false;
    console.log('🛑 EventListener stopped');
  }

  getStatus() {
    return {
      isListening: this.isListening,
      lastProcessedBlock: this.lastProcessedBlock,
      contractAddress,
      consecutiveErrors: this.consecutiveErrors,
    };
  }
}