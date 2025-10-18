import pg from 'pg';
import dotenv from 'dotenv';
import { retry } from '../utils/retry.js';

dotenv.config();

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'blockchain_explorer',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

export async function testConnection(): Promise<boolean> {
  try {
    const result = await retry(
      async () => {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT NOW()');
          return result;
        } finally {
          client.release();
        }
      },
      {
        maxAttempts: 5,
        delayMs: 1000,
        backoff: 'exponential',
        onRetry: (attempt, error) => {
          console.log(`⚠️  Database connection attempt ${attempt} failed: ${error.message}`);
          console.log(`   Retrying in ${Math.pow(2, attempt - 1)} seconds...`);
        }
      }
    );
    
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to database after multiple attempts:', error);
    return false;
  }
}

export async function queryWithRetry<T extends pg.QueryResultRow = any>(
  queryText: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return retry(
    async () => {
      const client = await pool.connect();
      try {
        return await client.query<T>(queryText, params);
      } finally {
        client.release();
      }
    },
    {
      maxAttempts: 3,
      delayMs: 500,
      backoff: 'exponential',
      onRetry: (attempt, error) => {
        console.warn(`⚠️  Query retry attempt ${attempt}: ${error.message}`);
      }
    }
  );
}

export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database pool closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
}

export default pool;