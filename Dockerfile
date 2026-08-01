# Stage 1: Install production dependencies only using Bun
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY package.json ./
RUN bun install --production

# Stage 2: Ultra-lightweight Bun Production Runtime (~85 MB)
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy cached production dependencies and source code
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 4000

CMD ["bun", "run", "index.ts"]
