// Controlador de Pedidos - Sistema de Restaurante
// Desarrollador 3 - Rama: feature/pedidos
// 
// Este controlador implementa todas las funciones para gestión de pedidos:
// - crearPedido: Crear nuevo pedido con sus items
// - getPedidos: Obtener lista de pedidos con filtros
// - getPedidoById: Obtener pedido específico por ID
// - actualizarEstadoPedido: Cambiar estado del pedido
// - agregarItemPedido: Agregar artículo al pedido existente
// - actualizarItemPedido: Modificar cantidad/observaciones de item
// - eliminarItemPedido: Quitar artículo del pedido
// - getPedidosCocina: Vista especial para área de cocina
// - getPedidosMesero: Pedidos asignados a mesero específico

const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const helpers = require('../utils/helpers');

const prisma = new PrismaClient();

// Función auxiliar para validar errores de express-validator
const validarErrores = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: errors.array()
    });
    return false;
  }
  return true;
};

// Función auxiliar para validar ID
const validarId = (id, res, fieldName = 'pedido') => {
  const parsedId = parseInt(id);
  if (isNaN(parsedId) || parsedId < 1) {
    if (res) {
      res.status(400).json({ error: `ID de ${fieldName} inválido` });
    }
    return null;
  }
  return parsedId;
};

// Función auxiliar para obtener pedido por ID con validación
const obtenerPedidoPorId = async (id, res, includeOptions = {}) => {
  const pedidoId = validarId(id, res, 'pedido');
  if (!pedidoId) return null;

  const pedido = await prisma.pedidoEnc.findUnique({
    where: { id: pedidoId },
    include: includeOptions
  });

  if (!pedido) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return null;
  }

  return { pedido, pedidoId };
};

// Función auxiliar para recalcular total del pedido
const recalcularTotalPedido = async (pedidoId, tx = prisma) => {
  const nuevoTotal = await tx.pedidoDet.aggregate({
    where: { pedidoId },
    _sum: { subtotal: true }
  });

  return await tx.pedidoEnc.update({
    where: { id: pedidoId },
    data: { total: nuevoTotal._sum.subtotal || 0 }
  });
};

const pedidoController = {
  // POST /api/pedidos - Crear nuevo pedido
  crearPedido: async (req, res) => {
    try {
      if (!validarErrores(req, res)) return;

      const { mesaId, items, observaciones } = req.body;
      const usuarioId = req.user.id; // Viene del middleware de autenticación

      // 1. Verificar que la mesa existe y está ocupada
      const mesa = await prisma.mesa.findUnique({
        where: { id: mesaId }
      });

      if (!mesa) {
        return res.status(404).json({
          error: 'Mesa no encontrada'
        });
      }

      if (mesa.estado !== 'OCUPADA') {
        return res.status(409).json({
          error: 'La mesa debe estar ocupada para crear un pedido',
          estadoActual: mesa.estado
        });
      }

      // 2. Verificar que todos los artículos existen y están disponibles
      const articuloIds = items.map(item => item.articuloId);
      const articulos = await prisma.articulo.findMany({
        where: {
          id: { in: articuloIds },
          disponible: true
        }
      });

      if (articulos.length !== articuloIds.length) {
        return res.status(400).json({
          error: 'Uno o más artículos no existen o no están disponibles'
        });
      }

      // 3. Generar número de pedido único (formato: PED-YYYYMMDD-XXXX)
      const fechaHoy = new Date();
      const fechaStr = fechaHoy.toISOString().slice(0, 10).replace(/-/g, '');

      // Buscar el último pedido del día para generar número secuencial
      const ultimoPedidoHoy = await prisma.pedidoEnc.findFirst({
        where: {
          numeroPedido: {
            startsWith: `PED-${fechaStr}`
          }
        },
        orderBy: {
          numeroPedido: 'desc'
        }
      });

      let numeroSecuencial = 1;
      if (ultimoPedidoHoy) {
        const ultimoNumero = parseInt(ultimoPedidoHoy.numeroPedido.split('-')[2]);
        numeroSecuencial = ultimoNumero + 1;
      }

      const numeroPedido = `PED-${fechaStr}-${numeroSecuencial.toString().padStart(4, '0')}`;

      // 4. Calcular totales de cada item y total del pedido
      let totalPedido = 0;
      const detallesParaCrear = [];

      for (const item of items) {
        const articulo = articulos.find(a => a.id === item.articuloId);
        const subtotal = parseFloat(articulo.precio) * item.cantidad;
        totalPedido += subtotal;

        detallesParaCrear.push({
          articuloId: item.articuloId,
          cantidad: item.cantidad,
          precioUnitario: articulo.precio,
          subtotal: subtotal,
          observaciones: item.observaciones || null,
          estado: 'PENDIENTE'
        });
      }

      // 5. Crear pedido con detalles en una transacción
      const pedidoCreado = await prisma.$transaction(async (tx) => {
        // Crear el pedido encabezado
        const pedido = await tx.pedidoEnc.create({
          data: {
            numeroPedido,
            usuarioId,
            mesaId,
            estado: 'PENDIENTE',
            total: totalPedido,
            observaciones
          }
        });

        // Crear los detalles del pedido
        const detalles = await tx.pedidoDet.createMany({
          data: detallesParaCrear.map(detalle => ({
            ...detalle,
            pedidoId: pedido.id
          }))
        });

        return { pedido, detalles };
      });

      // 6. Retornar pedido creado con todos sus detalles
      const pedidoCompleto = await prisma.pedidoEnc.findUnique({
        where: { id: pedidoCreado.pedido.id },
        include: {
          mesa: {
            select: { numero: true, capacidad: true }
          },
          usuario: {
            select: { nombre: true, email: true }
          },
          detalles: {
            include: {
              articulo: {
                select: { nombre: true, precio: true, categoria: true }
              }
            }
          }
        }
      });

      res.status(201).json({
        message: 'Pedido creado exitosamente',
        pedido: pedidoCompleto
      });

    } catch (error) {
      console.error('Error en crearPedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/pedidos - Obtener lista de pedidos con filtros
  getPedidos: async (req, res) => {
    try {
      // Extraer parámetros de query con valores por defecto
      const {
        estado,
        mesa,
        mesero,
        fecha,
        page = 1,
        limit = 20
      } = req.query;

      // Construir cláusula WHERE dinámicamente según filtros
      const whereClause = {};

      if (estado) {
        whereClause.estado = estado;
      }

      if (mesa) {
        whereClause.mesaId = parseInt(mesa);
      }

      if (mesero) {
        whereClause.usuarioId = parseInt(mesero);
      }

      // Filtro por fecha (buscar pedidos del día especificado)
      if (fecha) {
        const fechaInicio = new Date(fecha);
        const fechaFin = new Date(fecha);
        fechaFin.setDate(fechaFin.getDate() + 1);

        whereClause.fechaPedido = {
          gte: fechaInicio,
          lt: fechaFin
        };
      }

      // Calcular offset para paginación
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Obtener pedidos con paginación e incluir relaciones
      const [pedidos, totalPedidos] = await Promise.all([
        prisma.pedidoEnc.findMany({
          where: whereClause,
          include: {
            mesa: {
              select: { numero: true, capacidad: true, ubicacion: true }
            },
            usuario: {
              select: { nombre: true, email: true, rol: true }
            },
            detalles: {
              include: {
                articulo: {
                  select: { nombre: true, precio: true, categoria: true }
                }
              }
            }
          },
          orderBy: [
            { fechaPedido: 'desc' },
            { numeroPedido: 'desc' }
          ],
          skip: offset,
          take: limitNum
        }),
        prisma.pedidoEnc.count({
          where: whereClause
        })
      ]);

      // Calcular metadatos de paginación
      const totalPages = Math.ceil(totalPedidos / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        message: 'Pedidos obtenidos exitosamente',
        pedidos,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalPedidos,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPrevPage
        }
      });

    } catch (error) {
      console.error('Error en getPedidos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/pedidos/:id - Obtener pedido específico por ID
  getPedidoById: async (req, res) => {
    try {
      const { id } = req.params;
      const pedidoId = parseInt(id);

      // Validar que el ID sea un número válido
      if (isNaN(pedidoId)) {
        return res.status(400).json({
          error: 'ID de pedido inválido'
        });
      }

      // Buscar pedido con todas las relaciones necesarias
      const pedido = await prisma.pedidoEnc.findUnique({
        where: { id: pedidoId },
        include: {
          mesa: {
            select: { numero: true, capacidad: true, ubicacion: true }
          },
          usuario: {
            select: { nombre: true, email: true, rol: true }
          },
          detalles: {
            include: {
              articulo: {
                select: { nombre: true, descripcion: true, precio: true, categoria: true }
              }
            },
            orderBy: { id: 'asc' }
          },
          factura: {
            select: { id: true, numeroFactura: true, fechaFactura: true, total: true }
          }
        }
      });

      // Verificar si el pedido existe
      if (!pedido) {
        return res.status(404).json({
          error: 'Pedido no encontrado'
        });
      }

      // TODO: Aquí se podría implementar verificación de permisos
      // Por ejemplo, un mesero solo puede ver sus propios pedidos
      // if (req.user.rol === 'MESERO' && pedido.usuarioId !== req.user.id) {
      //   return res.status(403).json({ error: 'No tienes permisos para ver este pedido' });
      // }

      res.json({
        message: 'Pedido obtenido exitosamente',
        pedido
      });

    } catch (error) {
      console.error('Error en getPedidoById:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/pedidos/:id/estado - Actualizar estado del pedido
  actualizarEstadoPedido: async (req, res) => {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { estado, motivo } = req.body;
      const pedidoId = parseInt(id);

      if (isNaN(pedidoId)) {
        return res.status(400).json({
          error: 'ID de pedido inválido'
        });
      }

      // Verificar que el pedido existe
      const pedidoActual = await prisma.pedidoEnc.findUnique({
        where: { id: pedidoId },
        include: {
          detalles: true
        }
      });

      if (!pedidoActual) {
        return res.status(404).json({
          error: 'Pedido no encontrado'
        });
      }

      // Validar transiciones de estado válidas
      const transicionesValidas = {
        'PENDIENTE': ['EN_PREPARACION', 'CANCELADO'],
        'EN_PREPARACION': ['LISTO', 'CANCELADO'],
        'LISTO': ['ENTREGADO'],
        'ENTREGADO': [], // Estado final
        'CANCELADO': [] // Estado final
      };

      const estadosPermitidos = transicionesValidas[pedidoActual.estado];
      if (!estadosPermitidos.includes(estado)) {
        return res.status(409).json({
          error: 'Transición de estado no válida',
          estadoActual: pedidoActual.estado,
          estadoSolicitado: estado,
          transicionesValidas: estadosPermitidos
        });
      }

      // TODO: Aquí se podría implementar verificación de permisos por rol
      // Ejemplo de lógica de permisos:
      // - COCINERO: puede cambiar PENDIENTE -> EN_PREPARACION, EN_PREPARACION -> LISTO
      // - MESERO: puede cambiar LISTO -> ENTREGADO, cualquier estado -> CANCELADO
      // - ADMIN: puede cambiar cualquier transición

      // Actualizar estado del pedido y timestamp correspondiente
      const datosActualizacion = { estado };

      // Si se cancela, requerir motivo
      if (estado === 'CANCELADO' && !motivo) {
        return res.status(400).json({
          error: 'El motivo es requerido para cancelar un pedido'
        });
      }

      // Actualizar observaciones con motivo si se proporciona
      if (motivo) {
        const observacionesActuales = pedidoActual.observaciones || '';
        datosActualizacion.observaciones = observacionesActuales +
          (observacionesActuales ? '\n' : '') +
          `[${new Date().toLocaleString()}] Estado cambiado a ${estado}: ${motivo}`;
      }

      // Ejecutar actualización
      const pedidoActualizado = await prisma.pedidoEnc.update({
        where: { id: pedidoId },
        data: datosActualizacion,
        include: {
          mesa: {
            select: { numero: true }
          },
          usuario: {
            select: { nombre: true }
          }
        }
      });

      // TODO: Aquí se podría implementar notificaciones
      // Por ejemplo, notificar a meseros cuando un pedido esté LISTO

      res.json({
        message: `Estado del pedido actualizado a ${estado}`,
        pedido: pedidoActualizado
      });

    } catch (error) {
      console.error('Error en actualizarEstadoPedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/pedidos/:id/items - Agregar artículo al pedido
  agregarItemPedido: async (req, res) => {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { articuloId, cantidad, observaciones } = req.body;
      const pedidoId = parseInt(id);

      if (isNaN(pedidoId)) {
        return res.status(400).json({
          error: 'ID de pedido inválido'
        });
      }

      // 1. Verificar que el pedido existe y se puede modificar
      const pedido = await prisma.pedidoEnc.findUnique({
        where: { id: pedidoId }
      });

      if (!pedido) {
        return res.status(404).json({
          error: 'Pedido no encontrado'
        });
      }

      // Solo se puede agregar items a pedidos PENDIENTES
      if (pedido.estado !== 'PENDIENTE') {
        return res.status(409).json({
          error: 'Solo se pueden agregar items a pedidos pendientes',
          estadoActual: pedido.estado
        });
      }

      // 2. Verificar que el artículo existe y está disponible
      const articulo = await prisma.articulo.findUnique({
        where: { id: articuloId }
      });

      if (!articulo) {
        return res.status(404).json({
          error: 'Artículo no encontrado'
        });
      }

      if (!articulo.disponible) {
        return res.status(409).json({
          error: 'El artículo no está disponible'
        });
      }

      // 3. Calcular precios y subtotales
      const precioUnitario = parseFloat(articulo.precio);
      const subtotal = precioUnitario * cantidad;

      // 4. Crear el item y recalcular total del pedido en transacción
      const resultado = await prisma.$transaction(async (tx) => {
        // Crear el nuevo item
        const nuevoItem = await tx.pedidoDet.create({
          data: {
            pedidoId,
            articuloId,
            cantidad,
            precioUnitario,
            subtotal,
            observaciones,
            estado: 'PENDIENTE'
          },
          include: {
            articulo: {
              select: { nombre: true, precio: true, categoria: true }
            }
          }
        });

        // Recalcular total del pedido
        const nuevoTotal = await tx.pedidoDet.aggregate({
          where: { pedidoId },
          _sum: { subtotal: true }
        });

        // Actualizar total del pedido
        const pedidoActualizado = await tx.pedidoEnc.update({
          where: { id: pedidoId },
          data: { total: nuevoTotal._sum.subtotal }
        });

        return { nuevoItem, pedidoActualizado };
      });

      res.status(201).json({
        message: 'Item agregado al pedido exitosamente',
        item: resultado.nuevoItem,
        nuevoTotal: resultado.pedidoActualizado.total
      });

    } catch (error) {
      console.error('Error en agregarItemPedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/pedidos/:id/items/:itemId - Actualizar item del pedido
  actualizarItemPedido: async (req, res) => {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { id, itemId } = req.params;
      const { cantidad, observaciones } = req.body;
      const pedidoId = parseInt(id);
      const itemIdInt = parseInt(itemId);

      if (isNaN(pedidoId) || isNaN(itemIdInt)) {
        return res.status(400).json({
          error: 'IDs inválidos'
        });
      }

      // 1. Verificar que pedido e item existen
      const item = await prisma.pedidoDet.findFirst({
        where: {
          id: itemIdInt,
          pedidoId: pedidoId
        },
        include: {
          pedido: true,
          articulo: true
        }
      });

      if (!item) {
        return res.status(404).json({
          error: 'Item del pedido no encontrado'
        });
      }

      // 2. Verificar que se puede modificar (item PENDIENTE en pedido PENDIENTE)
      if (item.pedido.estado !== 'PENDIENTE' || item.estado !== 'PENDIENTE') {
        return res.status(409).json({
          error: 'Solo se pueden modificar items pendientes de pedidos pendientes',
          estadoPedido: item.pedido.estado,
          estadoItem: item.estado
        });
      }

      // Preparar datos para actualización
      const datosActualizacion = {};

      if (cantidad !== undefined) {
        datosActualizacion.cantidad = cantidad;
        datosActualizacion.subtotal = parseFloat(item.articulo.precio) * cantidad;
      }

      if (observaciones !== undefined) {
        datosActualizacion.observaciones = observaciones;
      }

      // 3 y 4. Actualizar item y recalcular total del pedido en transacción
      const resultado = await prisma.$transaction(async (tx) => {
        // Actualizar el item
        const itemActualizado = await tx.pedidoDet.update({
          where: { id: itemIdInt },
          data: datosActualizacion,
          include: {
            articulo: {
              select: { nombre: true, precio: true, categoria: true }
            }
          }
        });

        // Si se cambió la cantidad, recalcular total del pedido
        if (cantidad !== undefined) {
          const nuevoTotal = await tx.pedidoDet.aggregate({
            where: { pedidoId },
            _sum: { subtotal: true }
          });

          await tx.pedidoEnc.update({
            where: { id: pedidoId },
            data: { total: nuevoTotal._sum.subtotal }
          });
        }

        return itemActualizado;
      });

      res.json({
        message: 'Item del pedido actualizado exitosamente',
        item: resultado
      });

    } catch (error) {
      console.error('Error en actualizarItemPedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // DELETE /api/pedidos/:id/items/:itemId - Eliminar item del pedido
  eliminarItemPedido: async (req, res) => {
    try {
      const { id, itemId } = req.params;
      const pedidoId = parseInt(id);
      const itemIdInt = parseInt(itemId);

      if (isNaN(pedidoId) || isNaN(itemIdInt)) {
        return res.status(400).json({
          error: 'IDs inválidos'
        });
      }

      // 1. Verificar que pedido e item existen
      const item = await prisma.pedidoDet.findFirst({
        where: {
          id: itemIdInt,
          pedidoId: pedidoId
        },
        include: {
          pedido: true
        }
      });

      if (!item) {
        return res.status(404).json({
          error: 'Item del pedido no encontrado'
        });
      }

      // 2. Verificar que se puede eliminar (item PENDIENTE en pedido PENDIENTE)
      if (item.pedido.estado !== 'PENDIENTE' || item.estado !== 'PENDIENTE') {
        return res.status(409).json({
          error: 'Solo se pueden eliminar items pendientes de pedidos pendientes',
          estadoPedido: item.pedido.estado,
          estadoItem: item.estado
        });
      }

      // Verificar que el pedido tenga más de un item
      const cantidadItems = await prisma.pedidoDet.count({
        where: { pedidoId }
      });

      if (cantidadItems <= 1) {
        return res.status(409).json({
          error: 'No se puede eliminar el último item del pedido'
        });
      }

      // 3 y 4. Eliminar item y recalcular total en transacción
      await prisma.$transaction(async (tx) => {
        // Eliminar el item
        await tx.pedidoDet.delete({
          where: { id: itemIdInt }
        });

        // Recalcular total del pedido
        const nuevoTotal = await tx.pedidoDet.aggregate({
          where: { pedidoId },
          _sum: { subtotal: true }
        });

        await tx.pedidoEnc.update({
          where: { id: pedidoId },
          data: { total: nuevoTotal._sum.subtotal || 0 }
        });
      });

      res.json({
        message: 'Item eliminado del pedido exitosamente'
      });

    } catch (error) {
      console.error('Error en eliminarItemPedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/pedidos/cocina - Vista especial para cocina
  getPedidosCocina: async (req, res) => {
    try {
      // 1. Filtrar pedidos PENDIENTE y EN_PREPARACION
      const pedidosCocina = await prisma.pedidoEnc.findMany({
        where: {
          estado: {
            in: ['PENDIENTE', 'EN_PREPARACION']
          }
        },
        // 3. Incluir solo datos necesarios para cocina
        include: {
          mesa: {
            select: { numero: true }
          },
          detalles: {
            where: {
              estado: {
                in: ['PENDIENTE', 'EN_PREPARACION']
              }
            },
            include: {
              articulo: {
                select: { nombre: true, categoria: true, descripcion: true }
              }
            }
          }
        },
        // 4. Ordenar por prioridad (estado) y tiempo
        orderBy: [
          { estado: 'asc' }, // PENDIENTE antes que EN_PREPARACION
          { fechaPedido: 'asc' } // Más antiguos primero
        ]
      });

      // 2. Agrupar por estado y calcular tiempo transcurrido
      const pedidosConTiempo = pedidosCocina.map(pedido => {
        const tiempoTranscurrido = Math.floor((new Date() - new Date(pedido.fechaPedido)) / (1000 * 60)); // en minutos

        return {
          ...pedido,
          tiempoTranscurrido,
          prioridad: tiempoTranscurrido > 30 ? 'ALTA' : tiempoTranscurrido > 15 ? 'MEDIA' : 'NORMAL'
        };
      });

      // Agrupar por estado para mejor presentación en cocina
      const pedidosAgrupados = {
        PENDIENTE: pedidosConTiempo.filter(p => p.estado === 'PENDIENTE'),
        EN_PREPARACION: pedidosConTiempo.filter(p => p.estado === 'EN_PREPARACION')
      };

      res.json({
        message: 'Pedidos para cocina obtenidos exitosamente',
        pedidos: pedidosAgrupados,
        resumen: {
          totalPendientes: pedidosAgrupados.PENDIENTE.length,
          totalEnPreparacion: pedidosAgrupados.EN_PREPARACION.length,
          totalItems: pedidosCocina.reduce((total, pedido) => total + pedido.detalles.length, 0)
        }
      });

    } catch (error) {
      console.error('Error en getPedidosCocina:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/pedidos/mesero/:meseroId - Pedidos asignados a mesero específico
  getPedidosMesero: async (req, res) => {
    try {
      const { meseroId } = req.params;
      const meseroIdInt = parseInt(meseroId);

      if (isNaN(meseroIdInt)) {
        return res.status(400).json({
          error: 'ID de mesero inválido'
        });
      }

      // Verificar que el mesero existe
      const mesero = await prisma.usuario.findUnique({
        where: { id: meseroIdInt },
        select: { id: true, nombre: true, rol: true }
      });

      if (!mesero) {
        return res.status(404).json({
          error: 'Mesero no encontrado'
        });
      }

      // 1. Filtrar pedidos del mesero específico
      // 2. Incluir estados activos (no ENTREGADO ni CANCELADO)
      const pedidosMesero = await prisma.pedidoEnc.findMany({
        where: {
          usuarioId: meseroIdInt,
          estado: {
            notIn: ['ENTREGADO', 'CANCELADO']
          }
        },
        // 4. Incluir información de mesas
        include: {
          mesa: {
            select: { numero: true, capacidad: true, ubicacion: true }
          },
          detalles: {
            include: {
              articulo: {
                select: { nombre: true, categoria: true }
              }
            }
          }
        },
        // 3. Ordenar por mesa y tiempo
        orderBy: [
          { mesa: { numero: 'asc' } },
          { fechaPedido: 'asc' }
        ]
      });

      // Calcular estadísticas para el mesero
      const estadisticas = {
        totalPedidos: pedidosMesero.length,
        porEstado: {
          PENDIENTE: pedidosMesero.filter(p => p.estado === 'PENDIENTE').length,
          EN_PREPARACION: pedidosMesero.filter(p => p.estado === 'EN_PREPARACION').length,
          LISTO: pedidosMesero.filter(p => p.estado === 'LISTO').length
        }
      };

      res.json({
        message: `Pedidos del mesero ${mesero.nombre} obtenidos exitosamente`,
        mesero: {
          id: mesero.id,
          nombre: mesero.nombre
        },
        pedidos: pedidosMesero,
        estadisticas
      });

    } catch (error) {
      console.error('Error en getPedidosMesero:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = pedidoController;