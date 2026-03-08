FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared lib
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install && npm run build

# Copy group-service
WORKDIR /app
COPY services/group-service/ ./services/group-service/
WORKDIR /app/services/group-service
RUN npm install && npx tsc

# ── Production ──
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/services/group-service/dist ./dist
COPY --from=builder /app/services/group-service/node_modules ./node_modules
COPY --from=builder /app/services/group-service/package.json ./

# Prisma
COPY eStokvel/backend/prisma ./prisma
RUN npx prisma generate

EXPOSE 3002
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
