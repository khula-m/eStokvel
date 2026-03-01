import request from 'supertest';
import app from '../../server';

describe('Groups API', () => {
  describe('GET /api/groups', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/groups');
      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', 'Bearer invalid-token');
      // 403 is returned for invalid tokens (unauthorized = forbidden)
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/groups', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: 'Test Group',
          contributionAmount: 500,
          payoutFrequency: 'MONTHLY',
        });
      expect(response.status).toBe(401);
    });

    it('should have the create group endpoint', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({});
      // Should return 401 (unauthorized) not 404 (not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/groups/test-id');
      expect(response.status).toBe(401);
    });
  });
});
