// TODO: Implementar authController
// Desarrollador 1 - Rama: devOrtega
// 
// Este controlador debe implementar:
// - login: Autenticación de usuarios con email/password
// - register: Registro de nuevos usuarios
// - verifyToken: Verificación de tokens JWT
// - refreshToken: Renovación de tokens
// - logout: Cerrar sesión
// 
// Dependencias necesarias:
// - bcrypt para hash de passwords
// - jsonwebtoken para manejo de JWT
// - express-validator para validaciones
// - @prisma/client para acceso a BD

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

const authController = {
  // POST /api/auth/login
  login: async (req, res) => {
    try {
      // TODO: Implementar lógica de login
      // 1. Validar datos de entrada
      // 2. Buscar usuario por email
      // 3. Verificar password con bcrypt
      // 4. Generar JWT token
      // 5. Retornar token y datos del usuario
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Login endpoint pendiente de implementación',
        developer: 'Desarrollador 1 - rama: feature/auth'
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/register
  register: async (req, res) => {
    try {
      // TODO: Implementar lógica de registro
      // 1. Validar datos de entrada
      // 2. Verificar que el email no existe
      // 3. Hash del password con bcrypt
      // 4. Crear usuario en la BD
      // 5. Generar JWT token
      // 6. Retornar token y datos del usuario
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Register endpoint pendiente de implementación',
        developer: 'Desarrollador 1 - rama: feature/auth'
      });
    } catch (error) {
      console.error('Error en register:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/auth/verify
  verifyToken: async (req, res) => {
    try {
      // TODO: Implementar verificación de token
      // 1. Obtener token del header Authorization
      // 2. Verificar token con jwt.verify()
      // 3. Buscar usuario en BD
      // 4. Retornar datos del usuario
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Verify token endpoint pendiente de implementación',
        developer: 'Desarrollador 1 - rama: feature/auth'
      });
    } catch (error) {
      console.error('Error en verifyToken:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/refresh
  refreshToken: async (req, res) => {
    try {
      // TODO: Implementar refresh de token
      // 1. Verificar refresh token
      // 2. Generar nuevo access token
      // 3. Retornar nuevo token
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Refresh token endpoint pendiente de implementación',
        developer: 'Desarrollador 1 - rama: feature/auth'
      });
    } catch (error) {
      console.error('Error en refreshToken:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/logout
  logout: async (req, res) => {
    try {
      // TODO: Implementar logout
      // 1. Invalidar token (opcional: blacklist)
      // 2. Limpiar cookies si se usan
      // 3. Retornar confirmación
      
      res.status(501).json({
        error: 'Not implemented',
        message: 'Logout endpoint pendiente de implementación',
        developer: 'Desarrollador 1 - rama: feature/auth'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = authController;