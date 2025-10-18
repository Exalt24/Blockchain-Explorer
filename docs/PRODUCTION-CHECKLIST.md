# Production Readiness Checklist

Complete checklist for deploying Blockchain Explorer to production.

## Pre-Deployment

### Infrastructure

- [ ] Server provisioned (4+ CPU cores, 8GB+ RAM, 50GB+ SSD)
- [ ] Ubuntu 22.04 LTS or later installed
- [ ] SSH access configured with key-based authentication
- [ ] Root login disabled
- [ ] Non-root user created with sudo privileges
- [ ] UFW firewall configured (ports 22, 80, 443 only)
- [ ] Domain name configured and pointing to server IP
- [ ] DNS records propagated (A/AAAA records)

### Software Installation

- [ ] Docker and Docker Compose installed (or Node.js 22+ for PM2)
- [ ] PostgreSQL 18 installed (if not using Docker)
- [ ] Nginx installed and configured
- [ ] Certbot installed for SSL certificates
- [ ] PM2 installed globally (if using PM2 deployment)
- [ ] Git installed

### Application Setup

- [ ] Repository cloned to `/opt/blockchain-explorer`
- [ ] Correct ownership set (`chown -R user:user`)
- [ ] Dependencies installed (all `node_modules`)
- [ ] Frontend built successfully (`npm run build`)
- [ ] Backend compiled (`npm run build`)

### Environment Configuration

- [ ] `.env.production.docker` or `.env.production.vps` created
- [ ] All placeholder values replaced (passwords, API keys)
- [ ] `DB_PASSWORD` changed from default
- [ ] `RPC_URL` configured (Infura/Alchemy/own node)
- [ ] `CONTRACT_ADDRESS` set to deployed mainnet contract
- [ ] `CORS_ORIGIN` restricted to production domain only
- [ ] `NODE_ENV=production` set
- [ ] Sensitive `.env` files added to `.gitignore`
- [ ] Environment files have correct permissions (600)

### Database

- [ ] Database created (`blockchain_explorer`)
- [ ] Database user created with strong password
- [ ] Database permissions granted
- [ ] Migrations run successfully
- [ ] Database accessible from backend only (not public)
- [ ] Connection pooling configured (max 20)
- [ ] PostgreSQL performance tuning applied
- [ ] Backup directory created (`/backups`)
- [ ] Backup cron job configured
- [ ] Test backup and restore completed

### Smart Contract

- [ ] Contract deployed to mainnet/production network
- [ ] Contract address verified on block explorer
- [ ] Contract source code verified (Etherscan)
- [ ] Contract ownership transferred if needed
- [ ] Initial contract state validated

### SSL/HTTPS

- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Auto-renewal configured and tested
- [ ] HTTP to HTTPS redirect configured
- [ ] HSTS header enabled
- [ ] Certificate expiry monitoring setup
- [ ] SSL Labs test passed (A+ rating)

### Security

- [ ] All default passwords changed
- [ ] SSH password authentication disabled
- [ ] Fail2ban installed and configured
- [ ] Firewall rules tested
- [ ] Security headers configured in Nginx
- [ ] CORS properly restricted
- [ ] Rate limiting configured
- [ ] No sensitive data in logs
- [ ] Error messages don't leak information
- [ ] Dependencies audited (`npm audit`)
- [ ] Docker images from trusted sources only

## Deployment

### Docker Deployment

- [ ] `docker-compose.prod.yml` configured
- [ ] Resource limits set (CPU, memory)
- [ ] Log rotation configured
- [ ] Health checks passing
- [ ] All services start successfully
- [ ] PostgreSQL data persists across restarts
- [ ] Frontend served via Nginx
- [ ] Backend API accessible via `/api`
- [ ] WebSocket connections working

### PM2 Deployment

- [ ] `ecosystem.config.js` configured
- [ ] PM2 startup script installed
- [ ] Application starts on system boot
- [ ] Cluster mode configured (2+ instances)
- [ ] Memory limit set (1GB per instance)
- [ ] Log rotation working
- [ ] Auto-restart on crash enabled
- [ ] Zero-downtime reload tested

### Nginx Configuration

- [ ] Reverse proxy configured for backend
- [ ] Static files served efficiently
- [ ] Gzip compression enabled
- [ ] Cache headers set for static assets
- [ ] SPA routing configured (try_files)
- [ ] WebSocket proxy configured
- [ ] Security headers present
- [ ] Request size limits set
- [ ] Timeout values appropriate
- [ ] Rate limiting configured

## Post-Deployment

### Functionality Testing

- [ ] Frontend loads at `https://yourdomain.com`
- [ ] No console errors in browser
- [ ] All API endpoints responding (200 OK)
- [ ] Health check passing: `/health`
- [ ] Real-time events displaying
- [ ] WebSocket connection stable
- [ ] Statistics cards updating
- [ ] Charts rendering correctly
- [ ] Leaderboard showing data
- [ ] Event explorer working
- [ ] Filters and search functional

### Performance Testing

- [ ] Page load time < 2 seconds
- [ ] API response time P95 < 200ms
- [ ] WebSocket latency < 100ms
- [ ] Database query performance acceptable
- [ ] Cache hit rate > 80%
- [ ] Memory usage stable (no leaks)
- [ ] CPU usage reasonable (< 70% avg)
- [ ] Disk I/O acceptable
- [ ] Network bandwidth sufficient

### Monitoring Setup

- [ ] Health check endpoint monitored (UptimeRobot/Pingdom)
- [ ] PM2 monitoring enabled (or Docker monitoring)
- [ ] Database monitoring configured
- [ ] Disk space alerts set (< 20% free)
- [ ] Memory alerts configured (> 80% usage)
- [ ] Error log monitoring active
- [ ] API error rate alerts set
- [ ] WebSocket connection alerts
- [ ] Certificate expiry alerts (30 days)

### Logging

- [ ] Application logs accessible
- [ ] Nginx access logs enabled
- [ ] Nginx error logs enabled
- [ ] PostgreSQL logs enabled
- [ ] Log rotation configured (daily/weekly)
- [ ] Old logs automatically deleted
- [ ] Sensitive data not logged
- [ ] Log aggregation setup (optional)

### Backup & Recovery

- [ ] Daily database backups running
- [ ] Backup retention policy set (7-30 days)
- [ ] Backups stored off-server
- [ ] Backup restoration tested
- [ ] Recovery time objective (RTO) documented
- [ ] Recovery point objective (RPO) documented
- [ ] Disaster recovery plan documented

### Documentation

- [ ] Production environment documented
- [ ] Deployment process documented
- [ ] Rollback procedure documented
- [ ] Emergency contacts listed
- [ ] Access credentials securely stored
- [ ] Architecture diagram updated
- [ ] API documentation current
- [ ] Monitoring dashboard URLs documented

## Ongoing Maintenance

### Daily

- [ ] Review error logs
- [ ] Check health status
- [ ] Monitor disk space
- [ ] Verify backups completed

### Weekly

- [ ] Review performance metrics
- [ ] Check for security updates
- [ ] Review monitoring alerts
- [ ] Analyze traffic patterns

### Monthly

- [ ] Update dependencies (`npm update`)
- [ ] Security audit (`npm audit`)
- [ ] Review and rotate logs
- [ ] Test backup restoration
- [ ] Performance optimization review
- [ ] SSL certificate check (90 days expiry)

### Quarterly

- [ ] Full system backup
- [ ] Disaster recovery test
- [ ] Security review
- [ ] Capacity planning review
- [ ] Documentation update

## Rollback Plan

### Quick Rollback (< 5 minutes)

- [ ] Rollback script tested
- [ ] Previous version Git tag documented
- [ ] Database rollback procedure documented
- [ ] Communication plan for downtime

### Rollback Steps

1. Stop application
2. Restore database backup
3. Checkout previous Git commit/tag
4. Restart application
5. Verify functionality
6. Notify users if needed

## Support & Escalation

### Contact Information

- [ ] On-call engineer contact
- [ ] DevOps team contact
- [ ] Database administrator contact
- [ ] Hosting provider support
- [ ] DNS provider support

### Escalation Path

- [ ] Level 1: Application errors → DevOps team
- [ ] Level 2: Infrastructure issues → Hosting provider
- [ ] Level 3: Security incidents → Security team
- [ ] Critical: System down → All hands on deck

## Sign-Off

### Deployment Approval

- [ ] Technical lead approval
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Documentation reviewed
- [ ] Stakeholders notified

### Production Launch

- [ ] Soft launch completed (limited users)
- [ ] Performance validated under load
- [ ] No critical issues identified
- [ ] Monitoring confirmed working
- [ ] Full launch approved

**Date:** _______________

**Deployed by:** _______________

**Approved by:** _______________

---

## Emergency Procedures

### Application Down

1. Check health endpoint: `curl https://yourdomain.com/health`
2. Check service status: `docker-compose ps` or `pm2 list`
3. Check logs: `docker-compose logs backend` or `pm2 logs`
4. Restart if needed: `docker-compose restart` or `pm2 restart`
5. If persists: Rollback to previous version

### Database Issues

1. Check PostgreSQL status: `systemctl status postgresql`
2. Check connections: `SELECT count(*) FROM pg_stat_activity;`
3. Check disk space: `df -h`
4. Review slow queries
5. Restart PostgreSQL if needed

### High Memory Usage

1. Check process: `docker stats` or `pm2 show`
2. Review memory leaks in logs
3. Restart service with memory limit
4. Scale horizontally if needed

### SSL Certificate Expiry

1. Check expiry: `certbot certificates`
2. Renew: `certbot renew`
3. Reload Nginx: `systemctl reload nginx`
4. Verify: `curl -I https://yourdomain.com`

### DDoS Attack

1. Check traffic patterns in Nginx logs
2. Enable rate limiting (if not already)
3. Block malicious IPs in firewall
4. Enable Cloudflare DDoS protection
5. Contact hosting provider

---

**Status:** ☐ Not Started | ☐ In Progress | ☐ Production Ready

**Production Ready:** All checkboxes completed = ✅ Ready to launch!