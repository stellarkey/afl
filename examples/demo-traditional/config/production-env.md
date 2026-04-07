# Production 环境配置

## 环境变量
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

## Kubernetes 配置
- Namespace: production
- Replicas: 5
- CPU: 500m request / 1000m limit
- Memory: 512Mi request / 1Gi limit
- Ingress: api.company.com
- HPA: min=3, max=10, target CPU=70%

## 数据库
- PostgreSQL 15 (RDS Multi-AZ)
- max_connections: 100
- 自动备份 + WAL archiving
- Read replica 用于报表查询

## 监控
- Datadog APM
- Sentry 错误追踪
- PagerDuty 告警
