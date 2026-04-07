# Staging 环境配置

## 环境变量
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

## Kubernetes 配置
- Namespace: staging
- Replicas: 3
- CPU: 250m request / 500m limit
- Memory: 256Mi request / 512Mi limit
- Ingress: staging-api.internal.company.com

## 数据库
- PostgreSQL 15 (单实例)
- max_connections: 20
- 每日备份到 S3

## 注意事项
- staging 的 PG max_connections 只有 20，部署多副本时注意控制 pool_size
- staging 没有 Cloudflare WAF，不要暴露到公网
