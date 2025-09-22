const request = require('supertest');
const app = require('../../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Auth Controller Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Clean up existing test user if exists
    await prisma.usuario.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'newuser@example.com']
        }
      }
    });

    // Create a test user for login tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.usuario.create({
      data: {
        nombre: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        rol: 'MESERO',
        activo: true
      }
    });

    // Generate auth token for protected route tests
    authToken = jwt.sign(
      {
        id: testUser.id,
        email: testUser.email,
        rol: testUser.rol
      },
      process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.usuario.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'newuser@example.com']
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    test('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login exitoso');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.email).toBe('test@example.com');
      expect(response.body.usuario).not.toHaveProperty('password');
    });

    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
      expect(response.body).toHaveProperty('details');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
    });
  });

  describe('POST /api/auth/register', () => {
    test('should create new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'New User',
          email: 'newuser@example.com',
          password: 'Password123',
          rol: 'MESERO'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Usuario registrado exitosamente');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.email).toBe('newuser@example.com');
      expect(response.body.usuario).not.toHaveProperty('password');
    });

    test('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Another User',
          email: 'test@example.com', // This email already exists
          password: 'Password123',
          rol: 'MESERO'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'El email ya está registrado');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: '',
          email: '',
          password: '',
          rol: ''
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
      expect(response.body).toHaveProperty('details');
    });

    test('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Test User',
          email: 'weakpass@example.com',
          password: 'weak', // Too weak
          rol: 'MESERO'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
    });

    test('should validate role values', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          nombre: 'Test User',
          email: 'invalidrole@example.com',
          password: 'Password123',
          rol: 'INVALID_ROLE'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
    });
  });

  describe('GET /api/auth/verify', () => {
    test('should verify valid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Token válido');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.id).toBe(testUser.id);
    });

    test('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token no proporcionado o formato inválido');
    });

    test('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'InvalidToken');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token no proporcionado o formato inválido');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token inválido');
    });

    test('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id, email: testUser.email, rol: testUser.rol },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
        { expiresIn: '-1h' } // Expired token
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token expirado');
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: authToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Token renovado exitosamente');
      expect(response.body).toHaveProperty('token');
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Refresh token inválido o expirado');
    });

    test('should validate refresh token field', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout exitoso');
    });
  });
});