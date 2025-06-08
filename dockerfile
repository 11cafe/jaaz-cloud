FROM node:18-alpine AS base

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache git libc6-compat

FROM base AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json ./

RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Clone the comfyui-fork repository and checkout the dev branch
RUN git clone --branch dev https://github.com/11cafe/comfyui-online-serverless.git comfyui-fork

COPY . .

# build comfyui-fork workspace-manager ui first
WORKDIR /app/comfyui-fork/web/extensions/workspace-manager
RUN npm install
RUN npm run build

WORKDIR /app

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the built app and other necessary files from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules/
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/schema.ts ./src/schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts/

USER nextjs

# Set default environment variables
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE $PORT

CMD ["sh", "-c", "node ./scripts/setupPgTriggers.js && echo 'Running drizzle migrations...' && npx drizzle-kit migrate && echo 'Starting Next.js application...' && node server.js"]
