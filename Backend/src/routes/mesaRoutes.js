// TODO: Implementar mesaRoutes
// Desarrollador 2 - Rama: feature/mesas
//
// Rutas de gestión de mesas que deben implementarse:

const express = require('express');
const { body, param, query } = require('express-validator');
const mesaController = require('../controllers/mesaController');
// TODO: Importar middlewares cuando estén implementados
// const authMiddleware = require('../middleware/auth');
// const roleMiddleware = require('../middleware/role');

const router = express.Router();

// TODO: GET /api/mesas - Obtener todas las mesas
// Parámetros de query opcionales:
// - estado: filtrar por estado (DISPONIBLE, OCUPADA, RESERVADA, MANTENIMIENTO)
// - capacidad: filtrar por capacidad mínima
router.get('/', [
  query('estado')
    .optional()
    .isIn(['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'MANTENIMIENTO'])
    .withMessage('Estado debe ser válido'),
  query('capacidad')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacidad debe ser un número entero mayor a 0')
], mesaController.getMesas);

// TODO: GET /api/mesas/disponibles - Obtener mesas disponibles
// Parámetros de query opcionales:
// - capacidad: capacidad mínima requerida
// - fecha: fecha para verificar reservas (formato YYYY-MM-DD)
// - hora: hora para verificar reservas (formato HH:mm)
router.get('/disponibles', [
  query('capacidad')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacidad debe ser un número entero mayor a 0'),
  query('fecha')
    .optional()
    .isDate()
    .withMessage('Fecha debe tener formato válido (YYYY-MM-DD)'),
  query('hora')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora debe tener formato válido (HH:mm)')
], mesaController.getMesasDisponibles);

// TODO: GET /api/mesas/:id - Obtener mesa por ID
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], mesaController.getMesaById);

// TODO: POST /api/mesas/:id/asignar - Asignar mesa a cliente
// Requiere autenticación y rol MESERO o ADMIN
// Body debe incluir: clienteInfo (opcional)
router.post('/:id/asignar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('clienteInfo')
    .optional()
    .isObject()
    .withMessage('Información del cliente debe ser un objeto'),
  body('clienteInfo.nombre')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Nombre del cliente debe tener mínimo 2 caracteres'),
  body('clienteInfo.telefono')
    .optional()
    .isMobilePhone()
    .withMessage('Teléfono debe tener formato válido')
], mesaController.asignarMesa);

// TODO: POST /api/mesas/:id/liberar - Liberar mesa ocupada
// Requiere autenticación y rol MESERO o ADMIN
router.post('/:id/liberar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], mesaController.liberarMesa);

// TODO: PUT /api/mesas/:id/estado - Cambiar estado de mesa
// Requiere autenticación y rol MESERO o ADMIN
// Body debe incluir: estado
router.put('/:id/estado', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('estado')
    .isIn(['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'MANTENIMIENTO'])
    .withMessage('Estado debe ser válido')
    .notEmpty()
    .withMessage('Estado es requerido'),
  body('motivo')
    .optional()
    .isLength({ min: 5 })
    .withMessage('Motivo debe tener mínimo 5 caracteres')
], mesaController.cambiarEstadoMesa);

// TODO: POST /api/mesas - Crear nueva mesa (solo ADMIN)
// Body debe incluir: numero, capacidad, ubicacion (opcional)
router.post('/', [
  body('numero')
    .isInt({ min: 1 })
    .withMessage('Número debe ser entero mayor a 0')
    .notEmpty()
    .withMessage('Número es requerido'),
  body('capacidad')
    .isInt({ min: 1, max: 20 })
    .withMessage('Capacidad debe ser entre 1 y 20 personas')
    .notEmpty()
    .withMessage('Capacidad es requerida'),
  body('ubicacion')
    .optional()
    .isLength({ min: 3 })
    .withMessage('Ubicación debe tener mínimo 3 caracteres')
], mesaController.crearMesa);

// TODO: PUT /api/mesas/:id - Actualizar mesa (solo ADMIN)
// Body puede incluir: numero, capacidad, ubicacion
router.put('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('numero')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Número debe ser entero mayor a 0'),
  body('capacidad')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Capacidad debe ser entre 1 y 20 personas'),
  body('ubicacion')
    .optional()
    .isLength({ min: 3 })
    .withMessage('Ubicación debe tener mínimo 3 caracteres')
], mesaController.actualizarMesa);

// TODO: DELETE /api/mesas/:id - Eliminar mesa (solo ADMIN)
// Solo se puede eliminar si no tiene pedidos/reservas asociadas
router.delete('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], mesaController.eliminarMesa);

// TODO: Middleware de autenticación y roles a aplicar:
// Rutas que requieren autenticación: todas excepto GET públicas
// Rutas que requieren rol ADMIN: POST, PUT, DELETE
// Rutas que requieren rol MESERO o superior: asignar, liberar, cambiar estado

module.exports = router;