CREATE TABLE IF NOT EXISTS blockchain_events (
  id SERIAL PRIMARY KEY,
  block_number BIGINT NOT NULL,
  block_hash VARCHAR(66) NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  log_index INTEGER NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  decoded_data JSONB,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(transaction_hash, log_index)
);


CREATE INDEX IF NOT EXISTS idx_block_number ON blockchain_events(block_number);
CREATE INDEX IF NOT EXISTS idx_event_name ON blockchain_events(event_name);
CREATE INDEX IF NOT EXISTS idx_timestamp ON blockchain_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contract ON blockchain_events(contract_address);


CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  contract_address VARCHAR(42) UNIQUE NOT NULL,
  last_synced_block BIGINT NOT NULL,
  last_synced_at TIMESTAMP DEFAULT NOW()
);