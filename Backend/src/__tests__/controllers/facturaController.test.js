// Tests para facturaController
// Desarrollador 4 - Rama: devArango

jest.mock('../../middleware/auth', () => ({
  verifyToken: (req, res, next) => next(),
}));

const request = require('supertest');
const app = require('../../app.js');

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrisma = {
    facturaEnc: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pedidoDet: {
      findMany: jest.fn(),
    },
    facturaDet: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('Factura Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/facturas/generar/:pedidoId', () => {
    test('should create a factura successfully', async () => {
      prisma.facturaEnc.findFirst.mockResolvedValue({ numeroFactura: '100' });
      prisma.facturaEnc.create.mockResolvedValue({
        id: 1,
        numeroFactura: '101',
        nombreCliente: 'Cliente Test',
        total: 100,
        subtotal: 108,
      });
      prisma.pedidoDet.findMany.mockResolvedValue([
        { articuloId: 1, cantidad: 2, precioUnitario: 50 },
      ]);
      prisma.facturaDet.createMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/facturas/generar/1')
        .send({
          pedidoId: 1,
          metodoPago: 'EFECTIVO',
          nombreCliente: 'Cliente Test',
          total: 100,
          usuarioId: 1,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('Factura creada exitosamente');
      expect(prisma.facturaEnc.create).toHaveBeenCalled();
      expect(prisma.facturaDet.createMany).toHaveBeenCalled();
    });

    test('should return validation error when data is missing', async () => {
      const res = await request(app)
        .post('/api/facturas/generar/1')
        .send({}); // vacío

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Datos de entrada inválidos');
    });
  });

  describe('GET /api/facturas', () => {
    test('should return facturas list', async () => {
      prisma.facturaEnc.findMany.mockResolvedValue([
        { id: 1, numeroFactura: '101', nombreCliente: 'Cliente Test' },
      ]);

      const res = await request(app).get('/api/facturas');

      expect(res.statusCode).toBe(200);
      expect(res.body.factura.length).toBe(1);
      expect(res.body.message).toBe('Facturas generadas');
    });
  });

  describe('GET /api/facturas/:id', () => {
    test('should return factura by ID', async () => {
      prisma.facturaEnc.findUnique.mockResolvedValue({
        id: 1,
        numeroFactura: '101',
      });

      const res = await request(app).get('/api/facturas/1');

      expect(res.statusCode).toBe(200);
      expect(res.body.factura.id).toBe(1);
    });

    test('should return 404 if factura not found', async () => {
      prisma.facturaEnc.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/facturas/999');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Factura no encontrada');
    });
  });

  describe('GET /api/facturas/:id/detalles', () => {
    test('should return factura details', async () => {
      prisma.facturaDet.findMany.mockResolvedValue([
        { id: 1, articuloId: 1, cantidad: 2 },
      ]);

      const res = await request(app).get('/api/facturas/1/detalles');

      expect(res.statusCode).toBe(200);
      expect(res.body.detalles.length).toBe(1);
    });
  });

  describe('PUT /api/facturas/:id/anular', () => {
    test('should annul factura successfully', async () => {
      prisma.facturaEnc.update.mockResolvedValue({
        id: 1,
        estado: 'ANULADA',
      });

      const res = await request(app).put('/api/facturas/1/anular');

      expect(res.statusCode).toBe(200);
      expect(res.body.factura.estado).toBe('ANULADA');
    });
  });
});
