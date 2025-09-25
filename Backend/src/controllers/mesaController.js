// TODO: Implementar mesaController
// Desarrollador 2 - Rama: feature/mesas
// 
// Este controlador debe implementar:
// - getMesas: Obtener todas las mesas
// - getMesasDisponibles: Obtener mesas disponibles
// - asignarMesa: Asignar mesa a cliente
// - liberarMesa: Liberar mesa ocupada
// - cambiarEstadoMesa: Cambiar estado de mesa
// - getMesaById: Obtener mesa por ID
// - crearMesa: Crear nueva mesa (solo admin)
// - actualizarMesa: Actualizar datos de mesa (solo admin)
// - eliminarMesa: Eliminar mesa (solo admin)

const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Helper functions para evitar duplicación de código
const mesaHelpers = {
  // Validar y parsear ID de mesa
  validarMesaId: (id) => {
    const mesaId = parseInt(id);
    if (isNaN(mesaId)) {
      throw new Error('ID de mesa inválido');
    }
    return mesaId;
  },

  // Buscar mesa por ID con validaciones
  buscarMesaPorId: async (id, includeRelations = false) => {
    const mesaId = mesaHelpers.validarMesaId(id);
    
    const includeOptions = includeRelations ? {
      pedidos: {
        where: {
          estado: {
            in: ['PENDIENTE', 'EN_PREPARACION', 'LISTO']
          }
        }
      },
      reservas: {
        where: {
          estado: 'ACTIVA',
          fechaReserva: {
            gte: new Date()
          }
        }
      }
    } : undefined;

    const mesa = await prisma.mesa.findUnique({
      where: { id: mesaId },
      ...(includeOptions && { include: includeOptions })
    });

    if (!mesa) {
      throw new Error('Mesa no encontrada');
    }

    return mesa;
  },

  // Manejar errores de validación
  manejarErroresValidacion: (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Datos de entrada inválidos');
      error.details = errors.array();
      error.statusCode = 400;
      throw error;
    }
  },

  // Respuesta de error estándar
  respuestaError: (res, error) => {
    console.error('Error en mesaController:', error);

    if (error.message === 'ID de mesa inválido') {
      return res.status(400).json({ error: error.message });
    }

    if (error.message === 'Mesa no encontrada') {
      return res.status(404).json({ error: error.message });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.message,
        ...(error.details && { details: error.details })
      });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  },

  // Manejo genérico de errores para operaciones simples
  manejarErrorGenerico: (res, error, contexto = 'mesaController') => {
    console.error(`Error en ${contexto}:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



const mesaController = {
  // GET /api/mesas
  getMesas: async (req, res) => {
    try {
      const mesas = await prisma.mesa.findMany({
        orderBy: {
          numero: 'asc'
        }
      });

      res.json({
        message: 'Mesas obtenidas exitosamente',
        mesas,
        total: mesas.length
      });
    } catch (error) {
      return mesaHelpers.manejarErrorGenerico(res, error, 'getMesas');
    }
  },

  // GET /api/mesas/disponibles
  getMesasDisponibles: async (req, res) => {
    try {
      const { capacidad } = req.query;
      
      const whereClause = {
        estado: 'DISPONIBLE'
      };
      
      if (capacidad) {
        whereClause.capacidad = {
          gte: parseInt(capacidad)
        };
      }

      const mesasDisponibles = await prisma.mesa.findMany({
        where: whereClause,
        orderBy: [
          { capacidad: 'asc' },
          { numero: 'asc' }
        ]
      });

      res.json({
        message: 'Mesas disponibles obtenidas exitosamente',
        mesas: mesasDisponibles,
        total: mesasDisponibles.length
      });
    } catch (error) {
      return mesaHelpers.manejarErrorGenerico(res, error, 'getMesasDisponibles');
    }
  },

  // POST /api/mesas/:id/asignar
  asignarMesa: async (req, res) => {
    try {
      const { id } = req.params;
      const mesa = await mesaHelpers.buscarMesaPorId(id);
      if (mesa.estado !== 'DISPONIBLE') {
        return res.status(409).json({
          error: 'La mesa no está disponible',
          estadoActual: mesa.estado
        });
      }
      const mesaActualizada = await prisma.mesa.update({
        where: { id: mesa.id },
        data: {
          estado: 'OCUPADA'
        }
      });
      res.json({
        message: 'Mesa asignada exitosamente',
        mesa: mesaActualizada
      });
    } catch (error) {
      return mesaHelpers.respuestaError(res, error);
    }
  },

  // POST /api/mesas/:id/liberar
  liberarMesa: async (req, res) => {
    try {
      const { id } = req.params;
      const mesa = await mesaHelpers.buscarMesaPorId(id);
      if (mesa.estado !== 'OCUPADA') {
        return res.status(409).json({
          error: 'La mesa no está ocupada',
          estadoActual: mesa.estado
        });
      }
      const mesaActualizada = await prisma.mesa.update({
        where: { id: mesa.id },
        data: {
          estado: 'DISPONIBLE'
        }
      });
      res.json({
        message: 'Mesa liberada exitosamente',
        mesa: mesaActualizada
      });
    } catch (error) {
      return mesaHelpers.respuestaError(res, error);
    }
  },

  // PUT /api/mesas/:id/estado
  cambiarEstadoMesa: async (req, res) => {
    try {
      mesaHelpers.manejarErroresValidacion(req);
      const { id } = req.params;
      const { estado, motivo } = req.body;
      const mesa = await mesaHelpers.buscarMesaPorId(id);
      if (mesa.estado === estado) {
        return res.status(409).json({
          error: 'La mesa ya tiene ese estado',
          estadoActual: mesa.estado
        });
      }
      const transicionesPermitidas = {
        'DISPONIBLE': ['OCUPADA', 'RESERVADA', 'MANTENIMIENTO'],
        'OCUPADA': ['DISPONIBLE', 'MANTENIMIENTO'],
        'RESERVADA': ['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO'],
        'MANTENIMIENTO': ['DISPONIBLE']
      };
      if (!transicionesPermitidas[mesa.estado]?.includes(estado)) {
        return res.status(409).json({
          error: 'Transición de estado no permitida',
          estadoActual: mesa.estado,
          estadoSolicitado: estado,
          transicionesPermitidas: transicionesPermitidas[mesa.estado]
        });
      }
      const mesaActualizada = await prisma.mesa.update({
        where: { id: mesa.id },
        data: {
          estado
        }
      });
      res.json({
        message: 'Estado de mesa actualizado exitosamente',
        mesa: mesaActualizada,
        cambio: {
          estadoAnterior: mesa.estado,
          estadoNuevo: estado,
          motivo: motivo || null,
          usuario: req.user?.nombre || 'Sistema'
        }
      });
    } catch (error) {
      return mesaHelpers.respuestaError(res, error);
    }
  },

  // GET /api/mesas/:id
  getMesaById: async (req, res) => {
    try {
      const { id } = req.params;
      const mesa = await mesaHelpers.buscarMesaPorId(id);
      res.json({
        message: 'Mesa obtenida exitosamente',
        mesa
      });
    } catch (error) {
      return mesaHelpers.respuestaError(res, error);
    }
  },

  // POST /api/mesas (solo admin)
  crearMesa: async (req, res) => {
    try {
      mesaHelpers.manejarErroresValidacion(req);
      const { numero, capacidad, ubicacion } = req.body;
      // Verificar que no exista una mesa con el mismo número
      const mesaExistente = await prisma.mesa.findUnique({
        where: { numero }
      });
      if (mesaExistente) {
        return res.status(409).json({
          error: 'Ya existe una mesa con ese número'
        });
      }
      const nuevaMesa = await prisma.mesa.create({
        data: {
          numero,
          capacidad,
          ubicacion,
          estado: 'DISPONIBLE'
        }
      });
      res.status(201).json({
        message: 'Mesa creada exitosamente',
        mesa: nuevaMesa
      });
    } catch (error) {
      return mesaHelpers.respuestaError(res, error);
    }
  },

  // PUT /api/mesas/:id (solo admin)
  actualizarMesa: async (req, res) => {
    try {
      mesaHelpers.manejarErroresValidacion(req);
      const { id } = req.params;
      const { numero, capacidad, ubicacion } = req.body;
      const mesa = await mesaHelpers.buscarMesaPorId(id);
      if (numero && numero !== mesa.numero) {
        const mesaExistente = await prisma.mesa.findUnique({
          where: { numero }
        });
        if (mesaExistente) {
          return res.status(409).json({
            error: 'Ya existe una mesa con ese número'
          });
        }
      }
      const datosActualizacion = {};
      if (numero !== undefined) datosActualizacion.numero = numero;
      if (capacidad !== undefined) datosActualizacion.capacidad = capacidad;
      if (ubicacion !== undefined) datosActualizacion.ubicacion = ubicacion;
      if (Object.keys(datosActualizacion).length === 0) {
        return res.status(400).json({
          error: 'No se proporcionaron campos para actualizar'
        });
      }
      const mesaActualizada = await prisma.mesa.update({
        where: { id: mesa.id },
        data: datosActualizacion
      });
      res.json({
        message: 'Mesa actualizada exitosamente',
        mesa: mesaActualizada,
        cambios: datosActualizacion
      });
    } catch (error) {
      return mesaHelpers.respuestaError(res, error);
    }
  },

  // DELETE /api/mesas/:id (solo admin)
  eliminarMesa: async (req, res) => {
    try {
      mesaHelpers.manejarErroresValidacion(req);
      const { id } = req.params;
      const mesa = await mesaHelpers.buscarMesaPorId(id, true);
      if (mesa.estado === 'OCUPADA') {
        return res.status(409).json({
          error: 'No se puede eliminar una mesa ocupada',
          estadoActual: mesa.estado
        });
      }
      if (mesa.pedidos && mesa.pedidos.length > 0) {
        return res.status(409).json({
          error: 'No se puede eliminar una mesa con pedidos activos',
          pedidosActivos: mesa.pedidos.length
        });
      }
      if (mesa.reservas && mesa.reservas.length > 0) {
        return res.status(409).json({
          error: 'No se puede eliminar una mesa con reservas futuras',
          reservasFuturas: mesa.reservas.length
        });
      }
      await prisma.mesa.delete({
        where: { id: mesa.id }
      });
      res.json({
        message: 'Mesa eliminada exitosamente',
        mesaEliminada: {
          id: mesa.id,
          numero: mesa.numero,
          capacidad: mesa.capacidad,
          ubicacion: mesa.ubicacion
        },
        eliminadoPor: req.user?.nombre || 'Sistema'
      });
    } catch (error) {
      return mesaHelpers.respuestaError(res, error);
    }
  }
};

module.exports = mesaController;