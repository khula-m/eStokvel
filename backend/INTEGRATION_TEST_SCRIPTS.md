# eStokvel — Integration & Manual Test Scripts

> All 🧪 NEEDS TESTING items from the Production Testing Framework.
> These scripts are for **live environment** testing against the Railway deployment.

**Base URLs:**
- Backend: `https://estokvel-production.up.railway.app`
- Admin Dashboard: `https://admin-dashboard-service-production-524e.up.railway.app`
- SuperAdmin: `admin@estokvel.co.za` / `Secure@2026!Zkm`

---

## Prerequisites

```bash
# Get a SuperAdmin JWT token (reuse across tests)
SA_TOKEN=$(curl -s -X POST "$BASE/api/auth/superadmin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estokvel.co.za","password":"Secure@2026!Zkm"}' \
  | jq -r '.data.token')
echo $SA_TOKEN

# Get a member JWT token (use test phone number)
MEMBER_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0831234567","pin":"12345"}' \
  | jq -r '.data.token')
echo $MEMBER_TOKEN
```

---

## PART 1: MONEY FLOW & RECONCILIATION

### 1.1 🧪 Member Contributes Twice Same Day

**Purpose:** Verify two contributions on the same day are both recorded and summed.

```bash
BASE="https://estokvel-production.up.railway.app"

# Step 1: Initiate first contribution
curl -s -X POST "$BASE/api/ozow/initiate" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"<GROUP_ID>","amount":500}' | jq .

# Step 2: Wait 6 minutes (past 5-min double-click window)

# Step 3: Initiate second contribution
curl -s -X POST "$BASE/api/ozow/initiate" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"<GROUP_ID>","amount":500}' | jq .
```

**Expected:** Both return `success: true` with different `transactionId` values.

**Verify:** Query member transactions — both contributions should appear.

```bash
curl -s "$BASE/api/transactions?groupId=<GROUP_ID>&memberId=<MEMBER_ID>" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | jq '.data | length'
# Expected: 2 (or previous count + 2)
```

### 1.2 🧪 SUM(contributions) vs Group total_collected

**Purpose:** Detect drift between transaction records and group aggregate.

```sql
-- Run against Railway PostgreSQL:
SELECT sg.id, sg.name, sg."totalCollected",
  COALESCE(SUM(t.amount), 0) AS actual_contributions
FROM "stokvel_groups" sg
LEFT JOIN transactions t ON t."stokvelGroupId" = sg.id
  AND t."transactionType" = 'CONTRIBUTION'
  AND t.status = 'COMPLETED'
GROUP BY sg.id
HAVING sg."totalCollected" != COALESCE(SUM(t.amount), 0);
```

**Expected:** ZERO rows. Any results = discrepancy needing investigation.

### 1.3 🧪 SUM(group totals) vs Pooled Balance

```sql
-- Total across all groups
SELECT SUM("totalCollected") AS system_total FROM "stokvel_groups";

-- Total completed contributions
SELECT SUM(amount) AS tx_total FROM transactions
WHERE "transactionType" = 'CONTRIBUTION' AND status = 'COMPLETED';

-- These two numbers should match
-- Difference = pooled balance drift
```

### 1.4 🧪 Member Receives Payout Then Leaves

```bash
# Step 1: Confirm member has a COMPLETED payout
curl -s "$BASE/api/transactions?memberId=<MEMBER_ID>&type=PAYOUT&status=COMPLETED" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | jq .

# Step 2: Remove member from group (admin action)
curl -s -X DELETE "$BASE/api/groups/<GROUP_ID>/members/<MEMBER_ID>" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Step 3: Verify transaction history preserved (as SuperAdmin)
curl -s "$BASE/api/transactions?memberId=<MEMBER_ID>" \
  -H "Authorization: Bearer $SA_TOKEN" | jq '.data | length'
# Expected: Previous transactions still present (soft delete preserves history)
```

---

## PART 2: PAYOUT LOGIC EDGE CASES

### 2.1 🧪 Bank Details Missing at Term End

**Setup:** Create a member WITHOUT bank details in a group approaching end date.

```bash
# Step 1: Query member bank details
curl -s "$BASE/api/payments/bank-details/<MEMBER_ID>" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | jq .
# Confirm payoutBankName and payoutAccountNumber are null

# Step 2: When scheduler runs, check logs:
# Railway → Backend Logs → Filter: "[PayoutJob]"
# Expected log: "Skipping Ozow payout ... no bank details"

# Step 3: Dashboard → Scheduler panel → Check pending payouts count
curl -s "$BASE/api/superadmin/scheduler-status" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

**Expected:** Payout is skipped (no Ozow API call), warning logged, dashboard shows pending.

---

## PART 3: OZOW INTEGRATION

### 3.1 🧪 Successful Payment Flow

```bash
# Step 1: Initiate payment
RESPONSE=$(curl -s -X POST "$BASE/api/ozow/initiate" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"<GROUP_ID>","amount":500}')
echo $RESPONSE | jq .

TX_ID=$(echo $RESPONSE | jq -r '.data.transactionId')
echo "Transaction ID: $TX_ID"

# Step 2: Complete payment on Ozow test page (follow the redirect URL)
OZOW_URL=$(echo $RESPONSE | jq -r '.data.url')
echo "Open: $OZOW_URL"
# Use test bank credentials on Ozow staging

# Step 3: Wait 30 seconds for webhook

# Step 4: Verify transaction status
curl -s "$BASE/api/ozow/status/$TX_ID" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | jq .
# Expected: status = COMPLETED
```

### 3.2 🧪 Failed Payment (Insufficient Funds)

```bash
# Same as 3.1 but select "Decline" or "Error" on Ozow test page
# Expected: Transaction status = FAILED, member gets failure notification
```

### 3.3 🧪 Webhook Before User Returns to App

```bash
# Step 1: Initiate payment
# Step 2: On Ozow page, complete payment but close browser IMMEDIATELY
# Step 3: Check if webhook still processed (webhooks are server-to-server)

curl -s "$BASE/api/ozow/status/$TX_ID" \
  -H "Authorization: Bearer $MEMBER_TOKEN" | jq '.data.status'
# Expected: COMPLETED (webhook processed independently of user redirect)
```

### 3.4 🧪 Invalid Bank Details Payout

```bash
# Step 1: Set invalid bank details for a member
curl -s -X PUT "$BASE/api/payments/bank-details" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payoutBankName":"INVALID_BANK","payoutAccountNumber":"0000000000","payoutAccountType":"SAVINGS"}' | jq .

# Step 2: Trigger payout (via scheduler or SuperAdmin retry)
# Step 3: Check payout-notify webhook — should receive Error status
# Step 4: Verify transaction marked FAILED

# Query audit logs for the failure:
curl -s "$BASE/api/superadmin/audit-logs?action=PAYOUT&result=FAILURE" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

### 3.5 🧪 Valid Bank Details Payout

```bash
# Step 1: Set valid bank details
curl -s -X PUT "$BASE/api/payments/bank-details" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payoutBankName":"FNB","payoutAccountNumber":"62000000001","payoutAccountType":"SAVINGS"}' | jq .

# Step 2: Trigger payout via SuperAdmin (or wait for scheduler)
curl -s -X POST "$BASE/api/superadmin/override/payout/retry/<PAYOUT_TX_ID>" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .

# Step 3: Check Ozow payout dashboard for the disbursement
# Step 4: Verify payout-notify webhook updates transaction to COMPLETED
```

### 3.6 🧪 Webhook for Non-existent Transaction

```bash
# Simulate a webhook with a fake transaction reference
curl -s -X POST "$BASE/api/ozow/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "SiteCode":"<YOUR_SITE_CODE>",
    "TransactionId":"fake-ozow-id",
    "TransactionReference":"non-existent-tx-id-12345",
    "Amount":"100.00",
    "Status":"Complete",
    "CurrencyCode":"ZAR",
    "Hash":"invalid-hash"
  }' -w "\nHTTP Status: %{http_code}\n"
# Expected: 400 or 403 (hash verification fails first, then transaction not found)
```

---

## PART 4: ADMIN FLOWS

### 4.1 🧪 Admin Forgets PIN (SMS Reset)

```bash
# Step 1: Use SuperAdmin tool to reset admin's PIN
curl -s -X POST "$BASE/api/superadmin/override/admin/reset-pin/<ADMIN_USER_ID>" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPin":"99999"}' | jq .
# Expected: success: true

# Step 2: Login with new PIN
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"<ADMIN_PHONE>","pin":"99999"}' | jq .
# Expected: Successful login with new token

# Step 3: Verify old PIN no longer works
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"<ADMIN_PHONE>","pin":"<OLD_PIN>"}' | jq .
# Expected: 401 Invalid credentials
```

### 4.2 🧪 Admin Transfers Group

```bash
# Step 1: Get group members to find IDs
curl -s "$BASE/api/groups/<GROUP_ID>/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[] | {id, role, name: .user.fullName}'

# Step 2: Transfer admin role (SuperAdmin only)
curl -s -X POST "$BASE/api/superadmin/override/group/<GROUP_ID>/transfer-admin" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromMemberId":"<CURRENT_ADMIN_MEMBER_ID>",
    "toMemberId":"<NEW_ADMIN_MEMBER_ID>",
    "reason":"Admin stepped down, transferring to vice chair"
  }' | jq .
# Expected: success: true

# Step 3: Verify transfer
curl -s "$BASE/api/groups/<GROUP_ID>/members" \
  -H "Authorization: Bearer $SA_TOKEN" | jq '.data[] | {id, role, name: .user.fullName}'
# Expected: Old admin → MEMBER, New admin → ADMIN

# Step 4: Check audit log
curl -s "$BASE/api/superadmin/audit-logs?action=ADMIN_TRANSFER" \
  -H "Authorization: Bearer $SA_TOKEN" | jq '.data[0]'
```

---

## PART 5: RATE LIMITING

### 5.1 🧪 Auth Rate Limiter Triggers on Repeated Failures

```bash
# Rapid-fire 6 login attempts with wrong credentials
for i in $(seq 1 6); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE/api/auth/superadmin/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"attacker@test.com","password":"wrong"}')
  echo "Attempt $i: HTTP $STATUS"
  sleep 0.5
done
# Expected: Attempts 1-5 return 401, Attempt 6 returns 429 (Too Many Requests)
```

---

## PART 6: ALL 6 SUPERADMIN TOOLS (End-to-End)

### Tool 1: Update Transaction Status

```bash
# Get a PENDING transaction ID first
TX_ID=$(curl -s "$BASE/api/superadmin/transactions?status=PENDING" \
  -H "Authorization: Bearer $SA_TOKEN" | jq -r '.data[0].id')

curl -s -X POST "$BASE/api/superadmin/override/transaction/$TX_ID/status" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED","reason":"Webhook lost - confirmed payment on Ozow dashboard ref #12345"}' | jq .
# Expected: success: true, previousStatus: PENDING, newStatus: COMPLETED
```

### Tool 2: Create Adjustment

```bash
curl -s -X POST "$BASE/api/superadmin/override/transaction/adjustment" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId":"<GROUP_ID>",
    "memberId":"<MEMBER_ID>",
    "amount": 50,
    "reason":"Correcting R50 underpayment from bank charges in March"
  }' | jq .
# Expected: success: true, new ADJUSTMENT transaction created
```

### Tool 3: Retry Failed Payout

```bash
# Find a FAILED payout
FAILED_TX=$(curl -s "$BASE/api/superadmin/transactions?status=FAILED&type=PAYOUT" \
  -H "Authorization: Bearer $SA_TOKEN" | jq -r '.data[0].id')

curl -s -X POST "$BASE/api/superadmin/override/payout/retry/$FAILED_TX" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
# Expected: success: true, Ozow payout re-initiated
```

### Tool 4: Reset Admin PIN

```bash
curl -s -X POST "$BASE/api/superadmin/override/admin/reset-pin/<USER_ID>" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPin":"12345"}' | jq .
# Expected: success: true

# Validation tests:
# 3-digit PIN → 400 "must be exactly 5 digits"
# SUPERADMIN user → 403 "Cannot reset SUPERADMIN PIN"
```

### Tool 5: Unlock Account

```bash
curl -s -X POST "$BASE/api/superadmin/override/admin/unlock/<LOCKED_USER_ID>" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
# Expected: success: true, failedAttempts reset to 0
```

### Tool 6: Transfer Group Admin

(See Part 4.2 above — identical flow)

---

## PART 7: SCHEDULER MONITORING

### 7.1 🧪 Scheduler on Public Holiday

**Purpose:** Verify scheduler still runs — it has no holiday calendar exclusions.

```bash
# Check scheduler status
curl -s "$BASE/api/superadmin/scheduler-status" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
# Verify: running = true, lastRunAt is within last 24h

# Railway logs: confirm "[PayoutJob] Checking for due payouts" appears daily
```

**Expected:** Scheduler runs every 24h regardless of holidays.

---

## PART 8: AUDIT LOG COMPLETENESS

### 8.1 🧪 All Override Actions Logged

```bash
# After running all SuperAdmin tools above, query full audit log
curl -s "$BASE/api/superadmin/audit-logs?page=1&limit=50" \
  -H "Authorization: Bearer $SA_TOKEN" | jq '.data | .[].action'

# Expected actions present:
# - SUPERADMIN_OVERRIDE (transaction status changes)
# - SUPERADMIN_ADJUSTMENT
# - SUPERADMIN_PIN_RESET
# - SUPERADMIN_UNLOCK
# - SUPERADMIN_ADMIN_TRANSFER
# - SUPERADMIN_PAYOUT_RETRY
```

---

## PART 9: LOAD & STRESS TESTING

### 9.1 🧪 100 Concurrent Users (Login Stress)

```bash
# Install artillery (if not present): npm install -g artillery

# Create artillery config: artillery-test.yml
cat > artillery-test.yml << 'EOF'
config:
  target: "https://estokvel-production.up.railway.app"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Ramp to 10 users/sec"
  defaults:
    headers:
      Content-Type: "application/json"
scenarios:
  - name: "Login flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            phoneNumber: "0831234567"
            pin: "12345"
          expect:
            - statusCode: [200, 401, 429]
EOF

artillery run artillery-test.yml
```

**Expected:** All requests get a response (no 502/503). P95 latency < 2s.

### 9.2 🧪 Scheduler With Ozow API Down

**Simulated test (can't take down Ozow):**

```bash
# Step 1: Set invalid Ozow credentials temporarily via Railway env vars
# OZOW_API_KEY="" (empty)

# Step 2: Trigger payout processing or wait for scheduler

# Step 3: Check logs:
# Expected: "Ozow API key not configured for payouts" logged
# Transaction remains PENDING (not lost)

# Step 4: Restore OZOW_API_KEY and retry via SuperAdmin tool
```

---

## PART 10: SECURITY VALIDATION

### 10.1 🧪 Unauthorized Access Attempts

```bash
# No token
curl -s "$BASE/api/groups" | jq .
# Expected: 401

# Expired token
curl -s "$BASE/api/groups" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.expired.token" | jq .
# Expected: 401

# Member trying SuperAdmin endpoint
curl -s "$BASE/api/superadmin/override/transaction/tx-1/status" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED","reason":"Testing RBAC"}' | jq .
# Expected: 403 Forbidden
```

### 10.2 🧪 SQL Injection Attempt

```bash
curl -s "$BASE/api/groups" \
  -H "Authorization: Bearer $SA_TOKEN" \
  -d 'search=1%27%20OR%201%3D1--' | jq .
# Expected: Normal response (Prisma parameterizes queries)
```

### 10.3 🧪 XSS Attempt

```bash
curl -s -X POST "$BASE/api/groups" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","description":"test"}' | jq .
# Expected: Stored as-is (escaped on rendering) or validation rejects
```

---

## Test Execution Checklist

| # | Test | Status | Result | Notes |
|---|------|--------|--------|-------|
| 1.1 | Double contribution same day | ☐ | | |
| 1.2 | Contributions vs total_collected | ☐ | | |
| 1.3 | Group totals vs pooled balance | ☐ | | |
| 1.4 | Member leave after payout | ☐ | | |
| 2.1 | Missing bank details at payout | ☐ | | |
| 3.1 | Successful Ozow payment | ☐ | | |
| 3.2 | Failed Ozow payment | ☐ | | |
| 3.3 | Webhook before redirect | ☐ | | |
| 3.4 | Invalid bank payout | ☐ | | |
| 3.5 | Valid bank payout | ☐ | | |
| 3.6 | Non-existent tx webhook | ☐ | | |
| 4.1 | Admin PIN reset | ☐ | | |
| 4.2 | Admin transfer | ☐ | | |
| 5.1 | Rate limiter | ☐ | | |
| 6.1 | Tool: Update TX status | ☐ | | |
| 6.2 | Tool: Create adjustment | ☐ | | |
| 6.3 | Tool: Retry payout | ☐ | | |
| 6.4 | Tool: Reset PIN | ☐ | | |
| 6.5 | Tool: Unlock account | ☐ | | |
| 6.6 | Tool: Transfer admin | ☐ | | |
| 7.1 | Scheduler on holiday | ☐ | | |
| 8.1 | Audit log completeness | ☐ | | |
| 9.1 | 100 concurrent users | ☐ | | |
| 9.2 | Scheduler w/ Ozow down | ☐ | | |
| 10.1 | Auth/RBAC validation | ☐ | | |
| 10.2 | SQL injection | ☐ | | |
| 10.3 | XSS attempt | ☐ | | |
