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
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/groups', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: 'Test Group',
          contributionAmount: 500,
          contributionFrequency: 'MONTHLY',
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

  describe('GET /api/groups/:id/stats', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/groups/test-id/stats');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/groups/:id/members', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/groups/test-id/members');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/groups/:id/join', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/groups/test-id/join')
        .send({ code: 'TEST123' });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/groups/code/:code', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/groups/code/MDIC2024');
      expect(response.status).toBe(401);
    });
  });
});
