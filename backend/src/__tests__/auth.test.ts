import request from 'supertest';
import app from '../../server';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should have auth registration endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      // Should return an error but endpoint should exist (not 404)
      expect(response.status).not.toBe(404);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('Server Health', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});