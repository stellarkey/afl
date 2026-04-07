---
id: "debug-deploy-failure"
type: memory
tags: ["deployment", "failure", "connection-pool", "crash-loop", "postmortem"]
summary: "2026-04-01 staging deploy failure. Root cause: DB pool overflow (3×10=30 > max_connections=20). Fix: DB_POOL_SIZE=5 + /health endpoint. Resolved in 70 min."
refs:
  - "know-pg-tuning"
  - "know-k8s"
  - "config-staging"
  - "diary-2026-04-01"
---

# 2026-04-01 Deployment Failure Postmortem

## Incident Summary
Staging deploy caused all 3 pods to enter CrashLoopBackOff. @attr(severity: "P1", mttr: "70min")

## Timeline
- 14:30 Deploy triggered
- 14:31 First pod started
- 14:32 All pods CrashLoopBackOff
- 14:35 Investigation started
- 15:20 Root cause identified
- 15:40 Fix deployed, service restored

## Debug Trace

### 1. Pod Logs
```
$ kubectl logs api-gateway-7b9f4-xk2m9 --previous
Error: connect ETIMEDOUT 10.96.42.15:5432
Error: Failed to acquire connection from pool - timeout
```

### 2. Network Check (passed)
```
$ kubectl exec ... -- nslookup pg-staging.internal → OK
$ kubectl exec ... -- nc -zv 10.96.42.15 5432 → OK
```

### 3. Connection Count
```sql
SELECT count(*) FROM pg_stat_activity; -- 20 (FULL!)
```

## Root Cause
Drizzle ORM default pool_size=10. With 3 pods: 3×10=30 connections.
Staging PG max_connections=20. Pool overflow → connection rejected.

See [[know-pg-tuning]] for the formula: `total = pool_size × replicas`
See [[config-staging]] for staging DB constraints.

## Fix
1. `DB_POOL_SIZE=5` (3×5=15 < 20) ✓
2. Added connection retry with timeout config
3. Added `/health` endpoint for K8s liveness probe — see [[know-k8s]]

## Action Items
- [x] All environments: pool_size via env var
- [x] Add connection pool metrics to Datadog
- [x] Document pool formula in runbook
- [ ] Consider PgBouncer for production. See ((connection pooling proxy solutions)).
