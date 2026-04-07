---
id: "know-pg-tuning"
type: knowledge
tags: ["postgresql", "database", "performance", "connection-pool"]
summary: "PostgreSQL tuning: connection pool formula (total = pool_size × replicas), N+1 fix, full-text search, backup."
---

# PostgreSQL Performance Tuning

## Connection Pool Management
PostgreSQL max_connections defaults to 100. Each connection consumes ~5-10MB memory.

**Critical formula:**
**total_connections = pool_size × app_replicas** @attr(importance: "critical", learned_from: "diary-2026-04-01")

If total exceeds max_connections, new connections are rejected ("too many connections" error).

Recommendation: use PgBouncer for connection pool proxy to keep actual connections in check.

See [[debug-deploy-failure]] for a real-world incident caused by ignoring this formula.

## Query Optimization
- N+1 problem: use JOIN or batch queries instead of per-row loops. See [[diary-2026-03-30]] for a 17.7x improvement.
- Indexes: create for WHERE, ORDER BY, JOIN columns
- EXPLAIN ANALYZE: check actual plan, watch for Seq Scan vs Index Scan
- Partial indexes: `CREATE INDEX idx ON orders (status) WHERE status = 'pending'`

## Full-Text Search
Use tsvector and tsquery:
```sql
ALTER TABLE products ADD COLUMN search_vector tsvector;
CREATE INDEX idx_search ON products USING gin(search_vector);
```

## Backup Strategy
- pg_dump for logical backups, daily
- WAL archiving for incremental backups
- Regularly test restore procedures
