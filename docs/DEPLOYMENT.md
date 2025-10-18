# Deployment Guide

Complete deployment guide for development, staging, and production environments.

## Table of Contents

- [Quick Start (Docker - Recommended)](#quick-start-docker---recommended)
- [Development Scripts (PowerShell Automation)](#development-scripts-powershell-automation)
- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
  - [First-Time Setup](#first-time-setup)
  - [Daily Development Workflow](#daily-development-workflow)
  - [Docker Commands Reference](#docker-commands-reference)
  - [Docker Architecture](#docker-architecture)
- [Local Development (Without Docker)](#local-development-without-docker)
- [Production Deployment](#production-deployment)
  - [VPS/Server Setup](#vpsserver-setup)
  - [PM2 Deployment](#pm2-deployment)
  - [Docker Production](#docker-production)
- [Environment Variables](#environment-variables)
- [Database Management](#database-management)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Docker - Recommended)

Get the entire application running in **under 5 minutes** with Docker:

```bash
# 1. Start all services
docker-compose up -d

# 2. Run database migrations
docker-compose exec backend npm run migrate

# 3. Deploy smart contracts
docker-compose exec hardhat npm run deploy-docker

# 4. Restart backend to pick up contract address
docker-compose restart backend

# 5. Generate test events (optional)
docker-compose exec hardhat npm run generate-events
```

**Access the application:**
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:4000/api
- 💚 **Health Check**: http://localhost:4000/health
- ⛓️ **Hardhat RPC**: http://localhost:8545

**Done!** The dashboard is now running with live blockchain events.

---

## Development Scripts (PowerShell Automation)

**Prefer automation?** Use PowerShell scripts that handle the entire workflow:

```powershell
# First-time setup (does everything above automatically)
.\scripts\setup.ps1

# Daily development
.\scripts\start-dev.ps1          # Start all services
.\scripts\health-check.ps1       # Verify everything is working
.\scripts\stop-dev.ps1           # Stop services (keeps data)

# Utilities
.\scripts\deploy-contract.ps1   # Deploy contract
.\scripts\generate-events.ps1   # Generate test events
.\scripts\view-logs.ps1          # View logs
.\scripts\run-tests.ps1          # Run test suites
.\scripts\reset-all.ps1          # Fresh start (destroys data)

# Database management
.\scripts\db-operations.ps1 -Operation migrate
.\scripts\db-operations.ps1 -Operation stats
.\scripts\db-operations.ps1 -Operation shell
```

### Available Scripts

| Script | Purpose | Equivalent Manual Commands |
|--------|---------|---------------------------|
| `setup.ps1` | Complete first-time setup | See [First-Time Setup](#first-time-setup) |
| `start-dev.ps1` | Start environment | `docker-compose up -d` |
| `stop-dev.ps1` | Stop environment | `docker-compose down` |
| `health-check.ps1` | System health check | `curl http://localhost:4000/health` |
| `deploy-contract.ps1` | Deploy contract | `docker-compose exec hardhat npm run deploy-docker` |
| `generate-events.ps1` | Generate test events | `docker-compose exec hardhat npm run generate-events` |
| `view-logs.ps1` | View logs | `docker-compose logs -f` |
| `run-tests.ps1` | Run tests | `docker-compose exec backend npm run test:*` |
| `reset-all.ps1` | Complete reset | `docker-compose down -v && setup` |
| `db-operations.ps1` | Database management | Various database commands |

**Example Workflow:**

```powershell
# First time
.\scripts\setup.ps1

# Open dashboard
Start-Process http://localhost:3000

# Daily work
.\scripts\start-dev.ps1
# ... make changes (hot reload works) ...
.\scripts\view-logs.ps1 -Service backend -Follow
.\scripts\stop-dev.ps1

# Troubleshooting
.\scripts\health-check.ps1
.\scripts\view-logs.ps1 -Service backend -Lines 100
.\scripts\reset-all.ps1  # Nuclear option
```

**Note:** Scripts automate the manual workflows documented below. For detailed explanations and manual commands, see the relevant sections.

---

## Prerequisites

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- OS: Windows 10/11, Linux, macOS

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- OS: Linux (Ubuntu 22.04 LTS)

### Software Dependencies

**For Docker Deployment (Recommended):**
- Docker Desktop v24.0.0+ (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0.0+

**For Local Development:**
- Node.js v22.11.0 or higher
- PostgreSQL v18.0 or higher
- npm v10.0.0 or higher

**For Production:**
- All of the above, plus:
- PM2 v5.3.0 or higher
- Nginx (reverse proxy)

### Installation

```bash
# Docker Desktop (Windows/Mac)
# Download from: https://www.docker.com/products/docker-desktop

# Node.js (if running locally)
# Download from: https://nodejs.org/ (v22.11.0 LTS)

# PM2 (production)
npm install -g pm2
```

---

## Docker Deployment

Docker provides the **easiest and most reliable** way to run the application. All services are containerized with proper networking, health checks, and volume management.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Docker Compose Network (blockchain-network)    │
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │  PostgreSQL  │◄─────┤   Backend    │                │
│  │  Port: 5432  │      │  Port: 4000  │                │
│  └──────────────┘      └──────┬───────┘                │
│                                │                         │
│  ┌──────────────┐             │      ┌──────────────┐  │
│  │   Hardhat    │◄────────────┴─────►│   Frontend   │  │
│  │  Port: 8545  │                     │  Port: 3000  │  │
│  └──────────────┘                     └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### First-Time Setup

#### Step 1: Clone and Prepare

```powershell
# Clone repository
git clone <repository-url>
cd blockchain-explorer

# Verify Docker is running
docker --version
docker-compose --version
```

#### Step 2: Start Services

```powershell
# Build and start all containers (first run takes 5-10 minutes)
docker-compose up -d

# Monitor startup
docker-compose logs -f

# Wait for all services to be healthy (~1-2 minutes)
docker-compose ps
```

Expected output:
```
NAME                 STATUS
blockchain-postgres  Up (healthy)
blockchain-hardhat   Up (healthy)
blockchain-backend   Up (healthy)
blockchain-frontend  Up (healthy)
```

#### Step 3: Initialize Database

```powershell
# Run migrations to create tables
docker-compose exec backend npm run migrate

# Verify tables created
docker-compose exec postgres psql -U postgres -d blockchain_explorer -c "\dt"
```

#### Step 4: Deploy Smart Contracts

```powershell
# Deploy contracts to Hardhat node
docker-compose exec hardhat npm run deploy-docker

# This automatically updates backend/.env.docker with CONTRACT_ADDRESS
```

Expected output:
```
✅ GameState deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ Updated backend/.env.docker with CONTRACT_ADDRESS
```

#### Step 5: Restart Backend

```powershell
# Restart to pick up contract address
docker-compose restart backend

# Wait for backend to be healthy
Start-Sleep -Seconds 10

# Verify health
curl http://localhost:4000/health
```

#### Step 6: Generate Test Events (Optional)

```powershell
# Generate ~69 test blockchain events
docker-compose exec hardhat npm run generate-events

# Monitor backend logs to see indexing
docker-compose logs -f backend
```

#### Step 7: Access Application

Open your browser:
- **Dashboard**: http://localhost:3000
- **API Health**: http://localhost:4000/health

You should see:
- ✅ Real-time event feed
- ✅ Statistics cards updating
- ✅ Charts showing event distribution
- ✅ Leaderboard with player rankings

### Daily Development Workflow

```powershell
# Morning: Start everything
docker-compose up -d

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend

# Code changes auto-reload via volume mounts
# Edit files in backend/src or frontend/src

# Restart a service if needed
docker-compose restart backend

# Evening: Stop everything (keeps data)
docker-compose down

# Fresh start: Stop and remove all data
docker-compose down -v
docker-compose up -d
```

### Docker Commands Reference

#### Service Management

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Stop services (keep data)
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# View service status
docker-compose ps

# View service health
docker-compose ps --format "table {{.Service}}\t{{.Status}}"
```

#### Logs & Debugging

```bash
# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# Last 100 lines from service
docker-compose logs backend --tail=100

# Logs since specific time
docker-compose logs --since 5m

# Logs for multiple services
docker-compose logs -f backend frontend
```

#### Execute Commands

```bash
# Shell into container
docker-compose exec backend sh
docker-compose exec postgres sh

# Run npm commands
docker-compose exec backend npm test
docker-compose exec backend npm run migrate

# Database access
docker-compose exec postgres psql -U postgres -d blockchain_explorer

# Run scripts
docker-compose exec hardhat npm run generate-events
docker-compose exec backend npm run diagnose-api
```

#### Health & Status

```bash
# Check service health
docker-compose ps

# Backend health endpoint
curl http://localhost:4000/health

# Count events in database
docker-compose exec postgres psql -U postgres -d blockchain_explorer -c "SELECT COUNT(*) FROM blockchain_events;"

# View resource usage
docker stats
```

#### Database Operations

```bash
# Run migrations
docker-compose exec backend npm run migrate

# Backup database
docker-compose exec postgres pg_dump -U postgres blockchain_explorer > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres blockchain_explorer < backup.sql

# Reset database
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend npm run migrate
```

#### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything (careful!)
docker system prune -a --volumes
```

### Docker Architecture

#### Services

**postgres** - PostgreSQL 18 Database
- Internal port: 5432
- Exposed port: 5432
- Volume: postgres_data (persistent)
- Health check: `pg_isready`

**hardhat** - Local blockchain node
- Internal port: 8545
- Exposed port: 8545
- Volume: contracts source mounted
- Health check: `curl http://localhost:8545`

**backend** - Node.js/Express API
- Internal port: 4000
- Exposed port: 4000
- Volume: backend/src mounted (hot reload)
- Health check: `curl http://localhost:4000/health`

**frontend** - React development server
- Internal port: 3000
- Exposed port: 3000
- Volume: frontend/src mounted (hot reload)
- Health check: `curl http://localhost:3000`

#### Networking

All services communicate via the `blockchain-network` bridge network:
- Backend connects to postgres: `postgres:5432`
- Backend connects to hardhat: `http://hardhat:8545`
- Frontend accesses backend: `http://localhost:4000` (via exposed port)

#### Volume Mounts (Hot Reload)

```yaml
# Backend
- ./backend/src:/app/src              # Source code
- /app/node_modules                   # Exclude (container's)

# Hardhat
- ./contracts:/app                    # All contracts
- ./backend/.env.docker:/backend/.env.docker  # Shared config
- /app/node_modules                   # Exclude

# Frontend
- ./frontend/src:/app/src             # Source code
- /app/node_modules                   # Exclude
```

#### Environment Files

Development uses Docker-specific env files:
- `backend/.env.docker` - Uses service names (postgres, hardhat)
- `frontend/.env.docker` - Points to localhost:4000

### Troubleshooting Docker

#### Services Won't Start

```bash
# Check logs
docker-compose logs backend

# Check service status
docker-compose ps

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

#### Port Conflicts

```bash
# Check what's using port
netstat -ano | findstr :4000

# Change port in docker-compose.yml
ports:
  - "4001:4000"  # Use different host port
```

#### Hot Reload Not Working

```bash
# Verify volumes mounted
docker-compose config

# Restart service
docker-compose restart backend

# Check file changes detected
docker-compose logs backend
```

#### Database Connection Issues

```bash
# Check postgres health
docker-compose ps postgres

# Test connection from backend
docker-compose exec backend ping postgres

# Check credentials
docker-compose exec backend env | grep DB_
```

---

## Local Development (Without Docker)

If you prefer not to use Docker, you can run services locally.

### Prerequisites

- Node.js v22.11.0
- PostgreSQL 18
- Git

### Setup

#### 1. Install Dependencies

```powershell
# Backend
cd backend
npm install
cd ..

# Contracts
cd contracts
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

#### 2. Setup PostgreSQL

```powershell
# Create database (using psql)
psql -U postgres
CREATE DATABASE blockchain_explorer;
\q

# Configure connection in backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blockchain_explorer
DB_USER=postgres
DB_PASSWORD=postgres
```

#### 3. Run Migrations

```powershell
cd backend
npm run migrate
cd ..
```

#### 4. Start Hardhat Node

```powershell
# Terminal 1: Start Hardhat node
cd contracts
npm run node

# Terminal 2: Deploy contracts
npm run deploy
cd ..
```

#### 5. Start Backend

```powershell
cd backend
npm run dev
```

#### 6. Start Frontend

```powershell
cd frontend
npm run dev
```

### Access Points

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Hardhat: http://localhost:8545

---

## Production Deployment

### VPS/Server Setup

#### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 18
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-18

# Install PM2 process manager
npm install -g pm2

# Install Nginx reverse proxy
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Create Application User

```bash
# Create user
sudo useradd -m -s /bin/bash explorer
sudo usermod -aG sudo explorer

# Create app directory
sudo mkdir -p /opt/blockchain-explorer
sudo chown explorer:explorer /opt/blockchain-explorer
```

#### 3. Setup Database

```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE blockchain_explorer;
CREATE USER explorer_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE blockchain_explorer TO explorer_user;
\q
```

#### 4. Clone and Build Application

```bash
# Switch to app user
sudo su - explorer
cd /opt/blockchain-explorer

# Clone repository
git clone <repository-url> .

# Install and build backend
cd backend
npm install --production
npm run build
cd ..

# Install and build frontend
cd frontend
npm install
npm run build
cd ..
```

#### 5. Configure Environment

```bash
# Backend production environment
cp backend/.env.example backend/.env
nano backend/.env
```

Update with production values:
```env
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blockchain_explorer
DB_USER=explorer_user
DB_PASSWORD=STRONG_PASSWORD_HERE
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
CONTRACT_ADDRESS=0x...
CHAIN_ID=1
CORS_ORIGIN=https://yourdomain.com
```

#### 6. Run Migrations

```bash
cd backend
npm run migrate
cd ..
```

### PM2 Deployment

#### Setup PM2 Ecosystem

Create `backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'blockchain-backend',
    script: './dist/index.js',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

#### Start with PM2

```bash
cd /opt/blockchain-explorer/backend

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
# Follow the printed command (run as root)

# Monitor
pm2 monit
pm2 logs blockchain-backend
```

### Nginx Configuration

#### Setup Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/blockchain-explorer
```

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (certbot will fill this)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend - Serve static files
    root /opt/blockchain-explorer/frontend/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Frontend - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:4000;
        access_log off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/blockchain-explorer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL Certificate

```bash
# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

### Firewall Configuration

```bash
# Setup UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Verify rules
sudo ufw status
```

### Docker Production

For production deployment with Docker, use `docker-compose.prod.yml`:

```bash
# Create production .env
cp backend/.env.example backend/.env
nano backend/.env
# Add production values

# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

---

## Environment Variables

### Backend Environment

**Development (backend/.env.docker):**
```env
PORT=4000
DB_HOST=postgres                    # Docker service name
DB_PORT=5432
DB_NAME=blockchain_explorer
DB_USER=postgres
DB_PASSWORD=postgres
RPC_URL=http://hardhat:8545        # Docker service name
CHAIN_ID=31337
START_BLOCK=0
CONTRACT_ADDRESS=                   # Filled by deploy script
CORS_ORIGIN=*
```

**Production (backend/.env):**
```env
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blockchain_explorer
DB_USER=explorer_user
DB_PASSWORD=STRONG_PASSWORD
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
CONTRACT_ADDRESS=0x...
CHAIN_ID=1
START_BLOCK=0
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

### Frontend Environment

**Development (frontend/.env.docker):**
```env
VITE_API_URL=http://localhost:4000/api
VITE_WS_URL=http://localhost:4000
```

**Production (frontend/.env.production):**
```env
VITE_API_URL=/api
VITE_WS_URL=https://yourdomain.com
```

---

## Database Management

### Backup & Restore

```bash
# Docker: Backup
docker-compose exec postgres pg_dump -U postgres blockchain_explorer > backup_$(date +%Y%m%d).sql

# Docker: Restore
docker-compose exec -T postgres psql -U postgres blockchain_explorer < backup.sql

# Local: Backup
pg_dump -U explorer_user blockchain_explorer > backup_$(date +%Y%m%d).sql

# Local: Restore
psql -U explorer_user blockchain_explorer < backup.sql
```

### Automated Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * docker-compose -f /opt/blockchain-explorer/docker-compose.prod.yml exec -T postgres pg_dump -U postgres blockchain_explorer > /backups/db_$(date +\%Y\%m\%d).sql

# Keep last 7 days
0 3 * * * find /backups -name "db_*.sql" -mtime +7 -delete
```

### Performance Tuning

Edit PostgreSQL configuration:

```bash
# Docker: Edit in container or mount config
# Local: Edit /etc/postgresql/18/main/postgresql.conf

# Memory settings
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 64MB

# Connections
max_connections = 100

# WAL
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

Restart PostgreSQL:
```bash
# Docker
docker-compose restart postgres

# Local
sudo systemctl restart postgresql
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# Process list
pm2 list

# Detailed info
pm2 show blockchain-backend

# Logs
pm2 logs blockchain-backend --lines 100
pm2 logs --err --lines 50

# Monitoring dashboard
pm2 monit

# Restart
pm2 restart blockchain-backend

# Reload (zero-downtime)
pm2 reload blockchain-backend
```

### Docker Monitoring

```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Logs
docker-compose logs -f backend
docker-compose logs --tail=100 backend

# Health checks
curl http://localhost:4000/health
docker-compose exec postgres psql -U postgres -d blockchain_explorer -c "SELECT COUNT(*) FROM blockchain_events;"
```

### System Monitoring

```bash
# Resource usage
htop
free -h
df -h

# Network
netstat -tuln
ss -tuln

# Disk I/O
iotop

# Process monitoring
ps aux | grep node
```

### Log Management

```bash
# Backend logs (PM2)
pm2 logs blockchain-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-18-main.log

# Docker logs
docker-compose logs -f
```

### Health Checks

```bash
# Backend health endpoint
curl http://localhost:4000/health | jq

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-10-21T10:30:00.000Z",
  "services": {
    "database": { "connected": true, "latency": 5 },
    "blockchain": { "connected": true, "latestBlock": "12345" },
    "eventListener": { "running": true, "errorCount": 0 },
    "websocket": { "enabled": true, "connectedClients": 3 },
    "cache": { "enabled": true, "hitRate": 0.85 }
  }
}
```

---

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
docker-compose logs backend
docker-compose ps
docker-compose down -v && docker-compose up -d
```

**Port conflicts:**
```bash
netstat -ano | findstr :4000
# Change port in docker-compose.yml if needed
```

**Permission errors:**
```bash
# Already fixed - development containers run as root
# Production containers run as node user
```

### Database Issues

**Connection failed:**
```bash
# Check postgres running
docker-compose ps postgres

# Test connection
docker-compose exec backend ping postgres

# Check credentials
docker-compose exec backend env | grep DB_
```

**Slow queries:**
```sql
-- Check running queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Backend Issues

**Backend crashes:**
```bash
# Check logs
pm2 logs blockchain-backend --err
docker-compose logs backend --tail=100

# Check health
curl http://localhost:4000/health

# Restart
pm2 restart blockchain-backend
docker-compose restart backend
```

**High memory usage:**
```bash
# Check process
pm2 show blockchain-backend
docker stats backend

# Restart with memory limit
pm2 restart blockchain-backend --max-memory-restart 1G
```

### Frontend Issues

**Build fails:**
```bash
cd frontend
npm ci
npm run build
```

**Assets not loading:**
```bash
# Check nginx config
sudo nginx -t
sudo systemctl restart nginx

# Check file permissions
ls -la /opt/blockchain-explorer/frontend/dist
```

### Quick Diagnostic Commands

```bash
# Check all services
docker-compose ps

# Check ports
sudo netstat -tuln | grep -E '3000|4000|5432|8545'

# Check disk space
df -h

# Check memory
free -h

# Check logs
docker-compose logs backend --tail=50

# Count events
docker-compose exec postgres psql -U postgres -d blockchain_explorer -c "SELECT COUNT(*) FROM blockchain_events;"
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Configure firewall (UFW)
- [ ] Enable SSL/HTTPS with Let's Encrypt
- [ ] Restrict database access (localhost only)
- [ ] Use environment variables for secrets (never commit .env)
- [ ] Enable CORS only for trusted origins
- [ ] Implement rate limiting (nginx or backend)
- [ ] Regular security updates (`apt upgrade`)
- [ ] Monitor logs for suspicious activity
- [ ] Backup database regularly (automated)
- [ ] Use least privilege principle for system users
- [ ] Secure SSH (key-based auth, disable root login)
- [ ] Keep Docker images updated
- [ ] Review application logs daily

---

## Post-Deployment Checklist

- [ ] Application starts without errors
- [ ] Database connections working
- [ ] Blockchain connection successful
- [ ] All API endpoints responding
- [ ] WebSocket connections working
- [ ] Frontend loads correctly
- [ ] SSL certificate valid (production)
- [ ] Monitoring setup complete
- [ ] Backups configured and tested
- [ ] Logs rotating properly
- [ ] Performance acceptable (<200ms P95)
- [ ] Health checks passing
- [ ] Error alerts configured
- [ ] Documentation updated

---

## Rollback Procedure

```bash
# 1. Stop application
pm2 stop blockchain-backend
# or
docker-compose down

# 2. Restore database backup
psql -U explorer_user blockchain_explorer < backup_YYYYMMDD.sql
# or
docker-compose exec -T postgres psql -U postgres blockchain_explorer < backup.sql

# 3. Checkout previous version
git checkout <previous-commit-hash>

# 4. Install dependencies
npm install --production

# 5. Restart
pm2 restart blockchain-backend
# or
docker-compose up -d
```

---

## Support & Resources

**Documentation:**
- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Testing Guide](./TESTING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Monitoring](./MONITORING.md)

**Docker Documentation:**
- `/docker/README.md` - Technical Dockerfile reference

**Quick Help:**
```bash
# Check health
curl http://localhost:4000/health

# View logs
docker-compose logs -f

# Get help
docker-compose --help
pm2 --help
```

For deployment issues, check logs first, then consult [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).