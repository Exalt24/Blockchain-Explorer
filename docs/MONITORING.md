# Monitoring Guide

Comprehensive monitoring setup for Blockchain Explorer application.

## Overview

Monitoring is essential for:
- **Performance**: Track response times and throughput
- **Reliability**: Detect outages and issues early
- **Capacity Planning**: Understand resource usage
- **Debugging**: Diagnose problems quickly

## Monitoring Stack

Recommended tools:
- **Metrics**: Prometheus + Grafana
- **Logs**: ELK Stack (Elasticsearch, Logstash, Kibana) or Loki
- **APM**: New Relic, Datadog, or Sentry
- **Uptime**: UptimeRobot or Pingdom

## Built-in Health Checks

### Health Endpoint

GET `/health` provides comprehensive system status.

**Metrics Included:**
- Overall health status (healthy/degraded/unhealthy)
- Service-level status (database, blockchain, EventListener, WebSocket)
- Latency measurements
- Cache statistics
- Uptime

**Monitoring Script:**

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:4000/health"

response=$(curl -s -w "\n%{http_code}" $HEALTH_URL)
body=$(echo "$response" | head -n -1)
status_code=$(echo "$response" | tail -n 1)

if [ "$status_code" -eq 200 ]; then
    echo "✅ Healthy"
    exit 0
elif [ "$status_code" -eq 503 ]; then
    echo "⚠️  Degraded: $body"
    exit 1
else
    echo "❌ Unhealthy: $body"
    exit 2
fi
```

Usage:
```bash
chmod +x health-check.sh
./health-check.sh
```

### Scheduled Health Checks

Using cron:
```bash
# Check every 5 minutes
*/5 * * * * /path/to/health-check.sh >> /var/log/health-check.log 2>&1
```

---

## Key Performance Indicators (KPIs)

### Application Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API P95 Latency | <100ms | <200ms | >500ms |
| API P99 Latency | <200ms | <500ms | >1000ms |
| WebSocket Connections | Stable | Growing | Declining |
| Event Processing Rate | >100/min | >50/min | <10/min |
| Cache Hit Rate | >80% | >60% | <50% |
| Error Rate | <0.1% | <1% | >5% |
| Database Query Time | <50ms | <100ms | >200ms |
| Memory Usage | <70% | <85% | >95% |
| CPU Usage | <60% | <80% | >90% |

### Infrastructure Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Disk Usage | <70% | <85% | >95% |
| Database Connections | <50 | <75 | >90 |
| Network Bandwidth | <50% | <75% | >90% |

---

## PM2 Monitoring

### Built-in Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process list with metrics
pm2 list

# Detailed process info
pm2 show backend

# Logs
pm2 logs backend --lines 100
```

### PM2 Plus (Cloud Monitoring)

Free tier includes:
- Real-time metrics
- Custom metrics
- Alerting
- Transaction tracing

Setup:
```bash
pm2 plus
# Follow prompts to create account
```

Dashboard: https://app.pm2.io

---

## Prometheus + Grafana Setup

### 1. Install Prometheus

```bash
# Download
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64

# Create config
cat > prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'blockchain-explorer'
    static_configs:
      - targets: ['localhost:4000']
EOF

# Start
./prometheus --config.file=prometheus.yml
```

Access: http://localhost:9090

### 2. Expose Metrics in Backend

Install prom-client:
```bash
cd backend
npm install prom-client
```

Add to `backend/src/index.ts`:
```typescript
import { register, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

collectDefaultMetrics();

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const eventProcessingCounter = new Counter({
  name: 'events_processed_total',
  help: 'Total number of blockchain events processed'
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 3. Install Grafana

```bash
# Add repository
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -

# Install
sudo apt-get update
sudo apt-get install grafana

# Start
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

Access: http://localhost:3000 (admin/admin)

### 4. Configure Grafana Dashboard

1. Add Prometheus data source
2. Import dashboard ID: 1860 (Node Exporter Full)
3. Create custom dashboard for application metrics

**Sample Dashboard Panels:**
- API Request Rate
- Response Time (P50, P95, P99)
- Error Rate
- Active WebSocket Connections
- Event Processing Rate
- Cache Hit Rate
- Database Query Performance

---

## Log Aggregation

### Structured Logging

Update logging in backend:

```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Log Rotation

Install:
```bash
sudo npm install -g pm2-logrotate
pm2 install pm2-logrotate
```

Configure:
```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### ELK Stack (Optional)

For centralized logging:

1. **Elasticsearch**: Store logs
2. **Logstash**: Process logs
3. **Kibana**: Visualize logs

Install with Docker:
```bash
docker-compose -f docker-compose.elk.yml up -d
```

---

## Alerting

### Email Alerts via PM2

```bash
# Configure PM2 alerts
pm2 set pm2-email:smtp_host smtp.gmail.com
pm2 set pm2-email:smtp_port 587
pm2 set pm2-email:smtp_username your-email@gmail.com
pm2 set pm2-email:smtp_password your-app-password
pm2 set pm2-email:to your-email@gmail.com
```

### Custom Alert Script

```bash
#!/bin/bash
# alert.sh

HEALTH_URL="http://localhost:4000/health"
ALERT_EMAIL="admin@example.com"

response=$(curl -s $HEALTH_URL)
status=$(echo "$response" | jq -r '.status')

if [ "$status" != "healthy" ]; then
    echo "System is $status" | mail -s "🚨 Blockchain Explorer Alert" $ALERT_EMAIL
fi
```

Run every 5 minutes:
```bash
*/5 * * * * /path/to/alert.sh
```

### Prometheus Alertmanager

Configure alerts in `prometheus.yml`:

```yaml
rule_files:
  - alerts.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

Create `alerts.yml`:
```yaml
groups:
  - name: blockchain-explorer
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: http_request_duration_seconds{quantile="0.95"} > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
```

---

## Dashboards

### Grafana Dashboard JSON

Example dashboard configuration:

```json
{
  "dashboard": {
    "title": "Blockchain Explorer",
    "panels": [
      {
        "title": "API Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "WebSocket Connections",
        "targets": [
          {
            "expr": "websocket_connections_active"
          }
        ]
      }
    ]
  }
}
```

---

## Performance Testing

### Load Testing with Artillery

Install:
```bash
npm install -g artillery
```

Create `load-test.yml`:
```yaml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "API Endpoints"
    flow:
      - get:
          url: "/api/stats"
      - get:
          url: "/api/events?page=1&limit=20"
      - get:
          url: "/api/leaderboard"
```

Run:
```bash
artillery run load-test.yml
```

### Continuous Performance Monitoring

Run automated performance tests:

```bash
#!/bin/bash
# performance-test.sh

THRESHOLD_P95=200  # ms

result=$(artillery run load-test.yml --output report.json)
p95=$(cat report.json | jq '.aggregate.latency.p95')

if [ "$p95" -gt "$THRESHOLD_P95" ]; then
    echo "⚠️  Performance degradation: P95 latency is ${p95}ms (threshold: ${THRESHOLD_P95}ms)"
    # Send alert
fi
```

---

## Database Monitoring

### PostgreSQL Statistics

```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - pg_stat_activity.query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cache hit ratio
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS ratio
FROM pg_statio_user_tables;
```

### pg_stat_statements

Enable in `postgresql.conf`:
```conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
```

Query slow queries:
```sql
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Best Practices

1. **Monitor Everything**: Application, infrastructure, and business metrics
2. **Set Baselines**: Understand normal behavior before alerting
3. **Alert on Symptoms**: Alert on user-facing issues, not root causes
4. **Use Runbooks**: Document response procedures for each alert
5. **Test Alerts**: Regularly test alerting mechanisms
6. **Review Regularly**: Weekly review of metrics and trends
7. **Automate**: Use automation for monitoring and alerting
8. **Document**: Keep monitoring documentation up-to-date

---

## Monitoring Checklist

- [ ] Health checks configured
- [ ] Metrics collection setup
- [ ] Dashboards created
- [ ] Alerts configured
- [ ] Log aggregation working
- [ ] Performance testing automated
- [ ] Database monitoring enabled
- [ ] Uptime monitoring active
- [ ] Alert notifications tested
- [ ] Runbooks documented
- [ ] Team trained on monitoring tools
- [ ] Regular reviews scheduled

---

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PM2 Monitoring](https://pm2.keymetrics.io/docs/usage/monitoring/)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring.html)