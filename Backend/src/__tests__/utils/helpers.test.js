  test('validarNIF retorna false si documento es falsy', () => {
    expect(helpers.validarNIF()).toBe(false);
    expect(helpers.validarNIF(null)).toBe(false);
    expect(helpers.validarNIF('')).toBe(false);
  });

  describe('formatearDireccion cubre todas las ramas', () => {
    it('devuelve string vacío si no hay datos', () => {
      expect(helpers.formatearDireccion({})).toBe('');
    });
    it('devuelve solo calle', () => {
      expect(helpers.formatearDireccion({ calle: 'Calle' })).toBe('Calle');
    });
    it('devuelve calle y número', () => {
      expect(helpers.formatearDireccion({ calle: 'Calle', numero: 5 })).toBe('Calle 5');
    });
    it('devuelve piso y puerta', () => {
      expect(helpers.formatearDireccion({ piso: 2, puerta: 'B' })).toContain('2º B');
    });
    it('devuelve código postal y ciudad', () => {
      expect(helpers.formatearDireccion({ codigoPostal: '28001', ciudad: 'Madrid' })).toContain('28001 Madrid');
    });
    it('devuelve provincia si es distinta de ciudad', () => {
      expect(helpers.formatearDireccion({ ciudad: 'Madrid', provincia: 'Madrid' })).not.toContain('(');
      expect(helpers.formatearDireccion({ ciudad: 'Madrid', provincia: 'España' })).toContain('(España)');
    });
  });
  test('calcularTiempoTranscurrido retorna minutos si < 60', () => {
    const hace30min = new Date(Date.now() - 30 * 60 * 1000);
    expect(helpers.calcularTiempoTranscurrido(hace30min)).toMatch(/30 min/);
  });

  test('limpiarTextoParaBusqueda retorna vacío si texto falsy', () => {
    expect(helpers.limpiarTextoParaBusqueda()).toBe('');
    expect(helpers.limpiarTextoParaBusqueda(null)).toBe('');
    expect(helpers.limpiarTextoParaBusqueda('')).toBe('');
  });

  test('calcularPaginacion usa valores por defecto y límites', () => {
    expect(helpers.calcularPaginacion()).toEqual({ skip: 0, take: 10 });
    expect(helpers.calcularPaginacion(-5, 200)).toEqual({ skip: 0, take: 100 });
    expect(helpers.calcularPaginacion('abc', 'xyz')).toEqual({ skip: 0, take: 1 });
  });

  test('encriptarDatos usa clave por defecto si no se pasa', () => {
    const enc = helpers.encriptarDatos('dato');
    expect(typeof enc).toBe('string');
    expect(enc.length).toBeGreaterThan(10);
  });
const helpers = require('../../utils/helpers');

describe('Helpers Utils', () => {
  test('generarNumeroPedido genera formato correcto', () => {
    const num = helpers.generarNumeroPedido();
    expect(num).toMatch(/^PED-\d{8}-\d{6}-\d{3}$/);
  });

  test('generarNumeroFactura genera formato correcto', () => {
    const num = helpers.generarNumeroFactura();
    expect(num).toMatch(/^FAC-\d{8}-\d{5}$/);
  });

  test('calcularTotales calcula subtotal, impuestos y total', () => {
    const items = [
      { precioUnitario: 10, cantidad: 2 },
      { precioUnitario: 5, cantidad: 1 }
    ];
    const res = helpers.calcularTotales(items, 10);
    expect(res).toEqual({ subtotal: 25, impuestos: 2.5, total: 27.5 });
  });

  test('calcularTotales con items vacíos retorna ceros', () => {
    const res = helpers.calcularTotales([], 21);
    expect(res).toEqual({ subtotal: 0, impuestos: 0, total: 0 });
  });

  test('calcularTotales con impuestoPorcentaje 0', () => {
    const items = [ { precioUnitario: 10, cantidad: 1 } ];
    const res = helpers.calcularTotales(items, 0);
    expect(res).toEqual({ subtotal: 10, impuestos: 0, total: 10 });
  });

  test('calcularTotales con decimales redondea correctamente', () => {
    const items = [ { precioUnitario: 1.333, cantidad: 3 } ];
    const res = helpers.calcularTotales(items, 21);
    expect(res.subtotal).toBeCloseTo(3.999, 2);
    expect(res.impuestos).toBeCloseTo(0.84, 2);
    expect(res.total).toBeCloseTo(4.84, 2);
  });

  test('formatearFecha retorna string legible', () => {
    const fecha = new Date('2025-09-16T10:00:00Z');
    expect(helpers.formatearFecha(fecha)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test('formatearFecha retorna vacío si no hay fecha', () => {
    expect(helpers.formatearFecha()).toBe('');
    expect(helpers.formatearFecha(null)).toBe('');
    expect(helpers.formatearFecha('')).toBe('');
  });

  test('formatearPrecio retorna string con moneda', () => {
    expect(helpers.formatearPrecio(12.5, '$')).toBe('12.50 $');
    expect(helpers.formatearPrecio('no-num')).toBe('0.00 €');
  });

  test('validarEmail reconoce emails válidos', () => {
    expect(helpers.validarEmail('test@mail.com')).toBe(true);
    expect(helpers.validarEmail('no-mail')).toBe(false);
  });

  test('validarTelefono reconoce teléfonos válidos', () => {
    expect(helpers.validarTelefono('612345678')).toBe(true);
    expect(helpers.validarTelefono('+34612345678')).toBe(true);
    expect(helpers.validarTelefono('123')).toBe(false);
  });

  test('generarCodigoReserva longitud por defecto y custom', () => {
    expect(helpers.generarCodigoReserva()).toHaveLength(6);
    expect(helpers.generarCodigoReserva(8)).toHaveLength(8);
  });

  test('esFechaPasada detecta fechas pasadas', () => {
    expect(helpers.esFechaPasada('2000-01-01')).toBe(true);
    expect(helpers.esFechaPasada(new Date(Date.now() + 100000))).toBe(false);
  });

  test('calcularTiempoTranscurrido retorna string legible', () => {
    const hace1h = new Date(Date.now() - 60 * 60 * 1000);
    expect(helpers.calcularTiempoTranscurrido(hace1h)).toMatch(/1h/);
  });

  test('limpiarTextoParaBusqueda limpia y normaliza', () => {
    expect(helpers.limpiarTextoParaBusqueda('  ÁÉÍÓÚ  ')).toBe('aeiou');
  });

  test('calcularPaginacion calcula skip y take', () => {
    expect(helpers.calcularPaginacion(2, 10)).toEqual({ skip: 10, take: 10 });
  });

  test('crearRespuestaPaginada retorna meta correcta', () => {
    const res = helpers.crearRespuestaPaginada([1,2], 20, 2, 10);
    expect(res.meta).toMatchObject({ total: 20, page: 2, limit: 10, totalPages: 2 });
  });

  test('encriptarDatos retorna string', () => {
    const enc = helpers.encriptarDatos('texto', 'clave');
    expect(typeof enc).toBe('string');
    expect(enc.length).toBeGreaterThan(10);
  });

  test('generarHash genera hash sha256', () => {
    const hash = helpers.generarHash('data');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('validarNIF reconoce NIF y CIF válidos', () => {
    expect(helpers.validarNIF('12345678Z')).toBe(true);
    expect(helpers.validarNIF('A1234567B')).toBe(true);
    expect(helpers.validarNIF('nope')).toBe(false);
  });

  test('convertirFechaUTC retorna Date', () => {
    const utc = helpers.convertirFechaUTC('2025-09-16T10:00:00Z');
    expect(utc instanceof Date).toBe(true);
  });

  test('formatearDireccion retorna string', () => {
    const dir = helpers.formatearDireccion({ calle: 'Calle', numero: 1, ciudad: 'Madrid', codigoPostal: '28001' });
    expect(typeof dir).toBe('string');
    expect(dir).toMatch(/Madrid/);
  });

  test('generarSlug genera slug', () => {
    expect(helpers.generarSlug('Texto con acentos!')).toBe('texto-con-acentos');
  });

  test('validarCodigoPostal reconoce CP válidos', () => {
    expect(helpers.validarCodigoPostal('28001')).toBe(true);
    expect(helpers.validarCodigoPostal('99999')).toBe(false);
  });

  test('generarQRMesa genera url', () => {
    expect(helpers.generarQRMesa(5)).toMatch(/mesa\/5/);
  });
});
