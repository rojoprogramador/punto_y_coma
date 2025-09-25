const helpers = require('../../utils/helpers');

describe('Helpers Tests', () => {

  describe('generarNumeroPedido', () => {
    test('debe generar número de pedido con formato correcto', () => {
      const numero = helpers.generarNumeroPedido();
      expect(numero).toMatch(/^PED-\d{8}-\d{6}-\d{3}$/);
      expect(numero).toContain('PED-');
    });

    test('debe generar números únicos', () => {
      const numero1 = helpers.generarNumeroPedido();
      const numero2 = helpers.generarNumeroPedido();
      expect(numero1).not.toBe(numero2);
    });
  });

  describe('generarNumeroFactura', () => {
    test('debe generar número de factura con formato correcto', () => {
      const numero = helpers.generarNumeroFactura();
      expect(numero).toMatch(/^FAC-\d{8}-\d{5}$/);
      expect(numero).toContain('FAC-');
    });

    test('debe generar números únicos', () => {
      const numero1 = helpers.generarNumeroFactura();
      const numero2 = helpers.generarNumeroFactura();
      expect(numero1).not.toBe(numero2);
    });
  });

  describe('calcularTotales', () => {
    const items = [
      { precioUnitario: 10, cantidad: 2 },
      { precioUnitario: 15, cantidad: 1 }
    ];

    test('debe calcular totales con impuesto por defecto (21%)', () => {
      const resultado = helpers.calcularTotales(items);
      expect(resultado.subtotal).toBe(35);
      expect(resultado.impuestos).toBe(7.35);
      expect(resultado.total).toBe(42.35);
    });

    test('debe calcular totales con impuesto personalizado', () => {
      const resultado = helpers.calcularTotales(items, 10);
      expect(resultado.subtotal).toBe(35);
      expect(resultado.impuestos).toBe(3.5);
      expect(resultado.total).toBe(38.5);
    });

    test('debe manejar array vacío', () => {
      const resultado = helpers.calcularTotales([]);
      expect(resultado.subtotal).toBe(0);
      expect(resultado.impuestos).toBe(0);
      expect(resultado.total).toBe(0);
    });

    test('debe redondear correctamente', () => {
      const itemsDecimales = [{ precioUnitario: 10.333, cantidad: 3 }];
      const resultado = helpers.calcularTotales(itemsDecimales);
      expect(resultado.subtotal).toBe(31);
      expect(resultado.impuestos).toBe(6.51);
      expect(resultado.total).toBe(37.51);
    });
  });

  describe('formatearFecha', () => {
    test('debe formatear fecha correctamente', () => {
      const fecha = new Date('2023-12-25T15:30:00');
      const resultado = helpers.formatearFecha(fecha);
      expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
    });

    test('debe retornar string vacío para fecha nula', () => {
      expect(helpers.formatearFecha(null)).toBe('');
      expect(helpers.formatearFecha(undefined)).toBe('');
      expect(helpers.formatearFecha('')).toBe('');
    });

    test('debe manejar string de fecha', () => {
      const resultado = helpers.formatearFecha('2023-12-25');
      expect(resultado).toBeTruthy();
      expect(typeof resultado).toBe('string');
    });
  });

  describe('formatearPrecio', () => {
    test('debe formatear precio con moneda por defecto', () => {
      expect(helpers.formatearPrecio(25.5)).toBe('25.50 €');
      expect(helpers.formatearPrecio(100)).toBe('100.00 €');
    });

    test('debe formatear precio con moneda personalizada', () => {
      expect(helpers.formatearPrecio(25.5, '$')).toBe('25.50 $');
    });

    test('debe manejar tipos no numéricos', () => {
      expect(helpers.formatearPrecio('abc')).toBe('0.00 €');
      expect(helpers.formatearPrecio(null)).toBe('0.00 €');
      expect(helpers.formatearPrecio(undefined)).toBe('0.00 €');
    });
  });

  describe('validarEmail', () => {
    test('debe validar emails correctos', () => {
      expect(helpers.validarEmail('test@example.com')).toBe(true);
      expect(helpers.validarEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('debe rechazar emails incorrectos', () => {
      expect(helpers.validarEmail('invalid-email')).toBe(false);
      expect(helpers.validarEmail('test@')).toBe(false);
      expect(helpers.validarEmail('@domain.com')).toBe(false);
      expect(helpers.validarEmail('')).toBe(false);
    });
  });

  describe('validarTelefono', () => {
    test('debe validar teléfonos españoles correctos', () => {
      expect(helpers.validarTelefono('612345678')).toBe(true);
      expect(helpers.validarTelefono('+34612345678')).toBe(true);
      expect(helpers.validarTelefono('34612345678')).toBe(true);
      expect(helpers.validarTelefono('712345678')).toBe(true);
    });

    test('debe rechazar teléfonos incorrectos', () => {
      expect(helpers.validarTelefono('512345678')).toBe(false); // No empieza por 6,7,8,9
      expect(helpers.validarTelefono('12345')).toBe(false); // Muy corto
      expect(helpers.validarTelefono('abc')).toBe(false);
    });

    test('debe manejar espacios en teléfonos', () => {
      expect(helpers.validarTelefono('612 345 678')).toBe(true);
    });
  });

  describe('generarCodigoReserva', () => {
    test('debe generar código con longitud por defecto', () => {
      const codigo = helpers.generarCodigoReserva();
      expect(codigo).toHaveLength(6);
      expect(codigo).toMatch(/^[A-Z0-9]+$/);
    });

    test('debe generar código con longitud personalizada', () => {
      const codigo = helpers.generarCodigoReserva(10);
      expect(codigo).toHaveLength(10);
      expect(codigo).toMatch(/^[A-Z0-9]+$/);
    });

    test('debe generar códigos únicos', () => {
      const codigo1 = helpers.generarCodigoReserva();
      const codigo2 = helpers.generarCodigoReserva();
      expect(codigo1).not.toBe(codigo2);
    });
  });

  describe('esFechaPasada', () => {
    test('debe detectar fechas pasadas', () => {
      const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(helpers.esFechaPasada(ayer)).toBe(true);
    });

    test('debe detectar fechas futuras', () => {
      const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(helpers.esFechaPasada(manana)).toBe(false);
    });

    test('debe manejar strings de fecha', () => {
      const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(helpers.esFechaPasada(ayer)).toBe(true);
    });
  });

  describe('calcularTiempoTranscurrido', () => {
    test('debe calcular minutos transcurridos', () => {
      const hace30min = new Date(Date.now() - 30 * 60 * 1000);
      const resultado = helpers.calcularTiempoTranscurrido(hace30min);
      expect(resultado).toMatch(/^\d+ min$/);
    });

    test('debe calcular horas y minutos transcurridos', () => {
      const hace90min = new Date(Date.now() - 90 * 60 * 1000);
      const resultado = helpers.calcularTiempoTranscurrido(hace90min);
      expect(resultado).toMatch(/^\d+h \d+min$/);
    });

    test('debe manejar string de fecha', () => {
      const hace60min = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const resultado = helpers.calcularTiempoTranscurrido(hace60min);
      expect(resultado).toMatch(/^\d+h \d+min$/);
    });
  });

  describe('limpiarTextoParaBusqueda', () => {
    test('debe limpiar texto correctamente', () => {
      expect(helpers.limpiarTextoParaBusqueda('Café ñandú')).toBe('cafe nandu');
      expect(helpers.limpiarTextoParaBusqueda('  TEXTO  ')).toBe('texto');
    });

    test('debe manejar texto vacío o nulo', () => {
      expect(helpers.limpiarTextoParaBusqueda('')).toBe('');
      expect(helpers.limpiarTextoParaBusqueda(null)).toBe('');
      expect(helpers.limpiarTextoParaBusqueda(undefined)).toBe('');
    });

    test('debe remover acentos', () => {
      expect(helpers.limpiarTextoParaBusqueda('áéíóú')).toBe('aeiou');
    });
  });

  describe('calcularPaginacion', () => {
    test('debe calcular paginación correctamente', () => {
      const resultado = helpers.calcularPaginacion(2, 10);
      expect(resultado.skip).toBe(10);
      expect(resultado.take).toBe(10);
    });

    test('debe usar valores por defecto', () => {
      const resultado = helpers.calcularPaginacion();
      expect(resultado.skip).toBe(0);
      expect(resultado.take).toBe(10);
    });

    test('debe manejar página menor a 1', () => {
      const resultado = helpers.calcularPaginacion(0, 10);
      expect(resultado.skip).toBe(0);
      expect(resultado.take).toBe(10);
    });

    test('debe limitar el límite máximo', () => {
      const resultado = helpers.calcularPaginacion(1, 200);
      expect(resultado.take).toBe(100);
    });

    test('debe parsear strings', () => {
      const resultado = helpers.calcularPaginacion('3', '15');
      expect(resultado.skip).toBe(30);
      expect(resultado.take).toBe(15);
    });
  });

  describe('crearRespuestaPaginada', () => {
    const data = [1, 2, 3];
    const total = 25;

    test('debe crear respuesta paginada correctamente', () => {
      const resultado = helpers.crearRespuestaPaginada(data, total, 2, 10);

      expect(resultado.data).toBe(data);
      expect(resultado.meta.total).toBe(25);
      expect(resultado.meta.page).toBe(2);
      expect(resultado.meta.limit).toBe(10);
      expect(resultado.meta.totalPages).toBe(3);
      expect(resultado.meta.hasNextPage).toBe(true);
      expect(resultado.meta.hasPrevPage).toBe(true);
    });

    test('debe calcular correctamente primera página', () => {
      const resultado = helpers.crearRespuestaPaginada(data, total, 1, 10);
      expect(resultado.meta.hasPrevPage).toBe(false);
      expect(resultado.meta.hasNextPage).toBe(true);
    });

    test('debe calcular correctamente última página', () => {
      const resultado = helpers.crearRespuestaPaginada(data, total, 3, 10);
      expect(resultado.meta.hasPrevPage).toBe(true);
      expect(resultado.meta.hasNextPage).toBe(false);
    });
  });

  describe('validarId', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    test('debe validar ID correcto', () => {
      expect(helpers.validarId(5, mockRes, 'test')).toBe(5);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe rechazar ID inválido', () => {
      expect(helpers.validarId('abc', mockRes, 'test')).toBe(null);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'ID de test inválido' });
    });

    test('debe rechazar ID menor a 1', () => {
      expect(helpers.validarId(0, mockRes)).toBe(null);
      expect(helpers.validarId(-1, mockRes)).toBe(null);
    });

    test('debe funcionar sin response object', () => {
      expect(helpers.validarId('abc', null)).toBe(null);
      expect(helpers.validarId(5, null)).toBe(5);
    });

    test('debe usar nombre de campo por defecto', () => {
      helpers.validarId('abc', mockRes);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'ID de recurso inválido' });
    });
  });

  describe('validarEstado', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    test('debe validar estado correcto', () => {
      const estados = ['ACTIVO', 'INACTIVO'];
      expect(helpers.validarEstado('ACTIVO', estados, mockRes)).toBe(true);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('debe rechazar estado inválido', () => {
      const estados = ['ACTIVO', 'INACTIVO'];
      expect(helpers.validarEstado('PENDIENTE', estados, mockRes)).toBe(false);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Estado inválido',
        estadosPermitidos: estados
      });
    });

    test('debe funcionar sin response object', () => {
      const estados = ['ACTIVO', 'INACTIVO'];
      expect(helpers.validarEstado('ACTIVO', estados, null)).toBe(true);
      expect(helpers.validarEstado('PENDIENTE', estados, null)).toBe(false);
    });
  });

  describe('manejarError', () => {
    let mockRes;
    let consoleSpy;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('debe manejar error correctamente', () => {
      const error = new Error('Test error');
      helpers.manejarError(error, mockRes, 'testOperation');

      expect(consoleSpy).toHaveBeenCalledWith('Error en testOperation:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Error interno del servidor' });
    });

    test('debe funcionar sin response object', () => {
      const error = new Error('Test error');
      expect(() => helpers.manejarError(error, null, 'testOperation')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error en testOperation:', error);
    });
  });
});