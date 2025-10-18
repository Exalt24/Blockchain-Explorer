import { Router } from 'express';
import { pool } from '../config/database.js';
import { StatsService } from '../services/StatsService.js';
import { asyncHandler } from './middleware.js';
import type { Request, Response } from 'express';

const router = Router();
const statsService = new StatsService();

router.get(
  '/events',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page = '1',
      limit = '50',
      eventType,
      playerAddress,
      fromDate,
      toDate,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (eventType) {
      whereConditions.push(`event_name = $${paramIndex}`);
      queryParams.push(eventType);
      paramIndex++;
    }

    if (playerAddress) {
      whereConditions.push(`decoded_data->>'player' = $${paramIndex}`);
      queryParams.push(playerAddress);
      paramIndex++;
    }

    if (fromDate) {
      whereConditions.push(`timestamp >= $${paramIndex}`);
      queryParams.push(new Date(fromDate as string));
      paramIndex++;
    }

    if (toDate) {
      whereConditions.push(`timestamp <= $${paramIndex}`);
      queryParams.push(new Date(toDate as string));
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM blockchain_events ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    queryParams.push(limitNum);
    queryParams.push(offset);

    const result = await pool.query(
      `SELECT 
        id,
        block_number,
        block_hash,
        transaction_hash,
        log_index,
        contract_address,
        event_name,
        event_data,
        decoded_data,
        timestamp,
        created_at
       FROM blockchain_events
       ${whereClause}
       ORDER BY block_number DESC, log_index DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    res.json({
      events: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  })
);

router.get(
  '/events/tx/:hash',
  asyncHandler(async (req: Request, res: Response) => {
    const { hash } = req.params;

    const result = await pool.query(
      `SELECT 
        id,
        block_number,
        block_hash,
        transaction_hash,
        log_index,
        contract_address,
        event_name,
        event_data,
        decoded_data,
        timestamp,
        created_at
       FROM blockchain_events
       WHERE transaction_hash = $1
       ORDER BY log_index ASC`,
      [hash]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: {
          message: 'No events found for this transaction hash',
          status: 404,
        },
      });
      return;
    }

    res.json({
      transactionHash: hash,
      events: result.rows,
    });
  })
);

router.get(
  '/events/block/:block',
  asyncHandler(async (req: Request, res: Response) => {
    const { block } = req.params;

    const result = await pool.query(
      `SELECT 
        id,
        block_number,
        block_hash,
        transaction_hash,
        log_index,
        contract_address,
        event_name,
        event_data,
        decoded_data,
        timestamp,
        created_at
       FROM blockchain_events
       WHERE block_number = $1
       ORDER BY log_index ASC`,
      [block]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: {
          message: 'No events found for this block number',
          status: 404,
        },
      });
      return;
    }

    res.json({
      blockNumber: block,
      events: result.rows,
    });
  })
);

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await statsService.getPlatformStats();
    res.json(stats);
  })
);

router.get(
  '/leaderboard',
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = '10' } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

    const leaderboard = await statsService.getLeaderboard(limitNum);
    res.json({ leaderboard });
  })
);

router.get(
  '/stats/distribution',
  asyncHandler(async (_req: Request, res: Response) => {
    const distribution = await statsService.getEventDistribution();
    res.json({ distribution });
  })
);

router.get(
  '/stats/timeline',
  asyncHandler(async (req: Request, res: Response) => {
    const { hours = '24' } = req.query;
    const hoursNum = Math.min(168, Math.max(1, parseInt(hours as string, 10)));

    const timeline = await statsService.getActivityTimeline(hoursNum);
    res.json({ timeline });
  })
);

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
  });
});

export default router;