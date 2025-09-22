const helpers = require('../../utils/helpers');

describe('Helpers Tests', () => {
  describe('generarNumeroPedido function', () => {
    test('should generate pedido number with correct format', () => {
      const numero = helpers.generarNumeroPedido();
      expect(numero).toMatch(/^PED-\d{8}-\d{6}-\d{3}$/);
    });

    test('should generate unique numbers', () => {
      const numero1 = helpers.generarNumeroPedido();
      const numero2 = helpers.generarNumeroPedido();
      expect(numero1).not.toBe(numero2);
    });
  });

  describe('generarNumeroFactura function', () => {
    test('should generate factura number with correct format', () => {
      const numero = helpers.generarNumeroFactura();
      expect(numero).toMatch(/^FAC-\d{8}-\d{5}$/);
    });

    test('should generate unique numbers', () => {
      const numero1 = helpers.generarNumeroFactura();
      const numero2 = helpers.generarNumeroFactura();
      expect(numero1).not.toBe(numero2);
    });
  });

  describe('calcularTotales function', () => {
    test('should calculate totals correctly with default tax', () => {
      const items = [
        { precioUnitario: 10.00, cantidad: 2 },
        { precioUnitario: 15.50, cantidad: 1 }
      ];

      const result = helpers.calcularTotales(items);

      expect(result.subtotal).toBe(35.50);
      expect(result.impuestos).toBe(7.46); // 21% of 35.50
      expect(result.total).toBe(42.96);
    });

    test('should calculate totals with custom tax rate', () => {
      const items = [
        { precioUnitario: 100.00, cantidad: 1 }
      ];

      const result = helpers.calcularTotales(items, 10);

      expect(result.subtotal).toBe(100.00);
      expect(result.impuestos).toBe(10.00);
      expect(result.total).toBe(110.00);
    });

    test('should handle empty items array', () => {
      const result = helpers.calcularTotales([]);

      expect(result.subtotal).toBe(0);
      expect(result.impuestos).toBe(0);
      expect(result.total).toBe(0);
    });

    test('should round numbers correctly', () => {
      const items = [
        { precioUnitario: 10.336, cantidad: 3 }
      ];

      const result = helpers.calcularTotales(items);

      expect(result.subtotal).toBe(31.01); // rounded
      expect(result.impuestos).toBe(6.51);
      expect(result.total).toBe(37.52);
    });
  });

  describe('formatearFecha function', () => {
    test('should format date correctly', () => {
      const fecha = new Date('2023-12-25T10:30:00');
      const formatted = helpers.formatearFecha(fecha);

      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    test('should handle string dates', () => {
      const formatted = helpers.formatearFecha('2023-12-25T10:30:00Z');

      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    test('should handle null and undefined', () => {
      expect(helpers.formatearFecha(null)).toBe('');
      expect(helpers.formatearFecha(undefined)).toBe('');
    });

    test('should handle empty string', () => {
      expect(helpers.formatearFecha('')).toBe('');
    });
  });

  describe('formatearPrecio function', () => {
    test('should format numbers correctly', () => {
      expect(helpers.formatearPrecio(1234.56)).toBe('1234.56 €');
      expect(helpers.formatearPrecio(999)).toBe('999.00 €');
      expect(helpers.formatearPrecio(0)).toBe('0.00 €');
    });

    test('should handle custom currency', () => {
      expect(helpers.formatearPrecio(100, '$')).toBe('100.00 $');
      expect(helpers.formatearPrecio(50.5, 'USD')).toBe('50.50 USD');
    });

    test('should handle non-number inputs', () => {
      expect(helpers.formatearPrecio('invalid')).toBe('0.00 €');
      expect(helpers.formatearPrecio(null)).toBe('0.00 €');
      expect(helpers.formatearPrecio(undefined)).toBe('0.00 €');
    });

    test('should handle negative numbers', () => {
      expect(helpers.formatearPrecio(-100.50)).toBe('-100.50 €');
    });
  });

  describe('validarEmail function', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+label@gmail.com',
        'simple@test.org'
      ];

      validEmails.forEach(email => {
        expect(helpers.validarEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'test@',
        'test..test@domain.com',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(helpers.validarEmail(email)).toBe(false);
      });
    });

    test('should handle null and undefined inputs', () => {
      expect(helpers.validarEmail(null)).toBe(false);
      expect(helpers.validarEmail(undefined)).toBe(false);
    });
  });

  describe('validarTelefono function', () => {
    test('should validate Spanish phone numbers', () => {
      const validPhones = [
        '612345678',
        '+34612345678',
        '0034612345678',
        '34612345678',
        '6 12 34 56 78' // with spaces
      ];

      validPhones.forEach(phone => {
        expect(helpers.validarTelefono(phone)).toBe(true);
      });
    });

    test('should reject invalid phone formats', () => {
      const invalidPhones = [
        '512345678', // doesn't start with 6,7,8,9
        '12345678',  // too short
        'abc123def',
        '+44612345678', // wrong country code
        ''
      ];

      invalidPhones.forEach(phone => {
        expect(helpers.validarTelefono(phone)).toBe(false);
      });
    });
  });

  describe('generarCodigoReserva function', () => {
    test('should generate code with default length', () => {
      const codigo = helpers.generarCodigoReserva();
      expect(codigo).toHaveLength(6);
      expect(codigo).toMatch(/^[A-Z0-9]+$/);
    });

    test('should generate code with custom length', () => {
      const codigo = helpers.generarCodigoReserva(10);
      expect(codigo).toHaveLength(10);
      expect(codigo).toMatch(/^[A-Z0-9]+$/);
    });

    test('should generate unique codes', () => {
      const codigo1 = helpers.generarCodigoReserva();
      const codigo2 = helpers.generarCodigoReserva();
      expect(codigo1).not.toBe(codigo2);
    });

    test('should handle zero length', () => {
      const codigo = helpers.generarCodigoReserva(0);
      expect(codigo).toBe('');
    });
  });

  describe('esFechaPasada function', () => {
    test('should detect past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(helpers.esFechaPasada(pastDate)).toBe(true);
    });

    test('should detect future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(helpers.esFechaPasada(futureDate)).toBe(false);
    });

    test('should handle string dates', () => {
      expect(helpers.esFechaPasada('2020-01-01')).toBe(true);
      expect(helpers.esFechaPasada('2030-01-01')).toBe(false);
    });

    test('should handle current time approximately', () => {
      const now = new Date();
      // Current time might be slightly in the past by the time the comparison happens
      const result = helpers.esFechaPasada(now);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('calcularTiempoTranscurrido function', () => {
    test('should calculate minutes correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const resultado = helpers.calcularTiempoTranscurrido(fiveMinutesAgo);
      expect(resultado).toBe('5 min');
    });

    test('should calculate hours and minutes correctly', () => {
      const twoHoursThirtyMinutesAgo = new Date(Date.now() - (2 * 60 + 30) * 60 * 1000);
      const resultado = helpers.calcularTiempoTranscurrido(twoHoursThirtyMinutesAgo);
      expect(resultado).toBe('2h 30min');
    });

    test('should handle zero time', () => {
      const now = new Date();
      const resultado = helpers.calcularTiempoTranscurrido(now);
      expect(resultado).toMatch(/^0 min$/);
    });

    test('should handle string dates', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const resultado = helpers.calcularTiempoTranscurrido(oneHourAgo);
      expect(resultado).toBe('1h 0min');
    });
  });

  describe('limpiarTextoParaBusqueda function', () => {
    test('should clean text for search', () => {
      expect(helpers.limpiarTextoParaBusqueda('Café Español')).toBe('cafe espanol');
      expect(helpers.limpiarTextoParaBusqueda('  TEST  ')).toBe('test');
      expect(helpers.limpiarTextoParaBusqueda('Niño')).toBe('nino');
    });

    test('should handle empty and null inputs', () => {
      expect(helpers.limpiarTextoParaBusqueda('')).toBe('');
      expect(helpers.limpiarTextoParaBusqueda(null)).toBe('');
      expect(helpers.limpiarTextoParaBusqueda(undefined)).toBe('');
    });

    test('should handle special characters', () => {
      expect(helpers.limpiarTextoParaBusqueda('Café & Restaurant')).toBe('cafe & restaurant');
      expect(helpers.limpiarTextoParaBusqueda('123 Test!')).toBe('123 test!');
    });
  });

  describe('calcularPaginacion function', () => {
    test('should calculate pagination correctly', () => {
      expect(helpers.calcularPaginacion(1, 10)).toEqual({ skip: 0, take: 10 });
      expect(helpers.calcularPaginacion(2, 10)).toEqual({ skip: 10, take: 10 });
      expect(helpers.calcularPaginacion(3, 5)).toEqual({ skip: 10, take: 5 });
    });

    test('should handle default values', () => {
      expect(helpers.calcularPaginacion()).toEqual({ skip: 0, take: 10 });
    });

    test('should handle invalid inputs', () => {
      expect(helpers.calcularPaginacion(0, 10)).toEqual({ skip: 0, take: 10 }); // page normalized to 1
      expect(helpers.calcularPaginacion(-1, 10)).toEqual({ skip: 0, take: 10 }); // page normalized to 1
      expect(helpers.calcularPaginacion(1, 0)).toEqual({ skip: 0, take: 1 }); // limit normalized to 1
      expect(helpers.calcularPaginacion(1, 200)).toEqual({ skip: 0, take: 100 }); // limit capped at 100
    });

    test('should handle string inputs', () => {
      expect(helpers.calcularPaginacion('2', '5')).toEqual({ skip: 5, take: 5 });
      expect(helpers.calcularPaginacion('invalid', 'invalid')).toEqual({ skip: 0, take: 10 });
    });
  });

  describe('crearRespuestaPaginada function', () => {
    test('should create paginated response correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const result = helpers.crearRespuestaPaginada(data, 50, 2, 10);

      expect(result.data).toEqual(data);
      expect(result.meta).toEqual({
        total: 50,
        page: 2,
        limit: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: true
      });
    });

    test('should handle first page', () => {
      const data = [1, 2, 3];
      const result = helpers.crearRespuestaPaginada(data, 25, 1, 5);

      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    test('should handle last page', () => {
      const data = [1, 2];
      const result = helpers.crearRespuestaPaginada(data, 12, 3, 5);

      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(true);
      expect(result.meta.totalPages).toBe(3);
    });

    test('should handle single page', () => {
      const data = [1, 2, 3];
      const result = helpers.crearRespuestaPaginada(data, 3, 1, 10);

      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(false);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});