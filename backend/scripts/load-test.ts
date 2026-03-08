/**
 * eStokvel — Load Testing Script
 *
 * Uses autocannon to simulate realistic traffic against the API.
 * Install: npm install -D autocannon
 * Run:     npx ts-node scripts/load-test.ts [target]
 *
 * Targets: all | auth | groups | transactions
 * Environment: Set BASE_URL (default: http://localhost:8080)
 */

import autocannon, { Result } from 'autocannon';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const DURATION = parseInt(process.env.LOAD_TEST_DURATION || '30', 10); // seconds
const CONNECTIONS = parseInt(process.env.LOAD_TEST_CONNECTIONS || '50', 10);

// A pre-obtained JWT token for authenticated endpoints
// Set via: export LOAD_TEST_TOKEN="Bearer eyJ..."
const AUTH_TOKEN = process.env.LOAD_TEST_TOKEN || '';

interface TestScenario {
  name: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: string;
  headers?: Record<string, string>;
  connections?: number;
  duration?: number;
}

function authHeaders(): Record<string, string> {
  if (!AUTH_TOKEN) {
    console.warn('⚠️  No LOAD_TEST_TOKEN set — authenticated endpoints will return 401');
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    Authorization: AUTH_TOKEN.startsWith('Bearer ') ? AUTH_TOKEN : `Bearer ${AUTH_TOKEN}`,
  };
}

// ── Test Scenarios ──

const scenarios: Record<string, TestScenario[]> = {
  auth: [
    {
      name: 'POST /api/auth/login (valid credentials)',
      url: `${BASE_URL}/api/auth/login`,
      method: 'POST',
      body: JSON.stringify({
        phoneNumber: '0712345678',
        pin: '1234',
      }),
      headers: { 'Content-Type': 'application/json' },
      connections: 20, // Lower — rate limited at 5/hr in prod
      duration: 10,
    },
    {
      name: 'GET /api/auth/health',
      url: `${BASE_URL}/health`,
      connections: 100,
    },
  ],

  groups: [
    {
      name: 'GET /api/groups (all groups — cached)',
      url: `${BASE_URL}/api/groups`,
      headers: authHeaders(),
    },
    {
      name: 'GET /api/groups/user (user groups — cached)',
      url: `${BASE_URL}/api/groups/user`,
      headers: authHeaders(),
    },
  ],

  transactions: [
    {
      name: 'GET /api/transactions (list)',
      url: `${BASE_URL}/api/transactions`,
      headers: authHeaders(),
    },
  ],
};

// ── Runner ──

async function runScenario(scenario: TestScenario): Promise<Result> {
  console.log(`\n🔥 ${scenario.name}`);
  console.log(`   Connections: ${scenario.connections || CONNECTIONS} | Duration: ${scenario.duration || DURATION}s`);

  const result = await autocannon({
    url: scenario.url,
    method: scenario.method || 'GET',
    connections: scenario.connections || CONNECTIONS,
    duration: scenario.duration || DURATION,
    headers: scenario.headers,
    body: scenario.body,
  });

  return result;
}

function printSummary(name: string, result: Result) {
  const r = result;
  const p95 = (r.latency as any).p95 ?? (r.latency as any)['p95'];
  const p99 = (r.latency as any).p99 ?? (r.latency as any)['p99'];
  const avgRps = r.requests.average;
  const errors = r.errors;
  const timeouts = r.timeouts;
  const nonSuccess = (r as any).non2xx || 0;

  const status = p95 < 200 && errors === 0 ? '✅ PASS' : '⚠️  REVIEW';

  console.log(`\n📊 ${name}`);
  console.log(`   ${status}`);
  console.log(`   Avg RPS:    ${avgRps}`);
  console.log(`   Latency:    avg=${r.latency.average}ms  p95=${p95}ms  p99=${p99}ms`);
  console.log(`   Throughput: ${(r.throughput.average / 1024).toFixed(1)} KB/s`);
  console.log(`   Errors: ${errors}  Timeouts: ${timeouts}  Non-2xx: ${nonSuccess}`);
  console.log(`   Total requests: ${r.requests.total}`);
}

async function main() {
  const target = process.argv[2] || 'all';
  console.log(`\n🚀 eStokvel Load Test — Target: ${target}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Default: ${CONNECTIONS} connections × ${DURATION}s`);
  console.log(`   Auth token: ${AUTH_TOKEN ? 'SET' : 'NOT SET'}`);

  let selectedScenarios: TestScenario[] = [];

  if (target === 'all') {
    selectedScenarios = Object.values(scenarios).flat();
  } else if (scenarios[target]) {
    selectedScenarios = scenarios[target];
  } else {
    console.error(`Unknown target: ${target}. Available: ${Object.keys(scenarios).join(', ')}, all`);
    process.exit(1);
  }

  const results: { name: string; result: Result }[] = [];

  for (const scenario of selectedScenarios) {
    const result = await runScenario(scenario);
    results.push({ name: scenario.name, result });
  }

  // ── Summary Table ──
  console.log('\n' + '═'.repeat(80));
  console.log('                         LOAD TEST SUMMARY');
  console.log('═'.repeat(80));

  for (const { name, result } of results) {
    printSummary(name, result);
  }

  console.log('\n' + '═'.repeat(80));

  // Check overall pass/fail
  const failures = results.filter(r => {
    const p95 = (r.result.latency as any).p95 ?? (r.result.latency as any)['p95'];
    return p95 >= 200 || r.result.errors > 0;
  });

  if (failures.length > 0) {
    console.log(`\n⚠️  ${failures.length}/${results.length} scenario(s) need attention.`);
    console.log('   Target: P95 < 200ms, 0 errors');
    process.exit(1);
  } else {
    console.log(`\n✅ All ${results.length} scenarios passed! P95 < 200ms, 0 errors.`);
  }
}

main().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
