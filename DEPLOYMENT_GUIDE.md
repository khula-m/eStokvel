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

| Component           | Recommended            | Alternative     | Monthly Cost (est.) |
| ------------------- | ---------------------- | --------------- | ------------------- |
| **Backend API**     | Railway                | Render / Fly.io | $5–20               |
| **PostgreSQL**      | Railway Postgres       | Neon / Supabase | $0–20               |
| **Redis**           | Upstash (serverless)   | Railway Redis   | $0–10               |
| **Admin Dashboard** | Vercel                 | Netlify         | $0 (free tier)      |
| **Mobile App**      | EAS Build + App Stores | —               | $0 (free tier)      |
| **CI/CD**           | GitHub Actions         | —               | $0 (2000 min/mo)    |
| **Domain + SSL**    | Cloudflare DNS         | Namecheap       | R180/yr (~$10)      |

**Estimated total: R250–R900/month ($15–50 USD)** for initial production load.

---

## Payment Integration Note

Ozow payment integration is fully coded but you don't need live Ozow credentials to deploy. Manual bank payment proof uploads work independently. When ready:

1. Register at [ozow.com](https://ozow.com) for production credentials
2. Set `OZOW_SITE_CODE`, `OZOW_PRIVATE_KEY`, `OZOW_API_KEY` in your env
3. Set `OZOW_IS_TEST=false` for live payments
4. Set `APP_BASE_URL` to your production domain for callback URLs

---

## OPTION A: Railway Deployment (Recommended — Step by Step)

Railway is the simplest path to production. It handles Docker builds, managed databases, auto-deploys from GitHub, and gives you a free SSL domain.

### Prerequisites

- GitHub account with your eStokvel repo pushed
- A credit card (Railway requires one even on the free trial — $5 credit/month)

### Step 1: Create a Railway Account & Project

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **"New Project"** → **"Empty Project"**
3. Name it `estokvel-production`

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway provisions it instantly. Click on the PostgreSQL service
3. Go to **"Variables"** tab — note down:
   - `DATABASE_URL` — Railway auto-generates this (e.g., `postgresql://postgres:xxxx@roundhouse.proxy.rlwy.net:12345/railway`)
4. Go to **"Settings"** → **"Networking"** → Enable **"Public Networking"** only if you need external DB access (not recommended for production)

### Step 3: Add Redis

**Option A — Railway Redis (simplest):**

1. Click **"+ New"** → **"Database"** → **"Redis"**
2. Note the `REDIS_URL` from the Variables tab

**Option B — Upstash (recommended — serverless, cheaper):**

1. Click **"+ New"** → **"Template"** → Search "Upstash Redis"
2. Or go to [upstash.com](https://upstash.com), create a Redis database (free tier: 10K commands/day)
3. Copy the Redis URL into your backend environment variables

### Step 4: Deploy the Backend API

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your `eStokvel` repository
3. Railway will ask for configuration:
   - **Root Directory:** `eStokvel/backend`
   - Railway auto-detects the Dockerfile and builds from it
4. Go to the backend service **"Variables"** tab and add ALL of these:

```env
# ─── Core ───
NODE_ENV=production
PORT=5000

# ─── Database (copy from Railway PostgreSQL service) ───
DATABASE_URL=<paste from Step 2>

# ─── Redis (copy from Step 3) ───
REDIS_URL=<paste from Step 3>

# ─── Authentication (GENERATE THESE — DO NOT COPY AS-IS) ───
# Run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<paste generated 128-char hex string>
JWT_EXPIRES_IN=24h

# ─── CORS — your admin dashboard URL ───
ALLOWED_ORIGINS=https://estokvel-admin.vercel.app

# ─── Payments (leave empty until Ozow account is ready) ───
OZOW_SITE_CODE=
OZOW_PRIVATE_KEY=
OZOW_API_KEY=
OZOW_IS_TEST=true
APP_BASE_URL=https://<your-railway-backend-url>.up.railway.app

# ─── SMS (leave empty until Africa's Talking account is ready) ───
AT_API_KEY=
AT_USERNAME=sandbox
SMS_SENDER_ID=eStokvel
SMS_ENABLED=false
```

5. Go to **"Settings"** tab:
   - **Custom Start Command:** leave blank (Dockerfile CMD handles it)
   - **Healthcheck Path:** `/health`
   - **Restart Policy:** `on-failure`

6. Go to **"Settings"** → **"Networking"** → **"Generate Domain"**
   - This gives you a public URL like `estokvel-backend-production.up.railway.app`
   - Railway provides **free SSL** automatically

7. **Trigger Deploy:** Railway auto-deploys on every push to your connected branch. You can also click **"Deploy"** manually.

### Step 5: Run Database Migration & Seed

The Dockerfile entrypoint runs `prisma migrate deploy` automatically on startup. To seed the initial SUPERADMIN:

1. In Railway, go to your backend service
2. Click the **"Command"** button (terminal icon) in the top-right
3. Run:
   ```bash
   npx prisma db seed
   ```
4. **IMPORTANT:** Immediately change the SUPERADMIN password via the API:

   ```bash
   # Login to get a token
   curl -X POST https://<your-url>.up.railway.app/api/auth/login/email \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@estokvel.co.za", "password": "Admin@2026!"}'

   # Change password using the returned token
   curl -X PUT https://<your-url>.up.railway.app/api/auth/change-password \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"currentPassword": "Admin@2026!", "newPassword": "YourNewStrongPassword123!"}'
   ```

### Step 6: Verify Backend is Running

```bash
curl https://<your-url>.up.railway.app/health
```

Expected response:

```json
{
  "success": true,
  "status": "healthy",
  "redis": "connected",
  "uptime": 42.5,
  "memory": { "rss": "85MB", "heapUsed": "45MB" }
}
```

### Step 7: Deploy Admin Dashboard to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import your `eStokvel` GitHub repository
4. Configure:
   - **Root Directory:** `eStokvel/frontend/web/admin-dashboard`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
5. Add **Environment Variable:**
   - `VITE_API_URL` = `https://<your-railway-backend-url>.up.railway.app`
6. Click **"Deploy"**
7. Vercel gives you a URL like `estokvel-admin.vercel.app` with free SSL

8. **IMPORTANT:** Go back to Railway and update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://estokvel-admin.vercel.app
   ```

### Step 8: Deploy Mobile App with EAS

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Update the API URL in [frontend/mobile/eStokvelMobile/src/constants/config.ts](eStokvel/frontend/mobile/eStokvelMobile/src/constants/config.ts):

   ```typescript
   export const API_URL =
     process.env.EXPO_PUBLIC_API_URL ||
     "https://<your-railway-url>.up.railway.app";
   ```

3. Build for Android:

   ```bash
   cd eStokvel/frontend/mobile/eStokvelMobile
   eas build --platform android --profile production
   ```

   - EAS builds the APK/AAB in the cloud (takes ~10–15 minutes)
   - Download the `.aab` file from [expo.dev](https://expo.dev) dashboard

4. Build for iOS (requires Apple Developer account — $99/year):

   ```bash
   eas build --platform ios --profile production
   ```

   - Fill in Apple credentials when prompted
   - EAS handles code signing automatically

5. Submit to app stores:

   ```bash
   # Google Play Store (need Google Play Console account — $25 one-time)
   eas submit --platform android

   # Apple App Store (need Apple Developer Program — $99/year)
   eas submit --platform ios
   ```

### Step 9: Custom Domain (Optional but Recommended)

1. Register a domain: `estokvel.co.za` (via [afrihost.com](https://afrihost.com) ~R80/year or Namecheap)
2. Use Cloudflare for DNS (free):
   - Add your domain to Cloudflare
   - Point nameservers to Cloudflare's

3. **For Railway backend:**
   - Go to Railway → Backend service → Settings → Networking → Custom Domain
   - Add `api.estokvel.co.za`
   - In Cloudflare, add a CNAME record: `api` → `<your-service>.up.railway.app`

4. **For Vercel admin dashboard:**
   - Go to Vercel → Project → Settings → Domains
   - Add `admin.estokvel.co.za`
   - In Cloudflare, add a CNAME record: `admin` → `cname.vercel-dns.com`

5. Update environment variables to use new domains:
   - Railway: `APP_BASE_URL=https://api.estokvel.co.za`
   - Railway: `ALLOWED_ORIGINS=https://admin.estokvel.co.za`
   - Vercel: `VITE_API_URL=https://api.estokvel.co.za`
   - Mobile: `EXPO_PUBLIC_API_URL=https://api.estokvel.co.za`

---

## OPTION B: Docker Compose on a VPS

Best for full control and lowest monthly cost (~$5–12/month for a VPS).

### Step 1: Provision a VPS

Recommended providers for South Africa:

- **Hetzner:** CPX11 (2 vCPU, 2GB RAM) — €4.15/month (~R80)
- **DigitalOcean:** Basic Droplet (1 vCPU, 2GB RAM) — $12/month
- **Afrihost Cloud:** Local SA hosting

Choose **Ubuntu 22.04 LTS** as the OS.

### Step 2: Initial Server Setup

```bash
# SSH into your server
ssh root@<your-server-ip>

# Update system
apt update && apt upgrade -y

# Create non-root user
adduser estokvel
usermod -aG sudo estokvel
su - estokvel

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose (included with Docker now)
docker compose version  # Should show v2.x

# Install git
sudo apt install git -y
```

### Step 3: Clone & Configure

```bash
# Clone your repo
git clone https://github.com/khula-m/eStokvel.git
cd eStokvel/eStokvel/backend

# Create production .env
cp .env.production.example .env
nano .env
```

Fill in ALL values. Generate secrets:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Database password
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Redis password
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Deploy

```bash
# Start all services (backend + postgres + redis)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Check status
docker compose ps

# Check logs
docker compose logs backend -f --tail 50

# Verify health
curl http://localhost:5000/health
```

### Step 5: Set Up SSL with Caddy (Reverse Proxy)

Caddy is the simplest way to get automatic HTTPS:

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy -y

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

Add to Caddyfile:

```
api.estokvel.co.za {
    reverse_proxy localhost:5000
}

admin.estokvel.co.za {
    root * /var/www/admin-dashboard
    try_files {path} /index.html
    file_server
}
```

```bash
# Start Caddy (auto-obtains Let's Encrypt SSL certificates)
sudo systemctl enable caddy
sudo systemctl restart caddy
```

### Step 6: Deploy Admin Dashboard (on same VPS)

```bash
# Build admin dashboard
cd ~/eStokvel/eStokvel/frontend/web/admin-dashboard
npm install
VITE_API_URL=https://api.estokvel.co.za npm run build

# Copy to Caddy serving directory
sudo mkdir -p /var/www/admin-dashboard
sudo cp -r dist/* /var/www/admin-dashboard/
```

### Step 7: Set Up Auto-Restart & Updates

```bash
# Docker auto-restart is already configured (restart: unless-stopped)
# To update after a git push:
cd ~/eStokvel/eStokvel/backend
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## OPTION C: Render (Alternative PaaS)

Similar to Railway but with a more generous free tier.

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect GitHub → Select repo
3. Settings:
   - **Root Directory:** `eStokvel/backend`
   - **Runtime:** Docker
   - **Instance Type:** Starter ($7/month)
4. Add env vars (same as Railway Step 4)
5. Add PostgreSQL: New → PostgreSQL (free tier: 256MB, 90 days)
6. Add Redis: New → Redis (free tier: 25MB)
7. Deploy

---

## Step-by-Step: First Deployment Checklist

### Pre-Deployment

- [ ] Push all code to GitHub (ensure `main` branch is up to date)
- [ ] Generate strong secrets (JWT, DB password, Redis password — see commands in Railway Step 4)
- [ ] Choose hosting option (Railway recommended for starting out)
- [ ] Register domain name (optional but recommended)

### Backend

- [ ] Deploy to Railway / VPS / Render
- [ ] Set ALL environment variables
- [ ] Verify health endpoint returns `"status": "healthy"`
- [ ] Run `npx prisma db seed` for initial SUPERADMIN
- [ ] Change SUPERADMIN password immediately
- [ ] Test a few API endpoints with Postman

### Admin Dashboard

- [ ] Deploy to Vercel
- [ ] Set `VITE_API_URL` to backend URL
- [ ] Login with SUPERADMIN credentials
- [ ] Verify you can see groups & users

### Mobile App

- [ ] Update `API_URL` to production backend
- [ ] Build with `eas build --platform android --profile production`
- [ ] Test the APK on a real Android device before submitting to Play Store
- [ ] Submit to Google Play Console ($25 one-time fee)
- [ ] (Optional) Build & submit iOS ($99/year Apple Developer Program)

### Post-Launch

- [ ] Set up UptimeRobot (free) to monitor `https://api.estokvel.co.za/health`
- [ ] Set up database backups (automatic on Railway/managed DB)
- [ ] Test payment flow with Ozow sandbox (when ready)
- [ ] Test SMS with Africa's Talking sandbox (when ready)
- [ ] Monitor Railway usage dashboard for cost

---

## Database Backups

### Railway (Automatic)

Railway PostgreSQL includes automatic daily backups. Go to your PostgreSQL service → **Backups** tab to view/restore.

### Manual Backup (any platform)

```bash
# Export database
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260306.sql.gz | psql $DATABASE_URL
```

### Self-Hosted Docker Backup

```bash
# Manual
docker exec estokvel-postgres pg_dump -U estokvel_user estokvel_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated daily (add to crontab: crontab -e)
0 2 * * * docker exec estokvel-postgres pg_dump -U estokvel_user estokvel_prod | gzip > /backups/estokvel_$(date +\%Y\%m\%d).sql.gz
```

---

## Monitoring & Logging

### Health Check Endpoints

```bash
# Backend
curl https://api.estokvel.co.za/health

# Admin Dashboard (if using nginx Docker)
curl https://admin.estokvel.co.za/nginx-health
```

### Log Access

```bash
# Railway: click on the service → "Logs" tab (real-time streaming)

# Docker:
docker compose logs backend -f --tail 100

# Production logs are JSON format, captured by Railway/Docker automatically
```

### Uptime Monitoring (Free)

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free: 50 monitors)
2. Add HTTP monitor: `https://api.estokvel.co.za/health`
3. Set check interval: 5 minutes
4. Add alert contact (email/SMS)

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

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend --tail 50
# Or on Railway: click service → Logs tab

# Common causes:
# 1. DATABASE_URL is wrong → check PostgreSQL credentials
# 2. JWT_SECRET is empty → generate one with the crypto command above
# 3. Port conflict → make sure PORT=5000 is set
```

### Database migration fails

```bash
# Run migration manually
npx prisma migrate deploy

# If schema is out of sync, reset (DESTROYS DATA):
npx prisma migrate reset
npx prisma db seed
```

### CORS errors in admin dashboard

- Check `ALLOWED_ORIGINS` includes your Vercel URL (with `https://`)
- Check `VITE_API_URL` doesn't have a trailing slash
- Redeploy both backend and dashboard after changing URLs

### Mobile app can't connect to backend

- Ensure the API URL is `https://` (not `http://`)
- Android emulator uses `10.0.2.2` for localhost, not `127.0.0.1`
- Check backend health endpoint is accessible from a browser first

### Redis connection errors

- Non-fatal: the app works without Redis (falls back to in-memory)
- If using Upstash: ensure your Redis URL includes the password
- Check `REDIS_URL` format: `redis://:password@host:port`

---

## Cost Summary (Recommended Setup)

| Service         | Provider        | Tier                | Monthly Cost     |
| --------------- | --------------- | ------------------- | ---------------- |
| Backend API     | Railway         | Hobby ($5 credit)   | ~$5              |
| PostgreSQL      | Railway         | 1 GB included       | $0 (included)    |
| Redis           | Upstash         | Free (10K cmds/day) | $0               |
| Admin Dashboard | Vercel          | Hobby (free)        | $0               |
| Mobile Builds   | EAS             | Free (30 builds/mo) | $0               |
| CI/CD           | GitHub Actions  | Free (2000 min/mo)  | $0               |
| Domain          | Afrihost/.co.za | 1 year              | R80/yr           |
| **Total**       |                 |                     | **~$5–10/month** |

Scale up as your user base grows. Railway and Vercel scale transparently — you only pay for what you use.
