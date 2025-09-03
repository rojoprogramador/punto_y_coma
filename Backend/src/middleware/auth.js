// TODO: Implementar middleware de autenticación
// Este middleware debe ser implementado por el Desarrollador 1 (rama: feature/auth)
//
// Funciones que debe incluir:
// - verifyToken: Verificar JWT token en requests
// - extractToken: Extraer token del header Authorization
// - refreshTokenMiddleware: Manejar refresh tokens
// - optionalAuth: Autenticación opcional (para endpoints públicos)

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authMiddleware = {
  // Middleware para verificar JWT token
  verifyToken: async (req, res, next) => {
    try {
      // TODO: Implementar verificación de token
      // 1. Extraer token del header Authorization
      // 2. Verificar token con jwt.verify()
      // 3. Buscar usuario en BD y verificar que esté activo
      // 4. Agregar usuario a req.user
      // 5. Continuar con next() o retornar 401
      
      console.log('⚠️  Middleware de autenticación no implementado');
      return res.status(501).json({
        error: 'Middleware not implemented',
        message: 'Middleware de autenticación pendiente de implementación',
        developer: 'Desarrollador 1 - rama: feature/auth',
        note: 'Este middleware debe verificar JWT tokens'
      });
    } catch (error) {
      console.error('Error en verifyToken middleware:', error);
      return res.status(401).json({
        error: 'Token inválido',
        message: 'No se pudo verificar el token de autenticación'
      });
    }
  },

  // Middleware para autenticación opcional
  optionalAuth: async (req, res, next) => {
    try {
      // TODO: Implementar autenticación opcional
      // 1. Si hay token, verificarlo y agregar usuario a req.user
      // 2. Si no hay token, continuar sin user (req.user = null)
      // 3. No retornar error si no hay token
      
      console.log('⚠️  Middleware de autenticación opcional no implementado');
      req.user = null; // Placeholder
      next();
    } catch (error) {
      // En autenticación opcional, los errores no bloquean el request
      req.user = null;
      next();
    }
  },

  // Función helper para extraer token del header
  extractToken: (req) => {
    // TODO: Implementar extracción de token
    // 1. Obtener header Authorization
    // 2. Verificar formato "Bearer <token>"
    // 3. Retornar solo el token o null
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  },

  // Middleware para verificar refresh token
  verifyRefreshToken: async (req, res, next) => {
    try {
      // TODO: Implementar verificación de refresh token
      // 1. Extraer refresh token del body o cookies
      // 2. Verificar que sea válido y no esté en blacklist
      // 3. Buscar usuario asociado al refresh token
      // 4. Agregar usuario a req.user
      
      return res.status(501).json({
        error: 'Middleware not implemented',
        message: 'Middleware de refresh token pendiente de implementación',
        developer: 'Desarrollador 1 - rama: feature/auth'
      });
    } catch (error) {
      console.error('Error en verifyRefreshToken middleware:', error);
      return res.status(401).json({
        error: 'Refresh token inválido',
        message: 'No se pudo verificar el refresh token'
      });
    }
  }
};

// TODO: Funciones adicionales que podrían ser útiles:
// - generateToken: Generar nuevo JWT
// - generateRefreshToken: Generar refresh token
// - blacklistToken: Agregar token a blacklist
// - validateTokenExpiry: Verificar si token está por expirar

module.exports = authMiddleware;