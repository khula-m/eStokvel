/**
 * Auth API Integration Tests
 * Tests endpoints via supertest against the Express app.
 * Uses the real Express stack but Prisma is mocked at the module level.
 */
import request from 'supertest';
import './setup';
import { prismaMock, resetAllMocks } from './helpers/prisma-mock';
import { generateTestToken, generateExpiredToken, testUsers } from './helpers/test-utils';
import bcrypt from 'bcryptjs';

// Must import app AFTER mocks are set up
import app from '../../server';

beforeEach(() => {
  resetAllMocks();
});

describe('Auth API', () => {

  // ====== Health Check ======
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  // ====== PIN Login ======
  describe('POST /api/auth/login', () => {
    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty phone and pin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '', pin: '' });
      expect(res.body.success).toBe(false);
    });

    it('should reject PIN shorter than 5 digits', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '0831234567', pin: '1234' });
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid phone number format', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '123', pin: '56789' });
      expect(res.body.success).toBe(false);
    });

    it('should login successfully with valid credentials', async () => {
      const hashedPin = await bcrypt.hash('56789', 10);
      const user = {
        ...testUsers.admin,
        pin: hashedPin,
        mustChangePin: false,
      };
      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue(user);
      prismaMock.member.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '0831234567', pin: '56789' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');
    });

    it('should reject wrong PIN and increment failed attempts', async () => {
      const hashedPin = await bcrypt.hash('56789', 10);
      const user = { ...testUsers.admin, pin: hashedPin };
      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '0831234567', pin: '99999' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(prismaMock.user.update).toHaveBeenCalled();
    });

    it('should block SUPERADMIN from PIN login', async () => {
      prismaMock.user.findUnique.mockResolvedValue(testUsers.superadmin);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '0800000001', pin: '56789' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('web portal');
    });

    it('should return locked status for locked account', async () => {
      const lockedUser = {
        ...testUsers.admin,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        failedAttempts: 5,
      };
      prismaMock.user.findUnique.mockResolvedValue(lockedUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '0831234567', pin: '56789' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should normalize +27 phone numbers', async () => {
      const hashedPin = await bcrypt.hash('56789', 10);
      const user = { ...testUsers.admin, pin: hashedPin, mustChangePin: false };
      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue(user);
      prismaMock.member.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '27831234567', pin: '56789' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return user not found for unknown phone', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '0839999999', pin: '56789' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ====== Superadmin Login ======
  describe('POST /api/auth/superadmin/login', () => {
    it('should reject missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/superadmin/login')
        .send({});
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/superadmin/login')
        .send({ email: 'fake@test.com', password: 'wrong' });

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should login superadmin with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Admin@2026!', 10);
      const superadmin = { ...testUsers.superadmin, password: hashedPassword };
      prismaMock.user.findUnique.mockResolvedValue(superadmin);
      prismaMock.user.update.mockResolvedValue(superadmin);

      const res = await request(app)
        .post('/api/auth/superadmin/login')
        .send({ email: 'admin@estokvel.co.za', password: 'Admin@2026!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
    });
  });

  // ====== Protected: GET /api/auth/me ======
  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const token = generateExpiredToken();
      await new Promise(r => setTimeout(r, 1100));
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('should return current user with valid token', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id, role: 'MEMBER' });
      prismaMock.user.findUnique.mockResolvedValue(testUsers.admin);
      prismaMock.member.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ====== Protected: POST /api/auth/change-pin ======
  describe('POST /api/auth/change-pin', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-pin')
        .send({ currentPin: '56789', newPin: '98765' });
      expect(res.status).toBe(401);
    });

    it('should reject missing pins', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id });

      const res = await request(app)
        .post('/api/auth/change-pin')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should change PIN successfully', async () => {
      const hashedPin = await bcrypt.hash('56789', 10);
      const user = { ...testUsers.admin, pin: hashedPin };
      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue({ ...user, mustChangePin: false });

      const token = generateTestToken({ userId: testUsers.admin.id });

      const res = await request(app)
        .post('/api/auth/change-pin')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPin: '56789', newPin: '97531' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ====== SUPERADMIN: Create Admin ======
  describe('POST /api/auth/admin/create', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/auth/admin/create')
        .send({ phoneNumber: '0821112222', fullName: 'New Admin' });
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-SUPERADMIN', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id, role: 'MEMBER' });
      const res = await request(app)
        .post('/api/auth/admin/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ phoneNumber: '0821112222', fullName: 'New Admin' });
      expect(res.status).toBe(403);
    });

    it('should create admin as SUPERADMIN', async () => {
      const token = generateTestToken({ userId: testUsers.superadmin.id, role: 'SUPERADMIN' });
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'new-admin-id',
        phoneNumber: '0821112222',
        fullName: 'New Admin',
        role: 'MEMBER',
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/admin/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ phoneNumber: '0821112222', fullName: 'New Admin' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('tempPin');
    });

    it('should reject missing fields', async () => {
      const token = generateTestToken({ userId: testUsers.superadmin.id, role: 'SUPERADMIN' });
      const res = await request(app)
        .post('/api/auth/admin/create')
        .set('Authorization', `Bearer ${token}`)
        .send({ phoneNumber: '0821112222' });
      expect(res.status).toBe(400);
    });
  });

  // ====== SUPERADMIN: List Admins ======
  describe('GET /api/auth/admin/list', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/admin/list');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-SUPERADMIN', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id, role: 'MEMBER' });
      const res = await request(app)
        .get('/api/auth/admin/list')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  // ====== SUPERADMIN: Delete Admin ======
  describe('DELETE /api/auth/admin/:adminId', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).delete('/api/auth/admin/some-id');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-SUPERADMIN', async () => {
      const token = generateTestToken({ role: 'MEMBER' });
      const res = await request(app)
        .delete('/api/auth/admin/some-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  // ====== SUPERADMIN: System Overview ======
  describe('GET /api/auth/system/overview', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/system/overview');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-SUPERADMIN', async () => {
      const token = generateTestToken({ role: 'MEMBER' });
      const res = await request(app)
        .get('/api/auth/system/overview')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  // ====== ADMIN: Add Member ======
  describe('POST /api/auth/member/add', () => {
    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/auth/member/add')
        .send({ phoneNumber: '0821113333', fullName: 'New Member', groupId: 'test' });
      expect(res.status).toBe(401);
    });

    it('should reject missing required fields', async () => {
      const token = generateTestToken({ userId: testUsers.admin.id });
      const res = await request(app)
        .post('/api/auth/member/add')
        .set('Authorization', `Bearer ${token}`)
        .send({ phoneNumber: '0821113333' });
      expect(res.status).toBe(400);
    });
  });

  // ====== 404 Handler ======
  describe('Unknown Routes', () => {
    it('should return 404 for unknown endpoint', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
