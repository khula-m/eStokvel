FROM node:20-alpine AS builder
WORKDIR /app

# Copy shared library
COPY shared/ ./shared/
RUN cd shared && npm ci && npm run build

# Copy service
COPY services/user-service/ ./services/user-service/
RUN cd services/user-service && npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json
COPY --from=builder /app/services/user-service/dist ./dist
COPY --from=builder /app/services/user-service/package.json ./package.json
COPY --from=builder /app/services/user-service/prisma ./prisma

RUN npm ci --only=production && npx prisma generate

EXPOSE 3001
CMD ["node", "dist/index.js"]
