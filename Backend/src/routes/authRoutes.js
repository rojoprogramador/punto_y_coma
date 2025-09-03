// TODO: Implementar authRoutes
// Desarrollador 1 - Rama: feature/auth
//
// Rutas de autenticación que deben implementarse:

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
// TODO: Importar middleware de autenticación cuando esté implementado
// const authMiddleware = require('../middleware/auth');

const router = express.Router();

// TODO: POST /api/auth/login - Iniciar sesión
// Validaciones necesarias:
// - email: debe ser email válido y requerido
// - password: debe tener mínimo 6 caracteres y requerido
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .notEmpty()
    .withMessage('Email es requerido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password debe tener mínimo 6 caracteres')
    .notEmpty()
    .withMessage('Password es requerido')
], authController.login);

// TODO: POST /api/auth/register - Registrar nuevo usuario
// Validaciones necesarias:
// - nombre: requerido, mínimo 2 caracteres
// - email: email válido y requerido
// - password: mínimo 8 caracteres, debe incluir mayúscula y número
// - rol: debe ser uno de los roles válidos (ADMIN, MESERO, COCINERO, CAJERO)
router.post('/register', [
  body('nombre')
    .isLength({ min: 2 })
    .withMessage('Nombre debe tener mínimo 2 caracteres')
    .notEmpty()
    .withMessage('Nombre es requerido'),
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .notEmpty()
    .withMessage('Email es requerido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password debe tener mínimo 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password debe incluir al menos una mayúscula, una minúscula y un número'),
  body('rol')
    .isIn(['ADMIN', 'MESERO', 'COCINERO', 'CAJERO'])
    .withMessage('Rol debe ser válido')
    .notEmpty()
    .withMessage('Rol es requerido')
], authController.register);

// TODO: GET /api/auth/verify - Verificar token JWT
// Debe usar middleware de autenticación
// router.get('/verify', authMiddleware.verifyToken, authController.verifyToken);
router.get('/verify', authController.verifyToken);

// TODO: POST /api/auth/refresh - Renovar token
// Validaciones necesarias:
// - refreshToken: requerido
router.post('/refresh', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token es requerido')
], authController.refreshToken);

// TODO: POST /api/auth/logout - Cerrar sesión
// Debe usar middleware de autenticación
// router.post('/logout', authMiddleware.verifyToken, authController.logout);
router.post('/logout', authController.logout);

// TODO: Rutas adicionales que podrían ser necesarias:
// POST /api/auth/forgot-password - Recuperar contraseña
// POST /api/auth/reset-password - Restablecer contraseña
// POST /api/auth/change-password - Cambiar contraseña (requiere autenticación)

module.exports = router;