// Funciones helper y utilidades generales
// Estas funciones pueden ser utilizadas por todos los desarrolladores

/**
 * Generar número único para pedidos
 * Formato: PED-YYYYMMDD-HHMMSS-XXX
 */
const generarNumeroPedido = () => {
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const hora = ahora.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PED-${fecha}-${hora}-${random}`;
};

/**
 * Generar número único para facturas
 * Formato: FAC-YYYYMMDD-XXXXX
 */
const generarNumeroFactura = () => {
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `FAC-${fecha}-${random}`;
};

/**
 * Calcular subtotal, impuestos y total
 * @param {Array} items - Array de items con precio y cantidad
 * @param {Number} impuestoPorcentaje - Porcentaje de impuesto (ej: 21 para 21%)
 * @returns {Object} - { subtotal, impuestos, total }
 */
const calcularTotales = (items, impuestoPorcentaje = 21) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.precioUnitario * item.cantidad);
  }, 0);
  
  const impuestos = subtotal * (impuestoPorcentaje / 100);
  const total = subtotal + impuestos;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    impuestos: Math.round(impuestos * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

/**
 * Formatear fecha para mostrar en la UI
 * @param {Date} fecha - Fecha a formatear
 * @returns {String} - Fecha formateada (DD/MM/YYYY HH:mm)
 */
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatear precio para mostrar en la UI
 * @param {Number} precio - Precio a formatear
 * @param {String} moneda - Símbolo de moneda (por defecto €)
 * @returns {String} - Precio formateado
 */
const formatearPrecio = (precio, moneda = '€') => {
  if (typeof precio !== 'number') return `0.00 ${moneda}`;
  return `${precio.toFixed(2)} ${moneda}`;
};

/**
 * Validar formato de email
 * @param {String} email - Email a validar
 * @returns {Boolean} - true si es válido
 */
const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validar formato de teléfono español
 * @param {String} telefono - Teléfono a validar
 * @returns {Boolean} - true si es válido
 */
const validarTelefono = (telefono) => {
  const regex = /^(\+34|0034|34)?[6789]\d{8}$/;
  return regex.test(telefono.replace(/\s/g, ''));
};

/**
 * Generar código aleatorio para reservas
 * @param {Number} longitud - Longitud del código (por defecto 6)
 * @returns {String} - Código generado
 */
const generarCodigoReserva = (longitud = 6) => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < longitud; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
};

/**
 * Verificar si una fecha está en el pasado
 * @param {Date|String} fecha - Fecha a verificar
 * @returns {Boolean} - true si está en el pasado
 */
const esFechaPasada = (fecha) => {
  const fechaComparar = new Date(fecha);
  const ahora = new Date();
  return fechaComparar < ahora;
};

/**
 * Calcular tiempo transcurrido desde una fecha
 * @param {Date|String} fechaInicio - Fecha de inicio
 * @returns {String} - Tiempo transcurrido en formato legible
 */
const calcularTiempoTranscurrido = (fechaInicio) => {
  const inicio = new Date(fechaInicio);
  const ahora = new Date();
  const diferencia = ahora - inicio;
  
  const minutos = Math.floor(diferencia / 60000);
  if (minutos < 60) {
    return `${minutos} min`;
  }
  
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return `${horas}h ${minutosRestantes}min`;
};

/**
 * Limpiar y formatear string para búsquedas
 * @param {String} texto - Texto a limpiar
 * @returns {String} - Texto limpio
 */
const limpiarTextoParaBusqueda = (texto) => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim();
};

/**
 * Paginar resultados
 * @param {Number} page - Página actual (base 1)
 * @param {Number} limit - Límite por página
 * @returns {Object} - { skip, take }
 */
const calcularPaginacion = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
  
  return {
    skip: (pageNum - 1) * limitNum,
    take: limitNum
  };
};

/**
 * Generar respuesta paginada
 * @param {Array} data - Datos
 * @param {Number} total - Total de registros
 * @param {Number} page - Página actual
 * @param {Number} limit - Límite por página
 * @returns {Object} - Respuesta con metadatos de paginación
 */
const crearRespuestaPaginada = (data, total, page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const totalPages = Math.ceil(total / limitNum);
  
  return {
    data,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

// TODO: Funciones adicionales que podrían ser útiles:
// - encriptarDatos: Para datos sensibles
// - generarHash: Para verificación de integridad
// - validarNIF: Validar NIF/CIF español
// - convertirFechaUTC: Manejar zonas horarias
// - formatearDireccion: Formatear direcciones postales
// - calcularDistancia: Entre dos direcciones
// - generarSlug: Para URLs amigables
// - comprimirImagen: Optimizar imágenes subidas

module.exports = {
  generarNumeroPedido,
  generarNumeroFactura,
  calcularTotales,
  formatearFecha,
  formatearPrecio,
  validarEmail,
  validarTelefono,
  generarCodigoReserva,
  esFechaPasada,
  calcularTiempoTranscurrido,
  limpiarTextoParaBusqueda,
  calcularPaginacion,
  crearRespuestaPaginada
};