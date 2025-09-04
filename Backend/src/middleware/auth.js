const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authMiddleware = {
  // Middleware para verificar JWT token
  verifyToken: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Token no proporcionado o formato inválido'
        });
      }

      const token = authHeader.substring(7); // Remover 'Bearer '

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-secreto-jwt-aqui');
      
      // Buscar usuario en BD
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true
        }
      });

      if (!usuario || !usuario.activo) {
        return res.status(401).json({
          error: 'Usuario no encontrado o inactivo'
        });
      }

      // Agregar usuario a la request
      req.user = usuario;
      next();

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      console.error('Error en verifyToken middleware:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // Middleware para autenticación opcional
  optionalAuth: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-secreto-jwt-aqui');
        
        const usuario = await prisma.usuario.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            activo: true
          }
        });

        req.user = (usuario && usuario.activo) ? usuario : null;
      } catch (error) {
        req.user = null;
      }

      next();
    } catch (error) {
      req.user = null;
      next();
    }
  },

  // Función helper para extraer token del header
  extractToken: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  },

  // Verificar rol específico
  requireRole: (rolesPermitidos) => {
    return (req, res, next) => {
      try {
        // Verificar que el middleware de autenticación ya se ejecutó
        if (!req.user) {
          return res.status(401).json({
            error: 'Usuario no autenticado. Debe usar verifyToken antes de requireRole'
          });
        }

        // Verificar si el rol del usuario está permitido
        if (!rolesPermitidos.includes(req.user.rol)) {
          return res.status(403).json({
            error: 'No tiene permisos para realizar esta acción',
            rolRequerido: rolesPermitidos,
            rolActual: req.user.rol
          });
        }

        next();
      } catch (error) {
        console.error('Error en requireRole middleware:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    };
  },

  // Verificar si es administrador
  requireAdmin: function() {
    return this.requireRole(['ADMIN']);
  },

  // Verificar si es mesero o admin
  requireMeseroOrAdmin: function() {
    return this.requireRole(['ADMIN', 'MESERO']);
  },

  // Verificar si es cocinero o admin
  requireCocineroOrAdmin: function() {
    return this.requireRole(['ADMIN', 'COCINERO']);
  },

  // Verificar si es cajero o admin
  requireCajeroOrAdmin: function() {
    return this.requireRole(['ADMIN', 'CAJERO']);
  }
};

// Alias para compatibilidad
authMiddleware.requireAuth = authMiddleware.verifyToken;

module.exports = authMiddleware;