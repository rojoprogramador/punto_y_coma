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
      console.error('Error en getMesas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
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
      console.error('Error en getMesasDisponibles:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/mesas/:id/asignar
  asignarMesa: async (req, res) => {
    try {
      const { id } = req.params;
      const mesaId = parseInt(id);
      
      if (isNaN(mesaId)) {
        return res.status(400).json({
          error: 'ID de mesa inválido'
        });
      }

      const mesa = await prisma.mesa.findUnique({
        where: { id: mesaId }
      });

      if (!mesa) {
        return res.status(404).json({
          error: 'Mesa no encontrada'
        });
      }

      if (mesa.estado !== 'DISPONIBLE') {
        return res.status(409).json({
          error: 'La mesa no está disponible',
          estadoActual: mesa.estado
        });
      }

      const mesaActualizada = await prisma.mesa.update({
        where: { id: mesaId },
        data: {
          estado: 'OCUPADA'
        }
      });

      res.json({
        message: 'Mesa asignada exitosamente',
        mesa: mesaActualizada
      });
    } catch (error) {
      console.error('Error en asignarMesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/mesas/:id/liberar
  liberarMesa: async (req, res) => {
    try {
      const { id } = req.params;
      const mesaId = parseInt(id);
      
      if (isNaN(mesaId)) {
        return res.status(400).json({
          error: 'ID de mesa inválido'
        });
      }

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
          error: 'La mesa no está ocupada',
          estadoActual: mesa.estado
        });
      }

      const mesaActualizada = await prisma.mesa.update({
        where: { id: mesaId },
        data: {
          estado: 'DISPONIBLE'
        }
      });

      res.json({
        message: 'Mesa liberada exitosamente',
        mesa: mesaActualizada
      });
    } catch (error) {
      console.error('Error en liberarMesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/mesas/:id/estado
  cambiarEstadoMesa: async (req, res) => {
    try {
      const { id } = req.params;
      const mesaId = parseInt(id);

      if (isNaN(mesaId)) {
        return res.status(400).json({
          error: 'ID de mesa inválido'
        });
      }

      // TODO: Implementar cambio de estado
      // 1. Validar nuevo estado
      // 2. Verificar permisos para el cambio
      // 3. Actualizar estado en BD
      // 4. Retornar mesa actualizada
      if (req.body.estado) {
        console.log('Nuevo estado recibido:', req.body.estado);
        // Validar nuevo estado
        const estadosValidos = ['DISPONIBLE', 'OCUPADA', 'RESERVADA', 'MANTENIMIENTO'];
        if (!estadosValidos.includes(req.body.estado)) {
          return res.status(400).json({
            error: 'Estado inválido',
            estadosPermitidos: estadosValidos
          });
        }

        // Verificar permisos para el cambio
        // TODO: Implementar verificación de permisos

        // Actualizar estado en BD
        const mesaActualizada = await prisma.mesa.update({
          where: { id: mesaId },
          data: { estado: req.body.estado }
        });

        return res.json({
          message: 'Estado de mesa actualizado exitosamente',
          mesa: mesaActualizada
        });
      }

      res.status(501).json({
        error: 'Not implemented',
        message: 'Cambiar estado mesa endpoint pendiente de implementación',
        developer: 'Desarrollador 2 - rama: feature/mesas'
      });
    } catch (error) {
      console.error('Error en cambiarEstadoMesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/mesas/:id
  getMesaById: async (req, res) => {
    try {
      const { id } = req.params;
      const mesaId = parseInt(id);
      
      if (isNaN(mesaId)) {
        return res.status(400).json({
          error: 'ID de mesa inválido'
        });
      }

      const mesa = await prisma.mesa.findUnique({
        where: { id: mesaId }
      });

      if (!mesa) {
        return res.status(404).json({
          error: 'Mesa no encontrada'
        });
      }

      res.json({
        message: 'Mesa obtenida exitosamente',
        mesa
      });
    } catch (error) {
      console.error('Error en getMesaById:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/mesas (solo admin)
  crearMesa: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

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
      console.error('Error en crearMesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // PUT /api/mesas/:id (solo admin)
  actualizarMesa: async (req, res) => {
    try {
      // TODO: Implementar actualizar mesa
      // 1. Validar datos de entrada
      // 2. Verificar permisos de admin
      // 3. Actualizar mesa en BD
      // 4. Retornar mesa actualizada

      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Actualizar mesa endpoint pendiente de implementación',
        developer: 'Desarrollador 2 - rama: feature/mesas'
      });
    } catch (error) {
      console.error('Error en actualizarMesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // DELETE /api/mesas/:id (solo admin)
  eliminarMesa: async (req, res) => {
    try {
      // TODO: Implementar eliminar mesa
      // 1. Verificar permisos de admin
      // 2. Verificar que la mesa no esté en uso
      // 3. Eliminar mesa de BD
      // 4. Retornar confirmación
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Eliminar mesa endpoint pendiente de implementación',
        developer: 'Desarrollador 2 - rama: feature/mesas'
      });
    } catch (error) {
      console.error('Error en eliminarMesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = mesaController;