import { pool } from '../config/database.js';
import type { BlockchainEvent } from '../types/database.js';
import type { Log, EventLog, Interface } from 'ethers';
import { contractABI } from '../config/blockchain.js';
import { ethers } from 'ethers';
import type { WebSocketServer } from '../websocket/server.js';
import { StatsService } from './StatsService.js';
import { BatchProcessor } from '../utils/batchProcessor.js';

interface EventToStore {
  blockNumber: bigint;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  contractAddress: string;
  eventName: string;
  eventData: Record<string, any>;
  decodedData: Record<string, any>;
  timestamp: Date;
}

export class EventProcessor {
  private contractAddress: string;
  private contractInterface: Interface;
  private wsServer?: WebSocketServer;
  private batchProcessor: BatchProcessor<EventToStore>;

  constructor(contractAddress: string, wsServer?: WebSocketServer) {
    this.contractAddress = contractAddress.toLowerCase();
    this.contractInterface = new ethers.Interface(contractABI);
    this.wsServer = wsServer;

    this.batchProcessor = new BatchProcessor<EventToStore>({
      batchSize: 50,
      flushInterval: 1000,
      processor: async (batch) => {
        await this.storeBatch(batch);
      },
    });
  }

  async processEvent(log: Log | EventLog): Promise<BlockchainEvent | null> {
    try {
      const block = await log.getBlock();
      const transaction = await log.getTransaction();

      if (!block || !transaction) {
        console.warn('⚠️  Could not fetch block or transaction for log');
        return null;
      }

      let eventName = 'Unknown';
      let eventArgs: any[] = [];

      if ('fragment' in log && log.fragment) {
        eventName = log.fragment.name;
        eventArgs = 'args' in log ? Array.from(log.args || []) : [];
      } else {
        try {
          const parsed = this.contractInterface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          if (parsed) {
            eventName = parsed.name;
            eventArgs = Array.from(parsed.args || []);
          }
        } catch (error) {
          console.warn('⚠️  Could not parse log, skipping');
          return null;
        }
      }

      const eventData: Record<string, any> = {};
      if (eventArgs && eventArgs.length > 0) {
        eventArgs.forEach((arg: any, index: number) => {
          if (typeof arg === 'bigint') {
            eventData[`arg${index}`] = arg.toString();
          } else {
            eventData[`arg${index}`] = arg;
          }
        });
      }

      const decodedData = this.decodeEventData(eventName, eventArgs);

      const eventToStore: EventToStore = {
        blockNumber: BigInt(block.number),
        blockHash: block.hash || '',
        transactionHash: transaction.hash,
        logIndex: log.index,
        contractAddress: this.contractAddress,
        eventName: eventName,
        eventData: eventData,
        decodedData: decodedData,
        timestamp: new Date(block.timestamp * 1000),
      };

      await this.batchProcessor.add(eventToStore);
      return null;
    } catch (error) {
      console.error('❌ Error processing event:', error);
      return null;
    }
  }

  private async storeBatch(events: EventToStore[]): Promise<void> {
    if (events.length === 0) return;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const values: any[] = [];
      const placeholders: string[] = [];

      events.forEach((event, idx) => {
        const base = idx * 10;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`
        );
        values.push(
          event.blockNumber.toString(),
          event.blockHash,
          event.transactionHash,
          event.logIndex,
          event.contractAddress,
          event.eventName,
          JSON.stringify(event.eventData),
          JSON.stringify(event.decodedData),
          event.timestamp,
          new Date()
        );
      });

      const query = `
        INSERT INTO blockchain_events (
          block_number, block_hash, transaction_hash, log_index,
          contract_address, event_name, event_data, decoded_data,
          timestamp, created_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (transaction_hash, log_index) DO NOTHING
        RETURNING id, event_name, decoded_data, block_number, block_hash, transaction_hash, log_index, contract_address, timestamp
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      if (result.rows.length > 0 && this.wsServer) {
        for (const row of result.rows) {
          this.wsServer.broadcastNewEvent({
            id: row.id,
            block_number: row.block_number,
            block_hash: row.block_hash,
            transaction_hash: row.transaction_hash,
            log_index: row.log_index,
            contract_address: row.contract_address,
            event_name: row.event_name,
            decoded_data: row.decoded_data,
            timestamp: row.timestamp
          });
        }

        try {
          const statsService = new StatsService();
          const stats = await statsService.getPlatformStats();
          this.wsServer.broadcastStatsUpdate(stats);
        } catch (err) {
          console.error('Failed to broadcast stats update:', err);
        }
      }

      console.log(`✅ Batch stored: ${result.rows.length} events inserted (${events.length - result.rows.length} duplicates skipped)`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error storing batch:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private decodeEventData(eventName: string, args: any[]): Record<string, any> {
    const decoded: Record<string, any> = {};

    switch (eventName) {
      case 'PlayerJoined':
        decoded.player = args[0];
        decoded.timestamp = args[1] ? args[1].toString() : null;
        break;

      case 'ScoreUpdated':
        decoded.player = args[0];
        decoded.oldScore = args[1] ? args[1].toString() : null;
        decoded.newScore = args[2] ? args[2].toString() : null;
        decoded.timestamp = args[3] ? args[3].toString() : null;
        break;

      case 'GameReset':
        decoded.timestamp = args[0] ? args[0].toString() : null;
        decoded.playerCount = args[1] ? args[1].toString() : null;
        break;

      case 'ItemPurchased':
        decoded.player = args[0];
        decoded.itemId = args[1] ? args[1].toString() : null;
        decoded.price = args[2] ? args[2].toString() : null;
        decoded.timestamp = args[3] ? args[3].toString() : null;
        break;

      default:
        decoded.raw = args.map((arg) =>
          typeof arg === 'bigint' ? arg.toString() : arg
        );
    }

    return decoded;
  }

  async getLastSyncedBlock(): Promise<bigint> {
    try {
      const result = await pool.query<{ last_synced_block: string }>(
        'SELECT last_synced_block FROM sync_status WHERE contract_address = $1',
        [this.contractAddress]
      );

      if (result.rows.length > 0) {
        return BigInt(result.rows[0].last_synced_block);
      }

      return BigInt(0);
    } catch (error) {
      console.error('❌ Error fetching last synced block:', error);
      return BigInt(0);
    }
  }

  async updateSyncStatus(blockNumber: bigint): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO sync_status (contract_address, last_synced_block, last_synced_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (contract_address) 
         DO UPDATE SET 
           last_synced_block = EXCLUDED.last_synced_block,
           last_synced_at = NOW()`,
        [this.contractAddress, blockNumber.toString()]
      );
    } catch (error) {
      console.error('❌ Error updating sync status:', error);
      throw error;
    }
  }

  async getEventCount(): Promise<number> {
    try {
      const result = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM blockchain_events WHERE contract_address = $1',
        [this.contractAddress]
      );

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('❌ Error getting event count:', error);
      return 0;
    }
  }

  async destroy(): Promise<void> {
    await this.batchProcessor.destroy();
  }
}