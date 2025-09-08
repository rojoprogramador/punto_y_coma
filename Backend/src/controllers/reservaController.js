const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const reservaController = {
  // POST /api/reservas
  crearReserva: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { 
        fechaReserva, 
        horaReserva, 
        numeroPersonas, 
        nombreCliente, 
        telefonoCliente, 
        emailCliente, 
        observaciones, 
        mesaPreferida,
        usuarioId = 1 // Valor por defecto, ajustar según tu lógica de autenticación
      } = req.body;

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

      // Crear fecha y hora completa para la reserva
      const fechaCompleta = new Date(fechaReserva);
      const [horas, minutos] = horaReserva.split(':');
      const horaCompleta = new Date(fechaCompleta);
      horaCompleta.setHours(parseInt(horas), parseInt(minutos), 0, 0);

      // Verificar que no haya conflicto de horario
      const conflictoReserva = await prisma.reservaEnc.findFirst({
        where: {
          mesaId: mesaDisponible.id,
          fechaReserva: fechaCompleta,
          horaReserva: horaCompleta,
          estado: { in: ['ACTIVA', 'CONFIRMADA'] }
        }
      });

      if (conflictoReserva) {
        return res.status(409).json({
          error: 'La mesa ya está reservada para esa fecha y hora'
        });
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
        include: {
          mesa: true,
          usuario: {
            select: { nombre: true }
          }
        }
      });

      res.status(201).json({
        message: 'Reserva creada exitosamente',
        reserva: nuevaReserva
      });
    } catch (error) {
      console.error('Error en crearReserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
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
          contains: cliente,
          mode: 'insensitive'
        };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [reservas, total] = await Promise.all([
        prisma.reservaEnc.findMany({
          where: whereClause,
          include: {
            mesa: true,
            usuario: { 
              select: { nombre: true } 
            }
          },
          orderBy: [
            { fechaReserva: 'desc' },
            { horaReserva: 'asc' }
          ],
          skip,
          take: parseInt(limit)
        }),
        prisma.reservaEnc.count({ where: whereClause })
      ]);

      // Formatear las reservas para incluir la hora como string
      const reservasFormateadas = reservas.map(reserva => ({
        ...reserva,
        horaReservaString: reserva.horaReserva.toTimeString().slice(0, 5) // HH:mm
      }));

      res.json({
        message: 'Reservas obtenidas exitosamente',
        reservas: reservasFormateadas,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error en getReservas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/reservas/:id
  getReservaById: async (req, res) => {
    try {
      const { id } = req.params;
      const reservaId = parseInt(id);
      
      if (isNaN(reservaId)) {
        return res.status(400).json({
          error: 'ID de reserva inválido'
        });
      }

      const reserva = await prisma.reservaEnc.findUnique({
        where: { id: reservaId },
        include: {
          mesa: true,
          usuario: { 
            select: { nombre: true } 
          },
          detalles: {
            include: {
              articulo: true
            }
          }
        }
      });

      if (!reserva) {
        return res.status(404).json({
          error: 'Reserva no encontrada'
        });
      }

      // Formatear la reserva para incluir la hora como string
      const reservaFormateada = {
        ...reserva,
        horaReservaString: reserva.horaReserva.toTimeString().slice(0, 5)
      };

      res.json({
        message: 'Reserva obtenida exitosamente',
        reserva: reservaFormateada
      });
    } catch (error) {
      console.error('Error en getReservaById:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/reservas/:id
  actualizarReserva: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const reservaId = parseInt(id);
      
      if (isNaN(reservaId)) {
        return res.status(400).json({
          error: 'ID de reserva inválido'
        });
      }

      const reservaExistente = await prisma.reservaEnc.findUnique({
        where: { id: reservaId }
      });

      if (!reservaExistente) {
        return res.status(404).json({
          error: 'Reserva no encontrada'
        });
      }

      if (reservaExistente.estado !== 'ACTIVA') {
        return res.status(409).json({
          error: 'Solo se pueden modificar reservas en estado ACTIVA'
        });
      }

      const { fechaReserva, horaReserva, numeroPersonas, nombreCliente, telefonoCliente, emailCliente, observaciones } = req.body;

      const datosActualizacion = {};
      
      if (fechaReserva) datosActualizacion.fechaReserva = new Date(fechaReserva);
      
      if (horaReserva) {
        const fechaBase = datosActualizacion.fechaReserva || reservaExistente.fechaReserva;
        const [horas, minutos] = horaReserva.split(':');
        const horaCompleta = new Date(fechaBase);
        horaCompleta.setHours(parseInt(horas), parseInt(minutos), 0, 0);
        datosActualizacion.horaReserva = horaCompleta;
      }
      
      if (numeroPersonas) datosActualizacion.numeroPersonas = numeroPersonas;
      if (nombreCliente) datosActualizacion.nombreCliente = nombreCliente;
      if (telefonoCliente) datosActualizacion.telefonoCliente = telefonoCliente;
      if (emailCliente) datosActualizacion.emailCliente = emailCliente;
      if (observaciones) datosActualizacion.observaciones = observaciones;

      const reservaActualizada = await prisma.reservaEnc.update({
        where: { id: reservaId },
        data: datosActualizacion,
        include: {
          mesa: true,
          usuario: {
            select: { nombre: true }
          }
        }
      });

      // Formatear la reserva actualizada
      const reservaFormateada = {
        ...reservaActualizada,
        horaReservaString: reservaActualizada.horaReserva.toTimeString().slice(0, 5)
      };

      res.json({
        message: 'Reserva actualizada exitosamente',
        reserva: reservaFormateada
      });
    } catch (error) {
      console.error('Error en actualizarReserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/reservas/:id/cancelar
  cancelarReserva: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const reservaId = parseInt(id);
      const { motivo } = req.body;
      
      if (isNaN(reservaId)) {
        return res.status(400).json({
          error: 'ID de reserva inválido'
        });
      }

      const reserva = await prisma.reservaEnc.findUnique({
        where: { id: reservaId }
      });

      if (!reserva) {
        return res.status(404).json({
          error: 'Reserva no encontrada'
        });
      }

      if (!['ACTIVA', 'CONFIRMADA'].includes(reserva.estado)) {
        return res.status(409).json({
          error: 'Solo se pueden cancelar reservas ACTIVAS o CONFIRMADAS'
        });
      }

      const reservaCancelada = await prisma.reservaEnc.update({
        where: { id: reservaId },
        data: {
          estado: 'CANCELADA',
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
      console.error('Error en cancelarReserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/reservas/:id/confirmar
  confirmarReserva: async (req, res) => {
    try {
      const { id } = req.params;
      const reservaId = parseInt(id);
      
      if (isNaN(reservaId)) {
        return res.status(400).json({
          error: 'ID de reserva inválido'
        });
      }

      const reserva = await prisma.reservaEnc.findUnique({
        where: { id: reservaId },
        include: { mesa: true }
      });

      if (!reserva) {
        return res.status(404).json({
          error: 'Reserva no encontrada'
        });
      }

      if (reserva.estado !== 'ACTIVA') {
        return res.status(409).json({
          error: 'Solo se pueden confirmar reservas ACTIVAS'
        });
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
      console.error('Error en confirmarReserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/reservas/verificar-disponibilidad
  verificarDisponibilidad: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

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
      const fechaCompleta = new Date(fechaReserva);
      const [horas, minutos] = horaReserva.split(':');
      const horaCompleta = new Date(fechaCompleta);
      horaCompleta.setHours(parseInt(horas), parseInt(minutos), 0, 0);

      // Verificar conflictos de horario
      const mesasLibres = [];
      for (const mesa of mesasDisponibles) {
        const conflicto = await prisma.reservaEnc.findFirst({
          where: {
            mesaId: mesa.id,
            fechaReserva: fechaCompleta,
            horaReserva: horaCompleta,
            estado: { in: ['ACTIVA', 'CONFIRMADA'] }
          }
        });

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
      console.error('Error en verificarDisponibilidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/reservas/hoy
  getReservasHoy: async (req, res) => {
    try {
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
        include: {
          mesa: true,
          usuario: {
            select: { nombre: true }
          }
        },
        orderBy: { horaReserva: 'asc' }
      });

      // Formatear las reservas
      const reservasFormateadas = reservasHoy.map(reserva => ({
        ...reserva,
        horaReservaString: reserva.horaReserva.toTimeString().slice(0, 5)
      }));

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
      console.error('Error en getReservasHoy:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/reservas/:id/completar
  completarReserva: async (req, res) => {
    try {
      const { id } = req.params;
      const reservaId = parseInt(id);
      
      if (isNaN(reservaId)) {
        return res.status(400).json({
          error: 'ID de reserva inválido'
        });
      }

      const reserva = await prisma.reservaEnc.findUnique({
        where: { id: reservaId },
        include: { mesa: true }
      });

      if (!reserva) {
        return res.status(404).json({
          error: 'Reserva no encontrada'
        });
      }

      if (reserva.estado !== 'CONFIRMADA') {
        return res.status(409).json({
          error: 'Solo se pueden completar reservas CONFIRMADAS'
        });
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
      console.error('Error en completarReserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = reservaController;