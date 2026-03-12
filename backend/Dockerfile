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
ARG CACHEBUST=1
COPY tsconfig.json ./
COPY server.ts ./
COPY src ./src
RUN npx tsc --outDir dist

# ── Stage 2: Production ──
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S estokvel && adduser -S estokvel -G estokvel

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema + migrations + generate client for production
COPY prisma ./prisma
RUN npx prisma generate

# Copy compiled output from builder + boot wrapper
COPY --from=builder /app/dist ./dist
COPY boot.js ./dist/boot.js

# Create entrypoint script that runs migrations then starts the app
RUN printf '#!/bin/sh\nset -e\necho "[ENTRYPOINT] Running migrations..."\nnpx prisma migrate deploy\necho "[ENTRYPOINT] Starting server..."\nexec node dist/boot.js\n' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

# Set ownership
RUN chown -R estokvel:estokvel /app

USER estokvel

# Expose API port (Railway overrides with $PORT)
EXPOSE 5000

# Health check (Railway also runs its own healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:${PORT:-5000}/health || exit 1

# Run entrypoint: migrate then start
CMD ["/app/entrypoint.sh"]
