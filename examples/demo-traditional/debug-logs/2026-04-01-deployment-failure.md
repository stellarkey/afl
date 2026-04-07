# 2026-04-01 部署失败排查日志

## 现象
staging 部署后，3 个 pod 全部进入 CrashLoopBackOff 状态。

## 时间线
- 14:30 部署触发
- 14:31 第一个 pod 启动
- 14:32 所有 pod 开始 CrashLoopBackOff
- 14:35 开始排查
- 15:20 定位到 root cause
- 15:40 修复完成，重新部署成功

## 排查步骤

### 1. 查看 pod 日志
```
$ kubectl logs api-gateway-7b9f4-xk2m9 --previous
Error: connect ETIMEDOUT 10.96.42.15:5432
    at TCPConnectWrap.afterConnect
Error: Failed to acquire connection from pool - timeout
```

### 2. 检查数据库连通性
```
$ kubectl exec api-gateway-7b9f4-xk2m9 -- nslookup pg-staging.internal
Name: pg-staging.internal
Address: 10.96.42.15

$ kubectl exec api-gateway-7b9f4-xk2m9 -- nc -zv 10.96.42.15 5432
Connection to 10.96.42.15 5432 port [tcp/postgresql] succeeded!
```
数据库网络是通的。

### 3. 检查 PG 连接数
```sql
SELECT count(*) FROM pg_stat_activity;
-- 结果: 20 (已满！)
```

### 4. Root Cause
Drizzle ORM 默认 pool size = 10，3 个 pod × 10 = 30 连接。
staging 的 PG max_connections = 20。
连接数溢出导致新连接被拒绝。

## 修复方案
1. 设置 `DB_POOL_SIZE=5` (3×5=15 < 20)
2. 在 Drizzle 配置中添加连接重试：
```typescript
const pool = new Pool({
  max: parseInt(process.env.DB_POOL_SIZE || '10'),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});
```
3. 添加 `/health` 端点检查数据库连接状态

## 后续改进
- 所有环境的 pool_size 都改为环境变量控制
- 添加连接池监控指标到 Datadog
- 在 runbook 中记录连接池计算公式
