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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Buscar usuario por email
      const usuario = await prisma.usuario.findUnique({
        where: { email }
      });

      if (!usuario) {
        return res.status(401).json({
          error: 'Credenciales inválidas'
        });
      }

      // Verificar password
      const passwordValido = await bcrypt.compare(password, usuario.password);
      if (!passwordValido) {
        return res.status(401).json({
          error: 'Credenciales inválidas'
        });
      }

      // Generar JWT token
      const token = jwt.sign(
        { 
          id: usuario.id, 
          email: usuario.email, 
          rol: usuario.rol 
        },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
        { expiresIn: '24h' }
      );

      // Retornar token y datos del usuario (sin password)
      const { password: _, ...usuarioSinPassword } = usuario;
      
      res.json({
        message: 'Login exitoso',
        token,
        usuario: usuarioSinPassword
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/register
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { nombre, email, password, rol } = req.body;

      // Verificar que el email no existe
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email }
      });

      if (usuarioExistente) {
        return res.status(409).json({
          error: 'El email ya está registrado'
        });
      }

      // Hash del password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Crear usuario en la BD
      const nuevoUsuario = await prisma.usuario.create({
        data: {
          nombre,
          email,
          password: passwordHash,
          rol,
          activo: true
        }
      });

      // Generar JWT token
      const token = jwt.sign(
        { 
          id: nuevoUsuario.id, 
          email: nuevoUsuario.email, 
          rol: nuevoUsuario.rol 
        },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
        { expiresIn: '24h' }
      );

      // Retornar token y datos del usuario (sin password)
      const { password: _, ...usuarioSinPassword } = nuevoUsuario;
      
      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        token,
        usuario: usuarioSinPassword
      });

    } catch (error) {
      console.error('Error en register:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/auth/verify
  verifyToken: async (req, res) => {
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
          activo: true,
          createdAt: true
        }
      });

      if (!usuario || !usuario.activo) {
        return res.status(401).json({
          error: 'Usuario no encontrado o inactivo'
        });
      }

      res.json({
        message: 'Token válido',
        usuario
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      console.error('Error en verifyToken:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/refresh
  refreshToken: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: errors.array()
        });
      }

      const { refreshToken } = req.body;

      // Verificar refresh token (por simplicidad, usamos el mismo secreto)
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'tu-secreto-jwt-aqui');
      
      // Buscar usuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
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

      // Generar nuevo token
      const newToken = jwt.sign(
        { 
          id: usuario.id, 
          email: usuario.email, 
          rol: usuario.rol 
        },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Token renovado exitosamente',
        token: newToken
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token inválido o expirado' });
      }
      console.error('Error en refreshToken:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/logout
  logout: async (req, res) => {
    try {
      // En una implementación más robusta, aquí se podría agregar el token a una blacklist
      // Por simplicidad, solo retornamos un mensaje de confirmación
      res.json({
        message: 'Logout exitoso'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = authController;