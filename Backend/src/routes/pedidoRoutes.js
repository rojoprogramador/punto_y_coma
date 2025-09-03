// TODO: Implementar pedidoRoutes
// Desarrollador 3 - Rama: feature/pedidos
//
// Rutas de gestión de pedidos que deben implementarse:

const express = require('express');
const { body, param, query } = require('express-validator');
const pedidoController = require('../controllers/pedidoController');
// TODO: Importar middlewares cuando estén implementados
// const authMiddleware = require('../middleware/auth');
// const roleMiddleware = require('../middleware/role');

const router = express.Router();

// TODO: GET /api/pedidos - Obtener lista de pedidos
// Parámetros de query opcionales:
// - estado: filtrar por estado
// - mesa: filtrar por mesa
// - mesero: filtrar por mesero (ID)
// - fecha: filtrar por fecha (YYYY-MM-DD)
// - page: número de página para paginación
// - limit: límite de resultados por página
router.get('/', [
  query('estado')
    .optional()
    .isIn(['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'])
    .withMessage('Estado debe ser válido'),
  query('mesa')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mesa debe ser un número entero válido'),
  query('mesero')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mesero debe ser un ID válido'),
  query('fecha')
    .optional()
    .isDate()
    .withMessage('Fecha debe tener formato válido (YYYY-MM-DD)'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser entre 1 y 100')
], pedidoController.getPedidos);

// TODO: GET /api/pedidos/cocina - Vista especial para cocina
// Muestra pedidos PENDIENTE y EN_PREPARACION ordenados por prioridad
router.get('/cocina', pedidoController.getPedidosCocina);

// TODO: GET /api/pedidos/mesero/:meseroId - Pedidos asignados a mesero específico
router.get('/mesero/:meseroId', [
  param('meseroId')
    .isInt({ min: 1 })
    .withMessage('ID de mesero debe ser un número entero válido')
], pedidoController.getPedidosMesero);

// TODO: GET /api/pedidos/:id - Obtener pedido por ID
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], pedidoController.getPedidoById);

// TODO: POST /api/pedidos - Crear nuevo pedido
// Body debe incluir: mesaId, items (array de objetos con articuloId, cantidad, observaciones)
// Requiere autenticación y rol MESERO o superior
router.post('/', [
  body('mesaId')
    .isInt({ min: 1 })
    .withMessage('ID de mesa debe ser un número entero válido')
    .notEmpty()
    .withMessage('Mesa es requerida'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items debe ser un array con al menos un elemento'),
  body('items.*.articuloId')
    .isInt({ min: 1 })
    .withMessage('ID de artículo debe ser un número entero válido'),
  body('items.*.cantidad')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número entero mayor a 0'),
  body('items.*.observaciones')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Observaciones no pueden exceder 255 caracteres'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observaciones generales no pueden exceder 500 caracteres')
], pedidoController.crearPedido);

// TODO: PUT /api/pedidos/:id/estado - Actualizar estado del pedido
// Body debe incluir: estado
// Diferentes roles pueden cambiar a diferentes estados:
// - MESERO: puede cambiar a CANCELADO
// - COCINERO: puede cambiar a EN_PREPARACION, LISTO
// - MESERO: puede cambiar a ENTREGADO
router.put('/:id/estado', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('estado')
    .isIn(['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'])
    .withMessage('Estado debe ser válido')
    .notEmpty()
    .withMessage('Estado es requerido'),
  body('motivo')
    .optional()
    .isLength({ min: 5 })
    .withMessage('Motivo debe tener mínimo 5 caracteres si se proporciona')
], pedidoController.actualizarEstadoPedido);

// TODO: POST /api/pedidos/:id/items - Agregar artículo al pedido
// Body debe incluir: articuloId, cantidad, observaciones (opcional)
// Solo se puede agregar si el pedido está PENDIENTE
router.post('/:id/items', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('articuloId')
    .isInt({ min: 1 })
    .withMessage('ID de artículo debe ser un número entero válido')
    .notEmpty()
    .withMessage('Artículo es requerido'),
  body('cantidad')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número entero mayor a 0')
    .notEmpty()
    .withMessage('Cantidad es requerida'),
  body('observaciones')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Observaciones no pueden exceder 255 caracteres')
], pedidoController.agregarItemPedido);

// TODO: PUT /api/pedidos/:id/items/:itemId - Actualizar item del pedido
// Body puede incluir: cantidad, observaciones
// Solo se puede modificar si el item está PENDIENTE
router.put('/:id/items/:itemId', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido'),
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('ID de item debe ser un número entero válido'),
  body('cantidad')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número entero mayor a 0'),
  body('observaciones')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Observaciones no pueden exceder 255 caracteres')
], pedidoController.actualizarItemPedido);

// TODO: DELETE /api/pedidos/:id/items/:itemId - Eliminar item del pedido
// Solo se puede eliminar si el item está PENDIENTE
router.delete('/:id/items/:itemId', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido'),
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('ID de item debe ser un número entero válido')
], pedidoController.eliminarItemPedido);

// TODO: Rutas adicionales que podrían ser útiles:
// GET /api/pedidos/estadisticas - Estadísticas de pedidos por período
// POST /api/pedidos/:id/duplicar - Duplicar pedido existente
// PUT /api/pedidos/:id/observaciones - Actualizar observaciones generales

// TODO: Middleware de autenticación y roles a aplicar:
// Todas las rutas requieren autenticación
// GET /cocina: accesible por COCINERO, MESERO, ADMIN
// GET /mesero/:id: solo el mesero propietario o ADMIN
// POST /pedidos: requiere rol MESERO o superior
// PUT /estado: diferentes permisos según estado objetivo
// POST, PUT, DELETE items: requiere rol MESERO o superior

module.exports = router;