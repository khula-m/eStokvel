# Railway Environment Variables Setup

All secrets live in Railway — **never in `.env` files committed to git**.

## How to set variables in Railway

1. Go to [railway.app](https://railway.app) → your project → **Backend** service
2. Click **Variables** tab → **+ New Variable**
3. Add each variable from the table below

---

## Required Variables

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Must be exactly this string |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Use Railway's reference syntax to auto-inject |
| `JWT_SECRET` | _(64-byte hex — see below)_ | **Never reuse across environments** |
| `JWT_EXPIRES_IN` | `24h` | Superadmin tokens are capped at 2h in code |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Auth rate limiting requires Redis — mandatory |
| `ALLOWED_ORIGINS` | `https://admin-dashboard-service-production-524e.up.railway.app` | Comma-separate multiple origins |
| `APP_BASE_URL` | `https://estokvel-production.up.railway.app` | Used for Ozow callback URLs |
| `OZOW_SITE_CODE` | _(from Ozow portal)_ | |
| `OZOW_PRIVATE_KEY` | _(from Ozow portal)_ | |
| `OZOW_API_KEY` | _(from Ozow portal)_ | |
| `OZOW_IS_TEST` | `false` | Set `true` only for staging |
| `AT_API_KEY` | _(from Africa's Talking)_ | |
| `AT_USERNAME` | _(your AT username)_ | Not "sandbox" in production |
| `AT_SENDER_ID` | `eStokvel` | |
| `SMS_ENABLED` | `true` | |
| `LOG_LEVEL` | `info` | |
| `DEFAULT_CURRENCY` | `ZAR` | |

---

## Generate a secure JWT_SECRET

Run this once locally — paste the output into Railway:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Railway reference syntax

Railway lets services reference each other's variables without copy-pasting:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
REDIS_URL    = ${{Redis.REDIS_URL}}
```

Set these in the Backend service Variables tab exactly as shown.

---

## TOTP 2FA for Superadmin

After deploying, set up 2FA on the superadmin account:

```bash
# 1. Get a token (login first)
curl -X POST https://estokvel-production.up.railway.app/api/auth/superadmin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estokvel.com","password":"..."}'

# 2. Set up TOTP (returns QR code as data URL)
curl -X POST https://estokvel-production.up.railway.app/api/auth/superadmin/totp/setup \
  -H "Authorization: Bearer <token>"

# 3. Scan the QR code with Google Authenticator / Authy

# 4. Verify with the first 6-digit code to enable 2FA
curl -X POST https://estokvel-production.up.railway.app/api/auth/superadmin/totp/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'
```

Once enabled, every superadmin login requires `email + password + totpToken`.

---

## Local development

```bash
cp .env.example .env
# Edit .env with your local values — this file is gitignored
```

The `.env` file is for **local dev only** and is excluded from git via `.gitignore`.
