export interface BlockchainEvent {
  id: number;
  block_number: bigint;
  block_hash: string;
  transaction_hash: string;
  log_index: number;
  contract_address: string;
  event_name: string;
  event_data: Record<string, any>;
  decoded_data?: Record<string, any>;
  timestamp: Date;
  created_at: Date;
}

export interface SyncStatus {
  id: number;
  contract_address: string;
  last_synced_block: bigint;
  last_synced_at: Date;
}