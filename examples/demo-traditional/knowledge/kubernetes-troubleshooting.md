# Kubernetes 故障排查指南

## Pod CrashLoopBackOff
当 pod 反复崩溃重启时：

1. **查看日志**: `kubectl logs <pod> --previous` 查看崩溃前的日志
2. **检查事件**: `kubectl describe pod <pod>` 看 Events 部分
3. **常见原因**:
   - 应用启动失败（配置错误、依赖不可用）
   - OOMKilled（内存不足，需要调整 resources.limits）
   - Liveness probe 失败（健康检查端点未实现或超时）
   - 数据库连接失败（网络策略、连接数限制）

## Liveness vs Readiness Probe
- **Liveness**: 检测容器是否存活。失败 → 重启容器
- **Readiness**: 检测容器是否就绪。失败 → 从 Service 摘除，不再接收流量

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Service 网络调试
- `kubectl exec <pod> -- nslookup <service>` 检查 DNS
- `kubectl exec <pod> -- curl <service>:<port>/health` 检查连通性
- 检查 NetworkPolicy 是否阻断了流量

## 资源管理
- 始终设置 requests 和 limits
- CPU: requests 用于调度，limits 用于限流
- Memory: 超过 limits 会被 OOMKill
