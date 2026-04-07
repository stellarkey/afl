---
id: "config-staging"
type: config
tags: ["staging", "environment", "database"]
summary: "Staging env config: 3 replicas, PG max_connections=20, DB_POOL_SIZE=5."
refs:
  - "config-production"
---

# Staging Environment Config

## Environment Variables
```
NODE_ENV=staging
PORT=3000
DB_HOST=pg-staging.internal
DB_PORT=5432
DB_NAME=api_staging
DB_USER=api_user
DB_PASSWORD=***
DB_POOL_SIZE=5
JWT_SECRET=***
REDIS_URL=redis://redis-staging.internal:6379
LOG_LEVEL=debug
```

## Kubernetes Config
- Namespace: staging
- Replicas: 3
- CPU: 250m request / 500m limit
- Memory: 256Mi request / 512Mi limit
- Ingress: staging-api.internal.company.com

## Database
- PostgreSQL 15 (single instance)
- max_connections: 20 @attr(constraint: "critical", see_also: "debug-deploy-failure")
- Daily backup to S3

## Warnings
- Staging PG max_connections is only 20. With 3 replicas and pool_size=5: 3×5=15 < 20 ✓
- Staging has no Cloudflare WAF — never expose to public internet
- Compare with [[config-production]] for production differences
