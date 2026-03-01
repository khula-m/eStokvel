import request from 'supertest';
import app from '../../server';

describe('RBAC - Role-Based Access Control', () => {
  // These tests verify that all protected endpoints require authentication.
  // The RBAC tests with actual tokens (SUPERADMIN vs ADMIN vs MEMBER) 
  // should be run as integration tests with a seeded database.

  describe('SUPERADMIN-only routes reject unauthenticated requests', () => {
    it('POST /api/auth/admin/create returns 401', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create')
        .send({ phoneNumber: '0821112222', fullName: 'Test' });
      expect(response.status).toBe(401);
    });

    it('GET /api/auth/admin/list returns 401', async () => {
      const response = await request(app).get('/api/auth/admin/list');
      expect(response.status).toBe(401);
    });

    it('DELETE /api/auth/admin/:id returns 401', async () => {
      const response = await request(app).delete('/api/auth/admin/test-id');
      expect(response.status).toBe(401);
    });

    it('GET /api/auth/system/overview returns 401', async () => {
      const response = await request(app).get('/api/auth/system/overview');
      expect(response.status).toBe(401);
    });
  });

  describe('ADMIN-only routes reject unauthenticated requests', () => {
    it('POST /api/auth/member/add returns 401', async () => {
      const response = await request(app)
        .post('/api/auth/member/add')
        .send({ phoneNumber: '0821113333', fullName: 'Test', groupId: 'test' });
      expect(response.status).toBe(401);
    });

    it('POST /api/transactions (record) returns 401', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({ amount: 1000, transactionType: 'CONTRIBUTION' });
      expect(response.status).toBe(401);
    });
  });

  describe('Public endpoints are accessible without auth', () => {
    it('GET /health returns 200', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    it('POST /api/auth/login is accessible (returns non-404)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(response.status).not.toBe(404);
    });

    it('POST /api/auth/superadmin/login is accessible (returns non-404)', async () => {
      const response = await request(app)
        .post('/api/auth/superadmin/login')
        .send({});
      expect(response.status).not.toBe(404);
    });
  });
});
