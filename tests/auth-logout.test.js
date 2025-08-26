const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/services/db');

describe('Auth Logout', () => {
  beforeAll(async () => {
    // Clean up database before all tests
    await prisma.user.deleteMany();
    await prisma.tokenBlacklist.deleteMany();
  });

  afterAll(async () => {
    // Clean up database after all tests
    await prisma.user.deleteMany();
    await prisma.tokenBlacklist.deleteMany();
    await prisma.$disconnect();
  });

  it('should logout user and invalidate token', async () => {
    // Register a user
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'logout1@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(registerRes.statusCode).toEqual(201);
    const token = registerRes.body.token;

    // Login to get a token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'logout1@example.com',
        password: 'password123',
      });

    // The user was registered with the token from registration, but we need to login
    // to get a fresh token that will be properly validated against the database
    expect(loginRes.statusCode).toEqual(200);
    const loginToken = loginRes.body.token;

    // Access a protected route with the token
    const protectedRes = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${loginToken}`);

    expect(protectedRes.statusCode).toEqual(200);

    // Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${loginToken}`);

    expect(logoutRes.statusCode).toEqual(200);
    expect(logoutRes.body).toHaveProperty('success', true);
    expect(logoutRes.body).toHaveProperty('message', 'Logged out successfully');

    // Try to access the protected route again with the same token
    const afterLogoutRes = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${loginToken}`);

    expect(afterLogoutRes.statusCode).toEqual(401);
    expect(afterLogoutRes.body).toHaveProperty('error', 'Invalid token');
  });

  it('should not allow access to protected routes after logout', async () => {
    // Register a user
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'logout2@example.com',
        password: 'password123',
        name: 'Test User',
      });

    // Login to get a token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'logout2@example.com',
        password: 'password123',
      });

    // Debug: Log the response to see what's happening
    console.log('Login response:', loginRes.status, loginRes.body);

    expect(loginRes.statusCode).toEqual(200);
    const token = loginRes.body.token;

    // Logout
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // Try to access a protected route after logout
    const protectedRes = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${token}`);

    expect(protectedRes.statusCode).toEqual(401);
    expect(protectedRes.body).toHaveProperty('error', 'Invalid token');
  });

  it('should require authentication for logout', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Authorization token required');
  });

  it('should get user profile with valid token', async () => {
    // Register a user
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'profile@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(registerRes.statusCode).toEqual(201);
    const token = registerRes.body.token;

    // Get user profile
    const profileRes = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.statusCode).toEqual(200);
    expect(profileRes.body).toHaveProperty('success', true);
    expect(profileRes.body.data).toHaveProperty('email', 'profile@example.com');
    expect(profileRes.body.data).toHaveProperty('firstName', 'Test');
    expect(profileRes.body.data).toHaveProperty('lastName', 'User');
  });

  it('should not get user profile without authentication', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Authorization token required');
  });

  it('should not get user profile with invalid token after logout', async () => {
    // Register a user
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'profile2@example.com',
        password: 'password123',
        name: 'Test User',
      });

    // Login to get a token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'profile2@example.com',
        password: 'password123',
      });

    expect(loginRes.statusCode).toEqual(200);
    const token = loginRes.body.token;

    // Logout
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // Try to get user profile after logout
    const profileRes = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.statusCode).toEqual(401);
    expect(profileRes.body).toHaveProperty('error', 'Invalid token');
  });
});
