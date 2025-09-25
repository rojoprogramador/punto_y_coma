const jwt = require('jsonwebtoken');

// Mock PrismaClient before importing
const mockUsuarioFindUnique = jest.fn();
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        usuario: {
          findUnique: mockUsuarioFindUnique
        }
      };
    })
  };
});

const authMiddleware = require('../../middleware/auth');

describe('Auth Middleware Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
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
    mockUsuarioFindUnique.mockClear();
  });

  afterEach(() => {
    // Additional cleanup
    mockUsuarioFindUnique.mockReset();
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

    test('should return 401 when user not found', async () => {
      const validToken = jwt.sign(
        { id: 999 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockUsuarioFindUnique.mockResolvedValue(null);

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

      mockUsuarioFindUnique.mockResolvedValue({
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

      mockUsuarioFindUnique.mockResolvedValue(mockUser);

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
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

      mockUsuarioFindUnique.mockResolvedValue(mockUser);

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
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
  });

  describe('Role helper methods', () => {
    test('requireAdmin should require ADMIN role', () => {
      mockReq.user = { rol: 'ADMIN' };

      const middleware = authMiddleware.requireAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('requireAuth alias should work like verifyToken', async () => {
      expect(authMiddleware.requireAuth).toBe(authMiddleware.verifyToken);
    });
  });

  describe('Edge Cases and Additional Coverage', () => {
    test('verifyToken should handle malformed JWT token', async () => {
      mockReq.headers.authorization = 'Bearer malformed.jwt.token';

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token inválido' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('optionalAuth should handle malformed JWT token gracefully', async () => {
      mockReq.headers.authorization = 'Bearer malformed.jwt.token';

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    test('verifyToken should handle expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token expirado' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('requireRole should handle user with undefined rol', () => {
      mockReq.user = {
        id: 1,
        rol: undefined
      };

      const middleware = authMiddleware.requireRole(['ADMIN']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tiene permisos para realizar esta acción',
        rolRequerido: ['ADMIN'],
        rolActual: undefined
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('requireRole should handle user with null rol', () => {
      mockReq.user = {
        id: 1,
        rol: null
      };

      const middleware = authMiddleware.requireRole(['ADMIN']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No tiene permisos para realizar esta acción',
        rolRequerido: ['ADMIN'],
        rolActual: null
      });
    });

    test('requireRole should work with multiple roles', () => {
      mockReq.user = {
        id: 1,
        rol: 'MESERO'
      };

      const middleware = authMiddleware.requireRole(['ADMIN', 'MESERO', 'CAJERO']);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('extractToken should handle authorization header with extra spaces', () => {
      mockReq.headers.authorization = '  Bearer   token123  ';

      const token = authMiddleware.extractToken(mockReq);

      expect(token).toBeNull(); // Current implementation doesn't trim spaces
    });

    test('extractToken should handle authorization header with different casing', () => {
      mockReq.headers.authorization = 'bearer token123';

      const token = authMiddleware.extractToken(mockReq);

      expect(token).toBeNull(); // Should be case sensitive
    });

    test('verifyToken should handle database error when finding user', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockUsuarioFindUnique.mockRejectedValue(new Error('Database connection failed'));

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('optionalAuth should handle database error gracefully', async () => {
      const validToken = jwt.sign(
        { id: 1 },
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      mockUsuarioFindUnique.mockRejectedValue(new Error('Database connection failed'));

      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    test('requireAdmin should reject non-admin users', () => {
      mockReq.user = { rol: 'MESERO' };

      const middleware = authMiddleware.requireAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('requireAdmin should handle missing user', () => {
      mockReq.user = null;

      const middleware = authMiddleware.requireAdmin();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('verifyToken should handle token with missing id field', async () => {
      const tokenWithoutId = jwt.sign(
        { username: 'test' }, // Missing id field
        process.env.JWT_SECRET || 'tu-secreto-jwt-aqui'
      );
      mockReq.headers.authorization = `Bearer ${tokenWithoutId}`;

      mockUsuarioFindUnique.mockResolvedValue(null); // Simulate user not found

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado o inactivo' });
    });

    test('extractToken should handle empty bearer token', () => {
      mockReq.headers.authorization = 'Bearer ';

      const token = authMiddleware.extractToken(mockReq);

      expect(token).toBe('');
    });
  });
});