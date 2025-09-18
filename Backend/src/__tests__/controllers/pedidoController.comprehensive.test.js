const request = require('supertest');
const app = require('../../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('Pedido Controller - Comprehensive Tests', () => {
  let testUser;
  let authToken;
  let testMesa;
  let testArticulo1;
  let testArticulo2;
  let testPedido;

  beforeAll(async () => {
    // Limpiar datos previos
    await prisma.pedidoDet.deleteMany({});
    await prisma.pedidoEnc.deleteMany({});
    await prisma.articulo.deleteMany({ where: { nombre: { startsWith: 'Test' } } });
    await prisma.mesa.deleteMany({ where: { numero: { in: [9999, 9998] } } });
    await prisma.usuario.deleteMany({ where: { email: 'pedido-test@example.com' } });

    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await prisma.usuario.create({
      data: {
        nombre: 'Pedido Test User',
        email: 'pedido-test@example.com',
        password: hashedPassword,
        rol: 'MESERO',
        activo: true
      }
    });

    // Token JWT
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email, rol: testUser.rol },
      process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
      { expiresIn: '24h' }
    );

    // Crear mesa de prueba
    testMesa = await prisma.mesa.create({
      data: {
        numero: 9999,
        capacidad: 4,
        estado: 'OCUPADA',
        ubicacion: 'Test Area'
      }
    });

    // Crear artículos de prueba
    testArticulo1 = await prisma.articulo.create({
      data: {
        nombre: 'Test Plato 1',
        descripcion: 'Plato de prueba 1',
        precio: 15.50,
        categoria: 'PLATO_PRINCIPAL',
        disponible: true
      }
    });

    testArticulo2 = await prisma.articulo.create({
      data: {
        nombre: 'Test Bebida 1',
        descripcion: 'Bebida de prueba 1',
        precio: 3.50,
        categoria: 'BEBIDA',
        disponible: true
      }
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.pedidoDet.deleteMany({});
    await prisma.pedidoEnc.deleteMany({});
    await prisma.articulo.deleteMany({ where: { nombre: { startsWith: 'Test' } } });
    await prisma.mesa.deleteMany({ where: { numero: { in: [9999, 9998] } } });
    await prisma.usuario.deleteMany({ where: { email: 'pedido-test@example.com' } });
    await prisma.$disconnect();
  });

  describe('POST /api/pedidos - crearPedido', () => {
    const endpoint = '/api/pedidos';
    const basePedido = {
      mesaId: null, // Se asignará en cada test
      observaciones: 'Test pedido',
      items: []
    };

    beforeEach(() => {
      basePedido.mesaId = testMesa.id;
      basePedido.items = [
        { articuloId: testArticulo1.id, cantidad: 2, observaciones: 'Sin cebolla' },
        { articuloId: testArticulo2.id, cantidad: 1 }
      ];
    });

    test('debe crear pedido correctamente', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send(basePedido);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Pedido creado exitosamente');
      expect(res.body).toHaveProperty('pedido');
      expect(res.body.pedido.mesaId).toBe(testMesa.id);
      expect(res.body.pedido.estado).toBe('PENDIENTE');
      expect(res.body.pedido.total).toBe(34.50); // (15.50 * 2) + (3.50 * 1)

      testPedido = res.body.pedido; // Guardar para otros tests
    });

    test('debe rechazar datos inválidos', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ mesaId: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Datos de entrada inválidos');
    });

    test('debe rechazar mesa no encontrada', async () => {
      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...basePedido, mesaId: 999999 });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Mesa no encontrada');
    });

    test('debe rechazar mesa no ocupada', async () => {
      const mesaDisponible = await prisma.mesa.create({
        data: { numero: 9998, capacidad: 2, estado: 'DISPONIBLE', ubicacion: 'Test' }
      });

      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...basePedido, mesaId: mesaDisponible.id });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'La mesa debe estar ocupada para crear un pedido');

      await prisma.mesa.delete({ where: { id: mesaDisponible.id } });
    });

    test('debe rechazar artículos no disponibles', async () => {
      const articuloNoDisponible = await prisma.articulo.create({
        data: {
          nombre: 'Test No Disponible',
          precio: 10.00,
          categoria: 'PLATO_PRINCIPAL',
          disponible: false
        }
      });

      const res = await request(app)
        .post(endpoint)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...basePedido,
          items: [{ articuloId: articuloNoDisponible.id, cantidad: 1 }]
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Uno o más artículos no existen o no están disponibles');

      await prisma.articulo.delete({ where: { id: articuloNoDisponible.id } });
    });

    test('debe requerir autenticación', async () => {
      const res = await request(app)
        .post(endpoint)
        .send(basePedido);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/pedidos - getPedidos', () => {
    const endpoint = '/api/pedidos';

    test('debe obtener lista de pedidos', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pedidos obtenidos exitosamente');
      expect(Array.isArray(res.body.pedidos)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });

    test('debe filtrar por estado', async () => {
      const res = await request(app)
        .get(`${endpoint}?estado=PENDIENTE`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pedidos.every(p => p.estado === 'PENDIENTE')).toBe(true);
    });

    test('debe filtrar por mesa', async () => {
      const res = await request(app)
        .get(`${endpoint}?mesa=${testMesa.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pedidos.every(p => p.mesaId === testMesa.id)).toBe(true);
    });

    test('debe filtrar por mesero', async () => {
      const res = await request(app)
        .get(`${endpoint}?mesero=${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pedidos.every(p => p.usuarioId === testUser.id)).toBe(true);
    });

    test('debe filtrar por fecha', async () => {
      const hoy = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`${endpoint}?fecha=${hoy}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pedidos');
    });

    test('debe paginar correctamente', async () => {
      const res = await request(app)
        .get(`${endpoint}?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.currentPage).toBe(1);
      expect(res.body.pagination.itemsPerPage).toBe(1);
    });

    test('debe manejar parámetros de paginación inválidos', async () => {
      const res = await request(app)
        .get(`${endpoint}?page=abc&limit=xyz`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200); // Debería usar valores por defecto
    });
  });

  describe('GET /api/pedidos/:id - getPedidoById', () => {
    test('debe obtener pedido por ID', async () => {
      const res = await request(app)
        .get(`/api/pedidos/${testPedido.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pedido obtenido exitosamente');
      expect(res.body.pedido.id).toBe(testPedido.id);
    });

    test('debe rechazar ID inválido', async () => {
      const res = await request(app)
        .get('/api/pedidos/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'ID de pedido inválido');
    });

    test('debe retornar 404 si no existe', async () => {
      const res = await request(app)
        .get('/api/pedidos/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Pedido no encontrado');
    });
  });

  describe('PUT /api/pedidos/:id/estado - actualizarEstadoPedido', () => {
    test('debe actualizar estado correctamente', async () => {
      const res = await request(app)
        .put(`/api/pedidos/${testPedido.id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'EN_PREPARACION' });

      expect(res.status).toBe(200);
      expect(res.body.pedido.estado).toBe('EN_PREPARACION');
    });

    test('debe rechazar transición inválida', async () => {
      const res = await request(app)
        .put(`/api/pedidos/${testPedido.id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'ENTREGADO' }); // No puede ir directo de EN_PREPARACION a ENTREGADO

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'Transición de estado no válida');
    });

    test('debe requerir motivo para cancelación', async () => {
      const res = await request(app)
        .put(`/api/pedidos/${testPedido.id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'CANCELADO' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'El motivo es requerido para cancelar un pedido');
    });

    test('debe cancelar con motivo', async () => {
      // Crear nuevo pedido para cancelar
      const nuevoPedido = await prisma.pedidoEnc.create({
        data: {
          numeroPedido: 'PED-TEST-CANCEL-0001',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'PENDIENTE',
          total: 10.00
        }
      });

      const res = await request(app)
        .put(`/api/pedidos/${nuevoPedido.id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'CANCELADO', motivo: 'Cliente solicitó cancelación' });

      expect(res.status).toBe(200);
      expect(res.body.pedido.estado).toBe('CANCELADO');

      await prisma.pedidoEnc.delete({ where: { id: nuevoPedido.id } });
    });

    test('debe rechazar ID inválido', async () => {
      const res = await request(app)
        .put('/api/pedidos/invalid/estado')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'LISTO' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'ID de pedido inválido');
    });
  });

  describe('POST /api/pedidos/:id/items - agregarItemPedido', () => {
    let pedidoPendiente;

    beforeEach(async () => {
      pedidoPendiente = await prisma.pedidoEnc.create({
        data: {
          numeroPedido: 'PED-TEST-ITEMS-0001',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'PENDIENTE',
          total: 0
        }
      });
    });

    afterEach(async () => {
      await prisma.pedidoDet.deleteMany({ where: { pedidoId: pedidoPendiente.id } });
      await prisma.pedidoEnc.delete({ where: { id: pedidoPendiente.id } });
    });

    test('debe agregar item al pedido', async () => {
      const res = await request(app)
        .post(`/api/pedidos/${pedidoPendiente.id}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          articuloId: testArticulo1.id,
          cantidad: 2,
          observaciones: 'Extra queso'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Item agregado al pedido exitosamente');
      expect(res.body.item.cantidad).toBe(2);
      expect(res.body.nuevoTotal).toBe(31.00); // 15.50 * 2
    });

    test('debe rechazar agregar a pedido no pendiente', async () => {
      await prisma.pedidoEnc.update({
        where: { id: pedidoPendiente.id },
        data: { estado: 'EN_PREPARACION' }
      });

      const res = await request(app)
        .post(`/api/pedidos/${pedidoPendiente.id}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          articuloId: testArticulo1.id,
          cantidad: 1
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'Solo se pueden agregar items a pedidos pendientes');
    });

    test('debe rechazar artículo no disponible', async () => {
      const articuloNoDisponible = await prisma.articulo.create({
        data: {
          nombre: 'Test No Disponible 2',
          precio: 5.00,
          categoria: 'POSTRE',
          disponible: false
        }
      });

      const res = await request(app)
        .post(`/api/pedidos/${pedidoPendiente.id}/items`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          articuloId: articuloNoDisponible.id,
          cantidad: 1
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'El artículo no está disponible');

      await prisma.articulo.delete({ where: { id: articuloNoDisponible.id } });
    });
  });

  describe('PUT /api/pedidos/:id/items/:itemId - actualizarItemPedido', () => {
    let pedidoConItems;
    let itemPedido;

    beforeEach(async () => {
      pedidoConItems = await prisma.pedidoEnc.create({
        data: {
          numeroPedido: 'PED-TEST-UPDATE-0001',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'PENDIENTE',
          total: 15.50
        }
      });

      itemPedido = await prisma.pedidoDet.create({
        data: {
          pedidoId: pedidoConItems.id,
          articuloId: testArticulo1.id,
          cantidad: 1,
          precioUnitario: 15.50,
          subtotal: 15.50,
          estado: 'PENDIENTE'
        }
      });
    });

    afterEach(async () => {
      await prisma.pedidoDet.deleteMany({ where: { pedidoId: pedidoConItems.id } });
      await prisma.pedidoEnc.delete({ where: { id: pedidoConItems.id } });
    });

    test('debe actualizar cantidad del item', async () => {
      const res = await request(app)
        .put(`/api/pedidos/${pedidoConItems.id}/items/${itemPedido.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cantidad: 3 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Item del pedido actualizado exitosamente');
      expect(res.body.item.cantidad).toBe(3);
      expect(res.body.item.subtotal).toBe(46.50); // 15.50 * 3
    });

    test('debe actualizar observaciones del item', async () => {
      const res = await request(app)
        .put(`/api/pedidos/${pedidoConItems.id}/items/${itemPedido.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ observaciones: 'Sin sal' });

      expect(res.status).toBe(200);
      expect(res.body.item.observaciones).toBe('Sin sal');
    });

    test('debe rechazar IDs inválidos', async () => {
      const res = await request(app)
        .put('/api/pedidos/invalid/items/abc')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cantidad: 2 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'IDs inválidos');
    });

    test('debe rechazar item no encontrado', async () => {
      const res = await request(app)
        .put(`/api/pedidos/${pedidoConItems.id}/items/999999`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cantidad: 2 });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Item del pedido no encontrado');
    });
  });

  describe('DELETE /api/pedidos/:id/items/:itemId - eliminarItemPedido', () => {
    let pedidoConMultiplesItems;
    let item1;
    let item2;

    beforeEach(async () => {
      pedidoConMultiplesItems = await prisma.pedidoEnc.create({
        data: {
          numeroPedido: 'PED-TEST-DELETE-0001',
          usuarioId: testUser.id,
          mesaId: testMesa.id,
          estado: 'PENDIENTE',
          total: 19.00
        }
      });

      item1 = await prisma.pedidoDet.create({
        data: {
          pedidoId: pedidoConMultiplesItems.id,
          articuloId: testArticulo1.id,
          cantidad: 1,
          precioUnitario: 15.50,
          subtotal: 15.50,
          estado: 'PENDIENTE'
        }
      });

      item2 = await prisma.pedidoDet.create({
        data: {
          pedidoId: pedidoConMultiplesItems.id,
          articuloId: testArticulo2.id,
          cantidad: 1,
          precioUnitario: 3.50,
          subtotal: 3.50,
          estado: 'PENDIENTE'
        }
      });
    });

    afterEach(async () => {
      await prisma.pedidoDet.deleteMany({ where: { pedidoId: pedidoConMultiplesItems.id } });
      await prisma.pedidoEnc.delete({ where: { id: pedidoConMultiplesItems.id } });
    });

    test('debe eliminar item del pedido', async () => {
      const res = await request(app)
        .delete(`/api/pedidos/${pedidoConMultiplesItems.id}/items/${item2.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Item eliminado del pedido exitosamente');

      // Verificar que el item fue eliminado
      const itemEliminado = await prisma.pedidoDet.findUnique({
        where: { id: item2.id }
      });
      expect(itemEliminado).toBeNull();
    });

    test('debe rechazar eliminar último item', async () => {
      // Eliminar un item primero
      await prisma.pedidoDet.delete({ where: { id: item2.id } });

      const res = await request(app)
        .delete(`/api/pedidos/${pedidoConMultiplesItems.id}/items/${item1.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'No se puede eliminar el último item del pedido');
    });
  });

  describe('GET /api/pedidos/cocina - getPedidosCocina', () => {
    test('debe obtener pedidos para cocina', async () => {
      const res = await request(app)
        .get('/api/pedidos/cocina')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pedidos para cocina obtenidos exitosamente');
      expect(res.body).toHaveProperty('pedidos');
      expect(res.body.pedidos).toHaveProperty('PENDIENTE');
      expect(res.body.pedidos).toHaveProperty('EN_PREPARACION');
      expect(res.body).toHaveProperty('resumen');
    });
  });

  describe('GET /api/pedidos/mesero/:meseroId - getPedidosMesero', () => {
    test('debe obtener pedidos del mesero', async () => {
      const res = await request(app)
        .get(`/api/pedidos/mesero/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('obtenidos exitosamente');
      expect(res.body).toHaveProperty('mesero');
      expect(res.body).toHaveProperty('pedidos');
      expect(res.body).toHaveProperty('estadisticas');
    });

    test('debe rechazar ID de mesero inválido', async () => {
      const res = await request(app)
        .get('/api/pedidos/mesero/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'ID de mesero inválido');
    });

    test('debe retornar 404 si mesero no existe', async () => {
      const res = await request(app)
        .get('/api/pedidos/mesero/999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Mesero no encontrado');
    });
  });

  describe('Casos de error y edge cases', () => {
    test('debe manejar errores internos del servidor', async () => {
      // Simular error de base de datos desconectando Prisma
      const originalFindMany = prisma.pedidoEnc.findMany;
      prisma.pedidoEnc.findMany = () => {
        throw new Error('Database connection failed');
      };

      const res = await request(app)
        .get('/api/pedidos')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno del servidor');

      // Restaurar método original
      prisma.pedidoEnc.findMany = originalFindMany;
    });

    test('debe generar números de pedido únicos', async () => {
      // Crear múltiples pedidos en rápida sucesión
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post('/api/pedidos')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              mesaId: testMesa.id,
              items: [{ articuloId: testArticulo1.id, cantidad: 1 }]
            })
        );
      }

      const results = await Promise.all(promises);

      // Verificar que todos se crearon exitosamente
      results.forEach(res => {
        expect(res.status).toBe(201);
      });

      // Verificar que los números de pedido son únicos
      const numerosPedido = results.map(res => res.body.pedido.numeroPedido);
      const numerosUnicos = new Set(numerosPedido);
      expect(numerosUnicos.size).toBe(numerosPedido.length);
    });
  });
});