---
id: "know-k8s"
type: knowledge
tags: ["kubernetes", "troubleshooting", "deployment", "health-check"]
summary: "K8s troubleshooting guide: CrashLoopBackOff diagnosis, liveness vs readiness probes, service networking, resource limits."
---

# Kubernetes Troubleshooting Guide

## Pod CrashLoopBackOff
When pods are crash-looping:

1. **Check logs**: `kubectl logs <pod> --previous` for crash-time logs
2. **Check events**: `kubectl describe pod <pod>` Events section
3. **Common causes**:
   - App startup failure (config error, dependency unavailable)
   - OOMKilled (memory exceeded, adjust resources.limits)
   - Liveness probe failure (health endpoint missing or timeout)
   - Database connection failure (network policy, connection limit)

See [[debug-deploy-failure]] for a real example of CrashLoopBackOff caused by DB connection overflow.

## Liveness vs Readiness Probe
- **Liveness**: is container alive? Failure → restart
- **Readiness**: is container ready? Failure → remove from Service, stop traffic

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

## Service Network Debugging
- `kubectl exec <pod> -- nslookup <service>` check DNS
- `kubectl exec <pod> -- curl <service>:<port>/health` check connectivity
- Check NetworkPolicy for blocked traffic

## Resource Management
- Always set requests and limits
- CPU: requests for scheduling, limits for throttling
- Memory: exceeding limits → OOMKill
