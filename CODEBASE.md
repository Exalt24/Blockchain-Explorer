BLOCKCHAIN EXPLORER - INTERVIEW CHEAT SHEET

ONE-LINER
It's a real-time blockchain event indexing and analytics dashboard. A Node.js backend polls the blockchain every 2 seconds, processes events in batches of 50, stores them in PostgreSQL, and serves them through 8 REST endpoints with an in-memory cache that gives 80-90% hit rates and 8-10x performance improvement. Real-time updates through Socket.IO.

QUICK FACTS

Item | Detail
What it does | Index on-chain events, store in PostgreSQL, serve analytics with caching
Smart Contract | GameState.sol (4 events, 5 functions)
Solidity Version | 0.8.28
Backend | Node.js 22, Express 5, ethers.js 6.15, PostgreSQL 18
Frontend | React 19, Vite 7.1, Tailwind CSS 4.1, Recharts 3.2
Real-time | Socket.IO 4.8 (block updates throttled to 1/second)
Cache | In-memory LRU-style with TTL (5s-60s per endpoint)
Batch Processing | 50 events per batch, 1000ms flush interval
API Endpoints | 8 (events, stats, leaderboard, distribution, timeline, health)
Performance | 200-500 req/s, sub-200ms P95, 80-90% cache hit rate
Tests | 18 test files (23 contract tests + 18 backend test suites)
Docker | 4 containers (PostgreSQL, Hardhat, Backend, Frontend)
GitHub | https://github.com/Exalt24/Blockchain-Explorer

ARCHITECTURE IN PLAIN ENGLISH
The backend connects to a blockchain node via ethers.js. EventListener polls every 2 seconds for new events. EventProcessor decodes the raw logs into structured data and batches them (50 events or 1000ms, whichever first). Each batch gets inserted into PostgreSQL in a single transaction with ON CONFLICT deduplication. StatsService queries the database for analytics and caches results in-memory (CacheService with TTL). The REST API serves 8 endpoints. Socket.IO broadcasts new events and stats updates to the frontend in real time. HealthMonitor checks database, blockchain, event listener, and WebSocket status.

EVERY POSSIBLE INTERVIEW QUESTION

What/How Questions

Q: How does the event indexing work?
A: EventListener polls the blockchain every 2000ms. It fetches logs from lastProcessedBlock+1 to the current block using ethers.js getLogs. Those raw logs go to EventProcessor, which decodes them based on event signature. I handle 4 event types: PlayerJoined, ScoreUpdated, GameReset, ItemPurchased. Each decoded event gets added to a BatchProcessor. When the batch hits 50 items or 1000ms passes, it flushes to PostgreSQL in a single INSERT with ON CONFLICT (transaction_hash, log_index) DO NOTHING for deduplication. After storage, events broadcast via Socket.IO.

The reason I went with getLogs over contract.on() event subscriptions is twofold. First, Hardhat 3.x has an incompatibility with ethers.js contract.on() subscriptions, so it literally wasn't an option for local dev. But more importantly, polling gives me explicit control over the backfill window. With subscriptions you only get events from the moment you connect. With polling I always specify a fromBlock, so if the service goes down for an hour, on restart it picks up exactly where it left off. No gap, no missed events. The trade-off is higher latency (up to 2 seconds vs near-instant with subscriptions), but for an analytics dashboard that's perfectly acceptable.

One thing I'd acknowledge as a limitation: I'm doing sequential processEvent calls inside the polling loop. For extremely high-throughput chains (thousands of events per block), I'd want to parallelize the log decoding and only serialize at the database write. But for this project's scale, sequential keeps the code simple and avoids race conditions in the batch processor.

Q: How does the caching work?
A: CacheService is an in-memory cache with TTL-based expiration. Each endpoint has a different TTL tuned to how frequently the underlying data actually changes: platform stats cache for 5 seconds since those change with every new event, leaderboard for 30 seconds since rankings shift slowly, event distribution and timeline for 60 seconds since aggregate breakdowns are expensive to compute and don't need real-time accuracy. The cache runs automatic cleanup every 60 seconds to remove expired entries. In production, this gives 80-90% hit rate and 8-10x performance improvement over uncached database queries.

I considered Redis here, and in a multi-instance deployment I'd absolutely use it. But for a single-process Node.js server, in-memory is strictly faster since there's no network hop, no serialization overhead, and no extra infrastructure to manage. The entire cache footprint is small (stats objects, leaderboard arrays, distribution breakdowns), so memory pressure isn't a concern. The real limitation is that the cache isn't shared across instances, so horizontal scaling would require migrating to Redis or Memcached. I'd also note that the CacheService doesn't implement true LRU eviction (it's TTL-only), which means under heavy load with many unique cache keys you could see unbounded growth. In practice the key space is small and fixed, so this hasn't been an issue.

Q: How does the health monitoring work?
A: HealthMonitor runs 4 checks: database connectivity (test query + latency), blockchain RPC (latest block number), event listener status (polling state + last processed block), and WebSocket server (connected clients count). Each service gets a status of up, down, or unknown. Overall status is healthy (all up), degraded (some down), or unhealthy (critical services down). The health endpoint returns all this in one response. Stats get broadcast to connected clients every 10 seconds.

The degraded state is the interesting one. If the database is down, nothing works, so that's unhealthy. But if just the blockchain RPC is temporarily unreachable, the API can still serve cached data and historical queries. That's a degraded state, not a full outage. This distinction matters for production alerting since you don't want to page someone at 3 AM because the RPC had a 5-second hiccup.

One limitation: the health check is synchronous and sequential. If the database is slow, the health endpoint itself becomes slow. A more robust approach would be to run health checks on a background interval and serve the last-known result, which is actually what most production health check libraries do.

Q: What's the database schema?
A: Two tables. blockchain_events stores all indexed events with block_number, transaction_hash, log_index, event_name, event_data (JSONB), decoded_data (JSONB), and timestamp. UNIQUE constraint on (transaction_hash, log_index) prevents duplicates. Four indexes: block_number, event_name, timestamp DESC (for timeline queries), and contract_address. sync_status table tracks the last synced block per contract address for recovery after restarts.

The UNIQUE constraint on (transaction_hash, log_index) is the key design decision here. A transaction can emit multiple events (joinGame emits both PlayerJoined and ScoreUpdated), so transaction_hash alone isn't unique. Adding log_index makes it unique per event within a transaction. This also enables the ON CONFLICT DO NOTHING pattern in batch inserts, which means I can safely re-process blocks without worrying about duplicates. It's idempotent by design.

I chose JSONB for event_data and decoded_data instead of separate columns per event type because different events have completely different schemas (PlayerJoined has player + timestamp, ItemPurchased has player + itemId + price + timestamp). JSONB lets me store all of them in the same table with a single schema. The trade-off is that JSONB queries are slightly slower than native column queries, and you lose type safety at the database level. For this project the flexibility was worth it, but at scale I might consider a polymorphic table design or even separate tables per event type for query performance.

The timestamp DESC index is specifically for the timeline endpoint, which queries recent events ordered by time. Without it, PostgreSQL would do a sequential scan on the entire table. With it, the query planner can do an index-only scan for the most recent data.

Q: What are the 8 API endpoints?
A: GET /api/events (paginated, filterable by type/address/date, max 100 per page), GET /api/events/tx/:hash (by transaction), GET /api/events/block/:block (by block number), GET /api/stats (total events, unique players, events last 24h, latest block), GET /api/leaderboard (top players by event count), GET /api/stats/distribution (event type breakdown with percentages), GET /api/stats/timeline (hourly buckets, configurable up to 168 hours), GET /health (comprehensive system health).

The /api/events endpoint builds dynamic WHERE clauses based on query parameters. I construct parameterized queries with $1, $2, etc. incrementing a paramIndex counter. This prevents SQL injection while still supporting flexible filtering. The pagination caps at 100 per page to prevent clients from accidentally requesting the entire dataset.

One thing I'd do differently: the timeline endpoint interpolates the hours value directly into the SQL string (INTERVAL '${hours} hours') instead of using a parameterized query. It's safe because I parseInt the value first, but it's not consistent with the rest of the codebase. A parameterized approach would be cleaner.

Q: How does error recovery work?
A: EventListener tracks consecutive errors. If it hits 10 consecutive errors, it stops and attempts an automatic restart after 5 seconds. Below that threshold, it continues polling normally with the error counter incrementing. The retry utility supports both linear and exponential backoff with configurable max attempts. For blockchain queries specifically, connection gets 5 retry attempts, block and log fetches get 3. Sync status persists the last processed block to PostgreSQL, so after a restart the system resumes from where it left off instead of reprocessing everything.

The auto-restart after 10 consecutive errors is a pragmatic choice. If the blockchain node is temporarily down, the listener should recover automatically once it comes back. But there's a subtle issue: the restart resets consecutiveErrors to 0, which means you could get into an infinite restart loop if the node is permanently down. In production I'd add a maximum restart count or exponential backoff on restarts, plus alerting after the first restart.

The BatchProcessor also has error recovery built in. If storeBatch fails, the batch gets unshifted back onto the queue (this.batch.unshift(...currentBatch)) and will be retried on the next flush. This means events aren't lost on transient database errors. The limitation is that if the database is down for a long time, the in-memory batch grows unbounded. I'd want a maximum batch queue size with a dead letter mechanism for production.

Q: How does the batch processor work internally?
A: BatchProcessor is a generic utility that accepts items via add(), accumulates them in an array, and flushes when either the batch size threshold (50) or a time interval (1000ms) is reached. The flush is protected by a processing flag to prevent concurrent flushes, which would cause race conditions. If a flush fails, the batch gets prepended back to the queue for retry.

The dual-trigger design (size OR time) is important. Size-based flushing handles high-throughput bursts efficiently (50 events go to the database in one INSERT instead of 50 separate INSERTs, reducing I/O by 98%). Time-based flushing handles quiet periods where you might have 3 events sitting in the buffer. Without the timer, those 3 events would just sit there until 47 more arrived.

One thing worth noting: the processing flag means if a new item arrives during a flush, it goes into a new batch. This is correct behavior since you don't want to modify the array being processed. But it means that during a flush, the effective batch size resets. In a very high throughput scenario, you could end up with rapid small flushes right after a big one. For this project's scale that's fine.

Q: How does the WebSocket layer work?
A: The WebSocket server uses Socket.IO with both websocket and polling transports. It tracks connected clients in a Set for accurate counts. Three broadcast types: newEvent (individual events after database storage), statsUpdate (platform statistics), and blockUpdate (new block notifications). Block updates are throttled to 1 per second using a throttle utility, since blocks can arrive faster than that on some networks and the frontend doesn't need sub-second block tracking.

I chose Socket.IO over raw WebSockets for the automatic reconnection, room support, and fallback to HTTP long-polling. Raw WebSockets would be lighter, but Socket.IO handles the edge cases (reconnection, buffering, transport negotiation) that I'd otherwise have to implement myself. The trade-off is a slightly larger client bundle and the Socket.IO protocol overhead, but for a dashboard with maybe dozens of concurrent users, that's negligible.

Why Questions / Architectural Decisions

Q: Why polling instead of WebSocket subscriptions to the blockchain?
A: Two reasons. First, Hardhat 3.x has an incompatibility with ethers.js contract.on() event subscriptions, so it wasn't an option for local development. But even beyond that, I actually prefer polling for an indexer. With subscriptions you only get events from the moment you connect. If your service restarts, you need separate backfill logic. With polling, the backfill IS the normal code path since I always specify fromBlock and toBlock. The system is naturally idempotent.

The trade-off is latency. Polling at 2-second intervals means worst case a new event takes 2 seconds to appear. WebSocket subscriptions give near-instant notification. For a production indexer on mainnet, I'd run both: subscriptions for low-latency new events, polling as a safety net to catch anything missed. Tools like The Graph and Ponder use similar hybrid approaches. But for a portfolio project demonstrating the indexing pattern, polling alone keeps the code simpler and more testable.

I should mention that tools like The Graph, Ponder, and Envio exist specifically for this problem. The Graph uses subgraphs with GraphQL, Ponder is a TypeScript-native indexer that's about 10x faster than The Graph for cold starts. I built a custom indexer because the goal was to demonstrate the underlying mechanics, not to use a framework that abstracts them away. In production, I'd evaluate Ponder first since it's TypeScript-native and handles reorgs, caching, and RPC management out of the box.

Q: Why Express 5 instead of Fastify?
A: Express 5 was the pragmatic choice. It has native async error handling (no more wrapper functions in theory, though I still use asyncHandler for explicit error formatting), and the ecosystem is massive. Fastify benchmarks at 2-3x the throughput of Express (70-80K req/s vs 20-30K req/s) thanks to schema-based serialization and less middleware overhead.

But here's the thing: my bottleneck is database queries and blockchain RPC calls, not HTTP parsing. The difference between Express handling 20K req/s and Fastify handling 70K req/s is irrelevant when my database query takes 5-50ms. Express 5 was the right call for development speed. If I were building a high-frequency trading API where every microsecond matters, Fastify would be the clear winner. For a dashboard serving analytics queries with caching, Express is more than sufficient and everyone on the team already knows it.

Q: Why in-memory caching instead of Redis?
A: For a single-instance deployment, in-memory is strictly superior. No network hop (saves 0.5-2ms per cache hit), no serialization/deserialization overhead, no infrastructure to manage. The cache is small since it's just stats objects, leaderboard arrays, and distribution breakdowns, maybe a few KB total. It rebuilds quickly on restart since the source data is all in PostgreSQL.

The limitation is obvious: no cache sharing across instances. If I deploy two backend instances behind a load balancer, each has its own cache with potentially different data. Users hitting different instances see slightly different stats. Redis solves this. I'd also get cache persistence across restarts and pub/sub for cache invalidation.

For this project, single-instance is the deployment model, so in-memory wins on simplicity and performance. The code is structured so swapping CacheService's implementation from Map to Redis would be a contained change since all cache access goes through the same get/set/has interface.

Q: Why batch processing instead of individual inserts?
A: Database performance, specifically reducing transaction overhead. Each individual INSERT in PostgreSQL involves: parse the query, plan the execution, acquire a lock, write to WAL, commit. With 50 individual inserts, that's 50 of each. With one batched INSERT of 50 rows, it's once. The I/O reduction is roughly 98%.

The batch size of 50 and flush interval of 1000ms were chosen empirically. 50 is large enough to amortize transaction overhead but small enough that a failed batch doesn't lose too many events (they go back to the queue on failure). 1000ms ensures events don't sit in the buffer for too long during quiet periods. In a higher-throughput system I'd increase the batch size to 200-500, but the flush interval probably stays around 1 second for latency reasons.

One alternative I considered was using PostgreSQL's COPY command, which is even faster for bulk inserts. But COPY doesn't support ON CONFLICT, so I'd lose the deduplication guarantee. The INSERT with ON CONFLICT approach gives me both batching and idempotency.

Q: Why PostgreSQL for event storage instead of a time-series database?
A: PostgreSQL handles both the event storage and analytics queries well enough for this scale. JSONB columns give flexibility for different event schemas without needing table-per-event-type. The timestamp DESC index makes timeline queries fast. And I already need a relational database for sync_status tracking and the various JOIN-like queries (leaderboard, distribution).

TimescaleDB would be the obvious upgrade path. It's a PostgreSQL extension, so migration would be seamless. At scale, TimescaleDB shows 20x higher insert rates and 4x faster time-range queries thanks to automatic partitioning (hypertables) and chunk-based storage. It also offers built-in compression (30-40% storage savings) and continuous aggregates for pre-computed rollups.

But for a project indexing events from a single contract on a dev chain, plain PostgreSQL with proper indexes is more than enough. Adding TimescaleDB would be adding complexity for hypothetical scale. The indexes I have (block_number, event_name, timestamp DESC, contract_address) cover all my query patterns. If I were indexing events from hundreds of contracts on mainnet, TimescaleDB would be the first thing I reach for.

I'd also mention ClickHouse as an alternative for pure analytics workloads. It's columnar storage, so aggregate queries are blazing fast. But it's not great for point lookups (get event by transaction hash), which my API needs. PostgreSQL is the jack-of-all-trades that handles both well enough.

Q: Why Recharts for the charts?
A: Recharts is built specifically for React with declarative, component-based APIs. For a dashboard with a pie chart (event distribution) and a line chart (activity timeline), it's the right level of abstraction. D3.js would give me pixel-level control but requires imperative DOM manipulation that fights React's declarative model. Chart.js is canvas-based which is faster for large datasets but less composable with React's component tree.

The trade-off with Recharts is limited customization. If I needed network graphs, heatmaps, or custom interactive visualizations, D3 would be the move. But for standard chart types (pie, line, bar), Recharts gives me 90% of what I need with 10% of the code. It also uses SVG rendering, which means charts are crisp at any resolution and individual elements are DOM nodes I can style with CSS.

Q: Why Socket.IO instead of raw WebSockets or Server-Sent Events?
A: Socket.IO gives me automatic reconnection with exponential backoff, transport fallback (WebSocket to long-polling), room support for future per-contract subscriptions, and a client library that handles all the edge cases. Raw WebSockets would mean implementing reconnection logic, heartbeats, and message buffering myself.

Server-Sent Events (SSE) would actually work fine for this use case since the data flow is one-directional (server to client). SSE is simpler, uses standard HTTP, and has built-in reconnection in the browser. I chose Socket.IO because I wanted bidirectional communication for the ping/pong health check and potential future features like client-initiated subscriptions to specific event types. If I were starting over with no plans for bidirectional communication, SSE would be the lighter choice.

Walk Me Through Questions

Q: Walk me through what happens when a new blockchain event occurs
A: Every 2 seconds, EventListener calls eth_getLogs for blocks since lastProcessedBlock+1. The raw log comes back with topics and data fields. EventProcessor first checks if the log already has a parsed fragment (ethers.js EventLog type). If not, it manually parses using contractInterface.parseLog(), matching the first topic against my 4 known event signatures. It decodes the args using ethers.js ABI decoder, converting BigInts to strings for JSON compatibility. The decoded event gets structured into an EventToStore object with block info, transaction hash, log index, event name, raw data, decoded data, and a timestamp derived from the block timestamp.

This goes into the BatchProcessor. When the batch hits 50 or 1000ms passes, it flushes: acquires a client from the connection pool, opens a PostgreSQL transaction, does a bulk INSERT with dynamically constructed parameterized placeholders ($1, $2, ..., $N) and ON CONFLICT DO NOTHING, commits. The RETURNING clause gets back the actually-inserted rows (excluding duplicates). For each inserted row, Socket.IO broadcasts a newEvent message. Then StatsService fetches fresh platform stats and broadcasts a statsUpdate.

The frontend's WebSocketContext receives the newEvent and updates the EventFeed component in real time. Stats update triggers re-renders of StatsCards, Charts, and Leaderboard components.

Q: Walk me through the backfill process
A: On startup, EventListener checks sync_status for the last processed block. If it's behind the current blockchain head, it enters backfill mode. It processes historical events in chunks of 1000 blocks to avoid two problems: memory pressure from holding too many logs at once, and RPC request size limits (some providers cap getLogs at 2000 blocks). Each chunk goes through the same EventProcessor pipeline, so the backfill path and the live polling path share all the same code. After each chunk, sync_status is updated so a crash mid-backfill doesn't require starting over. Progress logs every 5000 blocks. After catching up, it switches to the normal 2-second polling loop.

The 1000-block chunk size is a balance. Smaller chunks mean more RPC calls. Larger chunks risk timeouts on providers with request size limits. For Hardhat's local node, 1000 is conservative. For Infura or Alchemy in production, you'd probably lower it to 500 and add rate limiting on the RPC calls.

Q: Walk me through how a cache miss turns into a cache hit
A: Let's say someone requests GET /api/stats. StatsService.getPlatformStats() first checks cacheService.get("platform_stats"). The cache checks if the key exists in the Map AND if it hasn't expired (Date.now() minus entry.timestamp less than entry.ttl). First request: cache miss. StatsService runs 4 PostgreSQL queries in sequence: total events count, unique players count (DISTINCT on JSONB field), events in last 24 hours, max block number. Constructs the PlatformStats object, calls cacheService.set("platform_stats", stats, 5) with a 5-second TTL. Returns the result.

Next request within 5 seconds: cache hit. The Map lookup returns the stored data directly. No database queries. That's where the 8-10x performance improvement comes from since you're replacing 4 database round-trips with a single Map.get().

After 5 seconds: the TTL expires. Next request triggers a cache miss again. The cleanup timer (every 60 seconds) removes expired entries from the Map to prevent memory leaks, but expired entries are also removed on access via the lazy-deletion in the get() method.

What Would You Change Questions

Q: What would you do differently?
A: A few things. First, I'd add WebSocket subscriptions alongside polling for lower latency on production nodes. The polling would serve as a safety net for missed events, subscriptions would give near-instant notification. Second, I'd swap the in-memory cache for Redis to support horizontal scaling. Third, I'd add a dead letter queue for events that fail processing so they're not silently dropped. Right now, if storeBatch fails, events go back to the in-memory queue, but if the process crashes, those events are lost until the next backfill picks them up. A persistent queue (Redis Streams or BullMQ) would fix that.

Fourth, I'd add rate limiting on the API endpoints. Right now there's nothing stopping a client from hammering /api/events with thousands of requests. Express-rate-limit or a token bucket at the nginx level would handle this. Fifth, I'd parallelize the 4 stats queries in getPlatformStats() using Promise.all() instead of running them sequentially. They're independent queries, so running them in parallel would cut the uncached response time roughly in half.

Q: How would this scale?
A: The bottleneck is database writes during high-throughput periods. Immediate improvements: increase batch size to 200-500, add connection pooling (already have max 20 connections via pg), and use PostgreSQL's LISTEN/NOTIFY for cache invalidation instead of TTL-based expiration. For read scaling, Redis cache shared across instances. For write scaling, consider partitioning the blockchain_events table by block_number range or by contract_address.

If I needed to index multiple contracts or multiple chains, I'd separate the EventListener into a dedicated indexer service and the API into a separate read-replica service. The indexer writes to the primary, the API reads from replicas. This is essentially the CQRS pattern.

For really massive scale (millions of events per day), I'd look at replacing PostgreSQL with TimescaleDB for the time-series queries and potentially adding ClickHouse for analytics. Or honestly, at that point I'd evaluate using Ponder or The Graph since they've already solved the scaling problems for blockchain indexing.

The Socket.IO layer is already in decent shape. It handles 50+ concurrent connections easily. For hundreds or thousands, I'd add Redis adapter for Socket.IO to enable multi-process broadcasting, and potentially implement per-contract rooms so clients only receive events they care about.

Q: How does this relate to tokenization infrastructure?
A: This is literally what you need for tracking mint/burn operations. Instead of game events, you index Transfer, Mint, and Burn events from ERC-20 or ERC-721 contracts. The reconciliation pattern is the same: compare your PostgreSQL state against on-chain state and flag discrepancies. The batch processing, caching, and real-time broadcasting all transfer directly.

The one thing you'd add for token infrastructure is a state aggregation layer. My current system stores individual events but doesn't maintain a running balance. For token tracking, you'd want a balances table that gets updated on every Transfer event, so you can answer "what's this wallet's balance?" without replaying all Transfer events. That's basically what The Graph's entity system does.

Q: What are the security considerations?
A: A few things I'm handling and a few I'm not. On the handled side: parameterized SQL queries throughout (except the one timeline interpolation I mentioned), CORS configuration, input validation on pagination parameters (parseInt with min/max bounds). The UNIQUE constraint prevents duplicate event injection.

On the not-yet-handled side: no API rate limiting (mentioned above), no authentication on endpoints (it's a public read-only dashboard, but in production you'd want API keys for heavy consumers), no input sanitization on the eventType filter (it goes through a parameterized query so SQL injection is prevented, but there's no validation that it's an actual event type). The WebSocket server accepts connections from any origin matching the CORS config, with no authentication or connection limits. For production, I'd add connection rate limiting and potentially JWT-based authentication for WebSocket connections.

MODELS AND LIBRARIES CHEAT SHEET

Name | What it does | Why this over alternatives
Solidity 0.8.28 | Smart contract language | GameState contract with 4 events for testing. 0.8.x has built-in overflow protection, so no need for SafeMath.
Hardhat 3.0.4 | Dev environment | Local blockchain node. Chose over Foundry because the rest of the stack is TypeScript and I wanted one language for everything. Foundry is faster for Solidity-only projects but Hardhat's JS/TS integration is smoother.
ethers.js 6.15.0 | Blockchain interaction | getLogs, ABI decoding, provider management. Chose over web3.js because ethers v6 has better TypeScript support, smaller bundle size, and cleaner API design. web3.js has been catching up with v4 but ethers is still the ecosystem standard.
Express 5.1.0 | REST API | 8 endpoints with native async error handling. Chose over Fastify because the bottleneck is database/RPC, not HTTP throughput. Fastify would give 2-3x raw throughput but adds no real value when queries take 5-50ms.
PostgreSQL 18.0 | Database | Event storage with JSONB, 2 tables, 4 indexes. Chose over MongoDB (need relational queries for leaderboard/stats), TimescaleDB (overkill for single-contract scale), ClickHouse (need point lookups not just analytics).
pg 8.13.1 | PostgreSQL driver | Connection pool (max 20), parameterized queries. Simple and reliable. No ORM because queries are straightforward enough that an ORM would add overhead without simplifying anything.
Socket.IO 4.8.1 | Real-time | Event broadcasting, stats updates, block updates throttled 1/s. Chose over raw WebSocket (would need to implement reconnection/heartbeats manually) and SSE (wanted bidirectional for ping/pong and future client subscriptions).
React 19.0.0 | Frontend | 6 components: Header, StatsCards, EventFeed, Charts, Leaderboard, EventExplorer. React 19 for the concurrent rendering improvements, though honestly this project doesn't push those boundaries.
Vite 7.1.10 | Build tool | Fast HMR for development. Chose over webpack because Vite's dev server is near-instant. No contest for a new project.
Tailwind CSS 4.1.14 | Styling | Utility-first CSS. Rapid prototyping for a dashboard. Chose over CSS modules or styled-components because utility classes are faster to iterate with for data-heavy layouts.
Recharts 3.2.1 | Charts | Event distribution pie chart, activity timeline line chart. Chose over D3 (too low-level for standard charts), Chart.js (canvas-based, less React-native). Recharts is the sweet spot for React dashboards.
Docker Compose | Orchestration | 4 containers, reproducible environment. Makes the project runnable on any machine with one command.

KEY FILES MAP

If they ask about... | Open this file
Event polling and blockchain connection | backend/src/services/EventListener.ts
Event decoding and batch processing | backend/src/services/EventProcessor.ts
Statistics and analytics queries | backend/src/services/StatsService.ts
In-memory caching with TTL | backend/src/services/CacheService.ts
Health monitoring (4 checks) | backend/src/services/HealthMonitor.ts
REST API (8 endpoints) | backend/src/api/routes.ts
WebSocket server and broadcasting | backend/src/websocket/server.ts
Blockchain config and retry logic | backend/src/config/blockchain.ts
Database pool and connection | backend/src/config/database.ts
Batch processor utility | backend/src/utils/batchProcessor.ts
Retry with exponential backoff | backend/src/utils/retry.ts
Throttle and debounce | backend/src/utils/throttle.ts
Database schema (2 tables, 4 indexes) | backend/migrations/001_initial_schema.sql
Smart contract (4 events) | contracts/contracts/GameState.sol
Contract tests (23) | contracts/test/GameState.test.ts
Frontend WebSocket context | frontend/src/contexts/WebSocketContext.tsx
Real-time event feed | frontend/src/components/EventFeed.tsx
Server entry point | backend/src/index.ts
