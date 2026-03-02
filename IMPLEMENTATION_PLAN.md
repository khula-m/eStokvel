# eStokvel Implementation Plan

> Last updated: 1 March 2026  
> Branch: `feature/day14-testing-polish`  
> Latest commit: `e40bc8d`

---

## Phase 1: Project Setup & Infrastructure ✅ DONE

| #   | Task                                      | Status  | Notes                                                                              |
| --- | ----------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| 1.1 | Initialize backend (Express + TypeScript) | ✅ DONE | Express.js, TypeScript 5, port 5000                                                |
| 1.2 | Set up PostgreSQL + Prisma ORM            | ✅ DONE | Prisma 6.19.2, Docker Compose for DB                                               |
| 1.3 | Design database schema                    | ✅ DONE | Users, StokvelGroups, Members, Transactions, ChatMessages, Announcements, Meetings |
| 1.4 | Run migrations                            | ✅ DONE | 3 migrations: init, mvp_complete, add_chat_messages                                |
| 1.5 | Create seed data                          | ✅ DONE | SUPERADMIN, 1 ADMIN, 5 MEMBERS, 2 groups with transactions                         |
| 1.6 | Initialize frontend (Expo + React Native) | ✅ DONE | Expo SDK 54, React Native 0.81.5, React 19.1.0                                     |
| 1.7 | Set up USSD service skeleton              | ✅ DONE | Express server on port 3001, Africa's Talking format                               |

---

## Phase 2: Authentication & Security ✅ DONE

| #    | Task                                                  | Status  | Notes                                          |
| ---- | ----------------------------------------------------- | ------- | ---------------------------------------------- |
| 2.1  | Implement 3-tier RBAC (SUPERADMIN > ADMIN > MEMBER)   | ✅ DONE | UserRole enum, MemberRole enum                 |
| 2.2  | PIN-based auth for ADMIN/MEMBER (phone + 5-digit PIN) | ✅ DONE | 7-day JWT tokens                               |
| 2.3  | Email+password auth for SUPERADMIN                    | ✅ DONE | 2-hour JWT tokens, complex password rules      |
| 2.4  | Account lockout (5 failed attempts → 30min)           | ✅ DONE | failedLoginAttempts + lockedUntil fields       |
| 2.5  | Must-change-PIN on first login                        | ✅ DONE | mustChangePin flag, forced flow                |
| 2.6  | bcrypt password/PIN hashing                           | ✅ DONE | Salted hashes                                  |
| 2.7  | JWT middleware (auth.middleware.ts)                   | ✅ DONE | Token extraction, verification, user injection |
| 2.8  | Role middleware (role.middleware.ts)                  | ✅ DONE | Role array check against user.role             |
| 2.9  | Rate limiting (5 req/hr auth, 100 req/15min API)      | ✅ DONE | express-rate-limit                             |
| 2.10 | Security headers (Helmet, CORS, body limit)           | ✅ DONE | Helmet, CORS whitelist, 10KB body limit        |
| 2.11 | Group security middleware                             | ✅ DONE | requireGroupMembership, requireAdminRole       |

---

## Phase 3: Backend API Endpoints ✅ DONE

| #    | Task                | Status  | Notes                                                                                                     |
| ---- | ------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| 3.1  | Auth routes         | ✅ DONE | login, superadmin/login, me, change-pin, admin/create, admin/list, admin/:id, system/overview, member/add |
| 3.2  | Group routes        | ✅ DONE | CRUD, join, stats, members, code lookup (7 endpoints)                                                     |
| 3.3  | Transaction routes  | ✅ DONE | create, contribute, list, my, dashboard, detail (6 endpoints)                                             |
| 3.4  | Payment routes      | ✅ DONE | bank-details (GET/PUT), upload proof, verify, pending (5 endpoints)                                       |
| 3.5  | Chat routes         | ✅ DONE | send message, get messages, mark read, unread count (4 endpoints)                                         |
| 3.6  | Notification routes | ✅ DONE | get notifications, send SMS, contribution reminders, meeting reminders (4 endpoints)                      |
| 3.7  | Announcement routes | ✅ DONE | CRUD + mark read (5 endpoints)                                                                            |
| 3.8  | Meeting routes      | ✅ DONE | CRUD + RSVP (5 endpoints)                                                                                 |
| 3.9  | User routes         | ✅ DONE | me, list users in groups (2 endpoints)                                                                    |
| 3.10 | Health check        | ✅ DONE | /health and /api/health                                                                                   |

---

## Phase 4: Frontend Mobile App — Screens ✅ DONE

| #   | Task                          | Status  | Notes                                                                                                                           |
| --- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Login screen (PIN auth)       | ✅ DONE | Phone + 5-digit PIN, error handling                                                                                             |
| 4.2 | Change PIN screen             | ✅ DONE | Current PIN → New PIN → Confirm, must-change flow                                                                               |
| 4.3 | Dashboard screen (role-aware) | ✅ DONE | SUPERADMIN: system overview + admin management. ADMIN: group analytics, members, announcements, meetings. MEMBER: group summary |
| 4.4 | Ledger screen                 | ✅ DONE | Transaction list, filter by type, admin group selector                                                                          |
| 4.5 | Chat screen                   | ✅ DONE | Group messaging, mark as read, group selector                                                                                   |
| 4.6 | Profile screen                | ✅ DONE | User info, role display, membership count, total contributed, logout                                                            |
| 4.7 | Bottom tab navigation         | ✅ DONE | Dashboard, Ledger, Chat, Profile tabs                                                                                           |
| 4.8 | Reusable components           | ✅ DONE | Icon, StatsCard, ProgressBar, BottomTabBar, TabIcon                                                                             |
| 4.9 | Shared styles system          | ✅ DONE | Centralized styles/index.ts with COLORS theme                                                                                   |

---

## Phase 5: Frontend-Backend Integration — Partial

| #    | Task                                                                      | Status  | Notes                                                                             |
| ---- | ------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------- |
| 5.1  | Login → POST /api/auth/login                                              | ✅ DONE | Axios call, token stored in state                                                 |
| 5.2  | SUPERADMIN login → POST /api/auth/superadmin/login                        | ❌ TODO | No SUPERADMIN login screen in mobile app (email+password flow)                    |
| 5.3  | Change PIN → POST /api/auth/change-pin                                    | ✅ DONE | Connected with auth token                                                         |
| 5.4  | Dashboard → GET /api/groups, /api/transactions, /api/auth/system/overview | ✅ DONE | Role-aware data fetching                                                          |
| 5.5  | Dashboard → Admin management (create/list/delete admins)                  | ✅ DONE | SUPERADMIN can create admins from dashboard                                       |
| 5.6  | Dashboard → Announcements (CRUD)                                          | ✅ DONE | Create/list announcements from admin dashboard                                    |
| 5.7  | Dashboard → Meetings (CRUD + RSVP)                                        | ✅ DONE | Create/list meetings from admin dashboard                                         |
| 5.8  | Dashboard → Member management                                             | ✅ DONE | View group members from admin dashboard                                           |
| 5.9  | Ledger → GET /api/transactions/my, /api/transactions                      | ✅ DONE | User's own + admin group view                                                     |
| 5.10 | Chat → GET/POST messages, mark read                                       | ✅ DONE | Full chat integration                                                             |
| 5.11 | Profile → GET /api/groups, /api/transactions/my                           | ✅ DONE | Membership count, total contributed                                               |
| 5.12 | Payment proof upload screen                                               | ❌ TODO | Backend endpoint exists (POST /api/payments/transactions/:id/proof) but no UI     |
| 5.13 | Payment verification screen (ADMIN)                                       | ❌ TODO | Backend endpoint exists (PUT /api/payments/transactions/:id/verify) but no UI     |
| 5.14 | Bank details management (ADMIN)                                           | ❌ TODO | Backend endpoints exist (GET/PUT /api/payments/groups/:id/bank-details) but no UI |
| 5.15 | Pending payments view (ADMIN)                                             | ❌ TODO | Backend endpoint exists (GET /api/payments/groups/:id/pending) but no UI          |
| 5.16 | Notification display                                                      | ❌ TODO | Backend endpoint exists (GET /api/notifications) but no UI                        |
| 5.17 | Auth token persistence (AsyncStorage)                                     | ❌ TODO | Currently token is in-memory only, lost on app restart                            |
| 5.18 | Error boundary / global error handling                                    | ❌ TODO | No global error boundary component                                                |

---

## Phase 6: Testing

| #    | Task                                                     | Status  | Notes                                                     |
| ---- | -------------------------------------------------------- | ------- | --------------------------------------------------------- |
| 6.1  | Write Jest test files (auth, groups, transactions, RBAC) | ✅ DONE | 4 test files, 36 test cases total                         |
| 6.2  | Configure Jest (jest.config.js)                          | ✅ DONE | ts-jest, node environment                                 |
| 6.3  | Run Jest tests & fix failures                            | ❌ TODO | Test files written but not yet executed                   |
| 6.4  | Manual API testing (Postman)                             | ✅ DONE | Verified login, RBAC, groups, transactions via terminal   |
| 6.5  | Update Postman collection to match current API           | ✅ DONE | 40+ endpoints, correct credentials, role-based tokens     |
| 6.6  | Test payment flow end-to-end                             | ❌ TODO | Bank details → Contribute → Upload proof → Verify (ADMIN) |
| 6.7  | Test account lockout flow                                | ❌ TODO | 5 failed PINs → locked 30min → auto-unlock                |
| 6.8  | Test must-change-PIN flow                                | ❌ TODO | New user login → forced PIN change → access granted       |
| 6.9  | Test chat real-time (polling)                            | ❌ TODO | Send message → recipient sees it on refresh               |
| 6.10 | Test announcement/meeting CRUD                           | ❌ TODO | Create → List → Update → Delete                           |
| 6.11 | Frontend component testing                               | ❌ TODO | No React Native test setup yet                            |
| 6.12 | E2E scenario testing                                     | ❌ TODO | Full flows: onboarding, contribute, payout, chat          |

---

## Phase 7: Documentation & Standards ✅ DONE

| #   | Task                                              | Status  | Notes                                            |
| --- | ------------------------------------------------- | ------- | ------------------------------------------------ |
| 7.1 | Rewrite README.md                                 | ✅ DONE | Correct RBAC, endpoints, credentials, tech stack |
| 7.2 | Rewrite TESTING_CHECKLIST.md                      | ✅ DONE | 11 sections matching current system              |
| 7.3 | Update code comments (remove old role references) | ✅ DONE | member.controller.ts, security.middleware.ts     |
| 7.4 | Fix server.ts startup log credentials             | ✅ DONE | Correct SUPERADMIN/ADMIN/MEMBER credentials      |
| 7.5 | TypeScript error cleanup (0 errors)               | ✅ DONE | Prisma type bridge, implicit any fixes, tsconfig |

---

## Phase 8: USSD Service — Incomplete

| #    | Task                             | Status     | Notes                                                                       |
| ---- | -------------------------------- | ---------- | --------------------------------------------------------------------------- |
| 8.1  | Express server + health check    | ✅ DONE    | Port 3001                                                                   |
| 8.2  | Main menu display                | ✅ DONE    | 5 options: Balance, Transactions, Payment Status, Group Info, Contact Admin |
| 8.3  | Session management (in-memory)   | ✅ DONE    | Map-based session store                                                     |
| 8.4  | PIN authentication via USSD      | ⚠️ PARTIAL | Menu prompts for PIN, but backend auth call not wired                       |
| 8.5  | Check Balance handler            | ❌ TODO    | Needs to call backend API after PIN auth                                    |
| 8.6  | My Transactions handler          | ❌ TODO    | List recent transactions via API                                            |
| 8.7  | Payment Status handler           | ❌ TODO    | Show pending/verified payments                                              |
| 8.8  | Group Info handler               | ❌ TODO    | Show group details, members, stats                                          |
| 8.9  | Contact Admin handler            | ❌ TODO    | Display admin contact info                                                  |
| 8.10 | Error handling + session cleanup | ⚠️ PARTIAL | Basic try/catch, no session TTL                                             |

---

## Phase 9: DevOps & Deployment — Not Started

| #   | Task                              | Status     | Notes                                             |
| --- | --------------------------------- | ---------- | ------------------------------------------------- |
| 9.1 | Merge feature branch to main      | ❌ TODO    | `feature/day14-testing-polish` → `main`           |
| 9.2 | Environment config (.env.example) | ❌ TODO    | Document required env vars                        |
| 9.3 | Docker Compose for full stack     | ⚠️ PARTIAL | Docker Compose exists for DB only                 |
| 9.4 | CI/CD pipeline (GitHub Actions)   | ❌ TODO    | Lint, test, build on PR                           |
| 9.5 | Production build config           | ❌ TODO    | Backend: tsc build. Frontend: eas build           |
| 9.6 | EAS build for Android APK         | ❌ TODO    | eas.json exists but not configured for production |

---

---

# 📋 Revised Plan — Remaining Work

Priority order for what to tackle next.

## Immediate (High Priority)

| #   | Task                               | Effort | Description                                                                              |
| --- | ---------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| R1  | **Run Jest tests**                 | Small  | Execute `npm test` in backend, fix any failures in the 4 rewritten test files            |
| R2  | **Test payment flow end-to-end**   | Medium | Start backend → test bank details, contribute, upload proof, verify via Postman/terminal |
| R3  | **Test lockout + must-change-PIN** | Small  | Verify 5 failed PINs trigger lockout, new user forced to change PIN                      |
| R4  | **Auth token persistence**         | Small  | Add AsyncStorage to save/restore JWT token so login survives app restart                 |
| R5  | **Merge to main**                  | Small  | PR or direct merge `feature/day14-testing-polish` → `main`                               |

## Short-Term (Medium Priority)

| #   | Task                                | Effort | Description                                                                                      |
| --- | ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| R6  | **Payment proof upload UI**         | Medium | New screen or modal: select transaction → pick image → POST /api/payments/transactions/:id/proof |
| R7  | **Payment verification UI (ADMIN)** | Medium | Admin view: list pending payments → tap to verify → PUT /api/payments/transactions/:id/verify    |
| R8  | **Bank details management UI**      | Small  | Admin settings: update bank name, account number, branch code for group                          |
| R9  | **Pending payments view**           | Small  | Admin screen: GET /api/payments/groups/:id/pending → list with status                            |
| R10 | **Notifications UI**                | Small  | GET /api/notifications → display in-app notification list/badge                                  |
| R11 | **SUPERADMIN login screen**         | Small  | Separate login screen for email+password (web portal or mobile toggle)                           |
| R12 | **Error boundary component**        | Small  | Wrap app in React error boundary for graceful crash handling                                     |

## Medium-Term (Lower Priority)

| #   | Task                                  | Effort | Description                                                                            |
| --- | ------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| R13 | **Complete USSD handlers**            | Large  | Wire PIN auth → balance check, transactions, payment status, group info to backend API |
| R14 | **USSD session TTL/cleanup**          | Small  | Auto-expire sessions after 5 minutes                                                   |
| R15 | **Frontend component tests**          | Medium | Set up React Native Testing Library, write tests for key screens                       |
| R16 | **E2E scenario tests**                | Large  | Full user journeys: onboard → contribute → verify → payout → chat                      |
| R17 | **Environment config (.env.example)** | Small  | Document all required env vars for backend + frontend + USSD                           |

## Future (Deployment)

| #   | Task                          | Effort | Description                                                |
| --- | ----------------------------- | ------ | ---------------------------------------------------------- |
| R18 | **Docker Compose full stack** | Medium | Add backend + USSD services to Docker alongside PostgreSQL |
| R19 | **GitHub Actions CI/CD**      | Medium | Lint → Test → Build pipeline on PRs                        |
| R20 | **EAS production build**      | Medium | Configure eas.json for Android APK/AAB release build       |
| R21 | **Production deployment**     | Large  | Deploy backend to hosting, configure production DB, SSL    |
