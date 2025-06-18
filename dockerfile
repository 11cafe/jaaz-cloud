# 使用 Node.js 18 Alpine 版本作为基础镜像
FROM node:18-alpine AS runner
WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
# 创建系统用户组和用户，用于安全运行应用
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制预构建的应用程序文件（需要先在本地运行 npm run build）
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

# 复制数据库迁移相关文件（仅用于 drizzle-kit）
COPY --chown=nextjs:nodejs drizzle ./drizzle
COPY drizzle.config.ts ./drizzle.config.ts
COPY src/schema.ts ./src/schema.ts

# 切换到非特权用户运行应用
USER nextjs

# 设置默认环境变量
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 暴露端口
EXPOSE $PORT

# 启动命令：直接启动应用
CMD ["node", "server.js"]
