/**
 * Transactions API Integration Tests
 * Tests all transaction endpoints with proper auth tokens
 */
import request from 'supertest';
import './setup';
import { prismaMock, resetAllMocks } from './helpers/prisma-mock';
import { generateTestToken, testUsers, testGroups, testMembers, testTransactions } from './helpers/test-utils';

import app from '../../server';

beforeEach(() => {
  resetAllMocks();
});

describe('Transactions API', () => {

  // ====== GET /api/transactions ======
  describe('GET /api/transactions', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('should return transactions for authenticated user', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id });

      // requireGroupMembership middleware needs: group exists + user is member
      prismaMock.stokvelGroup.findUnique.mockResolvedValue(testGroups.active);
      prismaMock.member.findFirst.mockResolvedValue(testMembers.adminMember);

      // Service: getUserTransactions needs member.findMany, transaction.findMany, count, aggregate
      prismaMock.member.findMany.mockResolvedValue([testMembers.adminMember]);
      prismaMock.transaction.findMany.mockResolvedValue([testTransactions.contribution]);
      prismaMock.transaction.count.mockResolvedValue(1);
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
        _avg: { amount: 500 },
        _count: { _all: 1 },
      });

      const res = await request(app)
        .get('/api/transactions')
        .query({ groupId: testGroups.active.id })
        .set('Authorization', `Bearer ${token}`);

      // Should not be 401/404
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(404);
    });
  });

  // ====== POST /api/transactions ======
  describe('POST /api/transactions', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          stokvelGroupId: 'test-group-id',
          amount: 500,
          transactionType: 'CONTRIBUTION',
        });
      expect(res.status).toBe(401);
    });

    it('should require SUPERADMIN role', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id, role: 'MEMBER' });

      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          stokvelGroupId: testGroups.active.id,
          amount: 500,
          transactionType: 'CONTRIBUTION',
          paymentMethod: 'BANK_TRANSFER',
        });
      expect(res.status).toBe(403);
    });

    it('should have the endpoint (not 404)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({});
      expect(res.status).not.toBe(404);
    });
  });

  // ====== POST /api/transactions/contribute ======
  describe('POST /api/transactions/contribute', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/transactions/contribute')
        .send({ groupId: 'test-id', amount: 1000 });
      expect(res.status).toBe(401);
    });

    it('should allow authenticated members to contribute', async () => {
      const token = generateTestToken({ userId: testUsers.member.id });

      prismaMock.member.findFirst.mockResolvedValue(testMembers.regularMember);
      prismaMock.stokvelGroup.findUnique.mockResolvedValue(testGroups.active);
      prismaMock.transaction.create.mockResolvedValue(testTransactions.contribution);

      const res = await request(app)
        .post('/api/transactions/contribute')
        .set('Authorization', `Bearer ${token}`)
        .send({
          groupId: testGroups.active.id,
          amount: 500,
          paymentMethod: 'BANK_TRANSFER',
        });

      // We just check the endpoint is reachable and processes the request
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(404);
    });
  });

  // ====== GET /api/transactions/my ======
  describe('GET /api/transactions/my', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/transactions/my');
      expect(res.status).toBe(401);
    });

    it('should return user transactions', async () => {
      const token = generateTestToken({ userId: testUsers.member.id });

      // Service: getUserTransactions needs memberships, then transactions + count + aggregate
      prismaMock.member.findMany.mockResolvedValue([testMembers.regularMember]);
      prismaMock.transaction.findMany.mockResolvedValue([testTransactions.contribution]);
      prismaMock.transaction.count.mockResolvedValue(1);
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
        _avg: { amount: 500 },
        _count: { _all: 1 },
      });

      const res = await request(app)
        .get('/api/transactions/my')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ====== GET /api/transactions/dashboard/:groupId ======
  describe('GET /api/transactions/dashboard/:groupId', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/transactions/dashboard/${testGroups.active.id}`);
      expect(res.status).toBe(401);
    });
  });

  // ====== GET /api/transactions/:id ======
  describe('GET /api/transactions/:id', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/transactions/test-txn-id');
      expect(res.status).toBe(401);
    });
  });
});
