import request from 'supertest';
import app from '../../server';

describe('Transactions API', () => {
  describe('GET /api/transactions', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/transactions');
      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token');
      // 403 is returned for invalid tokens (unauthorized = forbidden)
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/transactions', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          groupId: 'test-group-id',
          amount: 500,
          type: 'CONTRIBUTION',
        });
      expect(response.status).toBe(401);
    });

    it('should have the create transaction endpoint', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({});
      // Should return 401 (unauthorized) not 404 (not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('PUT /api/transactions/:id/verify', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/transactions/test-id/verify')
        .send({ status: 'VERIFIED' });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/transactions/group/:groupId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/transactions/group/test-group-id');
      expect(response.status).toBe(401);
    });
  });
});
