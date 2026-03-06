# eStokvel Production Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌─────────────────────┐     ┌────────────────┐
│  Mobile App  │────▶│   Backend API        │────▶│  PostgreSQL    │
│  (Expo/EAS)  │     │   (Node.js/Express)  │     │  (Managed)     │
└─────────────┘     │                      │────▶│  Redis (Cache) │
                    └──────────┬───────────┘     └────────────────┘
┌─────────────┐               │
│  Admin Web   │───────────────┘
│  (React SPA) │
└─────────────┘
```

---

## Recommended Hosting Stack

| Component           | Recommended             | Alternative      | Monthly Cost (est.) |
| ------------------- | ----------------------- | ---------------- | ------------------- |
| **Backend API**     | Railway / Render        | AWS ECS Fargate  | $5–20               |
| **PostgreSQL**      | Railway Postgres / Neon | Supabase / RDS   | $0–20               |
| **Redis**           | Upstash (serverless)    | Railway Redis    | $0–10               |
| **Admin Dashboard** | Vercel / Netlify        | Cloudflare Pages | $0 (free tier)      |
| **Mobile App**      | EAS Build + App Stores  | —                | $0 (free tier)      |
| **Monitoring**      | Sentry (free tier)      | Better Stack     | $0                  |
| **CI/CD**           | GitHub Actions          | —                | $0 (2000 min/mo)    |
| **Domain + SSL**    | Cloudflare DNS          | Namecheap        | $10/yr              |

**Estimated total: $15–50/month** for initial production load.

---

## Deployment Options

### Option A: Railway (Recommended for MVP — simplest)

Railway handles Docker builds, managed Postgres, Redis, and auto-deploys from GitHub.

1. **Create a Railway project** at [railway.app](https://railway.app)
2. **Add a PostgreSQL service** — Railway provisions it automatically
3. **Add a Redis service** — Upstash plugin or Railway Redis
4. **Deploy Backend:**
   ```bash
   # Connect your GitHub repo
   # Set root directory: eStokvel/backend
   # Railway detects the Dockerfile automatically
   ```
5. **Set environment variables** in Railway dashboard (copy from `.env.production.example`)
6. **Deploy Admin Dashboard:**
   - Use Vercel: connect repo, set root to `eStokvel/frontend/web/admin-dashboard`
   - Set `VITE_API_URL` to your Railway backend URL

### Option B: Docker Compose on a VPS (DigitalOcean / Hetzner)

Best for cost control with a single-server setup.

```bash
# 1. Provision a VPS (2 vCPU, 4GB RAM recommended)
# Ubuntu 22.04 LTS

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Clone repository
git clone https://github.com/your-org/eStokvel.git
cd eStokvel/eStokvel/backend

# 4. Create production .env
cp .env.production.example .env
nano .env  # Fill in all values

# 5. Deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 6. Check health
curl http://localhost:5000/health
```

### Option C: AWS / Azure (Enterprise)

For larger scale with auto-scaling and managed services:

- **Backend:** ECS Fargate or Azure Container Apps
- **Database:** RDS PostgreSQL or Azure Database for PostgreSQL
- **Redis:** ElastiCache or Azure Cache for Redis
- **Admin Dashboard:** S3 + CloudFront or Azure Static Web Apps
- **CI/CD:** GitHub Actions → ECR/ACR → ECS/ACA

---

## Step-by-Step: First Deployment Checklist

### 1. Pre-Deployment

- [ ] Generate strong secrets:

  ```bash
  # JWT Secret (64 chars)
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

  # Postgres password
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

  # Redis password
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] Configure Ozow payment credentials (get from [ozow.com](https://ozow.com))
- [ ] Configure Africa's Talking SMS credentials (get from [africastalking.com](https://africastalking.com))
- [ ] Register domain (e.g., `estokvel.co.za`) and point DNS
- [ ] Set up SSL certificate (automatic with Railway/Vercel, or use Let's Encrypt on VPS)

### 2. Backend Deployment

- [ ] Copy `.env.production.example` → `.env` and fill ALL values
- [ ] Deploy via chosen platform (Railway / Docker / AWS)
- [ ] Verify health endpoint: `GET /health`
- [ ] Run initial database migration (automatic via Dockerfile entrypoint)
- [ ] Seed initial SUPERADMIN: `npx prisma db seed`
- [ ] **IMMEDIATELY** change SUPERADMIN password via API

### 3. Admin Dashboard Deployment

- [ ] Set `VITE_API_URL` to backend URL in build env
- [ ] Build: `npm run build`
- [ ] Deploy to Vercel/Netlify (auto on git push) or via Dockerfile

### 4. Mobile App Deployment

- [ ] Update `EXPO_PUBLIC_API_URL` in app config to production backend URL
- [ ] Build with EAS:

  ```bash
  cd eStokvel/frontend/mobile/eStokvelMobile

  # Android
  eas build --platform android --profile production

  # iOS
  eas build --platform ios --profile production
  ```

- [ ] Submit to Google Play Store / Apple App Store

### 5. Post-Deployment

- [ ] Set up monitoring (Sentry: `npm install @sentry/node` — future enhancement)
- [ ] Set up database backups (managed DB services do this automatically)
- [ ] Set up uptime monitoring (e.g., Better Stack, UptimeRobot free tier)
- [ ] Test all API endpoints via Postman collection (`postman/eStokvel-API.postman_collection.json`)
- [ ] Test payment flow end-to-end with Ozow sandbox
- [ ] Test SMS flow with Africa's Talking sandbox

---

## Database Backups

### Managed DB (Railway / Neon / RDS)

Automatic daily backups with point-in-time recovery.

### Self-Hosted (Docker)

```bash
# Manual backup
docker exec estokvel-postgres pg_dump -U estokvel_user estokvel_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated daily backup (add to crontab)
0 2 * * * docker exec estokvel-postgres pg_dump -U estokvel_user estokvel_prod | gzip > /backups/estokvel_$(date +\%Y\%m\%d).sql.gz

# Restore
gunzip -c backup_20260120.sql.gz | docker exec -i estokvel-postgres psql -U estokvel_user estokvel_prod
```

---

## Monitoring & Logging

### Log Access

```bash
# Docker logs
docker logs estokvel-backend --tail 100 -f

# Production logs are JSON to stdout (captured by Docker/Railway/ECS automatically)
# Use Better Stack, Datadog, or AWS CloudWatch for log aggregation
```

### Health Check

```bash
# Backend
curl https://api.estokvel.co.za/health

# Admin Dashboard
curl https://admin.estokvel.co.za/nginx-health
```

---

## Scaling Guide

| Users | Backend      | Database      | Redis        |
| ----- | ------------ | ------------- | ------------ |
| < 500 | 1 instance   | 1 vCPU / 1 GB | Upstash free |
| < 5K  | 2 instances  | 2 vCPU / 4 GB | 256 MB       |
| < 50K | 4+ instances | 4 vCPU / 8 GB | 1 GB         |

The backend supports Node.js clustering (set `WEB_CONCURRENCY=4`) and horizontal scaling behind a load balancer.

---

## Security Checklist

- [x] HTTPS enforced via HSTS headers
- [x] Helmet security headers (CSP, X-Frame-Options, etc.)
- [x] Rate limiting with Redis backing (auth: 5/hr, general: 100/15min)
- [x] JWT authentication with bcrypt password/PIN hashing
- [x] CORS restricted to allowed origins
- [x] SQL injection prevented via Prisma ORM (parameterized queries)
- [x] Request body size limits (10KB)
- [x] Non-root Docker user
- [x] Environment-based secret management (no hardcoded production secrets)
- [x] Graceful shutdown with connection draining
- [x] Crash handlers (unhandledRejection, uncaughtException)
- [ ] Set up WAF (Web Application Firewall) — recommended for financial apps
- [ ] Penetration testing before public launch
