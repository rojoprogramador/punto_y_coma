const express = require('express');
const { body, param, query } = require('express-validator');
const reservaController = require('../controllers/reservaController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/reservas - Obtener lista de reservas
router.get('/', [
  query('fechaDesde')
    .optional()
    .isDate()
    .withMessage('Fecha desde debe tener formato válido (YYYY-MM-DD)'),
  query('fechaHasta')
    .optional()
    .isDate()
    .withMessage('Fecha hasta debe tener formato válido (YYYY-MM-DD)'),
  query('estado')
    .optional()
    .isIn(['ACTIVA', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'])
    .withMessage('Estado debe ser válido'),
  query('mesa')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mesa debe ser un número entero válido'),
  query('cliente')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Nombre de cliente debe tener mínimo 2 caracteres'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser entre 1 y 100')
], reservaController.getReservas);

// GET /api/reservas/hoy - Reservas del día actual
router.get('/hoy', [
  // Comentado temporalmente para pruebas - descomentar cuando tengas autenticación
  // authMiddleware.verifyToken,
  // authMiddleware.requireMeseroOrAdmin()
], reservaController.getReservasHoy);

// GET /api/reservas/:id - Obtener reserva por ID
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], reservaController.getReservaById);

// POST /api/reservas - Crear nueva reserva
router.post('/', [
  body('fechaReserva')
    .isDate()
    .withMessage('Fecha de reserva debe ser válida')
    .custom((value) => {
      const fecha = new Date(value);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha < hoy) {
        throw new Error('La fecha de reserva debe ser futura');
      }
      return true;
    }),
  body('horaReserva')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora debe tener formato válido (HH:mm)'),
  body('numeroPersonas')
    .isInt({ min: 1, max: 20 })
    .withMessage('Número de personas debe ser entre 1 y 20')
    .notEmpty()
    .withMessage('Número de personas es requerido'),
  body('nombreCliente')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del cliente debe tener entre 2 y 100 caracteres')
    .notEmpty()
    .withMessage('Nombre del cliente es requerido'),
  body('telefonoCliente')
    .optional()
    .isMobilePhone()
    .withMessage('Teléfono debe tener formato válido'),
  body('emailCliente')
    .optional()
    .isEmail()
    .withMessage('Email debe tener formato válido'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observaciones no pueden exceder 500 caracteres'),
  body('mesaPreferida')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mesa preferida debe ser un número entero válido'),
  body('usuarioId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usuario ID debe ser un número entero válido')
], reservaController.crearReserva);

// POST /api/reservas/verificar-disponibilidad - Verificar disponibilidad
router.post('/verificar-disponibilidad', [
  body('fechaReserva')
    .isDate()
    .withMessage('Fecha de reserva debe ser válida')
    .notEmpty()
    .withMessage('Fecha de reserva es requerida'),
  body('horaReserva')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora debe tener formato válido (HH:mm)')
    .notEmpty()
    .withMessage('Hora de reserva es requerida'),
  body('numeroPersonas')
    .isInt({ min: 1, max: 20 })
    .withMessage('Número de personas debe ser entre 1 y 20')
    .notEmpty()
    .withMessage('Número de personas es requerido')
], reservaController.verificarDisponibilidad);

// PUT /api/reservas/:id - Actualizar reserva existente
router.put('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('fechaReserva')
    .optional()
    .isDate()
    .withMessage('Fecha de reserva debe ser válida'),
  body('horaReserva')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora debe tener formato válido (HH:mm)'),
  body('numeroPersonas')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Número de personas debe ser entre 1 y 20'),
  body('nombreCliente')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre del cliente debe tener entre 2 y 100 caracteres'),
  body('telefonoCliente')
    .optional()
    .isMobilePhone()
    .withMessage('Teléfono debe tener formato válido'),
  body('emailCliente')
    .optional()
    .isEmail()
    .withMessage('Email debe tener formato válido'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observaciones no pueden exceder 500 caracteres')
], reservaController.actualizarReserva);

// PUT /api/reservas/:id/confirmar - Confirmar asistencia
router.put('/:id/confirmar', [
  // Comentado temporalmente para pruebas - descomentar cuando tengas autenticación
  // authMiddleware.verifyToken,
  // authMiddleware.requireMeseroOrAdmin(),
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], reservaController.confirmarReserva);

// PUT /api/reservas/:id/cancelar - Cancelar reserva
router.put('/:id/cancelar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('motivo')
    .isLength({ min: 5, max: 255 })
    .withMessage('Motivo debe tener entre 5 y 255 caracteres')
    .notEmpty()
    .withMessage('Motivo de cancelación es requerido')
], reservaController.cancelarReserva);

// PUT /api/reservas/:id/completar - Marcar reserva como completada
router.put('/:id/completar', [
  // Comentado temporalmente para pruebas - descomentar cuando tengas autenticación
  // authMiddleware.verifyToken,
  // authMiddleware.requireMeseroOrAdmin(),
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], reservaController.completarReserva);

module.exports = router;