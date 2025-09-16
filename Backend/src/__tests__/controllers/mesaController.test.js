const request = require('supertest');
const app = require('../../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Mesa Controller Tests', () => {
  let testUser;
  let authToken;
  let testMesa;
  let testMesa2;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.mesa.deleteMany({
      where: {
        numero: {
          in: [999, 998, 997]
        }
      }
    });

    await prisma.usuario.deleteMany({
      where: {
        email: 'mesa-test@example.com'
      }
    });

    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.usuario.create({
      data: {
        nombre: 'Mesa Test User',
        email: 'mesa-test@example.com',
        password: hashedPassword,
        rol: 'MESERO',
        activo: true
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        id: testUser.id,
        email: testUser.email,
        rol: testUser.rol
      },
      process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
      { expiresIn: '24h' }
    );

    // Create test mesas
    testMesa = await prisma.mesa.create({
      data: {
        numero: 999,
        capacidad: 4,
        estado: 'DISPONIBLE',
        ubicacion: 'Terraza'
      }
    });

    testMesa2 = await prisma.mesa.create({
      data: {
        numero: 998,
        capacidad: 2,
        estado: 'OCUPADA',
        ubicacion: 'Interior'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.mesa.deleteMany({
      where: {
        numero: {
          in: [999, 998, 997]
        }
      }
    });

    await prisma.usuario.deleteMany({
      where: {
        email: 'mesa-test@example.com'
      }
    });

    await prisma.$disconnect();
  });

  describe('GET /api/mesas - IMPLEMENTED', () => {
    test('should return all mesas', async () => {
      const response = await request(app)
        .get('/api/mesas');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Mesas obtenidas exitosamente');
      expect(response.body).toHaveProperty('mesas');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.mesas)).toBe(true);
      expect(response.body.mesas.length).toBeGreaterThanOrEqual(2);

      // Check if test mesas are in the response
      const mesaNumbers = response.body.mesas.map(mesa => mesa.numero);
      expect(mesaNumbers).toContain(999);
      expect(mesaNumbers).toContain(998);
    });

    test('should return mesas ordered by numero', async () => {
      const response = await request(app)
        .get('/api/mesas');

      expect(response.status).toBe(200);
      const mesas = response.body.mesas;

      // Check if mesas are ordered by numero (ascending)
      for (let i = 1; i < mesas.length; i++) {
        expect(mesas[i].numero).toBeGreaterThanOrEqual(mesas[i - 1].numero);
      }
    });
  });

  describe('GET /api/mesas/disponibles - IMPLEMENTED', () => {
    test('should return only available mesas', async () => {
      const response = await request(app)
        .get('/api/mesas/disponibles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Mesas disponibles obtenidas exitosamente');
      expect(response.body).toHaveProperty('mesas');
      expect(response.body).toHaveProperty('total');

      // All mesas should have estado DISPONIBLE
      response.body.mesas.forEach(mesa => {
        expect(mesa.estado).toBe('DISPONIBLE');
      });

      // Should include test mesa 999 (DISPONIBLE) but not 998 (OCUPADA)
      const mesaNumbers = response.body.mesas.map(mesa => mesa.numero);
      expect(mesaNumbers).toContain(999);
      expect(mesaNumbers).not.toContain(998);
    });

    test('should filter by minimum capacity when provided', async () => {
      const capacidadMinima = 4;
      const response = await request(app)
        .get(`/api/mesas/disponibles?capacidad=${capacidadMinima}`);

      expect(response.status).toBe(200);

      // All mesas should have capacity >= requested capacity
      response.body.mesas.forEach(mesa => {
        expect(mesa.capacidad).toBeGreaterThanOrEqual(capacidadMinima);
        expect(mesa.estado).toBe('DISPONIBLE');
      });
    });

    test('should return empty array when no mesas match capacity filter', async () => {
      const capacidadMinima = 100; // Unrealistic high capacity
      const response = await request(app)
        .get(`/api/mesas/disponibles?capacidad=${capacidadMinima}`);

      expect(response.status).toBe(200);
      expect(response.body.mesas).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/mesas/:id - IMPLEMENTED', () => {
    test('should return specific mesa by ID', async () => {
      const response = await request(app)
        .get(`/api/mesas/${testMesa.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Mesa obtenida exitosamente');
      expect(response.body).toHaveProperty('mesa');
      expect(response.body.mesa.id).toBe(testMesa.id);
      expect(response.body.mesa.numero).toBe(999);
      expect(response.body.mesa.capacidad).toBe(4);
      expect(response.body.mesa.ubicacion).toBe('Terraza');
    });

    test('should reject invalid mesa ID', async () => {
      const response = await request(app)
        .get('/api/mesas/invalid');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'ID de mesa inválido');
    });

    test('should return 404 for non-existent mesa', async () => {
      const nonExistentId = 99999;
      const response = await request(app)
        .get(`/api/mesas/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Mesa no encontrada');
    });
  });

  // PROTECTED ROUTES - Testing authentication requirement
  describe('Protected Routes - Authentication Required', () => {
    describe('POST /api/mesas/:id/asignar', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/mesas/${testMesa.id}/asignar`);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token no proporcionado o formato inválido');
      });
    });

    describe('POST /api/mesas/:id/liberar', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/mesas/${testMesa.id}/liberar`);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token no proporcionado o formato inválido');
      });
    });

    describe('POST /api/mesas (crear mesa)', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .post('/api/mesas')
          .send({
            numero: 997,
            capacidad: 6,
            ubicacion: 'VIP'
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token no proporcionado o formato inválido');
      });
    });

    describe('PUT /api/mesas/:id/estado', () => {
      test('should require authentication', async () => {
        const response = await request(app)
          .put(`/api/mesas/${testMesa.id}/estado`)
          .send({
            estado: 'MANTENIMIENTO'
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token no proporcionado o formato inválido');
      });
    });
  });

  // NOT IMPLEMENTED ROUTES - Should return 501
  describe('Not Implemented Routes', () => {
    describe('PUT /api/mesas/:id (actualizar mesa)', () => {
      test('should return not implemented', async () => {
        const response = await request(app)
          .put(`/api/mesas/${testMesa.id}`)
          .send({
            capacidad: 8
          });

        expect(response.status).toBe(401); // Auth required first
      });
    });

    describe('DELETE /api/mesas/:id (eliminar mesa)', () => {
      test('should return not implemented', async () => {
        const response = await request(app)
          .delete(`/api/mesas/${testMesa.id}`);

        expect(response.status).toBe(401); // Auth required first
      });
    });
  });
});
