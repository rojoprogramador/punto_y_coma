const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const mesaRoutes = require('./routes/mesaRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const facturaRoutes = require('./routes/facturaRoutes');

const app = express();

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por ventana de tiempo
  message: {
    error: 'Demasiadas peticiones desde esta IP, intenta de nuevo después de 15 minutos.'
  }
});

// Middlewares globales
app.use(helmet()); // Seguridad con headers HTTP
app.use(limiter); // Rate limiting
app.use(morgan('combined')); // Logging de requests
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/facturas', facturaRoutes);

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    message: `La ruta ${req.originalUrl} no existe`,
    method: req.method
  });
});

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Error de validación de Prisma
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: 'Conflicto de datos únicos',
      message: 'Ya existe un registro con estos datos'
    });
  }
  
  // Error de registro no encontrado de Prisma
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro no encontrado',
      message: 'El registro solicitado no existe'
    });
  }
  
  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token de autenticación no es válido'
    });
  }
  
  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      message: 'El token de autenticación ha expirado'
    });
  }
  
  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      message: err.message
    });
  }
  
  // Error interno del servidor
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

const PORT = process.env.PORT || 3000;

// Solo iniciar el servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📋 Health check disponible en: http://localhost:${PORT}/health`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;