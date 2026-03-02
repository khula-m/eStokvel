/**
 * eStokvel System Flow Test Script v2
 * Fixed routes & field names based on actual codebase
 */

const http = require('http');

const BASE = 'http://localhost:5000';
const tokens = {};
let seedGroupId = '';
let newGroupId = '';
let testResults = [];
let currentSection = '';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function section(name) {
  currentSection = name;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
}

function test(name, passed, detail) {
  const icon = passed ? '\u2705' : '\u274C';
  console.log(`  ${icon} ${name}${detail ? ' -- ' + detail : ''}`);
  testResults.push({ section: currentSection, name, passed, detail });
}

async function run() {
  // ============================================================
  // 1. HEALTH CHECK
  // ============================================================
  section('1. HEALTH CHECK');
  try {
    const r = await request('GET', '/health');
    test('Server is running', r.status === 200, `HTTP ${r.status}`);
  } catch (e) {
    test('Server is running', false, e.message);
    console.log('\nServer not running. Aborting.');
    process.exit(1);
  }

  // ============================================================
  // 2. AUTHENTICATION FLOWS
  // ============================================================
  section('2. AUTHENTICATION FLOWS');

  // 2a. ADMIN PIN login
  let r = await request('POST', '/api/auth/login', { phoneNumber: '0831234567', pin: '56789' });
  test('ADMIN PIN login', r.status === 200 && r.body.success, `role=${r.body.data?.user?.role}`);
  if (r.body.data?.token) tokens.admin = r.body.data.token;

  // 2b. MEMBER PIN login
  r = await request('POST', '/api/auth/login', { phoneNumber: '0831234568', pin: '94716' });
  test('MEMBER PIN login', r.status === 200 && r.body.success, `role=${r.body.data?.user?.role}`);
  if (r.body.data?.token) tokens.member = r.body.data.token;

  // 2c. SUPERADMIN email+password login
  r = await request('POST', '/api/auth/superadmin/login', { email: 'admin@estokvel.co.za', password: 'Admin@2026!' });
  test('SUPERADMIN email+password login', r.status === 200 && r.body.success, `role=${r.body.data?.user?.role}`);
  if (r.body.data?.token) tokens.superadmin = r.body.data.token;

  // 2d. Wrong PIN rejection
  r = await request('POST', '/api/auth/login', { phoneNumber: '0831234567', pin: '00000' });
  test('Wrong PIN rejected (401)', r.status === 401, `msg=${r.body.message}`);

  // 2e. Missing fields
  r = await request('POST', '/api/auth/login', { phoneNumber: '0831234567' });
  test('Missing PIN rejected (400)', r.status === 400, `msg=${r.body.message}`);

  // 2f. Non-existent phone
  r = await request('POST', '/api/auth/login', { phoneNumber: '0000000000', pin: '12345' });
  test('Non-existent phone rejected (401)', r.status === 401);

  // 2g. Get current user (GET /api/auth/me)
  r = await request('GET', '/api/auth/me', null, tokens.admin);
  test('Get current user (ADMIN)', r.status === 200 && r.body.success, `name=${r.body.data?.fullName || r.body.data?.user?.fullName}`);

  r = await request('GET', '/api/auth/me', null, tokens.superadmin);
  test('Get current user (SUPERADMIN)', r.status === 200 && r.body.success, `name=${r.body.data?.fullName || r.body.data?.user?.fullName}`);

  // ============================================================
  // 3. ACCOUNT LOCKOUT
  // ============================================================
  section('3. ACCOUNT LOCKOUT (phone: 0831234572)');

  for (let i = 1; i <= 4; i++) {
    r = await request('POST', '/api/auth/login', { phoneNumber: '0831234572', pin: '00000' });
    test(`Wrong attempt ${i}/5`, r.status === 401, `msg=${r.body.message}`);
  }

  // 5th attempt should lock
  r = await request('POST', '/api/auth/login', { phoneNumber: '0831234572', pin: '00000' });
  test('5th wrong attempt locks account', r.status === 401 && r.body.locked === true, `msg=${r.body.message}`);

  // 6th attempt with CORRECT pin should still be locked
  r = await request('POST', '/api/auth/login', { phoneNumber: '0831234572', pin: '94716' });
  test('Correct PIN rejected when locked', r.status === 401 && r.body.locked === true, `msg=${r.body.message}`);

  // ============================================================
  // 4. MUST CHANGE PIN
  // ============================================================
  section('4. MUST CHANGE PIN');

  // Login with member who has mustChangePin=true
  r = await request('POST', '/api/auth/login', { phoneNumber: '0831234569', pin: '94716' });
  const memberForPinChange = r.body.data?.token;
  test('Member login for PIN change', r.status === 200 && r.body.data?.user?.mustChangePin === true, `mustChangePin=${r.body.data?.user?.mustChangePin}`);

  if (memberForPinChange) {
    // Change PIN -- use a non-common, non-sequential 5-digit PIN
    r = await request('POST', '/api/auth/change-pin', { currentPin: '94716', newPin: '83517' }, memberForPinChange);
    test('Change PIN', r.status === 200 && r.body.success, `msg=${r.body.message}`);

    // Login with new PIN
    r = await request('POST', '/api/auth/login', { phoneNumber: '0831234569', pin: '83517' });
    test('Login with new PIN', r.status === 200 && r.body.success && r.body.data?.user?.mustChangePin === false, `mustChangePin=${r.body.data?.user?.mustChangePin}`);
  }

  // ============================================================
  // 5. RBAC ACCESS CONTROL
  // ============================================================
  section('5. RBAC ACCESS CONTROL');

  // SUPERADMIN-only: Create Admin (POST /api/auth/admin/create)
  r = await request('POST', '/api/auth/admin/create', { phoneNumber: '0839999999', fullName: 'Test Admin' }, tokens.superadmin);
  test('SUPERADMIN can create admin', r.status === 201 && r.body.success, `admin=${r.body.data?.admin?.fullName}, tempPin=${r.body.data?.tempPin}`);

  r = await request('POST', '/api/auth/admin/create', { phoneNumber: '0839999998', fullName: 'Test Admin 2' }, tokens.admin);
  test('ADMIN cannot create admin (403)', r.status === 403, `HTTP ${r.status}`);

  r = await request('POST', '/api/auth/admin/create', { phoneNumber: '0839999997', fullName: 'Test Admin 3' }, tokens.member);
  test('MEMBER cannot create admin (403)', r.status === 403, `HTTP ${r.status}`);

  // List admins (SUPERADMIN only)
  r = await request('GET', '/api/auth/admin/list', null, tokens.superadmin);
  test('SUPERADMIN list admins', r.status === 200, `HTTP ${r.status}`);

  r = await request('GET', '/api/auth/admin/list', null, tokens.admin);
  test('ADMIN cannot list admins (403)', r.status === 403, `HTTP ${r.status}`);

  // System overview (SUPERADMIN only)
  r = await request('GET', '/api/auth/system/overview', null, tokens.superadmin);
  test('SUPERADMIN system overview', r.status === 200, `HTTP ${r.status}`);

  // No token
  r = await request('GET', '/api/groups');
  test('No token rejected (401)', r.status === 401, `HTTP ${r.status}`);

  // ============================================================
  // 6. GROUPS CRUD
  // ============================================================
  section('6. GROUPS CRUD');

  // List groups (any authenticated user)
  r = await request('GET', '/api/groups', null, tokens.admin);
  test('List groups', r.status === 200 && r.body.success, `count=${Array.isArray(r.body.data) ? r.body.data.length : r.body.data?.groups?.length || '?'}`);

  // Find existing seed group
  if (r.body.data) {
    const groups = Array.isArray(r.body.data) ? r.body.data : r.body.data.groups || [];
    if (groups.length > 0) seedGroupId = groups[0].id;
  }

  // Create group (ADMIN) -- use contributionFrequency (not payoutFrequency)
  r = await request('POST', '/api/groups', {
    name: 'Test Stokvel Group',
    description: 'Created during flow testing',
    contributionAmount: 500,
    contributionFrequency: 'MONTHLY',
    durationMonths: 12
  }, tokens.admin);
  test('ADMIN create group', r.status === 201 || (r.status === 200 && r.body.success), `msg=${r.body.message || 'created'}`);
  newGroupId = r.body.data?.id || r.body.data?.group?.id;

  // Use seed group for detail queries (admin is member of it)
  const gId = seedGroupId || newGroupId;
  if (gId) {
    // Get group by ID
    r = await request('GET', `/api/groups/${gId}`, null, tokens.admin);
    test('Get group by ID', r.status === 200, `name=${r.body.data?.name || r.body.data?.group?.name || '?'}`);

    // Get group stats
    r = await request('GET', `/api/groups/${gId}/stats`, null, tokens.admin);
    test('Get group stats', r.status === 200, `HTTP ${r.status}`);

    // Get group members
    r = await request('GET', `/api/groups/${gId}/members`, null, tokens.admin);
    test('Get group members', r.status === 200, `HTTP ${r.status}`);

    // Get group by code
    r = await request('GET', '/api/groups/code/MDIC2024', null, tokens.member);
    test('Get group by invite code', r.status === 200, `HTTP ${r.status}`);
  }

  // MEMBER should NOT be able to create groups (only ADMIN can)
  r = await request('POST', '/api/groups', {
    name: 'Member Group Attempt',
    description: 'Should be rejected'
  }, tokens.member);
  test('MEMBER cannot create group (403)', r.status === 403, `HTTP ${r.status} -- ${r.body.message || ''}`);

  // ============================================================
  // 7. TRANSACTIONS
  // ============================================================
  section('7. TRANSACTIONS');

  // Use SEED group for transaction tests (both admin and member are members of it)
  if (seedGroupId) {
    // List transactions
    r = await request('GET', `/api/transactions?stokvelGroupId=${seedGroupId}`, null, tokens.admin);
    test('List transactions', r.status === 200, `HTTP ${r.status}`);

    // Create transaction (ADMIN)
    r = await request('POST', '/api/transactions', {
      stokvelGroupId: seedGroupId,
      transactionType: 'CONTRIBUTION',
      amount: 500,
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Monthly contribution - test'
    }, tokens.admin);
    test('ADMIN create transaction', r.status === 201 || r.status === 200, `HTTP ${r.status} -- msg=${r.body.message || ''}`);

    // Contribute (MEMBER) — member is in seed group (digital payment required)
    r = await request('POST', '/api/transactions/contribute', {
      stokvelGroupId: seedGroupId,
      amount: 500,
      paymentMethod: 'EFT'
    }, tokens.member);
    test('MEMBER contribute', r.status === 201 || r.status === 200, `HTTP ${r.status} -- msg=${r.body.message || ''}`);

    // My transactions
    r = await request('GET', '/api/transactions/my', null, tokens.member);
    test('Get my transactions (MEMBER)', r.status === 200, `HTTP ${r.status}`);

    r = await request('GET', '/api/transactions/my', null, tokens.admin);
    test('Get my transactions (ADMIN)', r.status === 200, `HTTP ${r.status}`);

    // Dashboard
    r = await request('GET', `/api/transactions/dashboard/${seedGroupId}`, null, tokens.admin);
    test('Get dashboard', r.status === 200, `HTTP ${r.status}`);
  }

  // ============================================================
  // 8. PAYMENTS
  // ============================================================
  section('8. PAYMENTS');

  // Use SEED group for payment tests
  if (seedGroupId) {
    // Set bank details
    r = await request('PUT', `/api/payments/groups/${seedGroupId}/bank-details`, {
      bankName: 'FNB',
      accountNumber: '62123456789',
      accountHolder: 'Stokvel Fund',
      branchCode: '250655'
    }, tokens.admin);
    test('Set bank details (ADMIN)', r.status === 200, `HTTP ${r.status} -- msg=${r.body.message || ''}`);

    // Get bank details
    r = await request('GET', `/api/payments/groups/${seedGroupId}/bank-details`, null, tokens.admin);
    test('Get bank details (ADMIN)', r.status === 200, `HTTP ${r.status}`);

    r = await request('GET', `/api/payments/groups/${seedGroupId}/bank-details`, null, tokens.member);
    test('Get bank details (MEMBER)', r.status === 200, `HTTP ${r.status}`);

    // Get pending verifications
    r = await request('GET', `/api/payments/groups/${seedGroupId}/pending`, null, tokens.admin);
    test('Get pending payments', r.status === 200, `HTTP ${r.status}`);
  }

  // ============================================================
  // 9. CHAT
  // ============================================================
  section('9. CHAT');

  // Use SEED group for chat tests (both users are members)
  if (seedGroupId) {
    // Send message
    r = await request('POST', '/api/chat/messages', {
      stokvelGroupId: seedGroupId,
      message: 'Hello from flow test!'
    }, tokens.member);
    test('Send chat message (MEMBER)', r.status === 201 || r.status === 200, `HTTP ${r.status}`);

    r = await request('POST', '/api/chat/messages', {
      stokvelGroupId: seedGroupId,
      message: 'Admin message test'
    }, tokens.admin);
    test('Send chat message (ADMIN)', r.status === 201 || r.status === 200, `HTTP ${r.status}`);

    // Get messages
    r = await request('GET', `/api/chat/groups/${seedGroupId}/messages`, null, tokens.member);
    test('Get chat messages', r.status === 200, `HTTP ${r.status}`);

    // Mark as read
    r = await request('PUT', `/api/chat/groups/${seedGroupId}/read`, {}, tokens.member);
    test('Mark messages as read', r.status === 200, `HTTP ${r.status}`);

    // Get unread count
    r = await request('GET', '/api/chat/unread', null, tokens.admin);
    test('Get unread count', r.status === 200, `HTTP ${r.status}`);
  }

  // ============================================================
  // 10. NOTIFICATIONS
  // ============================================================
  section('10. NOTIFICATIONS');

  r = await request('GET', '/api/notifications', null, tokens.member);
  test('Get notifications (MEMBER)', r.status === 200, `HTTP ${r.status}`);

  r = await request('GET', '/api/notifications', null, tokens.admin);
  test('Get notifications (ADMIN)', r.status === 200, `HTTP ${r.status}`);

  // ============================================================
  // 11. USER PROFILE
  // ============================================================
  section('11. USER PROFILE');

  // GET /api/users/me
  r = await request('GET', '/api/users/me', null, tokens.member);
  test('Get MEMBER profile (/users/me)', r.status === 200, `HTTP ${r.status}`);

  r = await request('GET', '/api/users/me', null, tokens.admin);
  test('Get ADMIN profile (/users/me)', r.status === 200, `HTTP ${r.status}`);

  // Also /api/auth/me
  r = await request('GET', '/api/auth/me', null, tokens.member);
  test('Get MEMBER profile (/auth/me)', r.status === 200, `HTTP ${r.status}`);

  // ============================================================
  // 12. ADMIN: ADD MEMBER TO GROUP
  // ============================================================
  section('12. ADMIN: ADD MEMBER');

  r = await request('POST', '/api/auth/member/add', {
    phoneNumber: '0821112222',
    fullName: 'New Test Member',
    groupId: seedGroupId
  }, tokens.admin);
  test('ADMIN add member to group', r.status === 201 || r.status === 200, `HTTP ${r.status} -- msg=${r.body.message || ''}`);

  // MEMBER cannot add member
  r = await request('POST', '/api/auth/member/add', {
    phoneNumber: '0821113333',
    fullName: 'Unauthorized Add',
    groupId: seedGroupId
  }, tokens.member);
  test('MEMBER cannot add member (403)', r.status === 403, `HTTP ${r.status}`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n${'='.repeat(60)}`);
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  const total = testResults.length;

  console.log(`  Total: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`  Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n  FAILURES:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`    [${t.section}] ${t.name} -- ${t.detail || 'no detail'}`);
    });
  }

  console.log(`\n${'='.repeat(60)}`);
}

run().catch(e => { console.error('Fatal error:', e); process.exit(1); });
