# Troubleshooting Guide

Common issues and solutions for Blockchain Explorer.

## Table of Contents
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Database Issues](#database-issues)
- [Blockchain Connection Issues](#blockchain-connection-issues)
- [WebSocket Issues](#websocket-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)

---

## Backend Issues

### Server Won't Start

**Symptoms:**
- `npm run dev` fails
- Port already in use error
- Module not found errors

**Solutions:**

```powershell
# Check if port 4000 is in use
netstat -ano | findstr :4000

# Kill process using port (replace PID)
taskkill /PID <PID> /F

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be v22.11.0+

# Check environment variables
cat .env  # Ensure all required vars are set
```

### Database Connection Failed

**Symptoms:**
- "Failed to connect to database" error
- "Connection refused" error
- "Authentication failed" error

**Solutions:**

```powershell
# Check PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check connection manually
psql -h localhost -p 5432 -U postgres -d blockchain_explorer

# Verify .env database settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blockchain_explorer
DB_USER=postgres
DB_PASSWORD=postgres

# Check logs
docker-compose logs postgres
```

### Blockchain Connection Failed

**Symptoms:**
- "Failed to connect to blockchain" error
- "RPC_URL not responding" error
- EventListener not starting

**Solutions:**

```powershell
# Check Hardhat node is running
# In contracts directory
npm run node

# Test RPC connection
curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Verify CONTRACT_ADDRESS is set
cat .env | grep CONTRACT_ADDRESS

# Deploy contract if not deployed
cd contracts
npm run deploy

# Check RPC_URL in .env
RPC_URL=http://127.0.0.1:8545
```

### Event Listener Not Indexing

**Symptoms:**
- Backend starts but no events indexed
- "Already synced to latest block" message
- Database has no events

**Solutions:**

```powershell
# Check EventListener status
curl http://localhost:4000/health | jq '.services.eventListener'

# Generate test events
cd contracts
npm run generate-events

# Check sync_status table
psql -U postgres -d blockchain_explorer -c "SELECT * FROM sync_status;"

# Reset sync status (forces re-indexing)
psql -U postgres -d blockchain_explorer -c "DELETE FROM sync_status WHERE contract_address = '<YOUR_ADDRESS>';"

# Restart backend
pm2 restart backend  # or npm run dev
```

### High Memory Usage

**Symptoms:**
- Process using >2GB RAM
- Out of memory errors
- Slow response times

**Solutions:**

```powershell
# Check memory usage
pm2 monit

# Restart to clear memory
pm2 restart backend

# Check for memory leaks
node --inspect src/index.ts
# Open chrome://inspect in Chrome

# Reduce batch size (in EventProcessor)
# Change batchSize from 50 to 25

# Clear cache manually
curl -X POST http://localhost:4000/api/cache/clear  # If implemented

# Check database connection pool
# Reduce max connections in database.ts from 20 to 10
```

---

## Frontend Issues

### Build Fails

**Symptoms:**
- `npm run build` errors
- TypeScript compilation errors
- Module not found errors

**Solutions:**

```powershell
# Clear cache and rebuild
rm -rf node_modules dist .vite package-lock.json
npm install
npm run build

# Check TypeScript version
npm list typescript  # Should be 5.7.2

# Verify tsconfig.json is correct
# Check all paths and includes

# Check for circular dependencies
npm install -g madge
madge --circular src/
```

### WebSocket Not Connecting

**Symptoms:**
- Connection status shows red dot
- Console error: "WebSocket connection failed"
- No real-time updates

**Solutions:**

```javascript
// Check VITE_WS_URL in .env
VITE_WS_URL=http://localhost:4000

// Verify backend WebSocket is running
curl http://localhost:4000/health | jq '.services.websocket'

// Check browser console for errors
// Open DevTools → Console

// Test WebSocket manually
const socket = io('http://localhost:4000');
socket.on('connect', () => console.log('Connected'));
socket.on('connect_error', (err) => console.error(err));

// Check CORS settings
// Ensure backend allows frontend origin
```

### Components Not Rendering

**Symptoms:**
- Blank page
- "Hydration failed" error
- Components show loading forever

**Solutions:**

```powershell
# Check browser console for errors
# Open DevTools → Console

# Verify API is responding
curl http://localhost:4000/api/stats

# Check network tab in DevTools
# Look for failed requests

# Clear browser cache
# Ctrl+Shift+Delete → Clear cache

# Check if backend is running
curl http://localhost:4000/health

# Restart frontend dev server
npm run dev
```

### Charts Not Displaying

**Symptoms:**
- Empty chart areas
- "No data available" message
- Recharts errors

**Solutions:**

```javascript
// Check data format
console.log(chartData);  // Should be array of objects

// Verify data structure matches Recharts requirements
// PieChart: [{name: string, value: number}]
// LineChart: [{x: string, y: number}]

// Check API responses
fetch('http://localhost:4000/api/stats/distribution')
  .then(r => r.json())
  .then(console.log);

// Clear cache and refresh
localStorage.clear();
location.reload();
```

---

## Database Issues

### Table Not Found

**Symptoms:**
- "relation does not exist" error
- "Table blockchain_events not found"

**Solutions:**

```powershell
# Run migrations
cd backend
npm run migrate

# Verify tables exist
psql -U postgres -d blockchain_explorer -c "\dt"

# Check migration file
cat migrations/001_initial_schema.sql

# Recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS blockchain_explorer;"
psql -U postgres -c "CREATE DATABASE blockchain_explorer;"
npm run migrate
```

### Slow Queries

**Symptoms:**
- API responses taking >1 second
- Database CPU at 100%
- Timeout errors

**Solutions:**

```sql
-- Find slow queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - pg_stat_activity.query_start > interval '1 second'
ORDER BY duration DESC;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename = 'blockchain_events'
ORDER BY abs(correlation) DESC;

-- Analyze tables
ANALYZE blockchain_events;
ANALYZE sync_status;

-- Vacuum if needed
VACUUM ANALYZE blockchain_events;
```

### Connection Pool Exhausted

**Symptoms:**
- "Too many connections" error
- "Connection pool timeout" error
- Sporadic connection failures

**Solutions:**

```typescript
// Check active connections
// In PostgreSQL:
SELECT count(*) FROM pg_stat_activity;

// Increase pool size in database.ts
max: 30,  // Increase from 20

// Check for connection leaks
// Ensure all queries release connections
const client = await pool.connect();
try {
  // ... query ...
} finally {
  client.release();  // Important!
}

// Restart backend to reset pool
pm2 restart backend
```

### Disk Full

**Symptoms:**
- "No space left on device" error
- Database writes failing
- Logs not writing

**Solutions:**

```bash
# Check disk usage
df -h

# Find large files
du -sh /var/lib/postgresql/data/*
du -sh /var/log/*

# Clean old logs
sudo journalctl --vacuum-time=7d

# Clean old WAL files
# In PostgreSQL, set wal_keep_segments lower

# Archive and compress old data
pg_dump blockchain_explorer > backup.sql
gzip backup.sql
```

---

## Blockchain Connection Issues

### RPC Timeout

**Symptoms:**
- "eth_call timed out" error
- Slow event indexing
- EventListener stops

**Solutions:**

```typescript
// Increase timeout in blockchain config
const provider = new JsonRpcProvider(rpcUrl, {
  timeout: 10000  // 10 seconds
});

// Use retry logic
// Already implemented in getLogsWithRetry

// Check RPC provider health
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'

// Consider using Infura/Alchemy for mainnet
RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
```

### Contract Not Found

**Symptoms:**
- "Contract not deployed" error
- "Code not found at address" error

**Solutions:**

```powershell
# Verify contract address
echo $CONTRACT_ADDRESS

# Check contract exists
cast code $CONTRACT_ADDRESS --rpc-url http://127.0.0.1:8545

# Redeploy if needed
cd contracts
npm run deploy

# Verify in blockchain
cast call $CONTRACT_ADDRESS "playerCount()" --rpc-url http://127.0.0.1:8545
```

---

## WebSocket Issues

### Clients Not Receiving Messages

**Symptoms:**
- Frontend doesn't update in real-time
- New events don't appear
- Stats don't refresh

**Solutions:**

```javascript
// Check WebSocket connection
const socket = io('http://localhost:4000');
socket.on('connect', () => console.log('✅ Connected'));
socket.on('disconnect', () => console.log('❌ Disconnected'));
socket.on('newEvent', (e) => console.log('Event:', e));
socket.on('statsUpdate', (s) => console.log('Stats:', s));

// Check backend logs
pm2 logs backend | grep WebSocket

// Verify broadcasts
// In backend, add logging to broadcast methods

// Check CORS
// Ensure frontend origin is allowed in backend
```

### High Connection Count

**Symptoms:**
- >100 WebSocket connections
- Memory usage climbing
- Slow broadcasts

**Solutions:**

```typescript
// Check connection count
curl http://localhost:4000/health | jq '.services.websocket.details.connectedClients'

// Add connection limit
io.on('connection', (socket) => {
  if (connectedClients.size > 100) {
    socket.disconnect();
    return;
  }
  // ...
});

// Implement authentication
// Only allow authenticated clients

// Use connection pooling
// Limit connections per IP
```

---

## Performance Issues

### API Slow Response

**Symptoms:**
- Response times >500ms
- P95 latency high
- Users reporting slowness

**Solutions:**

```bash
# Check cache hit rate
curl http://localhost:4000/health | jq '.cache'

# Clear cache and rebuild
# May help if cache is corrupted

# Check database indexes
psql -U postgres -d blockchain_explorer -c "\d blockchain_events"

# Profile queries
# Enable query logging in PostgreSQL
log_statement = 'all'

# Check CPU/Memory usage
htop

# Scale vertically or horizontally
# Add more resources or instances
```

### High CPU Usage

**Symptoms:**
- CPU at 80-100%
- Slow response times
- High load average

**Solutions:**

```bash
# Check what's consuming CPU
htop
# Press F5 to tree view

# Check Node.js process
pm2 monit

# Profile application
node --prof src/index.ts
node --prof-process isolate-*.log

# Reduce polling frequency
# In EventListener, increase POLL_INTERVAL_MS from 2000 to 5000

# Optimize database queries
# Add indexes, use EXPLAIN ANALYZE

# Consider caching more aggressively
```

---

## Deployment Issues

### PM2 Won't Start

**Symptoms:**
- `pm2 start` fails
- "App not found" error
- Process exits immediately

**Solutions:**

```bash
# Check PM2 list
pm2 list

# Check logs
pm2 logs backend --lines 100

# Try starting manually first
cd /opt/blockchain-explorer/backend
npm start

# Check ecosystem config
pm2 start ecosystem.config.js --env production

# Delete and recreate
pm2 delete backend
pm2 start ecosystem.config.js --env production --name backend

# Check Node version
node --version

# Reinstall PM2
npm uninstall -g pm2
npm install -g pm2
```

### Nginx 502 Bad Gateway

**Symptoms:**
- Nginx returns 502 error
- "Upstream prematurely closed connection"

**Solutions:**

```bash
# Check backend is running
pm2 status

# Check backend port
netstat -tuln | grep 4000

# Test backend directly
curl http://localhost:4000/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart backend
sudo systemctl restart nginx

# Check Nginx config
sudo nginx -t
```

### SSL Certificate Issues

**Symptoms:**
- "Certificate not valid" error
- HTTPS not working
- Mixed content warnings

**Solutions:**

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# Check Nginx SSL config
sudo cat /etc/nginx/sites-available/blockchain-explorer

# Force HTTPS
# Add redirect in Nginx config
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

## Emergency Procedures

### Complete System Failure

1. **Check all services:**
   ```bash
   pm2 status
   sudo systemctl status postgresql
   sudo systemctl status nginx
   ```

2. **Restart in order:**
   ```bash
   sudo systemctl restart postgresql
   pm2 restart all
   sudo systemctl restart nginx
   ```

3. **Check logs:**
   ```bash
   pm2 logs --lines 100
   sudo tail -n 100 /var/log/nginx/error.log
   ```

4. **Rollback if needed:**
   ```bash
   git checkout <previous-working-commit>
   npm install
   pm2 restart backend
   ```

### Data Recovery

1. **Stop application:**
   ```bash
   pm2 stop backend
   ```

2. **Restore database:**
   ```bash
   psql -U postgres -d blockchain_explorer < backup_YYYYMMDD.sql
   ```

3. **Restart:**
   ```bash
   pm2 restart backend
   ```

---

## Getting Help

1. **Check logs first:**
   - Backend: `pm2 logs backend`
   - Database: `sudo tail -f /var/log/postgresql/postgresql-18-main.log`
   - Nginx: `sudo tail -f /var/log/nginx/error.log`

2. **Check health endpoint:**
   ```bash
   curl http://localhost:4000/health | jq
   ```

3. **Run integration tests:**
   ```bash
   npm run test:e2e
   ```

4. **Check documentation:**
   - [ARCHITECTURE.md](./ARCHITECTURE.md)
   - [DEPLOYMENT.md](./DEPLOYMENT.md)
   - [MONITORING.md](./MONITORING.md)

5. **Contact support with:**
   - Error messages and logs
   - Health check output
   - System specifications
   - Steps to reproduce

---

## Prevention

- Monitor system regularly
- Keep dependencies updated
- Run automated tests
- Maintain backups
- Document changes
- Follow deployment checklist
- Use staging environment
- Implement gradual rollouts