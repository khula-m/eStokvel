# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY server.ts ./
COPY src ./src
RUN npx tsc --outDir dist

# ── Stage 2: Production ──
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -S estokvel && adduser -S estokvel -G estokvel

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema + generate client for production
COPY prisma ./prisma
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R estokvel:estokvel /app

USER estokvel

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:5000/health || exit 1

# Run compiled JS (not ts-node)
CMD ["node", "dist/server.js"]
