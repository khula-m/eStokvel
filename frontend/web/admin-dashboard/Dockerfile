# ── Stage 1: Build the SPA ──
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Cache bust to force rebuild when source changes
ARG CACHEBUST=1

COPY . .

# Accept API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Stage 2: Serve with nginx ──
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config as template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy built SPA from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html

# Railway injects PORT env var; default to 80
ENV PORT=80

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/nginx-health || exit 1

# Only substitute $PORT — preserve nginx variables like $uri, $host
CMD sh -c "envsubst '\$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
