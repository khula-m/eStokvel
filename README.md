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

- JWT authentication
- User data isolation (users only see their own groups/transactions)
- Role-based access control (Chairperson, Treasurer, Secretary, Member)
- Transaction permissions (only officers can create/update)

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

## 📄 License

MIT
