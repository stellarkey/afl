# Docker Best Practices

## 多阶段构建
使用多阶段构建减小最终镜像体积。Builder 阶段安装所有依赖和编译，production 阶段只复制编译产物。

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

## 镜像优化
- 使用 alpine 基础镜像（~50MB vs ~300MB）
- 合并 RUN 指令减少层数
- 使用 .dockerignore 排除不需要的文件
- 固定依赖版本，避免构建不可复现

## 健康检查
始终在 Dockerfile 中定义 HEALTHCHECK：
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
```

## 安全
- 不使用 root 用户运行
- 不在镜像中包含 secrets
- 定期更新基础镜像修复 CVE
