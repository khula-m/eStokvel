# eStokvel - Digital Stokvel Management Platform

A modern digital platform for managing South African stokvels (savings clubs), featuring a 3-tier role hierarchy, PIN-based mobile authentication, and comprehensive group financial management.

## Project Structure

```
eStokvel/
├── backend/                    # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── controllers/        # Route handlers (auth, groups, transactions, chat, etc.)
│   │   ├── services/           # Business logic layer
│   │   ├── middleware/         # Auth, RBAC, rate limiting, security, validation
│   │   ├── models/             # Type definitions
│   │   ├── routes/             # API route definitions
│   │   ├── types/              # Custom TypeScript declarations
│   │   └── utils/              # JWT, Prisma client, logger, validation
│   ├── prisma/                 # Database schema, migrations & seed data
│   ├── server.ts               # Entry point
│   └── package.json
│
├── frontend/
│   └── mobile/
│       └── eStokvelMobile/     # React Native + Expo mobile app
│           ├── src/
│           │   ├── components/ # Reusable UI (BottomTabBar, Icon, StatsCard, etc.)
│           │   ├── screens/    # Login, Dashboard, Chat, Ledger, Profile, ChangePin
│           │   ├── constants/  # API config, theme colors
│           │   ├── navigation/ # Tab navigation
│           │   ├── styles/     # Shared stylesheet
│           │   ├── types/      # TypeScript types
│           │   └── utils/      # Alerts, formatters
│           ├── App.tsx         # Main app component
│           └── package.json
│
├── ussd-service/               # USSD interface (scaffolded)
│   └── src/
│       ├── index.ts
│       ├── menus/              # USSD menu flows
│       └── services/           # USSD business logic
│
├── .gitignore
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)
- Expo Go app on your phone (for mobile testing)

### 1. Start Database

```bash
cd backend
docker-compose up -d
```

### 2. Start Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed        # Seeds SUPERADMIN, ADMIN, members, groups, transactions
npm run dev                # or: npx ts-node --transpile-only server.ts
```

Backend runs at: http://localhost:5000

### 3. Start Mobile App

```bash
cd frontend/mobile/eStokvelMobile
npm install --legacy-peer-deps
npx expo start
```

## Role Hierarchy & Authentication

### 3-Tier Role System

| Role           | Auth Method              | Access Level                                    | Created By  |
| -------------- | ------------------------ | ----------------------------------------------- | ----------- |
| **SUPERADMIN** | Email + complex password | Full system control, manage ADMINs              | System seed |
| **ADMIN**      | Phone + 5-digit PIN      | Manage groups, add members, record transactions | SUPERADMIN  |
| **MEMBER**     | Phone + 5-digit PIN      | View own groups, make contributions, chat       | ADMIN       |

### Security Features

- **5-digit PIN authentication** - bcrypt-hashed, validated for complexity (no sequential/repeated digits)
- **Account lockout** - 5 failed attempts triggers 30-minute lockout
- **JWT tokens** - SUPERADMIN: 2-hour expiry, ADMIN/MEMBER: 7-day expiry
- **Must-change-PIN** - New ADMIN/MEMBER accounts require PIN change on first login
- **SUPERADMIN isolation** - Cannot use mobile PIN login; must use web portal (email+password)
- **Rate limiting** - Auth: 5 requests/hour, API: 100 requests/15min per IP
- **Helmet security headers** - CSP, HSTS, XSS protection, clickjacking prevention
- **CORS** - Configurable whitelist via `ALLOWED_ORIGINS` env var
- **Body parser limits** - 10KB max payload to prevent DoS
- **User data isolation** - Users only see groups/transactions they belong to
- **Group security middleware** - Verifies group membership and admin role per-request

## Test Credentials

After running `npx prisma db seed`:

| Role            | Login                              | Credentials                               |
| --------------- | ---------------------------------- | ----------------------------------------- |
| **SUPERADMIN**  | Email: `admin@estokvel.co.za`      | Password: `Admin@2026!`                   |
| **ADMIN**       | Phone: `0831234567`                | PIN: `56789` (must change on first login) |
| **MEMBER** (x5) | Phone: `0831234568` - `0831234572` | PIN: `94716` (must change on first login) |

**Login endpoints:**

- SUPERADMIN: `POST /api/auth/superadmin/login` with `{ "email", "password" }`
- ADMIN/MEMBER: `POST /api/auth/login` with `{ "phoneNumber", "pin" }`

## Features

- **PIN-based login** - 5-digit PIN for mobile users (ADMIN & MEMBER)
- **Dashboard** - Group overview, contribution stats, recent activity
- **Group management** - Create groups, join by code, view members & stats
- **Transaction ledger** - Contributions, payouts, expenses with full history
- **Chat** - In-group messaging with reply support
- **Announcements** - Group-wide announcements by ADMINs
- **Meetings** - Schedule and track meeting attendance
- **Notifications** - System and group notification delivery
- **SUPERADMIN panel** - System overview, create/list/delete ADMINs

## Tech Stack

- **Backend**: Node.js 22, Express 4, TypeScript 5, Prisma 6, PostgreSQL 16
- **Frontend Mobile**: React Native 0.81, Expo SDK 54, TypeScript 5
- **USSD Service**: Node.js + TypeScript (scaffolded)
- **Database**: PostgreSQL (via Docker Compose)

## API Endpoints

### Authentication

| Method | Endpoint                     | Description                       | Auth | Roles      |
| ------ | ---------------------------- | --------------------------------- | ---- | ---------- |
| POST   | `/api/auth/login`            | Mobile PIN login                  | No   | -          |
| POST   | `/api/auth/superadmin/login` | Web portal login (email+password) | No   | -          |
| GET    | `/api/auth/me`               | Get current user                  | Yes  | Any        |
| POST   | `/api/auth/change-pin`       | Change PIN                        | Yes  | Any        |
| POST   | `/api/auth/admin/create`     | Create new ADMIN account          | Yes  | SUPERADMIN |
| GET    | `/api/auth/admin/list`       | List all ADMINs                   | Yes  | SUPERADMIN |
| DELETE | `/api/auth/admin/:adminId`   | Delete an ADMIN                   | Yes  | SUPERADMIN |
| GET    | `/api/auth/system/overview`  | System-wide stats                 | Yes  | SUPERADMIN |
| POST   | `/api/auth/member/add`       | Add member to group               | Yes  | ADMIN      |

### Groups

| Method | Endpoint                  | Description               | Auth | Roles  |
| ------ | ------------------------- | ------------------------- | ---- | ------ |
| POST   | `/api/groups`             | Create new group          | Yes  | ADMIN  |
| GET    | `/api/groups`             | List user's groups        | Yes  | Any    |
| GET    | `/api/groups/:id`         | Get group details         | Yes  | Member |
| GET    | `/api/groups/code/:code`  | Find group by invite code | Yes  | Any    |
| POST   | `/api/groups/:id/join`    | Join a group              | Yes  | Any    |
| GET    | `/api/groups/:id/stats`   | Group financial stats     | Yes  | Member |
| GET    | `/api/groups/:id/members` | List group members        | Yes  | Member |

### Transactions

| Method | Endpoint                               | Description             | Auth | Roles  |
| ------ | -------------------------------------- | ----------------------- | ---- | ------ |
| POST   | `/api/transactions`                    | Record transaction      | Yes  | ADMIN  |
| POST   | `/api/transactions/contribute`         | Make contribution       | Yes  | MEMBER |
| GET    | `/api/transactions`                    | List group transactions | Yes  | Member |
| GET    | `/api/transactions/my`                 | My transactions         | Yes  | Any    |
| GET    | `/api/transactions/dashboard/:groupId` | Dashboard data          | Yes  | Member |
| GET    | `/api/transactions/:id`                | Get transaction detail  | Yes  | Member |

### Other

| Module        | Base Path              | Auth |
| ------------- | ---------------------- | ---- |
| Chat          | `/api/chat/*`          | Yes  |
| Notifications | `/api/notifications/*` | Yes  |
| Announcements | `/api/announcements/*` | Yes  |
| Meetings      | `/api/meetings/*`      | Yes  |
| Payments      | `/api/payments/*`      | Yes  |
| Health        | `/api/health`          | No   |

## Environment Variables

Create `.env` in the `backend/` directory:

```env
# Required
DATABASE_URL=postgresql://estokvel:estokvel@localhost:5432/estokvel
JWT_SECRET=your-secure-random-string-min-32-chars

# Optional
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

## License

MIT
