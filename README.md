# Blockchain Explorer

A full-stack real-time blockchain event indexing and analytics dashboard built with modern web technologies.

---

## 🚀 Features

⚡ **Real-time Event Indexing** - Automatic blockchain event monitoring and indexing  
📊 **Interactive Dashboard** - Beautiful visualizations with Recharts  
🔄 **Live Updates** - WebSocket-powered real-time data streaming  
💾 **Efficient Caching** - In-memory LRU cache with 8-10x performance improvement  
📦 **Batch Processing** - Optimized event processing (50 events/batch)  
🔍 **Advanced Filtering** - Search and filter events by multiple criteria  
📈 **Analytics** - Player leaderboards, event distribution, activity timelines  
🏥 **Health Monitoring** - Comprehensive health checks and status reporting  
🔐 **Production Ready** - Error handling, retry logic, graceful shutdown  
🐳 **Docker Support** - One-command deployment with hot reload  
🤖 **CI/CD Ready** - GitHub Actions workflows included  
📝 **Comprehensive Docs** - 10,000+ lines of documentation

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development Scripts](#development-scripts)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Performance](#performance)
- [Architecture](#architecture)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Project Status](#project-status)

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.0.0 |
| | TypeScript | 5.7.2 |
| | Vite | 7.1.10 |
| | Tailwind CSS | 4.1.14 |
| | Recharts | 3.2.1 |
| | Socket.IO Client | 4.8.1 |
| Backend | Node.js | 22.11.0 |
| | Express | 5.1.0 |
| | TypeScript | 5.7.2 |
| | Socket.IO | 4.8.1 |
| | ethers.js | 6.15.0 |
| Database | PostgreSQL | 18.0 |
| | pg | 8.13.1 |
| Blockchain | Hardhat | 3.0.4 |
| | Solidity | 0.8.28 |
| DevOps | Docker | Latest |
| | Docker Compose | v2+ |

---

## ⚡ Quick Start

### Option 1: Automated Setup (Recommended)

```powershell
# Clone repository
git clone <repository-url>
cd blockchain-explorer

# One-command setup (5-10 minutes)
.\scripts\setup.ps1

# Open dashboard
Start-Process http://localhost:3000
```

### Option 2: Manual Docker Setup

```bash
# 1. Start all services
docker-compose up -d

# 2. Run database migrations
docker-compose exec backend npm run migrate

# 3. Deploy smart contracts
docker-compose exec hardhat npm run deploy-docker

# 4. Restart backend
docker-compose restart backend

# 5. Generate test events (optional)
docker-compose exec hardhat npm run generate-events
```

**Access the application:**
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:4000/api
- 💚 **Health Check**: http://localhost:4000/health
- ⛓️ **Hardhat RPC**: http://localhost:8545

---

## 📁 Project Structure

```
blockchain-explorer/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── api/         # REST API routes
│   │   ├── config/      # Configuration files
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   ├── utils/       # Utility functions
│   │   └── websocket/   # WebSocket server
│   ├── migrations/      # Database migrations
│   └── tests/           # Test files
├── contracts/           # Smart contracts
│   ├── contracts/       # Solidity files
│   ├── ignition/        # Deployment scripts
│   ├── scripts/         # Helper scripts
│   └── test/            # Contract tests
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # Context providers
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API services
│   │   └── types/       # TypeScript types
│   └── public/          # Static assets
├── docker/              # Docker configuration
│   ├── backend.Dockerfile
│   ├── contracts.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.conf
├── scripts/             # Automation scripts (PowerShell)
│   ├── setup.ps1
│   ├── start-dev.ps1
│   ├── health-check.ps1
│   └── ... (7 more)
├── docs/                # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── TESTING.md
│   ├── TROUBLESHOOTING.md
│   ├── MONITORING.md
│   └── PRODUCTION-CHECKLIST.md
├── .github/workflows/   # CI/CD pipelines
│   ├── ci.yml
│   └── deploy.yml
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production environment
├── CHANGELOG.md
└── README.md
```

---

## 📚 Documentation

Comprehensive documentation available in the `/docs` directory:

- **[API Reference](docs/API.md)** - Complete API documentation with examples
- **[Architecture](docs/ARCHITECTURE.md)** - System design and component interactions
- **[Deployment](docs/DEPLOYMENT.md)** - Development and production deployment
- **[Testing](docs/TESTING.md)** - Integration and performance testing
- **[Monitoring](docs/MONITORING.md)** - Monitoring and alerting setup
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Production Checklist](docs/PRODUCTION-CHECKLIST.md)** - Pre-launch checklist

---

## 🤖 Development Scripts

PowerShell automation scripts for streamlined development:

```powershell
# Setup & Management
.\scripts\setup.ps1              # Complete first-time setup
.\scripts\start-dev.ps1          # Start all services
.\scripts\stop-dev.ps1           # Stop services (keeps data)
.\scripts\reset-all.ps1          # Complete reset (destroys data)

# Utilities
.\scripts\deploy-contract.ps1   # Deploy smart contract
.\scripts\generate-events.ps1   # Generate test events
.\scripts\health-check.ps1      # System health check
.\scripts\view-logs.ps1         # View service logs
.\scripts\run-tests.ps1         # Run test suites
.\scripts\db-operations.ps1     # Database management
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md#development-scripts-powershell-automation) for detailed script documentation.

---

## 🔌 API Reference

### REST Endpoints

```bash
GET  /api/events                # List events (paginated, filterable)
GET  /api/events/tx/:hash       # Events by transaction
GET  /api/events/block/:block   # Events by block
GET  /api/stats                 # Platform statistics
GET  /api/leaderboard           # Player rankings
GET  /api/stats/distribution    # Event type breakdown
GET  /api/stats/timeline        # Activity over time
GET  /health                    # System health
```

### WebSocket Events

```javascript
// Client → Server
socket.emit('ping');

// Server → Client
socket.on('newEvent', (event) => { /* ... */ });
socket.on('statsUpdate', (stats) => { /* ... */ });
socket.on('blockUpdate', (block) => { /* ... */ });
```

See [API.md](docs/API.md) for complete API documentation.

---

## 🧪 Testing

### Quick Diagnostics

```bash
cd backend

# Quick API smoke test
npm run diagnose-api
```

### Test Suites

```bash
# Unit Tests
npm run test:health      # Health monitoring
npm run test:cache       # Cache service
npm run test:batch       # Batch processor

# Integration Tests
npm run test:e2e         # End-to-end flow
npm run test:api-integration
npm run test:concurrent
npm run test:ws-stress

# Performance Tests
npm run test:load        # Load testing
npm run test:cache-perf  # Cache performance
```

### Contract Tests

```bash
cd contracts
npm test                 # All 16 tests
```

**Test Coverage**: 42+ automated tests across backend and contracts

See [TESTING.md](docs/TESTING.md) for detailed testing documentation.

---

## 🚀 Deployment

### Development (Docker)

```bash
# Start environment
docker-compose up -d

# Stop environment
docker-compose down
```

### Production (Docker)

```bash
# Create production .env
cp backend/.env.production.docker backend/.env
nano backend/.env

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Production (PM2 + Nginx)

```bash
# Server setup
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs postgresql-18 nginx

# Clone and setup
git clone <repository-url> /opt/blockchain-explorer
cd /opt/blockchain-explorer
npm run setup # Helper script

# Deploy with PM2
cd backend
npm install --production
npm run build
pm2 start ecosystem.config.js --env production
pm2 save

# Setup Nginx + SSL
sudo certbot --nginx -d yourdomain.com
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

---

## ⚡ Performance

### Benchmarks

**API Response Times:**
- Cached: 5-20ms (avg)
- Uncached: 50-150ms (avg)
- P95: <200ms
- P99: <500ms

**Throughput:**
- 200-500 req/s (single instance)
- 50+ concurrent WebSocket connections
- 100+ events/second indexing

**Cache Performance:**
- Hit rate: 80-90%
- Performance improvement: 8-10x
- Speedup: Cache hits are 8-10x faster than misses

### Optimizations

✅ **Database:**
- Connection pooling (max 20)
- Strategic indexes
- Batch inserts (50 events)
- Query optimization

✅ **Caching:**
- In-memory LRU cache
- TTL-based expiration (5-60s)
- Automatic cleanup
- WebSocket throttling (1/s for blocks)

✅ **Processing:**
- Batch processing (50 events/batch)
- Auto-flush (1s interval)
- Error recovery with retry logic

---

## 🏗 Architecture

```
Frontend (React 19)
        ↓ HTTP/WebSocket
Backend (Node.js + Express 5)
        ↓
    ┌───┴────┐
    │ Services│
    │┌───────┐│
    ││EventProc││
    ││ Stats  ││
    ││ Cache  ││
    │└───────┘│
    └────┬────┘
         ↓
    ┌─────────┐
    │PostgreSQL│
    │ Database │
    └─────────┘

Backend ← ethers.js → Blockchain (Hardhat/Ethereum)
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

---

## 🔍 Monitoring

### Health Check

```bash
curl http://localhost:4000/health

# Returns comprehensive system status:
{
  "status": "healthy",
  "services": {
    "database": { "connected": true, "latency": 5 },
    "blockchain": { "connected": true, "latestBlock": "12345" },
    "eventListener": { "running": true, "errorCount": 0 },
    "websocket": { "enabled": true, "connectedClients": 3 },
    "cache": { "enabled": true, "hitRate": 0.85 }
  }
}
```

### Recommended Stack

- **Metrics**: Prometheus + Grafana
- **Logs**: PM2 logs or ELK stack
- **APM**: PM2 Plus, New Relic, or Datadog
- **Uptime**: UptimeRobot or Pingdom

See [MONITORING.md](docs/MONITORING.md) for monitoring setup guide.

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check port availability
netstat -ano | findstr :4000

# Reinstall dependencies
rm -rf node_modules && npm install

# Verify environment variables
cat .env
```

**Database connection failed:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres
docker-compose restart postgres

# Test connection manually
psql -h localhost -U postgres -d blockchain_explorer
```

**No events indexed:**
```bash
# Generate test events
cd contracts && npm run generate-events

# Check EventListener status
curl http://localhost:4000/health | jq '.services.eventListener'

# Verify CONTRACT_ADDRESS is set
grep CONTRACT_ADDRESS backend/.env
```

See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for complete troubleshooting guide.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write tests for new features
- Update documentation
- Ensure all tests pass
- Keep commits atomic and descriptive

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with modern web3 stack
- Inspired by blockchain explorers like Etherscan
- Uses best practices from React, Node.js, and PostgreSQL communities

---

## 📞 Support

- **Documentation**: Check `/docs` directory
- **Issues**: Open an issue on GitHub
- **Discussions**: Start a discussion on GitHub

---

## 🎯 Project Status

**Current Version**: 1.0.0 (Production Ready)

### ✅ Completed Phases

- ✅ **Phase 0**: Project Setup and Dependencies
- ✅ **Phase 1**: Database Schema and Smart Contract
- ✅ **Phase 2**: Backend Service (Event Indexer + REST API)
- ✅ **Phase 3**: WebSocket Real-Time Layer
- ✅ **Phase 4**: Frontend Dashboard (React 19 + Recharts)
- ✅ **Phase 5**: Integration and Testing
- ✅ **Phase 6**: Docker and Production Readiness

### 🎉 Production Ready Features

✅ Full-stack application functional  
✅ Real-time event indexing  
✅ Interactive dashboard  
✅ Docker development environment  
✅ Docker production configuration  
✅ Comprehensive testing (42+ tests)  
✅ Complete documentation (10,000+ lines)  
✅ Performance optimized (cache, batch processing)  
✅ Error handling and retry logic  
✅ Health monitoring  
✅ Resource limits configured  
✅ Production-ready Nginx config  
✅ PowerShell automation scripts  
✅ CI/CD pipeline templates  
✅ Production readiness checklist  

---

## 🔮 Roadmap

### Short Term (v1.1.0)

- Redis integration for distributed cache
- Prometheus metrics export
- Grafana dashboards
- Rate limiting middleware
- GraphQL API

### Medium Term (v1.2.0)

- Multi-chain support
- Advanced analytics
- Data export features
- Event notifications
- Mobile-responsive improvements

### Long Term (v2.0.0)

- Machine learning insights
- Mobile app (React Native)
- Plugin system
- API monetization
- Advanced filtering and search

---

**Built with ❤️ for the Web3 community**

---

## Quick Links

- [Get Started](#quick-start)
- [Documentation](docs/)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing](#contributing)
- [License](#license)
- [Changelog](CHANGELOG.md)
