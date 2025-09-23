// TODO: Implementar facturaController
// Desarrollador 4 - Rama: devArango
// 
// Este controlador debe implementar:
// - generarFactura: Crear factura desde pedido
// - getFacturas: Obtener lista de facturas
// - getFacturaById: Obtener factura por ID
// - anularFactura: Anular factura existente
// - imprimirFactura: Generar PDF de factura
// - getReporteVentas: Reportes de ventas por período
// - getEstadisticas: Estadísticas de facturación

const { PrismaClient } = require('@prisma/client');
const { validationResult, check } = require('express-validator');

const prisma = new PrismaClient();

const facturaController = {
  // POST /api/facturas/generar/:pedidoId
  generarFactura: async (req, res) => {
  try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { pedidoId, metodoPago, nombreCliente, total, usuarioId } = req.body;

      const impuestos = 0.08; //? Impoconsumo 8%.
      const subtotal = total + (total * impuestos);

      //? Obteniendo último número de factura.
      const ultimaFactura = await prisma.facturaEnc.findFirst({
        orderBy: { numeroFactura: "desc" },
        select: { numeroFactura: true },
      });

      let ultimoNumero = Number(ultimaFactura?.numeroFactura ?? 0);

      //? 1. Creando la factura.
      const nuevaFactura = await prisma.facturaEnc.create({
        data: {
          numeroFactura: String(ultimoNumero + 1),
          nombreCliente,
          total,
          impuestos,
          subtotal,
          metodoPago,
          usuarioId,
          pedidoId,
        },
      });

      //? 2. Obteniendo los items del pedido.
      const itemsPedido = await prisma.pedidoDet.findMany({
        where: { pedidoId },
      });

      //? 3. Creando los detalles de factura copiando los detalles del pedido.
      if (itemsPedido.length > 0) {
        const detallesFactura = itemsPedido.map(item => ({
          facturaId: nuevaFactura.id,
          articuloId: item.articuloId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.cantidad * item.precioUnitario
        }));

        await prisma.facturaDet.createMany({
          data: detallesFactura,
        });
      }

      res.status(201).json({
        message: 'Factura creada exitosamente',
        factura: nuevaFactura
      });
    } catch (error) {
      console.error('Error en generarFactura:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/facturas
  getFacturas: async (req, res) => {
    try {
      // TODO: Implementar obtener facturas
      // 1. Aplicar filtros (fecha, cliente, método pago)
      // 2. Implementar paginación
      // 3. Incluir búsqueda por número de factura
      // 4. Ordenar por fecha desc por defecto
      // 5. Incluir datos del cliente y totales

      const { numeroFactura, fechaDesde, fechaHasta, cliente, metodoPago } = req.body;

      const filtros = {};

      // rango de fechas
      if (fechaDesde && fechaHasta) {
        filtros.fechaFactura = {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta),
        };
      } else if (fechaDesde) {
        filtros.fechaFactura = { gte: new Date(fechaDesde) };
      } else if (fechaHasta) {
        filtros.fechaFactura = { lte: new Date(fechaHasta) };
      }

      // cliente (ej. buscar por nombreCliente)
      if (cliente) {
        filtros.nombreCliente = {
          contains: cliente,   // o "equals" si quieres coincidencia exacta
        };
      }

      if (numeroFactura) {
        filtros.numeroFactura = String(numeroFactura)
      }

      // método de pago
      if (metodoPago) {
        filtros.metodoPago = metodoPago;
      }

      const facturas = await prisma.facturaEnc.findMany({
        where: filtros,
        orderBy: {
          fechaFactura: 'desc'
        }
      });
      
      res.status(200).json({
        message: 'Facturas generadas',
        factura: facturas,
        total: facturas.length
      });
    } catch (error) {
      console.error('Error en getFacturas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/facturas/:id
  getFacturaById: async (req, res) => {
    try {
      // TODO: Implementar obtener factura por ID
      // 1. Validar ID de factura
      // 2. Incluir todos los detalles y relaciones
      // 3. Incluir datos del pedido original
      // 4. Verificar permisos de acceso
      // 5. Retornar factura completa o 404

      const { id } = req.params;
      const facturaId = parseInt(id);

      const factura = await prisma.facturaEnc.findUnique({
        where: { id: facturaId }
      });

      if (!factura) {
        return res.status(404).json({
          error: 'Factura no encontrada'
        });
      }
      
      res.status(200).json({
        message: 'Datos de la factura cargados exitosamente',
        factura: factura
      });
    } catch (error) {
      console.error('Error en getFacturaById:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  getDetallesByFacturaId: async (req, res) => {
    try {
      const { id } = req.params;
      const facturaId = parseInt(id); 

      const detallesFactura = await prisma.facturaDet.findMany({
        where: { facturaId: facturaId }
      });
      
      res.status(200).json({
        message: 'Datos de la factura cargados exitosamente',
        detalles: detallesFactura
      });
    } catch (error) {
      console.error('Error en getFacturaById:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/facturas/:id/anular
  anularFactura: async (req, res) => {
    try {
      // TODO: Implementar anular factura
      // 1. Verificar que la factura existe y se puede anular
      // 2. Validar permisos (solo admin/cajero)
      // 3. Marcar factura como anulada
      // 4. Registrar motivo de anulación
      // 5. Actualizar estadísticas si es necesario

      const { id } = req.params;
      const facturaId = parseInt(id);

      const facturaAnulada = await prisma.facturaEnc.update({
        where: {
          id: facturaId,
        },
        data: {
          estado: "ANULADA",
        },
      });
      
      res.status(200).json({
        message: 'Factura correctamente anulada.',
        factura: facturaAnulada
      });

    } catch (error) {
      console.error('Error en anularFactura:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/facturas/:id/imprimir
  imprimirFactura: async (req, res) => {
    try {
      // TODO: Implementar generar PDF
      // 1. Obtener datos completos de la factura
      // 2. Generar PDF con librería como puppeteer o pdfkit
      // 3. Incluir logo del restaurante y datos fiscales
      // 4. Formatear correctamente los items y totales
      // 5. Retornar PDF como stream o base64
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Imprimir factura endpoint pendiente de implementación',
        developer: 'Desarrollador 4 - rama: feature/facturas',
        note: 'Requiere librería PDF como puppeteer o pdfkit'
      });
    } catch (error) {
      console.error('Error en imprimirFactura:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/facturas/reportes/ventas
  getReporteVentas: async (req, res) => {
    try {
      // TODO: Implementar reporte de ventas
      // 1. Validar parámetros de fecha (desde, hasta)
      // 2. Agrupar ventas por día/semana/mes
      // 3. Calcular totales, promedios, crecimiento
      // 4. Incluir top artículos vendidos
      // 5. Filtrar por método de pago si se especifica
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Reporte ventas endpoint pendiente de implementación',
        developer: 'Desarrollador 4 - rama: feature/facturas'
      });
    } catch (error) {
      console.error('Error en getReporteVentas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/facturas/estadisticas
  getEstadisticas: async (req, res) => {
    try {
      // TODO: Implementar estadísticas dashboard
      // 1. Ventas del día actual
      // 2. Comparación con día anterior
      // 3. Total mensual y comparación mes anterior
      // 4. Ticket promedio
      // 5. Métodos de pago más usados
      // 6. Artículos más vendidos del día
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Estadísticas endpoint pendiente de implementación',
        developer: 'Desarrollador 4 - rama: feature/facturas'
      });
    } catch (error) {
      console.error('Error en getEstadisticas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/facturas/numero/:numero
  getFacturaPorNumero: async (req, res) => {
    try {
      //! No necesario, ya que el filtro entra en la busqueda general.
      // TODO: Implementar búsqueda por número
      // 1. Buscar factura por número exacto
      // 2. Incluir detalles completos
      // 3. Verificar permisos
      // 4. Retornar factura o 404
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Get factura por número endpoint pendiente de implementación',
        developer: 'Desarrollador 4 - rama: feature/facturas'
      });
    } catch (error) {
      console.error('Error en getFacturaPorNumero:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = facturaController;