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
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/transactions', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({
          groupId: 'test-group-id',
          amount: 500,
          transactionType: 'CONTRIBUTION',
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

  describe('POST /api/transactions/contribute', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/transactions/contribute')
        .send({ groupId: 'test-id', amount: 1000 });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/transactions/my', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/transactions/my');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/transactions/dashboard/:groupId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/transactions/dashboard/test-group-id');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/transactions/test-id');
      expect(response.status).toBe(401);
    });
  });
});
