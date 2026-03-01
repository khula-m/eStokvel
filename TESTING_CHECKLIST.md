# eStokvel Testing Checklist

## Overview

Comprehensive testing checklist for the eStokvel platform aligned with the current 3-tier role system (SUPERADMIN > ADMIN > MEMBER), PIN-based mobile auth, and account lockout security.

---

## 1. Authentication Tests

### 1.1 ADMIN/MEMBER PIN Login (`POST /api/auth/login`)

- [ ] ADMIN can login with phone number + 5-digit PIN
- [ ] MEMBER can login with phone number + 5-digit PIN
- [ ] SUPERADMIN is blocked from PIN login (gets "must use web portal" message)
- [ ] Phone number validated (10 digits, SA format 0XXXXXXXXX)
- [ ] PIN validated (exactly 5 digits)
- [ ] Invalid PIN returns generic "Invalid phone number or PIN" error
- [ ] Non-existent phone number returns generic error (no user enumeration)
- [ ] Successful login returns JWT token + user data
- [ ] JWT token contains userId, phoneNumber, role
- [ ] Token expires after 7 days for ADMIN/MEMBER
- [ ] `lastLogin` timestamp updated on successful login

### 1.2 SUPERADMIN Login (`POST /api/auth/superadmin/login`)

- [ ] SUPERADMIN can login with email + password
- [ ] Non-SUPERADMIN account rejected even with valid email
- [ ] Invalid password returns generic "Invalid credentials" error
- [ ] Token expires after 2 hours (shorter than mobile)
- [ ] `lastLoginIp` recorded on login
- [ ] `lastLogin` timestamp updated

### 1.3 Account Lockout

- [ ] Failed attempt counter increments on wrong PIN/password
- [ ] Account locks after 5 failed attempts
- [ ] Locked account returns remaining lockout time in minutes
- [ ] Lockout duration is 30 minutes
- [ ] Successful login resets failed attempts to 0
- [ ] Successful login clears `lockedUntil` timestamp
- [ ] Lockout applies to both PIN login and SUPERADMIN login

### 1.4 Change PIN (`POST /api/auth/change-pin`)

- [ ] Authenticated user can change their PIN
- [ ] Old PIN must be verified before change
- [ ] New PIN must be exactly 5 digits
- [ ] New PIN validated for complexity (no sequential/repeated digits)
- [ ] `mustChangePin` flag cleared after successful change
- [ ] New PIN stored as bcrypt hash

### 1.5 Must-Change-PIN Flow

- [ ] New ADMIN accounts have `mustChangePin: true`
- [ ] New MEMBER accounts have `mustChangePin: true`
- [ ] Frontend redirects to ChangePinScreen when `mustChangePin` is true
- [ ] After PIN change, user proceeds to dashboard

### 1.6 Get Current User (`GET /api/auth/me`)

- [ ] Returns current user data with valid token
- [ ] Returns 401 with missing token
- [ ] Returns 401 with expired token
- [ ] Returns 401 with malformed token

---

## 2. Role-Based Access Control (RBAC) Tests

### 2.1 SUPERADMIN-Only Routes

- [ ] `POST /api/auth/admin/create` — SUPERADMIN: 200, ADMIN: 403, MEMBER: 403
- [ ] `GET /api/auth/admin/list` — SUPERADMIN: 200, ADMIN: 403, MEMBER: 403
- [ ] `DELETE /api/auth/admin/:id` — SUPERADMIN: 200, ADMIN: 403, MEMBER: 403
- [ ] `GET /api/auth/system/overview` — SUPERADMIN: 200, ADMIN: 403, MEMBER: 403

### 2.2 ADMIN-Only Routes

- [ ] `POST /api/auth/member/add` — ADMIN: 200, MEMBER: 403
- [ ] `POST /api/transactions` (record transaction) — ADMIN: 200, MEMBER: 403

### 2.3 Group Security Middleware

- [ ] Non-group-member cannot view group transactions
- [ ] Non-group-member cannot view group dashboard
- [ ] Group ADMIN can access admin-only group features
- [ ] Regular group MEMBER cannot access admin group features

### 2.4 Unauthenticated Access

- [ ] All `/api/groups/*` routes return 401 without token
- [ ] All `/api/transactions/*` routes return 401 without token
- [ ] All `/api/chat/*` routes return 401 without token
- [ ] Public routes work without token: `/api/health`, `/api/auth/login`, `/api/auth/superadmin/login`

---

## 3. SUPERADMIN Management Tests

### 3.1 Create ADMIN (`POST /api/auth/admin/create`)

- [ ] SUPERADMIN can create a new ADMIN with phone, name, email
- [ ] New ADMIN gets a temporary 5-digit PIN
- [ ] New ADMIN has `mustChangePin: true`
- [ ] New ADMIN has `createdById` set to SUPERADMIN's ID
- [ ] Duplicate phone number rejected
- [ ] Duplicate email rejected

### 3.2 List ADMINs (`GET /api/auth/admin/list`)

- [ ] Returns all ADMIN users with their managed groups
- [ ] Does not include SUPERADMIN or MEMBER accounts

### 3.3 Delete ADMIN (`DELETE /api/auth/admin/:adminId`)

- [ ] SUPERADMIN can delete an ADMIN account
- [ ] Cannot delete non-ADMIN users
- [ ] Cannot delete own SUPERADMIN account

### 3.4 System Overview (`GET /api/auth/system/overview`)

- [ ] Returns total admins, groups, members, collected amount, transactions
- [ ] Counts are accurate against database

---

## 4. ADMIN Member Management Tests

### 4.1 Add Member (`POST /api/auth/member/add`)

- [ ] ADMIN can add a new MEMBER with phone, name, groupId
- [ ] New MEMBER gets a temporary 5-digit PIN
- [ ] New MEMBER has `mustChangePin: true`
- [ ] New MEMBER automatically joined to specified group
- [ ] New MEMBER has `createdById` set to ADMIN's ID
- [ ] Duplicate phone number handled gracefully

---

## 5. Group Management Tests

### 5.1 Create Group (`POST /api/groups`)

- [ ] ADMIN can create a new group
- [ ] Group name is required
- [ ] Contribution amount is required and valid
- [ ] Unique group code generated
- [ ] Creator becomes group admin automatically
- [ ] `adminId` set to creating ADMIN's ID

### 5.2 View Groups (`GET /api/groups`)

- [ ] Returns only groups the authenticated user belongs to
- [ ] Group cards show name, members, contribution amount
- [ ] Empty array when user has no groups

### 5.3 Group Details (`GET /api/groups/:id`)

- [ ] Returns full group details for members
- [ ] Non-members get appropriate error

### 5.4 Join Group (`POST /api/groups/:id/join`)

- [ ] User can join a group with valid group code
- [ ] Cannot join same group twice
- [ ] New member gets MEMBER role in group

### 5.5 Group Stats (`GET /api/groups/:id/stats`)

- [ ] Returns financial summary (total collected, pending, etc.)
- [ ] Only accessible by group members

### 5.6 Group Members (`GET /api/groups/:id/members`)

- [ ] Lists all members with roles (ADMIN/MEMBER)
- [ ] Only accessible by group members

---

## 6. Transaction Tests

### 6.1 Record Transaction (`POST /api/transactions`)

- [ ] ADMIN can record contribution for any group member
- [ ] ADMIN can record payout
- [ ] ADMIN can record expense
- [ ] Transaction types: CONTRIBUTION, PAYOUT, EXPENSE, ADJUSTMENT
- [ ] Payment methods: CASH, BANK_TRANSFER, MOBILE_MONEY, CARD
- [ ] Reference number generated/accepted
- [ ] Transaction status: PENDING, COMPLETED, REJECTED, CANCELLED

### 6.2 Make Contribution (`POST /api/transactions/contribute`)

- [ ] MEMBER can submit own contribution
- [ ] Contribution tied to member's group
- [ ] Amount validated

### 6.3 View Transactions (`GET /api/transactions`)

- [ ] Only returns transactions for user's groups
- [ ] Transactions sorted by date (newest first)
- [ ] Transaction amounts formatted correctly (ZAR)

### 6.4 My Transactions (`GET /api/transactions/my`)

- [ ] Returns only the authenticated user's transactions
- [ ] Works across all groups user belongs to

### 6.5 Dashboard Data (`GET /api/transactions/dashboard/:groupId`)

- [ ] Returns group financial summary
- [ ] Only accessible by group members
- [ ] Includes contribution stats, payout info

---

## 7. Chat Tests

### 7.1 Group Chat

- [ ] Members can send messages to group chat
- [ ] Messages show sender name and timestamp
- [ ] Chat history loads correctly
- [ ] Reply to specific messages works

---

## 8. UI/UX Tests (Mobile)

### 8.1 Login Screen

- [ ] Phone number input (10 digits)
- [ ] PIN input (5 digits, masked)
- [ ] Show/hide PIN toggle works
- [ ] Loading spinner during login
- [ ] Error messages display clearly
- [ ] Lockout message shows remaining time

### 8.2 Change PIN Screen

- [ ] Shows when `mustChangePin` is true after login
- [ ] Old PIN field (pre-filled or manual)
- [ ] New PIN field (5 digits)
- [ ] Confirm new PIN field
- [ ] PIN mismatch validation
- [ ] Success redirects to dashboard

### 8.3 Dashboard Screen

- [ ] Welcome message with user name
- [ ] Group overview cards
- [ ] Contribution stats
- [ ] Recent activity

### 8.4 Navigation

- [ ] Bottom tab bar works (Dashboard, Ledger, Chat, Profile)
- [ ] Tab icons highlight active tab
- [ ] Screen transitions smooth

### 8.5 Ledger Screen

- [ ] Transaction list displays correctly
- [ ] Amount formatting (R 1,000.00)
- [ ] Status badges (Pending/Completed/Rejected)

### 8.6 Profile Screen

- [ ] User info displayed (name, phone, role)
- [ ] Logout button works
- [ ] Logout clears token and returns to login

---

## 9. Security Tests

### 9.1 Authentication Security

- [ ] PINs stored as bcrypt hashes (not plaintext)
- [ ] Passwords stored as bcrypt hashes
- [ ] JWT secret is strong (32+ characters)
- [ ] Expired tokens rejected
- [ ] Invalid tokens rejected
- [ ] SUPERADMIN cannot use mobile login

### 9.2 Rate Limiting

- [ ] Auth endpoints limited to 5 requests/hour per IP
- [ ] API endpoints limited to 100 requests/15min per IP
- [ ] Rate limit exceeded returns 429

### 9.3 Input Validation

- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] XSS prevented (Helmet CSP headers)
- [ ] Request body limited to 10KB
- [ ] Phone numbers validated format
- [ ] PIN complexity validated (no 11111, 12345, etc.)

### 9.4 Data Isolation

- [ ] Users only see their own groups
- [ ] Users only see transactions from their groups
- [ ] Group-specific data isolated between groups

---

## 10. API Integration Tests

### 10.1 Error Responses

- [ ] 400 returned for validation errors
- [ ] 401 returned for missing/invalid token
- [ ] 403 returned for insufficient role
- [ ] 404 returned for not found
- [ ] 429 returned for rate limit exceeded
- [ ] 500 handled gracefully with generic error message

### 10.2 Health Check

- [ ] `GET /api/health` returns 200 with status, uptime, memory

---

## 11. End-to-End Test Scenarios

### Scenario 1: SUPERADMIN Creates ADMIN

1. [ ] POST `/api/auth/superadmin/login` with email + password
2. [ ] POST `/api/auth/admin/create` with phone, name, email
3. [ ] Receive temp PIN for new ADMIN
4. [ ] New ADMIN logs in with phone + temp PIN
5. [ ] ADMIN redirected to change PIN
6. [ ] ADMIN changes PIN successfully
7. [ ] ADMIN accesses dashboard

### Scenario 2: ADMIN Sets Up Group & Members

1. [ ] ADMIN logs in with phone + PIN
2. [ ] POST `/api/groups` to create a new stokvel group
3. [ ] POST `/api/auth/member/add` to add members
4. [ ] Members receive temp PINs
5. [ ] Members log in and change PINs
6. [ ] Members appear in group member list

### Scenario 3: Contribution Flow

1. [ ] MEMBER logs in
2. [ ] MEMBER makes contribution via `/api/transactions/contribute`
3. [ ] Transaction appears as PENDING
4. [ ] ADMIN logs in
5. [ ] ADMIN views pending transactions
6. [ ] ADMIN records/verifies the payment
7. [ ] Transaction status updates to COMPLETED
8. [ ] MEMBER sees updated status

### Scenario 4: Account Lockout & Recovery

1. [ ] Enter wrong PIN 4 times
2. [ ] See "X attempts remaining" warning
3. [ ] Enter wrong PIN 5th time
4. [ ] Account locked - see "locked for 30 minutes" message
5. [ ] Further login attempts blocked with time remaining
6. [ ] After 30 minutes, login works with correct PIN

---

## Test Execution Log

| Date | Tester | Section | Pass/Fail | Notes |
| ---- | ------ | ------- | --------- | ----- |
|      |        |         |           |       |

---

## Known Issues

| Issue | Severity | Status | Notes |
| ----- | -------- | ------ | ----- |
|       |          |        |       |

---

## Sign-Off

- [ ] All critical tests passed
- [ ] All high-priority bugs fixed
- [ ] Performance acceptable
- [ ] Security review complete

**Approved by:** ******\_\_\_******
**Date:** ******\_\_\_******
