---
id: "config-production"
type: config
tags: ["production", "environment", "database", "monitoring"]
summary: "Production env config: 5 replicas (HPA 3-10), RDS Multi-AZ, max_connections=100, DB_POOL_SIZE=10."
refs:
  - "config-staging"
---

# Production Environment Config

## Environment Variables
```
NODE_ENV=production
PORT=3000
DB_HOST=pg-prod.rds.amazonaws.com
DB_PORT=5432
DB_NAME=api_production
DB_USER=api_user
DB_PASSWORD=***
DB_POOL_SIZE=10
JWT_SECRET=***
REDIS_URL=redis://redis-prod.elasticache.amazonaws.com:6379
LOG_LEVEL=warn
DATADOG_API_KEY=***
SENTRY_DSN=***
```

## Kubernetes Config
- Namespace: production
- Replicas: 5
- CPU: 500m request / 1000m limit
- Memory: 512Mi request / 1Gi limit
- Ingress: api.company.com
- HPA: min=3, max=10, target CPU=70%

## Database @attr(tier: "production", ha: true)
- PostgreSQL 15 (RDS Multi-AZ)
- max_connections: 100
- Auto backup + WAL archiving
- Read replica for reporting queries

Connection budget: 10 replicas × 10 pool = 100 (tight at HPA max). See [[know-pg-tuning]] for formula.

## Monitoring
- Datadog APM
- Sentry error tracking
- PagerDuty alerting
