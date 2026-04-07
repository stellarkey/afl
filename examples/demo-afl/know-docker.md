---
id: "know-docker"
type: knowledge
tags: ["docker", "containers", "deployment"]
summary: "Docker best practices: multi-stage build, alpine images, health checks, security hardening."
---

# Docker Best Practices

## Multi-Stage Build
Use multi-stage builds to reduce final image size. Builder stage installs deps and compiles, production stage only copies build artifacts.

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

## Image Optimization
- Use alpine base images (~50MB vs ~300MB)
- Merge RUN instructions to reduce layers
- Use .dockerignore to exclude unnecessary files
- Pin dependency versions for reproducible builds

## Health Checks
Always define HEALTHCHECK in Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```
See also: ((kubernetes liveness probe configuration))

## Security
- Don't run as root
- Don't include secrets in images
- Regularly update base images for CVE patches
