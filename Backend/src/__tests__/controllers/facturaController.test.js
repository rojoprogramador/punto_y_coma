// Tests para facturaController
// Desarrollador 4 - Rama: devArango

jest.mock('../../middleware/auth', () => ({
  verifyToken: (req, res, next) => next(),
  requireMeseroOrAdmin: () => (req, res, next) => next(),
  requireAdmin: () => (req, res, next) => next(),
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

    test('should create a factura with empty items', async () => {
      prisma.facturaEnc.findFirst.mockResolvedValue(null);
      prisma.facturaEnc.create.mockResolvedValue({
        id: 1,
        numeroFactura: '1',
        nombreCliente: 'Cliente Test',
        total: 100,
        subtotal: 108,
      });
      prisma.pedidoDet.findMany.mockResolvedValue([]);

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
    });

    test('should handle server error during factura creation', async () => {
      prisma.facturaEnc.findFirst.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/facturas/generar/1')
        .send({
          pedidoId: 1,
          metodoPago: 'EFECTIVO',
          nombreCliente: 'Cliente Test',
          total: 100,
          usuarioId: 1,
        });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
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

    test('should filter facturas with search parameters', async () => {
      prisma.facturaEnc.findMany.mockResolvedValue([
        { id: 1, numeroFactura: '101', nombreCliente: 'Juan' },
      ]);

      const res = await request(app)
        .get('/api/facturas')
        .send({
          fechaDesde: '2024-01-01',
          fechaHasta: '2024-12-31',
          cliente: 'Juan',
          numeroFactura: 101,
          metodoPago: 'EFECTIVO'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Facturas generadas');
    });

    test('should handle server error in getFacturas', async () => {
      prisma.facturaEnc.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/facturas');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
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

    test('should handle server error in getFacturaById', async () => {
      prisma.facturaEnc.findUnique.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/facturas/1');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
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

    test('should handle server error in getDetallesByFacturaId', async () => {
      prisma.facturaDet.findMany.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/facturas/1/detalles');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
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

    test('should handle server error in anularFactura', async () => {
      prisma.facturaEnc.update.mockRejectedValue(new Error('Database error'));

      const res = await request(app).put('/api/facturas/1/anular');

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('Error interno del servidor');
    });
  });

  // Test endpoints no implementados
  describe('NOT IMPLEMENTED endpoints', () => {
    test('should return 501 for imprimirFactura', async () => {
      const res = await request(app).get('/api/facturas/1/imprimir');
      expect(res.statusCode).toBe(501);
      expect(res.body.error).toBe('Not implemented');
    });

    test('should return 501 for getReporteVentas', async () => {
      const res = await request(app).get('/api/facturas/reportes/ventas');
      expect(res.statusCode).toBe(501);
      expect(res.body.error).toBe('Not implemented');
    });

    test('should return 501 for getEstadisticas', async () => {
      const res = await request(app).get('/api/facturas/estadisticas');
      expect(res.statusCode).toBe(501);
      expect(res.body.error).toBe('Not implemented');
    });

    test('should return 501 for getFacturaPorNumero', async () => {
      const res = await request(app).get('/api/facturas/numero/12345');
      expect(res.statusCode).toBe(501);
      expect(res.body.error).toBe('Not implemented');
    });
  });
});
