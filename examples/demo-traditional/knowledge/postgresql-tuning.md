# PostgreSQL 性能调优笔记

## 连接池管理
PostgreSQL 的 max_connections 默认 100。每个连接消耗约 5-10MB 内存。

关键公式：
**总连接数 = pool_size × 应用副本数**

如果总连接数超过 max_connections，新连接会被拒绝，应用会报 "too many connections" 错误。

推荐：使用 PgBouncer 做连接池代理，将实际连接数控制在合理范围。

## 查询优化
- N+1 问题：使用 JOIN 或批量查询替代循环单条查询
- 索引：为 WHERE、ORDER BY、JOIN 的列创建索引
- EXPLAIN ANALYZE：查看实际执行计划，关注 Seq Scan vs Index Scan
- 部分索引：`CREATE INDEX idx ON orders (status) WHERE status = 'pending'`

## 全文搜索
使用 tsvector 和 tsquery 实现全文搜索：
```sql
ALTER TABLE products ADD COLUMN search_vector tsvector;
CREATE INDEX idx_search ON products USING gin(search_vector);
```

## 备份策略
- pg_dump 做逻辑备份，每日一次
- WAL archiving 做增量备份
- 定期测试恢复流程
