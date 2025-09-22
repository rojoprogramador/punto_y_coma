const authMiddleware = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    usuario: {
      findUnique: jest.fn()
    }
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

describe('Auth Middleware Tests', () => {
  let mockPrisma;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockPrisma = new PrismaClient();

    mockReq = {
      headers: {},
      user: null
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('verifyToken middleware', () => {
    test('should return 401 when no authorization header provided', async () => {
      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token no proporcionado o formato inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers.authorization = 'Basic token123';

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token no proporcionado o formato inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when token is invalid', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token inválido' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
        { expiresIn: '-1h' }
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token expirado' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when user not found', async () => {
      const validToken = jwt.sign(
        { id: 999 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado o inactivo'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 when user is inactive', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        rol: 'MESERO',
        activo: false
      });

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuario no encontrado o inactivo'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should add user to request and call next when token is valid', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      const mockUser = {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        rol: 'MESERO',
        activo: true
      };

      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockPrisma.usuario.findUnique.mockRejectedValue(new Error('Database error'));

      // Mock console.error to suppress error logs
      const originalError = console.error;
      console.error = jest.fn();

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      console.error = originalError;

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    test('should set user to null when no authorization header', async () => {
      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should set user to null when invalid token format', async () => {
      mockReq.headers.authorization = 'Basic token123';

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should set user to null when token is invalid', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should set user when token is valid', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      const mockUser = {
        id: 1,
        nombre: 'Test User',
        email: 'test@example.com',
        rol: 'MESERO',
        activo: true
      };

      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should set user to null when user is inactive', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        activo: false
      });

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockPrisma.usuario.findUnique.mockRejectedValue(new Error('Database error'));

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('extractToken helper', () => {
    test('should extract token from valid Bearer header', () => {
      mockReq.headers.authorization = 'Bearer token123';

      const token = authMiddleware.extractToken(mockReq);

      expect(token).toBe('token123');
    });

    test('should return null for invalid header format', () => {
      mockReq.headers.authorization = 'Basic token123';

      const token = authMiddleware.extractToken(mockReq);

      expect(token).toBeNull();
    });

    test('should return null when no authorization header', () => {
      const token = authMiddleware.extractToken(mockReq);

      expect(token).toBeNull();
    });
  });

  describe('requireRole middleware', () => {
    test('should return 401 when user is not authenticated', () => {
      const middleware = authMiddleware.requireRole(['ADMIN']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Usuario no autenticado. Debe usar verifyToken antes de requireRole'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 403 when user role is not permitted', () => {
      mockReq.user = {
        id: 1,
        rol: 'MESERO'
      };

      const middleware = authMiddleware.requireRole(['ADMIN']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tiene permisos para realizar esta acción',
        rolRequerido: ['ADMIN'],
        rolActual: 'MESERO'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should call next when user role is permitted', () => {
      mockReq.user = {
        id: 1,
        rol: 'ADMIN'
      };

      const middleware = authMiddleware.requireRole(['ADMIN', 'MESERO']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should handle errors gracefully', () => {
      // Force an error by not setting user properly
      mockReq.user = null;

      const middleware = authMiddleware.requireRole(['ADMIN']);

      // Mock console.error
      const originalError = console.error;
      console.error = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      console.error = originalError;

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Role helper methods', () => {
    test('requireAdmin should require ADMIN role', () => {
      mockReq.user = { rol: 'ADMIN' };

      const middleware = authMiddleware.requireAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requireMeseroOrAdmin should allow MESERO and ADMIN', () => {
      mockReq.user = { rol: 'MESERO' };

      const middleware = authMiddleware.requireMeseroOrAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requireCocineroOrAdmin should allow COCINERO and ADMIN', () => {
      mockReq.user = { rol: 'COCINERO' };

      const middleware = authMiddleware.requireCocineroOrAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requireCajeroOrAdmin should allow CAJERO and ADMIN', () => {
      mockReq.user = { rol: 'CAJERO' };

      const middleware = authMiddleware.requireCajeroOrAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requireAuth alias should work like verifyToken', async () => {
      expect(authMiddleware.requireAuth).toBe(authMiddleware.verifyToken);
    });
  });
});