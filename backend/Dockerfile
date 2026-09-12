# ==========================================
# Paytm Merchant Autopilot - Production Dockerfile
# ==========================================

# 1. Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# 2. Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled dist files from builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000

# Container Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]
