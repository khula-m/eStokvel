# eStokvel - Digital Stokvel Management Platform

A modern digital platform for managing South African stokvels (savings clubs).

## 📁 Project Structure

```
eStokvel/
├── backend/                    # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── controllers/        # Route handlers
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Auth, validation, etc.
│   │   ├── models/             # Type definitions
│   │   ├── routes/             # API routes
│   │   └── utils/              # Utilities
│   ├── prisma/                 # Database schema & migrations
│   ├── server.ts               # Entry point
│   └── package.json
│
├── frontend/
│   └── mobile/
│       └── eStokvelMobile/     # React Native + Expo mobile app
│           ├── src/
│           │   ├── components/ # Reusable UI components
│           │   ├── screens/    # App screens
│           │   ├── services/   # API services
│           │   ├── store/      # State management (Zustand)
│           │   ├── theme/      # Colors, spacing, fonts
│           │   └── navigation/ # Navigation setup
│           ├── App.tsx         # Main app component
│           └── package.json
│
├── .gitignore
└── package.json                # Root monorepo config
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)

### 1. Start Database

```bash
npm run docker:up
```

### 2. Start Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Backend runs at: http://localhost:5000

### 3. Start Mobile App

```bash
cd frontend/mobile/eStokvelMobile
npm install
npx expo start
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth with configurable expiration
- **Rate Limiting** - Auth: 5 req/hour, API: 100 req/15min per IP
- **Helmet Security Headers** - CSP, HSTS, XSS protection, clickjacking prevention
- **CORS** - Configurable whitelist via `ALLOWED_ORIGINS` env var
- **Body Parser Limits** - 10KB max payload to prevent DoS
- **User Data Isolation** - Users only see their own groups/transactions
- **Role-Based Access** - Chairperson, Treasurer, Secretary, Member

## 🧪 Test Credentials

After running `npm run prisma:seed`:

| Role      | Phone       | Password    |
| --------- | ----------- | ----------- |
| Treasurer | 27831234567 | password123 |
| Member    | 27821234568 | password123 |

## 📱 Features

- **Member Dashboard**: Personal contributions, payment history
- **Treasurer Dashboard**: Group finances, record transactions
- **Group Management**: Create/join groups via invite codes
- **Transaction Tracking**: Contributions, payouts, loans

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend**: React Native, Expo, TypeScript, Zustand
- **Database**: PostgreSQL (Docker)
- **Cache**: Redis (Docker)

## � API Endpoints

| Method | Endpoint                     | Description                | Auth |
| ------ | ---------------------------- | -------------------------- | ---- |
| POST   | /api/auth/register           | Create new user            | No   |
| POST   | /api/auth/login              | Login with phone/password  | No   |
| GET    | /api/auth/me                 | Get current user           | Yes  |
| GET    | /api/groups                  | List user's groups         | Yes  |
| POST   | /api/groups                  | Create new group           | Yes  |
| GET    | /api/groups/:id              | Get group details          | Yes  |
| GET    | /api/transactions            | List transactions          | Yes  |
| POST   | /api/transactions            | Create transaction         | Yes  |
| PUT    | /api/transactions/:id/verify | Verify payment (Treasurer) | Yes  |
| GET    | /api/members                 | List members               | Yes  |
| POST   | /api/members/invite          | Invite member to group     | Yes  |

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/estokvel
JWT_SECRET=your-secure-random-string

# Production
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com
```

## �📄 License

MIT
