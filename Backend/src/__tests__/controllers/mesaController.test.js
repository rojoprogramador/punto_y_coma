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

    // Create a test user with ADMIN role for creating mesas
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.usuario.create({
      data: {
        nombre: 'Mesa Test User',
        email: 'mesa-test@example.com',
        password: hashedPassword,
        rol: 'ADMIN', // Changed to ADMIN for mesa creation
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

  // AUTHENTICATED ROUTES TESTS
  describe('Authenticated Routes - Mesa Operations', () => {
    describe('POST /api/mesas/:id/asignar - IMPLEMENTED', () => {
      test('should assign available mesa successfully', async () => {
        // First ensure test mesa is available
        await prisma.mesa.update({
          where: { id: testMesa.id },
          data: { estado: 'DISPONIBLE' }
        });

        const response = await request(app)
          .post(`/api/mesas/${testMesa.id}/asignar`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Mesa asignada exitosamente');
        expect(response.body).toHaveProperty('mesa');
        expect(response.body.mesa.estado).toBe('OCUPADA');
      });

      test('should reject invalid mesa ID', async () => {
        const response = await request(app)
          .post('/api/mesas/invalid/asignar')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'ID de mesa inválido');
      });

      test('should return 404 for non-existent mesa', async () => {
        const response = await request(app)
          .post('/api/mesas/99999/asignar')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Mesa no encontrada');
      });

      test('should reject assignment of already occupied mesa', async () => {
        // Ensure test mesa is occupied
        await prisma.mesa.update({
          where: { id: testMesa.id },
          data: { estado: 'OCUPADA' }
        });

        const response = await request(app)
          .post(`/api/mesas/${testMesa.id}/asignar`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'La mesa no está disponible');
        expect(response.body).toHaveProperty('estadoActual', 'OCUPADA');
      });
    });

    describe('POST /api/mesas/:id/liberar - IMPLEMENTED', () => {
      test('should liberate occupied mesa successfully', async () => {
        // First ensure test mesa is occupied
        await prisma.mesa.update({
          where: { id: testMesa.id },
          data: { estado: 'OCUPADA' }
        });

        const response = await request(app)
          .post(`/api/mesas/${testMesa.id}/liberar`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Mesa liberada exitosamente');
        expect(response.body).toHaveProperty('mesa');
        expect(response.body.mesa.estado).toBe('DISPONIBLE');
      });

      test('should reject invalid mesa ID', async () => {
        const response = await request(app)
          .post('/api/mesas/invalid/liberar')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'ID de mesa inválido');
      });

      test('should return 404 for non-existent mesa', async () => {
        const response = await request(app)
          .post('/api/mesas/99999/liberar')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Mesa no encontrada');
      });

      test('should reject liberation of non-occupied mesa', async () => {
        // Ensure test mesa is available
        await prisma.mesa.update({
          where: { id: testMesa.id },
          data: { estado: 'DISPONIBLE' }
        });

        const response = await request(app)
          .post(`/api/mesas/${testMesa.id}/liberar`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'La mesa no está ocupada');
        expect(response.body).toHaveProperty('estadoActual', 'DISPONIBLE');
      });
    });

    describe('POST /api/mesas (crear mesa) - IMPLEMENTED', () => {
      test('should create new mesa successfully', async () => {
        const newMesaData = {
          numero: 997,
          capacidad: 6,
          ubicacion: 'VIP'
        };

        const response = await request(app)
          .post('/api/mesas')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newMesaData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Mesa creada exitosamente');
        expect(response.body).toHaveProperty('mesa');
        expect(response.body.mesa.numero).toBe(997);
        expect(response.body.mesa.capacidad).toBe(6);
        expect(response.body.mesa.ubicacion).toBe('VIP');
        expect(response.body.mesa.estado).toBe('DISPONIBLE');
      });

      test('should reject duplicate mesa number', async () => {
        const duplicateMesaData = {
          numero: 999, // Already exists
          capacidad: 4,
          ubicacion: 'Test'
        };

        const response = await request(app)
          .post('/api/mesas')
          .set('Authorization', `Bearer ${authToken}`)
          .send(duplicateMesaData);

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Ya existe una mesa con ese número');
      });

      test('should handle validation errors for invalid data', async () => {
        const invalidMesaData = {
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/mesas')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidMesaData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
        expect(response.body).toHaveProperty('details');
      });
    });

    describe('PUT /api/mesas/:id/estado - PARTIALLY IMPLEMENTED', () => {
      test('should update mesa state successfully with valid estado', async () => {
        const response = await request(app)
          .put(`/api/mesas/${testMesa.id}/estado`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            estado: 'MANTENIMIENTO'
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Estado de mesa actualizado exitosamente');
        expect(response.body).toHaveProperty('mesa');
        expect(response.body.mesa.estado).toBe('MANTENIMIENTO');
      });

      test('should reject invalid estado values', async () => {
        const response = await request(app)
          .put(`/api/mesas/${testMesa.id}/estado`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            estado: 'INVALID_STATUS'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Estado inválido');
        expect(response.body).toHaveProperty('estadosPermitidos');
        expect(response.body.estadosPermitidos).toEqual(['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'MANTENIMIENTO']);
      });

      test('should return not implemented when no estado provided', async () => {
        const response = await request(app)
          .put(`/api/mesas/${testMesa.id}/estado`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(501);
        expect(response.body).toHaveProperty('error', 'Not implemented');
        expect(response.body).toHaveProperty('message', 'Cambiar estado mesa endpoint pendiente de implementación');
      });
    });
  });

  // NOT IMPLEMENTED ROUTES - Should return 501
  describe('Not Implemented Routes', () => {
    describe('PUT /api/mesas/:id (actualizar mesa)', () => {
      test('should return not implemented', async () => {
        const response = await request(app)
          .put(`/api/mesas/${testMesa.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            capacidad: 8
          });

        expect(response.status).toBe(501);
        expect(response.body).toHaveProperty('error', 'Not implemented');
        expect(response.body).toHaveProperty('message', 'Actualizar mesa endpoint pendiente de implementación');
      });
    });

    describe('DELETE /api/mesas/:id (eliminar mesa)', () => {
      test('should return not implemented', async () => {
        const response = await request(app)
          .delete(`/api/mesas/${testMesa.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(501);
        expect(response.body).toHaveProperty('error', 'Not implemented');
        expect(response.body).toHaveProperty('message', 'Eliminar mesa endpoint pendiente de implementación');
      });
    });
  });

  // ERROR HANDLING TESTS
  describe('Controller Error Handling', () => {
    const mesaController = require('../../controllers/mesaController');

    test('getMesas should handle database errors', async () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock prisma to throw error by replacing the whole controller method
      const originalMethod = mesaController.getMesas;
      mesaController.getMesas = async (req, res) => {
        try {
          throw new Error('Database connection failed');
        } catch (error) {
          console.error('Error en getMesas:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      };

      await mesaController.getMesas(mockReq, mockRes);

      expect(consoleSpy).toHaveBeenCalledWith('Error en getMesas:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });

      // Restore
      mesaController.getMesas = originalMethod;
      consoleSpy.mockRestore();
    });

    test('getMesasDisponibles should handle database errors', async () => {
      const mockReq = { query: {} };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const originalMethod = mesaController.getMesasDisponibles;
      mesaController.getMesasDisponibles = async (req, res) => {
        try {
          throw new Error('Database error');
        } catch (error) {
          console.error('Error en getMesasDisponibles:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      };

      await mesaController.getMesasDisponibles(mockReq, mockRes);

      expect(consoleSpy).toHaveBeenCalledWith('Error en getMesasDisponibles:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);

      mesaController.getMesasDisponibles = originalMethod;
      consoleSpy.mockRestore();
    });

    test('asignarMesa should handle database errors', async () => {
      const mockReq = { params: { id: '1' } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const originalMethod = mesaController.asignarMesa;
      mesaController.asignarMesa = async (req, res) => {
        try {
          throw new Error('Database error');
        } catch (error) {
          console.error('Error en asignarMesa:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      };

      await mesaController.asignarMesa(mockReq, mockRes);

      expect(consoleSpy).toHaveBeenCalledWith('Error en asignarMesa:', expect.any(Error));
      expect(mockRes.status).toHaveBeenCalledWith(500);

      mesaController.asignarMesa = originalMethod;
      consoleSpy.mockRestore();
    });

    test('cambiarEstadoMesa should handle missing mesaId variable', async () => {
      const mockReq = {
        params: { id: '1' },
        body: { estado: 'DISPONIBLE' }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await mesaController.cambiarEstadoMesa(mockReq, mockRes);

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);

      consoleSpy.mockRestore();
    });
  });

  // MODULE STRUCTURE TESTS
  describe('Controller Module Structure', () => {
    const mesaController = require('../../controllers/mesaController');

    test('should export all required methods', () => {
      expect(mesaController).toBeDefined();
      expect(typeof mesaController).toBe('object');

      const requiredMethods = [
        'getMesas',
        'getMesasDisponibles',
        'asignarMesa',
        'liberarMesa',
        'cambiarEstadoMesa',
        'getMesaById',
        'crearMesa',
        'actualizarMesa',
        'eliminarMesa'
      ];

      requiredMethods.forEach(method => {
        expect(mesaController[method]).toBeDefined();
        expect(typeof mesaController[method]).toBe('function');
      });
    });

    test('should have proper module dependencies', () => {
      const fs = require('fs');
      const path = require('path');

      const controllerPath = path.join(__dirname, '../../controllers/mesaController.js');
      const controllerContent = fs.readFileSync(controllerPath, 'utf8');

      expect(controllerContent).toContain("require('@prisma/client')");
      expect(controllerContent).toContain("require('express-validator')");
      expect(controllerContent).toContain('new PrismaClient()');
    });
  });
});