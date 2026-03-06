/**
 * RBAC & Members API Tests
 * Verifies role-based access control and member management endpoints
 */
import request from 'supertest';
import './setup';
import { prismaMock, resetAllMocks } from './helpers/prisma-mock';
import { generateTestToken, testUsers } from './helpers/test-utils';

import app from '../../server';

beforeEach(() => {
  resetAllMocks();
});

describe('RBAC - Role-Based Access Control', () => {

  describe('SUPERADMIN-only routes reject unauthenticated requests', () => {
    it('POST /api/auth/admin/create returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/admin/create')
        .send({ phoneNumber: '0821112222', fullName: 'Test' });
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/admin/list returns 401', async () => {
      const res = await request(app).get('/api/auth/admin/list');
      expect(res.status).toBe(401);
    });

    it('DELETE /api/auth/admin/:id returns 401', async () => {
      const res = await request(app).delete('/api/auth/admin/test-id');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/system/overview returns 401', async () => {
      const res = await request(app).get('/api/auth/system/overview');
      expect(res.status).toBe(401);
    });
  });

  describe('SUPERADMIN-only routes reject MEMBER tokens', () => {
    it('POST /api/auth/admin/create returns 403', async () => {
      const token = generateTestToken({ role: 'MEMBER' });
      const res = await request(app)
        .post('/api/auth/admin/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ phoneNumber: '0821112222', fullName: 'Test' });
      expect(res.status).toBe(403);
    });

    it('GET /api/auth/admin/list returns 403', async () => {
      const token = generateTestToken({ role: 'MEMBER' });
      const res = await request(app)
        .get('/api/auth/admin/list')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('DELETE /api/auth/admin/:id returns 403', async () => {
      const token = generateTestToken({ role: 'MEMBER' });
      const res = await request(app)
        .delete('/api/auth/admin/test-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/auth/system/overview returns 403', async () => {
      const token = generateTestToken({ role: 'MEMBER' });
      const res = await request(app)
        .get('/api/auth/system/overview')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('SUPERADMIN-only routes accept SUPERADMIN tokens', () => {
    it('GET /api/auth/admin/list returns 200', async () => {
      const token = generateTestToken({ userId: testUsers.superadmin.id, role: 'SUPERADMIN' });
      prismaMock.member.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/auth/admin/list')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/auth/system/overview returns 200', async () => {
      const token = generateTestToken({ userId: testUsers.superadmin.id, role: 'SUPERADMIN' });
      // getSystemOverview calls: member.groupBy, stokvelGroup.count, user.count, transaction.aggregate
      prismaMock.member.groupBy.mockResolvedValue([{ userId: 'admin-1' }]);
      prismaMock.stokvelGroup.count.mockResolvedValue(3);
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
        _count: 100,
      });

      const res = await request(app)
        .get('/api/auth/system/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('ADMIN-only routes reject unauthenticated requests', () => {
    it('POST /api/auth/member/add returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/member/add')
        .send({ phoneNumber: '0821113333', fullName: 'Test', groupId: 'test' });
      expect(res.status).toBe(401);
    });
  });

  describe('Transaction recording respects roles', () => {
    it('POST /api/transactions returns 401 unauthenticated', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ amount: 1000, transactionType: 'CONTRIBUTION' });
      expect(res.status).toBe(401);
    });

    it('POST /api/transactions returns 403 for non-SUPERADMIN', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id, role: 'MEMBER' });
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000, transactionType: 'CONTRIBUTION' });
      expect(res.status).toBe(403);
    });
  });

  describe('Public endpoints are accessible without auth', () => {
    it('GET /health returns 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('POST /api/auth/login is accessible', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).not.toBe(404);
    });

    it('POST /api/auth/superadmin/login is accessible', async () => {
      const res = await request(app).post('/api/auth/superadmin/login').send({});
      expect(res.status).not.toBe(404);
    });
  });

  describe('DELETE /api/auth/member/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).delete('/api/auth/member/some-member-id');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-SUPERADMIN', async () => {
      const token = generateTestToken({ role: 'MEMBER' });
      const res = await request(app)
        .delete('/api/auth/member/some-member-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});
