---
id: "node-skill-docker-debug"
type: skill
created_at: 2026-04-07T10:00:00+08:00
last_accessed: 2026-04-07T14:30:00+08:00
access_frequency: 42
refs:
  - "node-knowledge-docker-internals"
  - "node-skill-log-analysis"
back_refs:
  - "node-config-devops-pipeline"
tags: ["docker", "debugging", "containers"]
summary: "Docker container debugging workflow including log inspection, exec, and network diagnosis."
---

# Docker Container Debugging

When a container fails to start or behaves unexpectedly, follow this workflow:

## 1. Quick Diagnosis
Check container status and recent logs:
```bash
docker ps -a --filter "status=exited"
docker logs --tail 50 <container_id>
```

## 2. Deep Inspection
For runtime issues, exec into the container:
```bash
docker exec -it <container_id> /bin/sh
```
@attr(requires: "container must be running")

## 3. Network Issues
See [[node-skill-docker-network-debug]] for DNS resolution and port mapping problems.

## 4. Related Patterns
For similar debugging techniques in other contexts:
((container orchestration error patterns))
