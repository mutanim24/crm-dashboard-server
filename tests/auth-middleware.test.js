const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/services/db');
const bcrypt = require('bcryptjs');

describe('Authentication Middleware', () => {
  beforeAll(async () => {
    // Clean up database before tests
    await prisma.user.deleteMany();
    await prisma.tokenBlacklist.deleteMany();
    
    // Hash the password for the test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create a test user
    await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'middleware@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
      },
    });
  });

  afterAll(async () => {
    // Clean up database after tests
    await prisma.user.deleteMany();
    await prisma.tokenBlacklist.deleteMany();
    await prisma.$disconnect();
  });

  describe('Protected Routes', () => {
    it('should not access protected routes without authentication', async () => {
      // Try to access contacts without authentication
      const res = await request(app)
        .get('/api/v1/contacts');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Authorization token required');
    });

    it('should not access protected routes with invalid token', async () => {
      // Try to access contacts with invalid token
      const res = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid token');
    });

    it('should not access protected routes with expired token', async () => {
      // Create an expired token (by setting expiration to past)
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 'test-user-id', email: 'middleware@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      );

      // Try to access contacts with expired token
      const res = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Token expired');
    });

    it('should not access protected routes with blacklisted token', async () => {
      // Login to get a token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'middleware@example.com',
          password: 'password123',
        });

      expect(loginRes.statusCode).toEqual(200);
      const token = loginRes.body.token;

      // Logout to blacklist the token
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to access contacts with blacklisted token
      const res = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Token has been invalidated');
    });

    it('should access protected routes with valid token', async () => {
      // Login to get a valid token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'middleware@example.com',
          password: 'password123',
        });

      expect(loginRes.statusCode).toEqual(200);
      const token = loginRes.body.token;

      // Try to access contacts with valid token
      const res = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should not access protected routes with valid token but non-existent user', async () => {
      // Create a token with a non-existent user ID
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: 'non-existent-user-id', email: 'nonexistent@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Try to access contacts with token for non-existent user
      const res = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Token has been invalidated');
    });
  });
});
