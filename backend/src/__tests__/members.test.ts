import request from 'supertest';
import app from '../../server';

describe('Members API', () => {
  describe('GET /api/members', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/members');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/members/group/:groupId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/members/group/test-group-id');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/members/invite', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/members/invite')
        .send({
          groupId: 'test-group-id',
          phoneNumber: '+27123456789',
        });
      expect(response.status).toBe(401);
    });

    it('should have the invite endpoint', async () => {
      const response = await request(app)
        .post('/api/members/invite')
        .send({});
      // Should return 401 (unauthorized) not 404 (not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('PUT /api/members/:id/status', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/members/test-id/status')
        .send({ status: 'ACTIVE' });
      expect(response.status).toBe(401);
    });
  });
});
