describe('Reserva Controller Tests - Basic Structure', () => {
const request = require('supertest');
const app = require('../../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Reserva Controller Tests', () => {
  let testUser;
  let authToken;
  let testMesa;
  let testReserva;

  beforeAll(async () => {
    // Limpiar datos previos
    await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
    await prisma.mesa.deleteMany({ where: { numero: { in: [9999, 9998] } } });
    await prisma.usuario.deleteMany({ where: { email: 'reserva-test@example.com' } });

    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.usuario.create({
      data: {
        nombre: 'Reserva Test User',
        email: 'reserva-test@example.com',
        password: hashedPassword,
        rol: 'ADMIN',
        activo: true
      }
    });

    // Token JWT
    authToken = jwt.sign(
      {
        id: testUser.id,
        email: testUser.email,
        rol: testUser.rol
      },
      process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
      { expiresIn: '24h' }
    );

    // Crear mesa de prueba
    testMesa = await prisma.mesa.create({
      data: {
        numero: 9999,
        capacidad: 4,
        estado: 'DISPONIBLE',
        ubicacion: 'Test Area'
      }
    });
  });

  afterAll(async () => {
    await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
    await prisma.mesa.deleteMany({ where: { numero: { in: [9999, 9998] } } });
    await prisma.usuario.deleteMany({ where: { email: 'reserva-test@example.com' } });
    await prisma.$disconnect();
  });

  describe('POST /api/reservas', () => {
    const endpoint = '/api/reservas';
    const baseReserva = {
      fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // mañana
      horaReserva: '20:00',
      numeroPersonas: 2,
      nombreCliente: 'Reserva Test User',
      telefonoCliente: '612345678',
      emailCliente: 'cliente@ejemplo.com',
      observaciones: 'Test automatizado'
    };

    test('debe crear una reserva correctamente', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...baseReserva, mesaPreferida: testMesa.id });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Reserva creada exitosamente');
      expect(res.body).toHaveProperty('reserva');
      expect(res.body.reserva.mesaId).toBe(testMesa.id);
      expect(res.body.reserva.nombreCliente).toBe('Reserva Test User');
    });

    test('debe rechazar datos inválidos (validación)', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...baseReserva, nombreCliente: '' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('debe rechazar si no hay mesas disponibles', async () => {
      // Crear una mesa ocupada para simular no disponibilidad
      const mesaOcupada = await prisma.mesa.create({
        data: { numero: 9998, capacidad: 2, estado: 'OCUPADA', ubicacion: 'Test Area' }
      });
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...baseReserva, mesaPreferida: mesaOcupada.id });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
      await prisma.mesa.delete({ where: { id: mesaOcupada.id } });
    });

    test('debe rechazar si hay conflicto de horario', async () => {
      // Crear reserva previa en la misma mesa, fecha y hora
      await prisma.reservaEnc.create({
        data: {
          ...baseReserva,
          fechaReserva: new Date(baseReserva.fechaReserva),
          horaReserva: new Date(`${baseReserva.fechaReserva}T${baseReserva.horaReserva}:00`),
          numeroPersonas: 2,
          nombreCliente: 'Conflicto',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'ACTIVA'
        }
      });
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...baseReserva, mesaPreferida: testMesa.id });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .post(endpoint)
        .send(baseReserva);
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno del servidor', async () => {
      // Simular error forzando mesaPreferida inválida
      // Se espera 404 (mesa no encontrada) o 409 (conflicto) o 500 (error interno)
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...baseReserva, mesaPreferida: 999999 });
      expect([404, 409, 500]).toContain(res.status);
    });
    
    afterEach(async () => {
      // Limpiar reservas de prueba
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: { in: ['Reserva Test User', 'Conflicto'] } } });
    });
  });

  describe('GET /api/reservas', () => {
    // Aquí irán los tests de getReservas
    const endpoint = '/api/reservas';
    let reservaId;

    beforeEach(async () => {
      // Asegurar usuario y mesa existen
      testUser = await prisma.usuario.upsert({
        where: { email: 'reserva-test@example.com' },
        update: {},
        create: {
          nombre: 'Reserva Test User',
          email: 'reserva-test@example.com',
          password: await bcrypt.hash('password123', 10),
          rol: 'ADMIN',
          activo: true
        }
      });
      testMesa = await prisma.mesa.upsert({
        where: { numero: 9999 },
        update: {},
        create: {
          numero: 9999,
          capacidad: 4,
          estado: 'DISPONIBLE',
          ubicacion: 'Test Area'
        }
      });
      // Crear reserva de prueba
      const reserva = await prisma.reservaEnc.create({
        data: {
          fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          horaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          numeroPersonas: 2,
          nombreCliente: 'Reserva Test User',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'ACTIVA'
        }
      });
      reservaId = reserva.id;
    });

    afterEach(async () => {
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
    });

    test('debe obtener todas las reservas', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reservas obtenidas exitosamente');
      expect(Array.isArray(res.body.reservas)).toBe(true);
      expect(res.body.reservas.length).toBeGreaterThanOrEqual(1);
    });

    test('debe filtrar por estado', async () => {
      const res = await request(app)
        .get(`${endpoint}?estado=ACTIVA`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.reservas.every(r => r.estado === 'ACTIVA')).toBe(true);
    });

    test('debe paginar resultados', async () => {
      const res = await request(app)
        .get(`${endpoint}?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 1);
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .get(endpoint);
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con parámetro inválido
      const res = await request(app)
        .get(`${endpoint}?page=abc`)
        .set('Authorization', `Bearer ${authToken}`);
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('GET /api/reservas/:id', () => {
    // Aquí irán los tests de getReservaById
    let reservaId;

    beforeEach(async () => {
      // Crear reserva de prueba
      const reserva = await prisma.reservaEnc.create({
        data: {
          fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          horaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          numeroPersonas: 2,
          nombreCliente: 'Reserva Test User',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'ACTIVA'
        }
      });
      reservaId = reserva.id;
    });

    afterEach(async () => {
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
    });

    test('debe obtener una reserva por ID', async () => {
      const res = await request(app)
        .get(`/api/reservas/${reservaId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reserva obtenida exitosamente');
      expect(res.body.reserva.id).toBe(reservaId);
    });

    test('debe rechazar ID inválido', async () => {
      const res = await request(app)
        .get('/api/reservas/invalid')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'ID de reserva inválido');
    });

    test('debe retornar 404 si no existe', async () => {
      const res = await request(app)
        .get('/api/reservas/999999')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Reserva no encontrada');
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .get(`/api/reservas/${reservaId}`);
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con ID negativo
      const res = await request(app)
        .get('/api/reservas/-1')
        .set('Authorization', `Bearer ${authToken}`);
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/reservas/:id', () => {
    // Aquí irán los tests de actualizarReserva
    let reservaId;
    const endpoint = id => `/api/reservas/${id}`;
    const updateData = { nombreCliente: 'Reserva Actualizada', numeroPersonas: 3 };

    beforeEach(async () => {
      // Crear reserva ACTIVA
      const reserva = await prisma.reservaEnc.create({
        data: {
          fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          horaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          numeroPersonas: 2,
          nombreCliente: 'Reserva Test User',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'ACTIVA'
        }
      });
      reservaId = reserva.id;
    });

    afterEach(async () => {
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: { in: ['Reserva Test User', 'Reserva Actualizada'] } } });
    });

    test('debe actualizar una reserva ACTIVA', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reserva actualizada exitosamente');
      expect(res.body.reserva.nombreCliente).toBe('Reserva Actualizada');
      expect(res.body.reserva.numeroPersonas).toBe(3);
    });

    test('debe rechazar datos inválidos', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nombreCliente: '' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('debe rechazar ID inválido', async () => {
      const res = await request(app)
        .put(endpoint('invalid'))
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect([
        'ID de reserva inválido',
        'Datos de entrada inválidos'
      ]).toContain(res.body.error);
    });

    test('debe retornar 404 si no existe', async () => {
      const res = await request(app)
        .put(endpoint(999999))
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Reserva no encontrada');
    });

    test('debe rechazar si la reserva no está ACTIVA', async () => {
      // Cambiar estado a CONFIRMADA
      await prisma.reservaEnc.update({ where: { id: reservaId }, data: { estado: 'CONFIRMADA' } });
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .send(updateData);
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con body inválido
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ numeroPersonas: 'no-es-numero' });
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/reservas/:id/cancelar', () => {
    // Aquí irán los tests de cancelarReserva
    let reservaId;
    const endpoint = id => `/api/reservas/${id}/cancelar`;
    const motivo = 'Motivo de cancelación';

    beforeEach(async () => {
      // Crear reserva ACTIVA
      const reserva = await prisma.reservaEnc.create({
        data: {
          fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          horaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          numeroPersonas: 2,
          nombreCliente: 'Reserva Test User',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'ACTIVA'
        }
      });
      reservaId = reserva.id;
    });

    afterEach(async () => {
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
    });

    test('debe cancelar una reserva ACTIVA', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ motivo });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reserva cancelada exitosamente');
      expect(res.body.reserva.estado).toBe('CANCELADA');
    });

    test('debe rechazar datos inválidos', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ motivo: '' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('debe rechazar ID inválido', async () => {
      const res = await request(app)
        .put(endpoint('invalid'))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ motivo });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect([
        'ID de reserva inválido',
        'Datos de entrada inválidos'
      ]).toContain(res.body.error);
    });

    test('debe retornar 404 si no existe', async () => {
      const res = await request(app)
        .put(endpoint(999999))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ motivo });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Reserva no encontrada');
    });

    test('debe rechazar si la reserva no está ACTIVA o CONFIRMADA', async () => {
      // Cambiar estado a COMPLETADA
      await prisma.reservaEnc.update({ where: { id: reservaId }, data: { estado: 'COMPLETADA' } });
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ motivo });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .send({ motivo });
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con body inválido
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`)
        .send({ motivo: 123 });
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/reservas/:id/confirmar', () => {
    // Aquí irán los tests de confirmarReserva
    let reservaId;
    const endpoint = id => `/api/reservas/${id}/confirmar`;

    beforeEach(async () => {
      // Crear reserva ACTIVA y mesa DISPONIBLE
      await prisma.mesa.update({ where: { id: testMesa.id }, data: { estado: 'DISPONIBLE' } });
      const reserva = await prisma.reservaEnc.create({
        data: {
          fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          horaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          numeroPersonas: 2,
          nombreCliente: 'Reserva Test User',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'ACTIVA'
        }
      });
      reservaId = reserva.id;
    });

    afterEach(async () => {
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
      await prisma.mesa.update({ where: { id: testMesa.id }, data: { estado: 'DISPONIBLE' } });
    });

    test('debe confirmar una reserva ACTIVA', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reserva confirmada exitosamente');
      expect(res.body.reserva.estado).toBe('CONFIRMADA');
    });

    test('debe rechazar ID inválido', async () => {
      const res = await request(app)
        .put(endpoint('invalid'))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect([
        'ID de reserva inválido',
        'Datos de entrada inválidos'
      ]).toContain(res.body.error);
    });

    test('debe retornar 404 si no existe', async () => {
      const res = await request(app)
        .put(endpoint(999999))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Reserva no encontrada');
    });

    test('debe rechazar si la reserva no está ACTIVA', async () => {
      // Cambiar estado a CANCELADA
      await prisma.reservaEnc.update({ where: { id: reservaId }, data: { estado: 'CANCELADA' } });
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .put(endpoint(reservaId));
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con ID negativo
      const res = await request(app)
        .put(endpoint(-1))
        .set('Authorization', `Bearer ${authToken}`);
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('POST /api/reservas/verificar-disponibilidad', () => {
    // Aquí irán los tests de verificarDisponibilidad
    const endpoint = '/api/reservas/verificar-disponibilidad';
    const baseData = {
      fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      horaReserva: '20:00',
      numeroPersonas: 2
    };

    test('debe verificar disponibilidad y encontrar mesas', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send(baseData);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('mesasDisponibles');
      expect(Array.isArray(res.body.mesasDisponibles)).toBe(true);
    });

    test('debe retornar vacío si no hay mesas disponibles', async () => {
      // Poner la mesa en OCUPADA
      await prisma.mesa.update({ where: { id: testMesa.id }, data: { estado: 'OCUPADA' } });
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send(baseData);
      expect([200, 404]).toContain(res.status);
      await prisma.mesa.update({ where: { id: testMesa.id }, data: { estado: 'DISPONIBLE' } });
    });

    test('debe rechazar datos inválidos', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...baseData, numeroPersonas: null });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .post(endpoint)
        .send(baseData);
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con body inválido
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fechaReserva: 'invalid', horaReserva: 'invalid', numeroPersonas: 'x' });
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('GET /api/reservas/hoy', () => {
    // Aquí irán los tests de getReservasHoy
    const endpoint = '/api/reservas/hoy';

    beforeEach(async () => {
      // Crear reserva para hoy
      const hoy = new Date();
      hoy.setHours(20, 0, 0, 0);
      await prisma.reservaEnc.create({
        data: {
          fechaReserva: hoy,
          horaReserva: hoy,
          numeroPersonas: 2,
          nombreCliente: 'Reserva Test User',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'ACTIVA'
        }
      });
    });

    afterEach(async () => {
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
    });

    test('debe obtener reservas del día', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reservas');
      expect(Array.isArray(res.body.reservas)).toBe(true);
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .get(endpoint);
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con endpoint mal formado
      const res = await request(app)
        .get('/api/reservas/hoy?limit=error')
        .set('Authorization', `Bearer ${authToken}`);
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/reservas/:id/completar', () => {
    // Aquí irán los tests de completarReserva
    let reservaId;
    const endpoint = id => `/api/reservas/${id}/completar`;

    beforeEach(async () => {
      // Crear reserva CONFIRMADA
      const reserva = await prisma.reservaEnc.create({
        data: {
          fechaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          horaReserva: new Date(Date.now() + 24 * 60 * 60 * 1000),
          numeroPersonas: 2,
          nombreCliente: 'Reserva Test User',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'CONFIRMADA'
        }
      });
      reservaId = reserva.id;
    });

    afterEach(async () => {
      await prisma.reservaEnc.deleteMany({ where: { nombreCliente: 'Reserva Test User' } });
    });

    test('debe completar una reserva CONFIRMADA', async () => {
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Reserva completada exitosamente');
      expect(res.body.reserva.estado).toBe('COMPLETADA');
    });

    test('debe rechazar ID inválido', async () => {
      const res = await request(app)
        .put(endpoint('invalid'))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'ID de reserva inválido');
    });

    test('debe retornar 404 si no existe', async () => {
      const res = await request(app)
        .put(endpoint(999999))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Reserva no encontrada');
    });

    test('debe rechazar si la reserva no está CONFIRMADA', async () => {
      // Cambiar estado a CANCELADA
      await prisma.reservaEnc.update({ where: { id: reservaId }, data: { estado: 'CANCELADA' } });
      const res = await request(app)
        .put(endpoint(reservaId))
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .put(endpoint(reservaId));
      expect([401, 403]).toContain(res.status);
    });

    test('debe manejar error interno', async () => {
      // Simular error con ID negativo
      const res = await request(app)
        .put(endpoint(-1))
        .set('Authorization', `Bearer ${authToken}`);
      expect([400, 500]).toContain(res.status);
    });
  });
  });
});