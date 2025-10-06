
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const helpers = require('../utils/helpers');

const prisma = new PrismaClient();

// Función auxiliar para verificar conflictos de reserva
const verificarConflictoReserva = async (mesaId, fechaCompleta, horaCompleta) => {
  return await prisma.reservaEnc.findFirst({
    where: {
      mesaId,
      fechaReserva: fechaCompleta,
      horaReserva: horaCompleta,
      estado: { in: ['ACTIVA', 'CONFIRMADA'] }
    }
  });
};

// Función auxiliar para crear fecha y hora consistente
const crearFechaHora = (fechaReserva, horaReserva) => {
  const fechaCompleta = new Date(fechaReserva);
  const horaCompleta = new Date(`${fechaReserva}T${horaReserva}:00`);
  return { fechaCompleta, horaCompleta };
};

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

// Función auxiliar para formatear reserva con hora string
const formatearReserva = (reserva) => {
  return {
    ...reserva,
    horaReservaString: reserva.horaReserva.toTimeString().slice(0, 5)
  };
};

// Configuración estándar de includes para consultas de reserva
const includeReservaCompleta = {
  mesa: true,
  usuario: { select: { nombre: true } }
};

// Función auxiliar para obtener reserva por ID con validación
const obtenerReservaPorId = async (id, res, includeOptions = includeReservaCompleta) => {
  const reservaId = helpers.validarId(id, res, 'reserva');
  if (!reservaId) return null;

  const reserva = await prisma.reservaEnc.findUnique({
    where: { id: reservaId },
    include: includeOptions
  });

  if (!reserva) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return null;
  }

  return { reserva, reservaId };
};

// Función auxiliar para validar estado de reserva
const validarEstadoReserva = (reserva, estadosPermitidos, res, mensaje) => {
  if (!estadosPermitidos.includes(reserva.estado)) {
    res.status(409).json({ error: mensaje });
    return false;
  }
  return true;
};

const reservaController = {
  // POST /api/reservas
  crearReserva: async (req, res) => {
    try {
      if (!validarErrores(req, res)) return;

      const {
        fechaReserva,
        horaReserva,
        numeroPersonas,
        nombreCliente,
        telefonoCliente,
        emailCliente,
        observaciones,
        mesaPreferida
      } = req.body;

      // Usar el usuarioId del token autenticado
      const usuarioId = req.user.id;

      // Crear fecha y hora completa para la reserva
      const { fechaCompleta, horaCompleta } = crearFechaHora(fechaReserva, horaReserva);

      // Si se especifica mesa preferida, verificar conflicto primero
      if (mesaPreferida) {
        const conflictoReserva = await verificarConflictoReserva(mesaPreferida, fechaCompleta, horaCompleta);
        if (conflictoReserva) {
          return res.status(409).json({
            error: 'La mesa ya está reservada para esa fecha y hora'
          });
        }
      }

      // Buscar mesa disponible con capacidad adecuada
      const mesaDisponible = await prisma.mesa.findFirst({
        where: {
          capacidad: { gte: numeroPersonas },
          estado: 'DISPONIBLE',
          ...(mesaPreferida && { id: mesaPreferida })
        },
        orderBy: { capacidad: 'asc' }
      });

      if (!mesaDisponible) {
        return res.status(409).json({
          error: 'No hay mesas disponibles para la capacidad solicitada'
        });
      }

      // Verificar conflicto para la mesa seleccionada (si no se hizo antes)
      if (!mesaPreferida) {
        const conflictoReserva = await verificarConflictoReserva(mesaDisponible.id, fechaCompleta, horaCompleta);
        if (conflictoReserva) {
          return res.status(409).json({
            error: 'La mesa ya está reservada para esa fecha y hora'
          });
        }
      }

      const nuevaReserva = await prisma.reservaEnc.create({
        data: {
          fechaReserva: fechaCompleta,
          horaReserva: horaCompleta,
          numeroPersonas,
          nombreCliente,
          telefonoCliente,
          emailCliente,
          observaciones,
          estado: 'ACTIVA',
          usuarioId,
          mesaId: mesaDisponible.id
        },
        include: includeReservaCompleta
      });

      res.status(201).json({
        message: 'Reserva creada exitosamente',
        reserva: nuevaReserva
      });
    } catch (error) {
      if (error.code === 'P2003') {
        // Foreign key violation: mesa o usuario no existe
        return res.status(404).json({ error: 'Mesa o usuario no encontrado' });
      }
      if (error.code === 'P2002' || error.code === 'P2004') {
        // Unique constraint failed: conflicto de reserva
        return res.status(409).json({ error: 'Conflicto de reserva' });
      }
      if (error.message && error.message.includes('La mesa ya está reservada')) {
        // Conflicto de horario detectado manualmente
        return res.status(409).json({ error: 'La mesa ya está reservada para esa fecha y hora' });
      }
      // Otros errores
      helpers.manejarError(error, res, 'crearReserva');
    }
  },

  // GET /api/reservas
  getReservas: async (req, res) => {
    try {
      const { fechaDesde, fechaHasta, estado, mesa, cliente, page = 1, limit = 10 } = req.query;
      const whereClause = {};
      if (fechaDesde && fechaHasta) {
        whereClause.fechaReserva = {
          gte: new Date(fechaDesde),
          lte: new Date(fechaHasta)
        };
      } else if (fechaDesde) {
        whereClause.fechaReserva = { gte: new Date(fechaDesde) };
      } else if (fechaHasta) {
        whereClause.fechaReserva = { lte: new Date(fechaHasta) };
      }
      if (estado) whereClause.estado = estado;
      if (mesa) whereClause.mesaId = parseInt(mesa);
      if (cliente) {
        whereClause.nombreCliente = {
          contains: cliente
        };
      }
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
        return res.status(400).json({ error: 'Parámetros de paginación inválidos' });
      }
      const skip = (pageNum - 1) * limitNum;
      const [reservas, total] = await Promise.all([
        prisma.reservaEnc.findMany({
          where: whereClause,
          include: includeReservaCompleta,
          orderBy: [
            { fechaReserva: 'desc' },
            { horaReserva: 'asc' }
          ],
          skip,
          take: limitNum
        }),
        prisma.reservaEnc.count({ where: whereClause })
      ]);
      const reservasFormateadas = reservas.map(formatearReserva);
      res.json({
        message: 'Reservas obtenidas exitosamente',
        reservas: reservasFormateadas,
        total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      helpers.manejarError(error, res, 'getReservas');
    }
  },

  // PUT /api/reservas/:id
  // GET /api/reservas/:id
  getReservaById: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await obtenerReservaPorId(id, res, {
        mesa: true,
        usuario: { select: { nombre: true } },
        detalles: { include: { articulo: true } }
      });
      if (!result) return;

      const reservaFormateada = formatearReserva(result.reserva);

      res.json({
        message: 'Reserva obtenida exitosamente',
        reserva: reservaFormateada
      });
    } catch (error) {
      helpers.manejarError(error, res, 'getReservaById');
    }
  },
  actualizarReserva: async (req, res) => {
    try {
      if (!validarErrores(req, res)) return;

      const { id } = req.params;
      const result = await obtenerReservaPorId(id, res, {});
      if (!result) return;

      const { reserva: reservaExistente, reservaId } = result;

      if (!validarEstadoReserva(reservaExistente, ['ACTIVA'], res, 'Solo se pueden modificar reservas en estado ACTIVA')) {
        return;
      }

      const { fechaReserva, horaReserva, numeroPersonas, nombreCliente, telefonoCliente, emailCliente, observaciones } = req.body;

      const datosActualizacion = {};
      
      if (fechaReserva) datosActualizacion.fechaReserva = new Date(fechaReserva);
      
      if (horaReserva) {
        const fechaBase = datosActualizacion.fechaReserva || reservaExistente.fechaReserva;
        const fechaBaseString = fechaBase.toISOString().slice(0, 10);
        const { horaCompleta } = crearFechaHora(fechaBaseString, horaReserva);
        datosActualizacion.horaReserva = horaCompleta;
      }
      
      if (numeroPersonas) datosActualizacion.numeroPersonas = numeroPersonas;
      if (nombreCliente) datosActualizacion.nombreCliente = nombreCliente;
      if (telefonoCliente) datosActualizacion.telefonoCliente = telefonoCliente;
      if (emailCliente) datosActualizacion.emailCliente = emailCliente;
      if (observaciones) datosActualizacion.observaciones = observaciones;

      // ...existing code...
      const reservaActualizada = await prisma.reservaEnc.update({
        where: { id: reservaId },
        data: datosActualizacion,
        include: includeReservaCompleta
      });

      // Formatear la reserva actualizada
      const reservaFormateada = formatearReserva(reservaActualizada);

      res.json({
        message: 'Reserva actualizada exitosamente',
        reserva: reservaFormateada
      });
    } catch (error) {
      helpers.manejarError(error, res, 'actualizarReserva');
    }
  },

  // PUT /api/reservas/:id/cancelar
  cancelarReserva: async (req, res) => {
    try {
      if (!validarErrores(req, res)) return;

      const { id } = req.params;
      const { motivo } = req.body;

      const result = await obtenerReservaPorId(id, res, {});
      if (!result) return;

      const { reserva, reservaId } = result;

      if (!validarEstadoReserva(reserva, ['ACTIVA', 'CONFIRMADA'], res, 'Solo se pueden cancelar reservas ACTIVAS o CONFIRMADAS')) {
        return;
      }

      const reservaCancelada = await prisma.reservaEnc.update({
        where: { id: reservaId },
        data: {
          estado: 'CA          POST http://localhost:3000/api/reservasNCELADA',
          observaciones: reserva.observaciones ? 
            `${reserva.observaciones}\n\nCANCELADA: ${motivo}` : 
            `CANCELADA: ${motivo}`
        }
      });

      res.json({
        message: 'Reserva cancelada exitosamente',
        reserva: reservaCancelada
      });
    } catch (error) {
      helpers.manejarError(error, res, 'cancelarReserva');
    }
  },

  // PUT /api/reservas/:id/confirmar
  confirmarReserva: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await obtenerReservaPorId(id, res, { mesa: true });
      if (!result) return;

      const { reserva, reservaId } = result;

      if (!validarEstadoReserva(reserva, ['ACTIVA'], res, 'Solo se pueden confirmar reservas ACTIVAS')) {
        return;
      }

      const [reservaConfirmada] = await Promise.all([
        prisma.reservaEnc.update({
          where: { id: reservaId },
          data: { estado: 'CONFIRMADA' }
        }),
        prisma.mesa.update({
          where: { id: reserva.mesaId },
          data: { estado: 'RESERVADA' }
        })
      ]);

      res.json({
        message: 'Reserva confirmada exitosamente',
        reserva: reservaConfirmada
      });
    } catch (error) {
      helpers.manejarError(error, res, 'confirmarReserva');
    }
  },

  // POST /api/reservas/verificar-disponibilidad
  verificarDisponibilidad: async (req, res) => {
    try {
      if (!validarErrores(req, res)) return;

      const { fechaReserva, horaReserva, numeroPersonas } = req.body;

      const mesasDisponibles = await prisma.mesa.findMany({
        where: {
          capacidad: { gte: numeroPersonas },
          estado: 'DISPONIBLE'
        },
        orderBy: { capacidad: 'asc' }
      });

      if (mesasDisponibles.length === 0) {
        return res.status(404).json({
          error: 'No hay mesas disponibles para la capacidad solicitada',
          mesasDisponibles: []
        });
      }

      // Crear fecha y hora completa para verificación
      const { fechaCompleta, horaCompleta } = crearFechaHora(fechaReserva, horaReserva);

      // Verificar conflictos de horario
      const mesasLibres = [];
      for (const mesa of mesasDisponibles) {
        const conflicto = await verificarConflictoReserva(mesa.id, fechaCompleta, horaCompleta);
        if (!conflicto) {
          mesasLibres.push(mesa);
        }
      }

      res.json({
        message: 'Disponibilidad verificada exitosamente',
        fechaReserva,
        horaReserva,
        numeroPersonas,
        mesasDisponibles: mesasLibres,
        hayDisponibilidad: mesasLibres.length > 0
      });
    } catch (error) {
      helpers.manejarError(error, res, 'verificarDisponibilidad');
    }
  },

  // GET /api/reservas/hoy
  getReservasHoy: async (req, res) => {
    try {
      const { limit } = req.query;

      // Validar parámetros si se proporcionan
      if (limit !== undefined) {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1) {
          return res.status(400).json({
            error: 'Parámetro limit inválido'
          });
        }
      }

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      const reservasHoy = await prisma.reservaEnc.findMany({
        where: {
          fechaReserva: {
            gte: hoy,
            lt: manana
          }
        },
        include: includeReservaCompleta,
        orderBy: { horaReserva: 'asc' }
      });

      // Formatear las reservas
      const reservasFormateadas = reservasHoy.map(formatearReserva);

      const estadisticas = {
        total: reservasFormateadas.length,
        activas: reservasFormateadas.filter(r => r.estado === 'ACTIVA').length,
        confirmadas: reservasFormateadas.filter(r => r.estado === 'CONFIRMADA').length,
        completadas: reservasFormateadas.filter(r => r.estado === 'COMPLETADA').length,
        canceladas: reservasFormateadas.filter(r => r.estado === 'CANCELADA').length
      };

      res.json({
        message: 'Reservas del día obtenidas exitosamente',
        fecha: hoy.toISOString().split('T')[0],
        reservas: reservasFormateadas,
        estadisticas
      });
    } catch (error) {
      helpers.manejarError(error, res, 'getReservasHoy');
    }
  },

  // PUT /api/reservas/:id/completar
  completarReserva: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await obtenerReservaPorId(id, res, { mesa: true });
      if (!result) return;

      const { reserva, reservaId } = result;

      if (!validarEstadoReserva(reserva, ['CONFIRMADA'], res, 'Solo se pueden completar reservas CONFIRMADAS')) {
        return;
      }

      const [reservaCompletada] = await Promise.all([
        prisma.reservaEnc.update({
          where: { id: reservaId },
          data: { estado: 'COMPLETADA' }
        }),
        prisma.mesa.update({
          where: { id: reserva.mesaId },
          data: { estado: 'DISPONIBLE' }
        })
      ]);

      res.json({
        message: 'Reserva completada exitosamente',
        reserva: reservaCompletada
      });
    } catch (error) {
      helpers.manejarError(error, res, 'completarReserva');
    }
  }
};

module.exports = reservaController;