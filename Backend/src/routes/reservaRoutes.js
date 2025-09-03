// TODO: Implementar reservaRoutes
// Desarrollador 5 - Rama: feature/reservas
//
// Rutas de gestión de reservas que deben implementarse:

const express = require('express');
const { body, param, query } = require('express-validator');
const reservaController = require('../controllers/reservaController');
// TODO: Importar middlewares cuando estén implementados
// const authMiddleware = require('../middleware/auth');
// const roleMiddleware = require('../middleware/role');

const router = express.Router();

// TODO: GET /api/reservas - Obtener lista de reservas
// Parámetros de query opcionales:
// - fechaDesde: fecha inicio (YYYY-MM-DD)
// - fechaHasta: fecha fin (YYYY-MM-DD)
// - estado: filtrar por estado
// - mesa: filtrar por mesa específica
// - cliente: filtrar por nombre de cliente
// - page: número de página para paginación
// - limit: límite de resultados por página
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

// TODO: GET /api/reservas/hoy - Reservas del día actual
// Vista especial para recepción con reservas del día ordenadas por hora
router.get('/hoy', reservaController.getReservasHoy);

// TODO: GET /api/reservas/:id - Obtener reserva por ID
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], reservaController.getReservaById);

// TODO: POST /api/reservas - Crear nueva reserva
// Body debe incluir: fechaReserva, horaReserva, numeroPersonas, nombreCliente
// Campos opcionales: telefonoCliente, emailCliente, observaciones
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
    .withMessage('Mesa preferida debe ser un número entero válido')
], reservaController.crearReserva);

// TODO: POST /api/reservas/verificar-disponibilidad - Verificar disponibilidad
// Body debe incluir: fechaReserva, horaReserva, numeroPersonas
// Retorna mesas disponibles y horarios alternativos
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
    .withMessage('Número de personas es requerido'),
  body('duracionEstimada')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Duración estimada debe ser entre 30 y 300 minutos')
], reservaController.verificarDisponibilidad);

// TODO: PUT /api/reservas/:id - Actualizar reserva existente
// Solo se pueden modificar reservas en estado ACTIVA
// Body puede incluir: fechaReserva, horaReserva, numeroPersonas, nombreCliente, etc.
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

// TODO: PUT /api/reservas/:id/confirmar - Confirmar asistencia
// Cambia estado a CONFIRMADA y asigna mesa definitivamente
// Solo se puede confirmar el día de la reserva
router.put('/:id/confirmar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('mesaAsignada')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Mesa asignada debe ser un número entero válido'),
  body('horaLlegada')
    .optional()
    .isISO8601()
    .withMessage('Hora de llegada debe tener formato ISO 8601')
], reservaController.confirmarReserva);

// TODO: PUT /api/reservas/:id/cancelar - Cancelar reserva
// Cambia estado a CANCELADA y libera mesa asignada
// Body debe incluir: motivo
router.put('/:id/cancelar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('motivo')
    .isLength({ min: 5, max: 255 })
    .withMessage('Motivo debe tener entre 5 y 255 caracteres')
    .notEmpty()
    .withMessage('Motivo de cancelación es requerido'),
  body('canceladaPor')
    .optional()
    .isIn(['CLIENTE', 'RESTAURANTE'])
    .withMessage('Cancelado por debe ser CLIENTE o RESTAURANTE')
], reservaController.cancelarReserva);

// TODO: PUT /api/reservas/:id/completar - Marcar reserva como completada
// Cambia estado a COMPLETADA cuando los clientes terminan
// Libera mesa para nuevas asignaciones
router.put('/:id/completar', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('horaSalida')
    .optional()
    .isISO8601()
    .withMessage('Hora de salida debe tener formato ISO 8601'),
  body('calificacion')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Calificación debe ser entre 1 y 5'),
  body('comentarios')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comentarios no pueden exceder 500 caracteres')
], reservaController.completarReserva);

// TODO: Rutas adicionales que podrían ser útiles:
// GET /api/reservas/calendario/:fecha - Vista de calendario para fecha específica
// POST /api/reservas/:id/recordatorio - Enviar recordatorio de reserva
// GET /api/reservas/estadisticas - Estadísticas de reservas y ocupación
// POST /api/reservas/masivo - Crear múltiples reservas (eventos especiales)

// TODO: Middleware de autenticación y roles a aplicar:
// GET públicas: pueden ser accesibles sin autenticación (para app cliente)
// POST crear: puede ser público para reservas online
// PUT, DELETE: requieren autenticación
// Confirmar/completar: requiere rol MESERO o superior
// Cancelar: puede hacer el cliente (con token especial) o staff
// Vista hoy y estadísticas: solo staff del restaurante

// TODO: Consideraciones especiales:
// - Validar horarios de operación del restaurante
// - Implementar sistema de tokens para que clientes modifiquen sus reservas
// - Considerar tiempo de ocupación promedio por mesa
// - Implementar sistema de lista de espera
// - Envío automático de confirmaciones y recordatorios

module.exports = router;