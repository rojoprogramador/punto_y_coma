// Tests completos para mesaController
// Implementados por el Desarrollador 2 (rama: devOviedo)

const request = require('supertest');
const app = require('../../app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Mesa Controller Tests', () => {
  let testMesa;
  let authToken;

  beforeAll(async () => {
    // Crear usuario de prueba y obtener token
    const testUser = await prisma.usuario.create({
      data: {
        nombre: 'Test Mesero',
        email: 'test@mesa.com',
        password: 'hashedpassword',
        rol: 'MESERO',
        activo: true
      }
    });

    // Simular login para obtener token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@mesa.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  beforeEach(async () => {
    // Crear mesa de prueba
    testMesa = await prisma.mesa.create({
      data: {
        numero: 999,
        capacidad: 4,
        ubicacion: 'Test Area',
        estado: 'DISPONIBLE'
      }
    });
  });

  afterEach(async () => {
    // Limpiar datos de prueba
    await prisma.mesa.deleteMany({
      where: { numero: { gte: 999 } }
    });
  });

  afterAll(async () => {
    // Limpiar usuario de prueba
    await prisma.usuario.deleteMany({
      where: { email: 'test@mesa.com' }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/mesas', () => {
    test('should return all mesas', async () => {
      const response = await request(app)
        .get('/api/mesas')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('mesas');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.mesas)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    test('should filter mesas by estado', async () => {
      const response = await request(app)
        .get('/api/mesas?estado=DISPONIBLE')
        .expect(200);

      expect(response.body.mesas.every(mesa => mesa.estado === 'DISPONIBLE')).toBe(true);
    });

    test('should filter mesas by capacidad', async () => {
      const response = await request(app)
        .get('/api/mesas?capacidad=4')
        .expect(200);

      expect(response.body.mesas.every(mesa => mesa.capacidad >= 4)).toBe(true);
    });
  });

  describe('GET /api/mesas/disponibles', () => {
    test('should return only available mesas', async () => {
      const response = await request(app)
        .get('/api/mesas/disponibles')
        .expect(200);

      expect(response.body).toHaveProperty('mesas');
      expect(response.body.mesas.every(mesa => mesa.estado === 'DISPONIBLE')).toBe(true);
    });

    test('should filter by minimum capacity', async () => {
      const response = await request(app)
        .get('/api/mesas/disponibles?capacidad=4')
        .expect(200);

      expect(response.body.mesas.every(mesa => mesa.capacidad >= 4)).toBe(true);
    });
  });

  describe('GET /api/mesas/:id', () => {
    test('should return mesa by ID', async () => {
      const response = await request(app)
        .get(`/api/mesas/${testMesa.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('mesa');
      expect(response.body.mesa.id).toBe(testMesa.id);
      expect(response.body.mesa.numero).toBe(testMesa.numero);
    });

    test('should return 404 for non-existent mesa', async () => {
      const response = await request(app)
        .get('/api/mesas/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/mesas/invalid')
        .expect(400);

      expect(response.body.error).toBe('ID de mesa inválido');
    });
  });

  describe('POST /api/mesas/:id/asignar', () => {
    test('should assign mesa successfully', async () => {
      const response = await request(app)
        .post(`/api/mesas/${testMesa.id}/asignar`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.mesa.estado).toBe('OCUPADA');
    });

    test('should reject already occupied mesa', async () => {
      // Primero ocupar la mesa
      await prisma.mesa.update({
        where: { id: testMesa.id },
        data: { estado: 'OCUPADA' }
      });

      const response = await request(app)
        .post(`/api/mesas/${testMesa.id}/asignar`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.error).toBe('La mesa no está disponible');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/mesas/${testMesa.id}/asignar`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/mesas/:id/liberar', () => {
    beforeEach(async () => {
      // Ocupar la mesa antes de cada test
      await prisma.mesa.update({
        where: { id: testMesa.id },
        data: { estado: 'OCUPADA' }
      });
    });

    test('should free mesa successfully', async () => {
      const response = await request(app)
        .post(`/api/mesas/${testMesa.id}/liberar`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.mesa.estado).toBe('DISPONIBLE');
    });

    test('should reject non-occupied mesa', async () => {
      // Cambiar estado a disponible
      await prisma.mesa.update({
        where: { id: testMesa.id },
        data: { estado: 'DISPONIBLE' }
      });

      const response = await request(app)
        .post(`/api/mesas/${testMesa.id}/liberar`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.error).toBe('La mesa no está ocupada');
    });
  });

  describe('PUT /api/mesas/:id/estado', () => {
    test('should change mesa state successfully', async () => {
      const response = await request(app)
        .put(`/api/mesas/${testMesa.id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          estado: 'MANTENIMIENTO',
          motivo: 'Limpieza profunda'
        })
        .expect(200);

      expect(response.body.mesa.estado).toBe('MANTENIMIENTO');
      expect(response.body.cambio.estadoAnterior).toBe('DISPONIBLE');
    });

    test('should reject invalid state transition', async () => {
      // Cambiar a ocupada primero
      await prisma.mesa.update({
        where: { id: testMesa.id },
        data: { estado: 'OCUPADA' }
      });

      const response = await request(app)
        .put(`/api/mesas/${testMesa.id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'RESERVADA' })
        .expect(409);

      expect(response.body.error).toBe('Transición de estado no permitida');
    });
  });

  describe('POST /api/mesas', () => {
    test('should create mesa successfully (admin)', async () => {
      // Crear token de admin
      const adminUser = await prisma.usuario.create({
        data: {
          nombre: 'Admin Test',
          email: 'admin@test.com',
          password: 'hashedpassword',
          rol: 'ADMIN',
          activo: true
        }
      });

      const adminResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });

      const adminToken = adminResponse.body.token;

      const response = await request(app)
        .post('/api/mesas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          numero: 1000,
          capacidad: 6,
          ubicacion: 'Terraza'
        })
        .expect(201);

      expect(response.body).toHaveProperty('mesa');
      expect(response.body.mesa.numero).toBe(1000);

      // Limpiar
      await prisma.usuario.delete({ where: { email: 'admin@test.com' } });
    });

    test('should reject duplicate mesa number', async () => {
      const response = await request(app)
        .post('/api/mesas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          numero: testMesa.numero,
          capacidad: 4,
          ubicacion: 'Test'
        })
        .expect(409);

      expect(response.body.error).toBe('Ya existe una mesa con ese número');
    });
  });
});