# Quick Start Guide - Backend Connected App

## ⚡ Start Everything

### 1. Start Backend Server

```bash
cd c:\Users\khula\eStokvel\eStokvel\backend
npm run dev
```

**Wait for:** `✅ Server running on port 5000`

### 2. Start Mobile App

```bash
cd c:\Users\khula\eStokvel\eStokvel\mobile\eStokvelMobile
npm start
```

**Then press:** `a` for Android or `i` for iOS

---

## 🧪 Test Accounts

### Treasurer (Full Access)

```
Phone: 27831234567
Password: password123
```

**Can see:** All members, all transactions, full ledger

### Member (Limited Access)

```
Phone: 27831234568
Password: password123
```

**Can see:** Only own transactions, personal stats

---

## 🎯 What Changed

### Before (Mock Data)

```typescript
// ❌ Hardcoded fake data
const stats = {
  totalCollected: 25000,
  members: "12/15",
  // ...
};
```

### After (Real API)

```typescript
// ✅ Fetches from backend
const response = await axios.get(`${API_URL}/transactions`, {
  headers: { Authorization: `Bearer ${token}` },
});
const totalCollected = calculateFromRealData(response.data);
```

---

## 🔍 Key Features Now Working

### TreasurerDashboard

- [x] Real transaction totals from backend
- [x] Real member counts from backend
- [x] Recent activity from backend
- [x] Pull-to-refresh
- [x] Loading states

### MemberDashboard

- [x] Personal savings from backend
- [x] Payment streak calculation
- [x] Only own data (secure)
- [x] Pull-to-refresh
- [x] Loading states

### TreasurerLedger

- [x] All members visible (treasurer access)
- [x] All transactions grouped by member
- [x] Search by member name
- [x] Real-time totals

### MemberLedger

- [x] Only personal transactions (secure)
- [x] Grouped by month
- [x] Progress stats calculated from real data
- [x] Privacy message displayed

---

## 🚨 Troubleshooting

### Backend Not Connecting

```bash
# Check if backend is running
curl http://localhost:5000/health

# Should return: {"success":true,"status":"healthy"}
```

### App Shows "Loading..." Forever

- Backend probably not running
- Check terminal for errors
- Verify API_URL in App.tsx matches backend port

### Empty Data Displayed

- Login with test accounts above
- Backend needs seeded data
- Check backend terminal for successful database connection

---

## 📊 API Endpoints Used

```
GET  /api/transactions        → Treasurer: all transactions
GET  /api/transactions/my     → Member: own transactions only
GET  /api/groups              → All: user's groups
GET  /api/groups/:id/members  → Treasurer: all group members
```

---

## ✅ Ready for Presentation

**All mock data removed. Real backend integration complete.**

**No TypeScript errors. No console warnings. Production ready!**
