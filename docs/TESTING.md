# Integration Testing Guide

## Overview

This guide covers all integration and performance tests for the Blockchain Explorer backend.

**Note:** All test commands must be run from the `backend/` directory.

## Prerequisites

Before running tests, ensure:

1. **PostgreSQL is running**
   ```powershell
   docker-compose up -d
   ```

2. **Hardhat node is running**
   ```powershell
   cd contracts
   npm run node
   ```

3. **Contract is deployed**
   ```powershell
   cd contracts
   npm run deploy
   # Copy CONTRACT_ADDRESS to backend/.env
   ```

4. **Backend server is running** (for some tests)
   ```powershell
   cd backend
   npm run dev
   ```

---

## Test Categories

### Diagnostic Tools

#### API Response Diagnostic
Quick diagnostic to verify API response structures and data format.

```powershell
cd backend
npm run diagnose-api
```

**What it checks:**
- Response status codes
- Response data types (Array vs Object)
- Top-level keys in responses
- Sample data structure
- Field naming (helps identify snake_case vs camelCase issues)

**Tests 4 endpoints:**
- GET /api/events
- GET /api/leaderboard
- GET /api/stats/distribution
- GET /api/stats

**Use this when:**
- Debugging API response format issues
- Verifying backend/frontend data contract alignment
- Checking if responses match type definitions
- Quick smoke test after API changes

**Expected Duration:** 1-2 seconds

**Example Output:**
```
📍 Events API
   URL: http://localhost:4000/api/events?page=1&limit=5
   Status: 200
   Response Type: Object
   Top-Level Keys: events, pagination
   
📍 Leaderboard API
   Status: 200
   Response Type: Object
   Top-Level Keys: leaderboard
```

---

### Unit Tests
Individual component testing.

**From `backend/` directory:**

```powershell
cd backend

npm run test:health          # Health monitoring service
npm run test:cache           # Cache service functionality
npm run test:batch           # Batch processor
```

**Legacy tests (Phase 2-3):**

```powershell
npm run test:processor       # Event processor
npm run test:listener        # Event listener
npm run test:stats           # Stats service
npm run test:api             # API routes
npm run test:websocket       # WebSocket server
```

---

### Integration Tests
Complete flow testing.

**From `backend/` directory:**

#### End-to-End Flow Test
Tests entire pipeline: Contract → Indexer → Database → API → WebSocket

```powershell
cd backend
npm run test:e2e
```

**Tests:**
- Database connection
- Blockchain connection
- Table schema
- Event querying
- All API endpoints
- Health check
- WebSocket connection
- Real-time updates

**Expected Duration:** 20-30 seconds

---

#### API Integration Test
Comprehensive REST API testing.

```powershell
cd backend
npm run test:api-integration
```

**Tests:**
- All GET endpoints
- Pagination
- Filtering
- Error handling (404s for invalid resources)
- Response format validation
- Response time analysis

**Expected Duration:** 10-15 seconds

**Success Criteria:**
- All ~18 tests pass
- Avg response time <100ms
- 404 responses for invalid tx/block queries
- Proper error handling

---

#### Concurrent Events Test
Tests system under concurrent load.

```powershell
cd backend
npm run test:concurrent
```

**What it does:**
- Connects 10 WebSocket clients
- Monitors for new events (15s window)
- Tests 20 concurrent API requests
- Validates data consistency across clients
- Analyzes batch processing performance
- Graceful shutdown (no assertion errors)

**Expected Duration:** 20-25 seconds

**Note:** Generate events during test window using:
```powershell
cd contracts
npm run generate-events
```

**Success Criteria:**
- 10/10 clients connected
- 100% broadcast delivery rate
- All API responses identical (data consistency)
- Clean exit without assertion errors

---

#### Full Integration Test
Comprehensive server integration test (WebSocket + API + multiple clients).

```powershell
cd backend
npm run test:full-integration
```

**Tests:**
- Multiple WebSocket clients connecting
- Event broadcasting to all clients
- Stats broadcasting
- Block update broadcasting
- REST API + WebSocket integration
- Health endpoint with WebSocket status
- Client disconnect handling

**Expected Duration:** 15-20 seconds

---

#### WebSocket Stress Test
Tests WebSocket server scalability.

```powershell
cd backend
npm run test:ws-stress
```

**What it tests:**
- 50 concurrent WebSocket connections
- Message throughput
- Connection stability
- Error rates
- Disconnect handling

**Expected Duration:** 25-30 seconds

**Success Criteria:**
- 95%+ successful connections
- 95%+ connection health
- <5% error rate

---

### Performance Tests

#### Load Test
Tests API performance under concurrent load.

```powershell
cd backend
npm run test:load
```

**What it tests:**
- 50 concurrent requests × 5 iterations per endpoint
- Response time distribution (avg, min, max, p50, p95, p99)
- Throughput (requests per second)
- Error rates
- 100 concurrent requests stress test

**Expected Duration:** 30-40 seconds

**Typical Results:**
- Avg response: 10-50ms (cached) / 50-150ms (uncached)
- P95: <200ms
- Throughput: 100-500 req/s
- Success rate: >99%

---

#### Cache Performance Test
Validates cache effectiveness.

```powershell
cd backend
npm run test:cache-perf
```

**What it tests:**
- Cache miss vs cache hit latency
- Cache expiration behavior
- Data consistency
- Performance improvement metrics

**Expected Duration:** 2-3 minutes (includes waiting for cache expiration)

**Typical Results:**
- Cache hits: 5-20ms
- Cache misses: 50-150ms
- Improvement: 70-90% faster
- Speedup: 5-10x

---

## Event Generation

Generate test events for integration testing:

```powershell
cd contracts
npm run generate-events
```

**Generates:**
- 10 PlayerJoined events
- 55 ScoreUpdated events (includes rapid fire batch)
- 3 ItemPurchased events
- 1 GameReset event

**Total:** ~69 events

**Duration:** ~30 seconds

---

## Running All Tests

### Quick Smoke Test
```powershell
cd backend
npm run diagnose-api && npm run test:api-integration
```

### Sequential Execution (Recommended)

```powershell
cd backend

# Diagnostic check
npm run diagnose-api

# Unit tests
npm run test:health && npm run test:cache && npm run test:batch

# Integration tests
npm run test:e2e && npm run test:api-integration

# Performance tests
npm run test:load && npm run test:cache-perf
```

**Note:** Run `test:concurrent` and `test:ws-stress` separately as they require manual observation.

### Parallel Execution (Faster, Requires Care)
```powershell
cd backend

# Only for isolated unit tests that don't share resources
npm run test:health & npm run test:cache & npm run test:batch
```

---

## Interpreting Results

### Success Indicators

✅ **Diagnostic API:**
- Status: 200 for all endpoints
- Response types match expectations
- All expected keys present
- No undefined or null in critical fields

✅ **End-to-End Test:**
- All 11 tests pass
- No connection errors
- WebSocket receives stats updates

✅ **API Integration:**
- All ~18 tests pass
- Pagination works
- Filters apply properly
- 404 errors for invalid resources
- Error handling functional

✅ **Concurrent Test:**
- 10/10 clients connected
- 100% broadcast delivery
- Data consistency across all clients
- Clean exit without assertion errors

✅ **Load Test:**
- P95 latency <200ms
- Success rate >99%
- No timeouts or errors

✅ **Cache Test:**
- Cache hits 5-10x faster than misses
- Data consistency maintained
- TTL expiration works

### Warning Signs

⚠️ **Performance Issues:**
- P95 latency >500ms
- Success rate <95%
- High error counts

⚠️ **Connection Issues:**
- WebSocket disconnects
- Database connection failures
- Timeout errors
- Windows assertion errors on exit

⚠️ **Data Issues:**
- Inconsistent API responses
- Missing events
- Duplicate events
- Field naming mismatches (snake_case vs camelCase)

---

## Troubleshooting

### Common Test Failures

**"Expected status 200, got 404" in test:api-integration:**
- This is **expected behavior** for invalid tx/block queries
- Tests now properly expect 404 for non-existent resources
- Not a failure - validates proper error handling

**Assertion failed: !(handle->flags & UV_HANDLE_CLOSING):**
- Windows-specific cleanup race condition
- **Harmless** - test passed successfully
- Fixed in test:concurrent with graceful shutdown
- Occurs when `process.exit()` called with pending async ops

**"distribution.map is not a function":**
- Backend wrapping responses inconsistently
- Check API service unwrapping logic
- Run `npm run diagnose-api` to verify response structure

**"Property 'event_count' is undefined":**
- Field naming mismatch (snake_case vs camelCase)
- API layer should normalize field names
- Check LeaderboardEntry type definition

### Test Failures

**Database connection errors:**
```powershell
# Restart PostgreSQL (from project root)
docker-compose restart postgres

# Check logs
docker-compose logs postgres

# Test connection
psql -h localhost -U postgres -d blockchain_explorer
```

**Blockchain connection errors:**
```powershell
# Restart Hardhat node
cd contracts
# In contracts terminal: Ctrl+C, then
npm run node

# Verify RPC
curl http://localhost:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**WebSocket connection timeout:**
```powershell
# Check if backend is running
curl http://localhost:4000/health

# Check WebSocket status
curl http://localhost:4000/health | jq .services.websocket

# Restart backend
cd backend
npm run dev
```

**Cache test timing out:**
- Ensure test waits full TTL + 1 second
- Cache TTL: stats=5s, leaderboard=30s, distribution=60s
- Check cache service is enabled in config

### Common Issues

**Port conflicts:**
- Backend: 4000
- Frontend: 3000
- Hardhat: 8545
- PostgreSQL: 5432

```powershell
# Check ports in use (Windows)
netstat -ano | findstr :4000
netstat -ano | findstr :8545
netstat -ano | findstr :5432
```

**Missing CONTRACT_ADDRESS:**
```powershell
# Deploy contract first
cd contracts
npm run deploy

# Update backend/.env with returned address
# Example: CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**No events in database:**
```powershell
# Check event count
psql -h localhost -U postgres -d blockchain_explorer -c "SELECT COUNT(*) FROM blockchain_events;"

# Generate test events
cd contracts
npm run generate-events

# Verify backend is indexing
curl http://localhost:4000/api/stats
```

**TypeScript errors in tests:**
- Check `tsconfig.json` includes test directories
- Verify all `@types` packages installed
- Run `npm install` in backend directory

---

## CI/CD Integration

For automated testing:

```yaml
# Example GitHub Actions workflow
- name: Run Diagnostic
  run: |
    cd backend
    npm run diagnose-api

- name: Run Unit Tests
  run: |
    cd backend
    npm run test:health
    npm run test:cache
    npm run test:batch

- name: Run Integration Tests
  run: |
    cd backend
    npm run test:e2e
    npm run test:api-integration

- name: Run Load Tests
  run: |
    cd backend
    npm run test:load
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Good | Acceptable |
|--------|--------|------|------------|
| API Response (cached) | <20ms | <50ms | <100ms |
| API Response (uncached) | <100ms | <200ms | <500ms |
| WebSocket latency | <10ms | <50ms | <100ms |
| WebSocket broadcast delivery | 100% | >95% | >90% |
| Throughput | >200 req/s | >100 req/s | >50 req/s |
| Success rate | >99% | >95% | >90% |
| Cache hit improvement | >80% | >50% | >30% |
| Concurrent clients | 50+ | 20-50 | 10-20 |

### Optimization Tips

**If API is slow:**
- Check database query performance
- Verify cache is enabled and working
- Review batch processing settings
- Check PostgreSQL indexes (block_number, event_name, timestamp)
- Run `EXPLAIN ANALYZE` on slow queries

**If WebSocket is slow:**
- Check throttle settings (1s default)
- Verify client count (should handle 50+)
- Review message payload size
- Check broadcast vs per-client sending

**If cache isn't helping:**
- Verify TTL settings (too short = poor hit rate)
- Check cache cleanup interval (60s default)
- Review cache hit rates in health endpoint
- Ensure cache keys are consistent

**If tests fail randomly:**
- Check for race conditions in async operations
- Increase timeout values
- Add proper cleanup between tests
- Use graceful shutdown patterns

---

## Development Workflow

### Before Committing Code
```powershell
cd backend
npm run diagnose-api          # Quick smoke test
npm run test:api-integration  # Verify API contracts
```

### Before Merging PR
```powershell
cd backend
npm run test:e2e             # Full integration test
npm run test:load            # Performance regression test
```

### Weekly/Monthly
```powershell
cd backend
npm run test:concurrent      # Scalability check
npm run test:ws-stress       # WebSocket capacity test
npm run test:cache-perf      # Cache effectiveness audit
```

---

## Next Steps

After all tests pass:
- Review performance metrics
- Optimize slow endpoints
- Increase test coverage
- Add monitoring dashboards
- Configure production settings
- Set up alerting thresholds
- Document baseline performance
- Create load testing schedule