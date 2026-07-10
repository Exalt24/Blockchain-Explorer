# Docker Configuration

Technical reference for Docker infrastructure. **For deployment instructions, see [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).**

This directory contains Dockerfiles for all services in the blockchain explorer application.

---

## Dockerfiles

### backend.Dockerfile

Multi-stage Docker build for the Node.js/Express backend service.

**Stages:**
- `base`: Common setup with Node.js 22 Alpine + curl for health checks
- `dependencies`: Install all npm packages
- `build`: Compile TypeScript to JavaScript
- `development`: Development image with hot reload (runs as root for volume permissions)
- `production`: Optimized production image with only runtime dependencies (runs as node user)

**Exposed Ports:** 4000

**Key Features:**
- curl installed for health checks
- Development: Runs as root (allows writing to mounted volumes)
- Production: Runs as node user (security)
- Multi-stage build for optimal image size

**Target Selection:**
```bash
# Development
docker build -f docker/backend.Dockerfile --target development -t blockchain-backend:dev ./backend

# Production
docker build -f docker/backend.Dockerfile --target production -t blockchain-backend:prod ./backend
```

---

### contracts.Dockerfile

Hardhat node for local blockchain testing and contract deployment.

**Features:**
- Compiles Solidity contracts on build
- Runs Hardhat node exposing JSON-RPC on port 8545
- Includes Git for dependency management
- Includes curl for health checks
- Runs as root (allows writing to cache/artifacts)

**Exposed Ports:** 8545

**Build:**
```bash
docker build -f docker/contracts.Dockerfile -t blockchain-contracts ./contracts
```

**Volume Mounts (Development):**
- Source code mounted for hot reload
- Cache and artifacts excluded from mount (container manages these)
- Shares backend/.env.docker for contract deployment

---

### frontend.Dockerfile

Multi-stage Docker build for the React frontend application.

**Stages:**
- `base`: Common setup with Node.js 22 Alpine + curl
- `dependencies`: Install all npm packages
- `build`: Build React app with Vite
- `production`: Nginx serving static files (includes curl for health checks)
- `development`: Development server with hot reload (runs as root for volume permissions)

**Exposed Ports:** 3000 (dev), 80 (prod)

**Production Notes:**
- nginx.conf copied during build (from frontend/nginx.conf)
- curl installed in nginx container for health checks
- Optimized for serving static assets

**Target Selection:**
```bash
# Development
docker build -f docker/frontend.Dockerfile --target development -t blockchain-frontend:dev ./frontend

# Production
docker build -f docker/frontend.Dockerfile --target production -t blockchain-frontend:prod ./frontend
```

---

## Multi-Stage Build Benefits

1. **Smaller Images**: Production images only contain runtime dependencies
2. **Security**: Fewer packages = smaller attack surface
3. **Caching**: Layer caching speeds up rebuilds
4. **Flexibility**: Single Dockerfile for dev and prod
5. **Permission Control**: Different users for dev (root) vs prod (node)

---

## Build Optimization

All Dockerfiles use:
- **Alpine Linux**: Minimal base image (~5MB vs 900MB+)
- **dumb-init**: Proper signal handling (graceful shutdown)
- **curl**: Health check support
- **npm ci**: Faster, deterministic installs (vs npm install)
- **Multi-stage builds**: Smaller final images
- **Layer caching**: Only rebuild changed layers

---

## Development vs Production

### Development Images

**Purpose:** Fast iteration with hot reload

- Include dev dependencies
- Mount source code as volumes
- Enable hot reload (tsx watch, Vite HMR)
- Run with npm run dev
- **Run as root user** (allows writing to mounted volumes from host)

**Volume Pattern:**
```yaml
volumes:
  - ./backend/src:/app/src        # Source code
  - /app/node_modules              # Exclude (container's copy)
```

### Production Images

**Purpose:** Optimized, secure deployment

- Only runtime dependencies (--production)
- Copy built artifacts (no source code)
- Optimized for size and security
- Run compiled/built code (dist/)
- **Run as node user** (non-root for security)

**No volumes** - everything baked into image

---

## Security Considerations

### User Strategy

**Development:**
- Containers run as **root** 
- Reason: Allows writing to volumes mounted from host (Windows/Mac permissions)
- Trade-off: Acceptable for local development

**Production:**
- Containers run as **node** user (non-root)
- Reason: Security best practice (principle of least privilege)
- No volume mounts, so no permission issues

### Other Security Features

- Minimal Alpine base (fewer attack vectors)
- .dockerignore prevents leaking secrets into images
- Multi-stage builds (build tools not in final image)
- Health checks detect compromised services
- No hardcoded secrets (use environment variables)

---

## Health Checks

All images include curl for Docker health checks:

```yaml
# Example health check
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

**Why curl?**
- Available in Alpine with simple install
- Reliable HTTP checks
- Better than `wget` (simpler, smaller)
- Better than `nc` (more portable)

---

## Configuration Files

### nginx.conf

Production-ready Nginx configuration for frontend container:
- Gzip compression
- Security headers
- SPA routing (React Router support)
- Static asset caching (1 year)
- API proxy to backend
- WebSocket proxy
- Health check endpoint

**Used automatically** when building production frontend image.

---

## Common Tasks

### Build All Images

```bash
docker-compose build
```

### Build Specific Service

```bash
docker-compose build backend
```

### Build Without Cache

```bash
docker-compose build --no-cache backend
```

### View Image Sizes

```bash
docker images | grep blockchain
```

### Inspect Layers

```bash
docker history blockchain-backend:dev
```

---

## Troubleshooting

### Build Fails

```bash
# Check Docker version
docker --version

# Clean build cache
docker builder prune

# Build with no cache
docker-compose build --no-cache
```

### Permission Issues (Development)

**Already fixed** - development containers run as root.

If you still see permission errors:
```bash
# Rebuild images
docker-compose build --no-cache

# Verify user in container
docker-compose exec backend whoami
# Should return: root (development)
```

### Image Size Too Large

```bash
# Check actual size
docker images blockchain-backend

# Ensure multi-stage build used
docker build -f docker/backend.Dockerfile --target production ./backend

# Clean up old images
docker image prune -a
```

---

## References

- **User Guide**: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) - How to use Docker for deployment
- **Docker Compose**: [docker-compose.yml](../docker-compose.yml) - Development orchestration
- **Production Compose**: [docker-compose.prod.yml](../docker-compose.prod.yml) - Production orchestration
- **Best Practices**: [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## Maintenance Notes

When modifying Dockerfiles:

1. **Test both targets**: Always test development AND production builds
2. **Update health checks**: If ports/endpoints change, update health checks
3. **Document changes**: Update this README
4. **Check security**: Ensure production images run as non-root
5. **Optimize layers**: Order commands to maximize cache reuse
6. **Test volumes**: Verify hot reload works in development
7. **Size check**: Monitor image size after changes