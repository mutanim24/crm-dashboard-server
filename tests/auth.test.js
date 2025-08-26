const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/services/db');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    // Clean up database before all tests
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // Clean up database after all tests
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('token');
    });

    it('should not register user with existing email', async () => {
      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'New User',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('error', 'User with this email already exists');
    });

    it('should not register user with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should not register user with short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test2@example.com',
          password: '123',
          name: 'Test User',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login User',
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'login@example.com');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should not login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should not login with missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Validation failed');
      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('should not login with missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Validation failed');
      expect(res.body).toHaveProperty('details');
      expect(Array.isArray(res.body.details)).toBe(true);
    });
  });
});
