# eStokvel — Post-Launch Monitoring Plan

> Production monitoring, alerting, and incident response procedures.
> Railway backend: `https://estokvel-production.up.railway.app`
> Admin dashboard: `https://admin-dashboard-service-production-524e.up.railway.app`

---

## 1. Health Check Endpoints

### 1.1 Primary Health Check

```
GET /api/health
```

**Monitor:** Every 60 seconds via Railway or external uptime service.
**Alert if:** Response time > 5s or non-200 status for 3 consecutive checks.

### 1.2 Recommended Uptime Services (Free Tier)

| Service | URL | Features |
|---------|-----|----------|
| UptimeRobot | uptimerobot.com | 5-min checks, SMS/email alerts, free |
| Better Stack | betterstack.com | 30s checks, status page, free tier |
| Railway | Built-in | Health check on deploy |

**Setup:**
1. Create account on UptimeRobot
2. Add HTTP monitor: `https://estokvel-production.up.railway.app/api/health`
3. Alert contacts: admin phone + email
4. Check interval: 5 minutes

---

## 2. Daily Monitoring Checklist

Run these checks every morning (7:00 AM SAST):

### 2.1 Scheduler Health

```bash
SA_TOKEN="<your-superadmin-token>"
BASE="https://estokvel-production.up.railway.app"

curl -s "$BASE/api/superadmin/scheduler-status" \
  -H "Authorization: Bearer $SA_TOKEN" | jq '{
    running: .data.running,
    lastRunAt: .data.lastRunAt,
    lastRunResult: .data.lastRunResult,
    pendingPayouts: .data.pendingPayouts,
    failedPayouts: .data.failedPayouts
  }'
```

**Check:**
- `running` = true
- `lastRunAt` within last 25 hours
- `lastRunResult` = "success"
- `failedPayouts` = 0 (or investigate)

### 2.2 Failed Transactions

```bash
curl -s "$BASE/api/superadmin/audit-logs?action=PAYOUT&result=FAILURE&limit=10" \
  -H "Authorization: Bearer $SA_TOKEN" | jq '.data | length'
```

**Action:** If > 0, check each failure. Retry via SuperAdmin Tools if bank details are now valid.

### 2.3 Reconciliation Query

```sql
-- Run weekly or after any discrepancy report
SELECT sg.id, sg.name, sg."totalCollected",
  COALESCE(SUM(t.amount), 0) AS actual_sum,
  sg."totalCollected" - COALESCE(SUM(t.amount), 0) AS drift
FROM "stokvel_groups" sg
LEFT JOIN transactions t ON t."stokvelGroupId" = sg.id
  AND t."transactionType" = 'CONTRIBUTION'
  AND t.status = 'COMPLETED'
GROUP BY sg.id
HAVING sg."totalCollected" != COALESCE(SUM(t.amount), 0);
```

**Action:** Any rows = immediate investigation. Use SuperAdmin Adjustment tool to correct.

---

## 3. Logging & Observability

### 3.1 Railway Log Monitoring

**Access:** Railway Dashboard → Backend Service → Logs

**Key log patterns to watch:**

| Pattern | Meaning | Action |
|---------|---------|--------|
| `[PayoutJob] Fatal error:` | Scheduler crashed | Check error, restart if needed |
| `[AUDIT][SUPERADMIN_OVERRIDE]` | Manual override used | Review for legitimacy |
| `Ozow notification hash mismatch` | Possible tampering | Investigate immediately |
| `rate limit exceeded` | Brute force attempt | Check source IP |
| `Transaction not found` (from webhook) | Stale/replay webhook | Usually harmless |
| `no bank details` | Member missing payout info | Notify member to update |

### 3.2 Structured Log Queries

Railway supports log filtering. Use these searches:

```
# All errors in last hour
level:error

# Payout job activity
[PayoutJob]

# SuperAdmin actions
[AUDIT]

# Ozow webhooks
Ozow notification

# Failed login attempts
Invalid credentials
```

### 3.3 Winston Log Levels

The backend uses Winston with JSON output:
- **error**: System failures, unhandled exceptions
- **warn**: Business logic warnings (missing bank details, rate limits)
- **info**: Normal operations (payouts processed, transactions completed)

---

## 4. Alerting Rules

### 4.1 Critical (Immediate Response — within 15 min)

| Trigger | Detection | Response |
|---------|-----------|----------|
| Backend down (3+ health check failures) | UptimeRobot alert | Redeploy on Railway |
| Database connection lost | Error logs: "Can't reach database" | Check Railway PostgreSQL status |
| Scheduler not running | `running: false` in status API | Redeploy backend (scheduler starts on boot) |
| Ozow hash mismatch | Error log pattern | Verify Ozow private key hasn't rotated |

### 4.2 High (Response within 1 hour)

| Trigger | Detection | Response |
|---------|-----------|----------|
| Failed payouts > 3 in 24h | Daily check or dashboard | Investigate bank details, retry via tool |
| Rate limiter triggering frequently | Warn logs | Check for brute force, consider IP blocking |
| Reconciliation drift detected | Weekly SQL query | Create adjustment to correct |

### 4.3 Low (Response within 24h)

| Trigger | Detection | Response |
|---------|-----------|----------|
| Pending payouts > 5 | Dashboard scheduler panel | Review member bank details |
| Disk/memory high on Railway | Railway metrics | Scale plan or optimize queries |
| New audit log from unknown user | Audit log review | Verify SuperAdmin credentials haven't leaked |

---

## 5. Incident Response Playbooks

### 5.1 Backend Down

```
1. Check Railway Dashboard → Service status
2. Check Railway PostgreSQL → Database status
3. If service crashed:
   a. Check latest deploy logs for errors
   b. Redeploy latest successful commit
   c. If new code caused it: revert to previous commit
4. Verify health: curl https://estokvel-production.up.railway.app/api/health
5. Check scheduler restarted: query /api/superadmin/scheduler-status
```

### 5.2 Payments Not Processing

```
1. Check Ozow status page (status.ozow.com) for outages
2. Check Railway logs for Ozow errors
3. Verify env vars: OZOW_SITE_CODE, OZOW_PRIVATE_KEY, OZOW_API_KEY
4. Test with small payment amount
5. If Ozow is down:
   a. Inform affected users
   b. Pending transactions will auto-process when Ozow recovers (via webhook)
6. Retry failed payouts via SuperAdmin Retry Payout tool
```

### 5.3 Reconciliation Discrepancy

```
1. Run reconciliation SQL query (Section 2.3)
2. Identify affected groups and amounts
3. Check transaction logs for missing/duplicate entries
4. Cross-reference with Ozow dashboard for payment confirmations
5. Use SuperAdmin tools:
   a. Update Transaction Status (for webhook-lost payments)
   b. Create Adjustment (for confirmed discrepancies)
6. Re-run reconciliation to verify correction
7. Document findings in audit log
```

### 5.4 Suspected Security Breach

```
1. IMMEDIATELY:
   a. Change SuperAdmin password via direct DB update
   b. Rotate JWT_SECRET on Railway → Forces all sessions to expire
   c. Rotate OZOW_PRIVATE_KEY if payment tampering suspected
2. Review audit logs for unauthorized actions
3. Check rate limiter logs for brute force patterns
4. Review all SUPERADMIN_OVERRIDE actions in last 48 hours
5. Notify affected users if data was accessed
6. Document timeline and actions taken
```

---

## 6. Weekly Maintenance Tasks

| Day | Task | Tool |
|-----|------|------|
| Monday | Review audit logs for past week | Dashboard → Audit Logs |
| Monday | Run reconciliation query | Direct DB query |
| Wednesday | Check scheduler status & pending payouts | Dashboard → Scheduler Panel |
| Wednesday | Review error logs in Railway | Railway → Logs |
| Friday | Review failed transactions & retry if needed | SuperAdmin Tools |
| Friday | Verify UptimeRobot uptime % (target: 99.5%) | UptimeRobot dashboard |

---

## 7. Key Metrics to Track

### 7.1 Business Metrics (Monthly)

| Metric | Query/Source | Target |
|--------|-------------|--------|
| Active groups | `SELECT COUNT(*) FROM stokvel_groups WHERE "isActive" = true` | Growing |
| Total members | `SELECT COUNT(*) FROM members` | Growing |
| Monthly contributions | `SELECT SUM(amount) FROM transactions WHERE "transactionType"='CONTRIBUTION' AND status='COMPLETED' AND "transactionDate" > NOW() - INTERVAL '30 days'` | Growing |
| Payout success rate | `COMPLETED payouts / Total payouts * 100` | > 95% |
| Average payment time | Avg(paidAt - transactionDate) for COMPLETED | < 5 min |

### 7.2 Technical Metrics (Weekly)

| Metric | Source | Target |
|--------|--------|--------|
| API uptime | UptimeRobot | > 99.5% |
| P95 response time | Artillery/load test | < 2 seconds |
| Error rate | Railway logs (`level:error` count) | < 1% of requests |
| Scheduler success rate | Status API | 100% |
| Failed login rate | Log analysis | Investigate if > 10/day |

---

## 8. Database Maintenance

### 8.1 Monthly Tasks

```sql
-- Check table sizes
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Check index usage
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Audit log cleanup (keep 90 days)
DELETE FROM audit_logs WHERE "createdAt" < NOW() - INTERVAL '90 days';
```

### 8.2 Backup Verification

Railway PostgreSQL includes automated backups. Verify:
1. Railway Dashboard → Database → Backups tab
2. Confirm daily backups are running
3. Test restore procedure quarterly (to a temp database)

---

## 9. Scaling Triggers

| Indicator | Current | Action Needed |
|-----------|---------|---------------|
| Active groups > 50 | Scale DB | Upgrade Railway PostgreSQL plan |
| Concurrent users > 200 | Scale compute | Add Railway replicas |
| Transaction volume > 1000/day | Optimize queries | Add database indexes, connection pooling |
| Audit logs > 100K rows | Archive | Implement weekly archive + cleanup |
| Response time P95 > 3s | Investigate | Profile slow queries, add caching |

---

## 10. Contact & Escalation

| Level | Contact | When |
|-------|---------|------|
| L1 — Monitoring | UptimeRobot alerts | Automated |
| L2 — Operations | SuperAdmin dashboard | Daily checks |
| L3 — Engineering | Development team | Code changes needed |
| External — Payments | Ozow Support | Payment gateway issues |
| External — SMS | Africa's Talking Support | SMS delivery issues |
| External — Hosting | Railway Support | Infrastructure issues |

---

## Quick Reference Card

```
DAILY:
  ☐ Check scheduler status (Dashboard or API)
  ☐ Review any FAILED payouts → retry if applicable
  ☐ Scan error logs in Railway for anomalies

WEEKLY:
  ☐ Run reconciliation SQL query
  ☐ Review full audit log
  ☐ Check uptime percentage

MONTHLY:
  ☐ Review business metrics
  ☐ Database table sizes / cleanup audit logs
  ☐ Verify backup status
  ☐ Run load test to verify performance baseline
```
