// Rutas de Pedidos - Sistema de Restaurante
// Desarrollador 3 - Rama: feature/pedidos
//
// Define todas las rutas para gestión de pedidos del restaurante:
// - GET /api/pedidos: Lista de pedidos con filtros y paginación
// - GET /api/pedidos/cocina: Vista especial para área de cocina
// - GET /api/pedidos/mesero/:meseroId: Pedidos de mesero específico
// - GET /api/pedidos/:id: Obtener pedido por ID
// - POST /api/pedidos: Crear nuevo pedido
// - PUT /api/pedidos/:id/estado: Actualizar estado del pedido
// - POST /api/pedidos/:id/items: Agregar item al pedido
// - PUT /api/pedidos/:id/items/:itemId: Actualizar item del pedido
// - DELETE /api/pedidos/:id/items/:itemId: Eliminar item del pedido

const express = require('express');
const { body, param, query } = require('express-validator');
const pedidoController = require('../controllers/pedidoController');

// TODO: Descomentar cuando los middlewares estén implementados
// const authMiddleware = require('../middleware/auth');
// const roleMiddleware = require('../middleware/role');

const router = express.Router();

// GET /api/pedidos - Obtener lista de pedidos con filtros
// Parámetros de query opcionales:
// - estado: filtrar por estado (PENDIENTE, EN_PREPARACION, LISTO, ENTREGADO, CANCELADO)
// - mesa: filtrar por número de mesa
// - mesero: filtrar por ID del mesero
// - fecha: filtrar por fecha específica (YYYY-MM-DD)
// - page: número de página para paginación (default: 1)
// - limit: límite de resultados por página (default: 20, max: 100)
router.get('/', [
  // Validación del parámetro estado - debe ser uno de los valores permitidos
  query('estado')
    .optional()
    .isIn(['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'])
    .withMessage('Estado debe ser válido: PENDIENTE, EN_PREPARACION, LISTO, ENTREGADO, CANCELADO'),

  // Validación del parámetro mesa - debe ser número entero positivo
  query('mesa')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mesa debe ser un número entero mayor a 0'),

  // Validación del parámetro mesero - debe ser ID válido
  query('mesero')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mesero debe ser un ID válido (número entero mayor a 0)'),

  // Validación del parámetro fecha - debe tener formato YYYY-MM-DD
  query('fecha')
    .optional()
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('Fecha debe tener formato válido (YYYY-MM-DD)'),

  // Validación del parámetro page - número entero positivo
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),

  // Validación del parámetro limit - entre 1 y 100 para evitar sobrecarga
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser entre 1 y 100 resultados por página')
], pedidoController.getPedidos);

// GET /api/pedidos/cocina - Vista especial para área de cocina
// Muestra solo pedidos PENDIENTE y EN_PREPARACION ordenados por prioridad
// No requiere parámetros adicionales
// TODO: Aplicar middleware de autenticación cuando esté disponible
// TODO: Restringir acceso a roles COCINERO, MESERO y ADMIN
router.get('/cocina', [
  // TODO: authMiddleware.verifyToken,
  // TODO: authMiddleware.requireRole(['COCINERO', 'MESERO', 'ADMIN'])
], pedidoController.getPedidosCocina);

// GET /api/pedidos/mesero/:meseroId - Pedidos asignados a mesero específico
// Muestra pedidos activos (no ENTREGADO ni CANCELADO) del mesero
// TODO: Implementar control de acceso - solo el mesero propietario o ADMIN
router.get('/mesero/:meseroId', [
  // Validación del ID de mesero
  param('meseroId')
    .isInt({ min: 1 })
    .withMessage('ID de mesero debe ser un número entero válido')
], pedidoController.getPedidosMesero);

// GET /api/pedidos/:id - Obtener pedido específico por ID
// Retorna pedido completo con todos los detalles y relaciones
router.get('/:id', [
  // Validación del ID del pedido
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido')
], pedidoController.getPedidoById);

// POST /api/pedidos - Crear nuevo pedido
// Body debe incluir:
// - mesaId: ID de la mesa (requerido)
// - items: array de objetos con articuloId, cantidad y observaciones opcionales
// - observaciones: observaciones generales del pedido (opcional)
// TODO: Requiere autenticación y rol MESERO o superior
router.post('/', [
  // TODO: authMiddleware.verifyToken,
  // TODO: authMiddleware.requireRole(['MESERO', 'ADMIN']),

  // Validación del ID de mesa - requerido y debe ser válido
  body('mesaId')
    .notEmpty()
    .withMessage('Mesa es requerida')
    .isInt({ min: 1 })
    .withMessage('ID de mesa debe ser un número entero válido'),

  // Validación del array de items - debe tener al menos un elemento
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items debe ser un array con al menos un elemento'),

  // Validación de cada item - articuloId requerido y válido
  body('items.*.articuloId')
    .isInt({ min: 1 })
    .withMessage('ID de artículo debe ser un número entero válido'),

  // Validación de cantidad en cada item - debe ser positiva
  body('items.*.cantidad')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número entero mayor a 0'),

  // Validación de observaciones del item - máximo 255 caracteres
  body('items.*.observaciones')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Observaciones del item no pueden exceder 255 caracteres'),

  // Validación de observaciones generales - máximo 500 caracteres
  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observaciones generales no pueden exceder 500 caracteres')
], pedidoController.crearPedido);

// PUT /api/pedidos/:id/estado - Actualizar estado del pedido
// Body debe incluir:
// - estado: nuevo estado del pedido (requerido)
// - motivo: motivo del cambio (opcional, requerido para CANCELADO)
// Diferentes roles pueden cambiar a diferentes estados:
// - MESERO: puede cambiar a ENTREGADO y CANCELADO
// - COCINERO: puede cambiar a EN_PREPARACION y LISTO
// - ADMIN: puede cambiar a cualquier estado
router.put('/:id/estado', [
  // TODO: authMiddleware.verifyToken,
  // TODO: Implementar lógica de permisos por rol

  // Validación del ID del pedido
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido'),

  // Validación del nuevo estado - requerido y debe ser válido
  body('estado')
    .notEmpty()
    .withMessage('Estado es requerido')
    .isIn(['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'])
    .withMessage('Estado debe ser válido: PENDIENTE, EN_PREPARACION, LISTO, ENTREGADO, CANCELADO'),

  // Validación del motivo - mínimo 5 caracteres si se proporciona
  body('motivo')
    .optional()
    .isLength({ min: 5 })
    .withMessage('Motivo debe tener mínimo 5 caracteres si se proporciona')
], pedidoController.actualizarEstadoPedido);

// POST /api/pedidos/:id/items - Agregar artículo al pedido existente
// Body debe incluir:
// - articuloId: ID del artículo a agregar (requerido)
// - cantidad: cantidad del artículo (requerido)
// - observaciones: observaciones específicas del item (opcional)
// Solo se puede agregar si el pedido está en estado PENDIENTE
router.post('/:id/items', [
  // TODO: authMiddleware.verifyToken,
  // TODO: authMiddleware.requireRole(['MESERO', 'ADMIN']),

  // Validación del ID del pedido
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido'),

  // Validación del ID del artículo - requerido
  body('articuloId')
    .notEmpty()
    .withMessage('Artículo es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de artículo debe ser un número entero válido'),

  // Validación de la cantidad - requerida y positiva
  body('cantidad')
    .notEmpty()
    .withMessage('Cantidad es requerida')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número entero mayor a 0'),

  // Validación de observaciones - máximo 255 caracteres
  body('observaciones')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Observaciones no pueden exceder 255 caracteres')
], pedidoController.agregarItemPedido);

// PUT /api/pedidos/:id/items/:itemId - Actualizar item específico del pedido
// Body puede incluir:
// - cantidad: nueva cantidad del item (opcional)
// - observaciones: nuevas observaciones del item (opcional)
// Solo se puede modificar si el item está en estado PENDIENTE
router.put('/:id/items/:itemId', [
  // TODO: authMiddleware.verifyToken,
  // TODO: authMiddleware.requireRole(['MESERO', 'ADMIN']),

  // Validación del ID del pedido
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido'),

  // Validación del ID del item
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('ID de item debe ser un número entero válido'),

  // Validación de la nueva cantidad - opcional pero debe ser positiva si se envía
  body('cantidad')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número entero mayor a 0'),

  // Validación de nuevas observaciones - máximo 255 caracteres
  body('observaciones')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Observaciones no pueden exceder 255 caracteres')
], pedidoController.actualizarItemPedido);

// DELETE /api/pedidos/:id/items/:itemId - Eliminar item específico del pedido
// Solo se puede eliminar si el item está en estado PENDIENTE
// No se puede eliminar si es el último item del pedido
router.delete('/:id/items/:itemId', [
  // TODO: authMiddleware.verifyToken,
  // TODO: authMiddleware.requireRole(['MESERO', 'ADMIN']),

  // Validación del ID del pedido
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido'),

  // Validación del ID del item
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('ID de item debe ser un número entero válido')
], pedidoController.eliminarItemPedido);

// TODO: Rutas adicionales que podrían implementarse en el futuro:
// 
// GET /api/pedidos/estadisticas - Estadísticas de pedidos por período
// router.get('/estadisticas', [
//   query('fechaInicio').optional().isDate(),
//   query('fechaFin').optional().isDate(),
//   query('mesero').optional().isInt({ min: 1 }),
//   authMiddleware.verifyToken,
//   authMiddleware.requireRole(['ADMIN', 'MESERO'])
// ], pedidoController.getEstadisticasPedidos);
//
// POST /api/pedidos/:id/duplicar - Duplicar pedido existente
// router.post('/:id/duplicar', [
//   param('id').isInt({ min: 1 }),
//   body('mesaId').isInt({ min: 1 }),
//   authMiddleware.verifyToken,
//   authMiddleware.requireRole(['MESERO', 'ADMIN'])
// ], pedidoController.duplicarPedido);
//
// PUT /api/pedidos/:id/observaciones - Actualizar observaciones generales
// router.put('/:id/observaciones', [
//   param('id').isInt({ min: 1 }),
//   body('observaciones').isLength({ max: 500 }),
//   authMiddleware.verifyToken,
//   authMiddleware.requireRole(['MESERO', 'ADMIN'])
// ], pedidoController.actualizarObservaciones);

// TODO: Middleware de autenticación y roles que se debe aplicar:
// 
// Rutas públicas (sin autenticación):
// - Ninguna - todas las rutas de pedidos requieren autenticación
//
// Rutas que requieren rol COCINERO o superior:
// - GET /cocina: para ver pedidos en preparación
// - PUT /:id/estado: para cambiar a EN_PREPARACION y LISTO
//
// Rutas que requieren rol MESERO o superior:
// - GET /: para ver lista de pedidos
// - GET /:id: para ver pedido específico
// - GET /mesero/:id: para ver pedidos de mesero (con restricciones)
// - POST /: para crear pedidos
// - PUT /:id/estado: para cambiar a ENTREGADO y CANCELADO
// - POST /:id/items: para agregar items
// - PUT /:id/items/:itemId: para modificar items
// - DELETE /:id/items/:itemId: para eliminar items
//
// Rutas que requieren rol ADMIN:
// - Acceso completo a todas las funcionalidades
// - Puede ver pedidos de cualquier mesero
// - Puede cambiar cualquier estado de pedido

module.exports = router;