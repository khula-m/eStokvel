import request from 'supertest';
import app from '../../server';

describe('Auth API', () => {
  // ====== Public: PIN Login (ADMIN/MEMBER) ======
  describe('POST /api/auth/login', () => {
    it('should have the PIN login endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      // Should return an error but endpoint should exist (not 404)
      expect(response.status).not.toBe(404);
    });

    it('should reject empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '', pin: '' });
      expect(response.body.success).toBe(false);
    });

    it('should reject PIN shorter than 5 digits', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '0831234567', pin: '1234' });
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('5 digits');
    });
  });

  // ====== Public: SUPERADMIN Login (Email + Password) ======
  describe('POST /api/auth/superadmin/login', () => {
    it('should have the superadmin login endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/superadmin/login')
        .send({});
      expect(response.status).not.toBe(404);
    });

    it('should reject empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/superadmin/login')
        .send({ email: '', password: '' });
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email/password', async () => {
      const response = await request(app)
        .post('/api/auth/superadmin/login')
        .send({ email: 'fake@test.com', password: 'wrong' });
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  // ====== Protected: Current User ======
  describe('GET /api/auth/me', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
    });
  });

  // ====== Protected: Change PIN ======
  describe('POST /api/auth/change-pin', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/change-pin')
        .send({ oldPin: '12345', newPin: '67890' });
      expect(response.status).toBe(401);
    });
  });

  // ====== SUPERADMIN-only: Admin Management ======
  describe('POST /api/auth/admin/create', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/admin/create')
        .send({ phoneNumber: '0821112222', fullName: 'New Admin' });
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/admin/list', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/auth/admin/list');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/system/overview', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/auth/system/overview');
      expect(response.status).toBe(401);
    });
  });

  // ====== ADMIN-only: Member Management ======
  describe('POST /api/auth/member/add', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/member/add')
        .send({ phoneNumber: '0821113333', fullName: 'New Member', groupId: 'test' });
      expect(response.status).toBe(401);
    });
  });

  // ====== Health Check ======
  describe('GET /health', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
    });
  });
});
