// TODO: Implementar facturaRoutes
// Desarrollador 4 - Rama: feature/facturas
//
// Rutas de gestión de facturas que deben implementarse:

const express = require('express');
const { body, param, query } = require('express-validator');
const facturaController = require('../controllers/facturaController');
const authMiddleware = require('../middleware/auth');
// TODO: Importar middlewares cuando estén implementados
// const authMiddleware = require('../middleware/auth');
// const roleMiddleware = require('../middleware/role');

const router = express.Router();

// TODO: GET /api/facturas - Obtener lista de facturas
// Parámetros de query opcionales:
// - fechaDesde: fecha inicio (YYYY-MM-DD)
// - fechaHasta: fecha fin (YYYY-MM-DD)
// - cliente: filtrar por nombre de cliente
// - metodoPago: filtrar por método de pago
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
  query('cliente')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Nombre de cliente debe tener mínimo 2 caracteres'),
  query('metodoPago')
    .optional()
    .isIn(['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'DIGITAL'])
    .withMessage('Método de pago debe ser válido'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser entre 1 y 100')
], facturaController.getFacturas);

// TODO: GET /api/facturas/estadisticas - Estadísticas de facturación
// Para dashboard principal - requiere rol CAJERO o ADMIN
router.get('/estadisticas', facturaController.getEstadisticas);

// TODO: GET /api/facturas/reportes/ventas - Reporte de ventas
// Parámetros de query:
// - fechaDesde: fecha inicio (requerida)
// - fechaHasta: fecha fin (requerida)
// - agrupadoPor: 'dia', 'semana', 'mes'
// - metodoPago: filtrar por método específico
router.get('/reportes/ventas', [
  query('fechaDesde')
    .notEmpty()
    .withMessage('Fecha desde es requerida')
    .isDate()
    .withMessage('Fecha desde debe tener formato válido'),
  query('fechaHasta')
    .notEmpty()
    .withMessage('Fecha hasta es requerida')
    .isDate()
    .withMessage('Fecha hasta debe tener formato válido'),
  query('agrupadoPor')
    .optional()
    .isIn(['dia', 'semana', 'mes'])
    .withMessage('Agrupación debe ser: dia, semana o mes'),
  query('metodoPago')
    .optional()
    .isIn(['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'DIGITAL'])
    .withMessage('Método de pago debe ser válido')
], facturaController.getReporteVentas);

// TODO: GET /api/facturas/numero/:numero - Buscar factura por número
router.get('/numero/:numero', [
  param('numero')
    .notEmpty()
    .withMessage('Número de factura es requerido')
    .isLength({ min: 1, max: 20 })
    .withMessage('Número de factura debe tener entre 1 y 20 caracteres')
], facturaController.getFacturaPorNumero);

// TODO: GET /api/facturas/:id - Obtener factura por ID
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], facturaController.getFacturaById);

// TODO: GET /api/facturas/:id/imprimir - Generar PDF de factura
// Retorna PDF como stream o base64
router.get('/:id/imprimir', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido')
], facturaController.imprimirFactura);

// TODO: POST /api/facturas/generar/:pedidoId - Generar factura desde pedido
// Body debe incluir: metodoPago y opcionalmente datos del cliente
// Solo se puede generar desde pedidos LISTO o ENTREGADO
// Requiere rol CAJERO o ADMIN
router.post('/generar/:pedidoId', [
  param('pedidoId')
    .isInt({ min: 1 })
    .withMessage('ID de pedido debe ser un número entero válido'),
  body('metodoPago')
    .isIn(['EFECTIVO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'DIGITAL'])
    .withMessage('Método de pago debe ser válido')
    .notEmpty()
    .withMessage('Método de pago es requerido'),
  body('nombreCliente')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre de cliente debe tener entre 2 y 100 caracteres'),
  body('nifCliente')
    .optional()
    .isLength({ min: 8, max: 20 })
    .withMessage('NIF/CIF debe tener entre 8 y 20 caracteres'),
  body('direccionCliente')
    .optional()
    .isLength({ min: 5, max: 255 })
    .withMessage('Dirección debe tener entre 5 y 255 caracteres'),
  body('descuento')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Descuento debe ser un porcentaje entre 0 y 100'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Observaciones no pueden exceder 500 caracteres')
], facturaController.generarFactura);

// TODO: PUT /api/facturas/:id/anular - Anular factura
// Body debe incluir: motivo
// Solo ADMIN puede anular facturas
// Solo se pueden anular facturas del mismo día
router.put('/:id/anular', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un número entero válido'),
  body('motivo')
    .isLength({ min: 10 })
    .withMessage('Motivo debe tener mínimo 10 caracteres')
    .notEmpty()
    .withMessage('Motivo es requerido'),
  body('autorizadoPor')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Nombre de quien autoriza debe tener mínimo 2 caracteres')
], facturaController.anularFactura);

// TODO: Rutas adicionales que podrían ser útiles:
// GET /api/facturas/export/excel - Exportar facturas a Excel
// POST /api/facturas/:id/enviar-email - Enviar factura por email
// GET /api/facturas/duplicados - Detectar posibles facturas duplicadas
// PUT /api/facturas/:id/corregir - Corregir datos de factura (solo ADMIN)

// TODO: Middleware de autenticación y roles a aplicar:
// Todas las rutas requieren autenticación
// GET básicas: accesibles por CAJERO, ADMIN
// Reportes y estadísticas: solo ADMIN
// Generar facturas: CAJERO, ADMIN
// Anular facturas: solo ADMIN
// Imprimir: CAJERO, ADMIN, MESERO (solo las propias)

// TODO: Configuración de impuestos y numeración:
// Considerar configuración de:
// - Porcentaje de impuestos (IVA/IGV)
// - Formato de numeración de facturas
// - Datos fiscales de la empresa
// - Template de PDF personalizable

module.exports = router;