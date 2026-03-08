FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm install && npm run build

WORKDIR /app
COPY services/notification-service/ ./services/notification-service/
WORKDIR /app/services/notification-service
RUN npm install && npx tsc

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/services/notification-service/dist ./dist
COPY --from=builder /app/services/notification-service/node_modules ./node_modules
COPY --from=builder /app/services/notification-service/package.json ./

COPY eStokvel/backend/prisma ./prisma
RUN npx prisma generate

EXPOSE 3006
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
