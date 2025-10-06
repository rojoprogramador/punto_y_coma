# API Documentación - Sistema de Restaurante

## Información General

### URLs de Entorno

**🌐 Producción (AWS):** `http://ec2-18-220-22-188.us-east-2.compute.amazonaws.com:3000/api`
**💻 Desarrollo (Local):** `http://localhost:3000/api`

### Configuración por Entorno

| Aspecto | Producción (AWS) | Desarrollo (Local) |
|---------|------------------|-------------------|
| **Base de Datos** | SQLite | MySQL |
| **Propósito** | MVP para presentación | Desarrollo completo |
| **URL** | `ec2-18-220-22-188.us-east-2.compute.amazonaws.com:3000` | `localhost:3000` |

**Tecnología:** Node.js + Express + Prisma + SQLite/MySQL
**Autenticación:** JWT (JSON Web Tokens)
**Rate Limiting:** 100 requests por IP cada 15 minutos

## Configuración de Headers

```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>" // Para rutas protegidas
}
```

## Ejemplos de Uso Rápido

### ✅ Probar la API de Producción

```bash
# Health Check
curl -X GET http://ec2-18-220-22-188.us-east-2.compute.amazonaws.com:3000/health

# Registro de usuario (ejemplo)
curl -X POST http://ec2-18-220-22-188.us-east-2.compute.amazonaws.com:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "email": "test@ejemplo.com",
    "password": "Test123456",
    "rol": "MESERO"
  }'

# Login
curl -X POST http://ec2-18-220-22-188.us-east-2.compute.amazonaws.com:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "Test123456"
  }'
```

### 📱 Para el Frontend

```javascript
// Configuración base para fetch/axios
const API_BASE_URL = 'http://ec2-18-220-22-188.us-east-2.compute.amazonaws.com:3000/api';

// Ejemplo con fetch
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'usuario@ejemplo.com',
    password: 'contraseña123'
  })
});
```

## Estados de Respuesta HTTP

- `200` - Éxito
- `201` - Recurso creado exitosamente
- `400` - Error en la solicitud (datos inválidos)
- `401` - No autorizado (token inválido/expirado)
- `403` - Prohibido (sin permisos)
- `404` - Recurso no encontrado
- `429` - Demasiadas solicitudes (rate limit)
- `500` - Error interno del servidor

---

## 1. AUTENTICACIÓN (`/api/auth`)

### POST `/api/auth/login`
Iniciar sesión de usuario

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "usuario@ejemplo.com",
    "rol": "MESERO"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here"
}
```

### POST `/api/auth/register`
Registrar nuevo usuario (requiere ADMIN)

**Body:**
```json
{
  "nombre": "María García",
  "email": "maria@restaurante.com",
  "password": "Password123",
  "rol": "MESERO"
}
```

**Validaciones:**
- `nombre`: mínimo 2 caracteres
- `email`: formato de email válido
- `password`: mínimo 8 caracteres, debe incluir mayúscula, minúscula y número
- `rol`: debe ser `ADMIN`, `MESERO`, `COCINERO`, o `CAJERO`

### GET `/api/auth/verify`
Verificar validez del token JWT

**Headers:** `Authorization: Bearer <token>`

**Respuesta exitosa (200):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "rol": "MESERO"
  }
}
```

### POST `/api/auth/refresh`
Renovar token de acceso

**Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### POST `/api/auth/logout`
Cerrar sesión (requiere autenticación)

**Headers:** `Authorization: Bearer <token>`

---

## 2. MESAS (`/api/mesas`)

### GET `/api/mesas`
Obtener lista de mesas

**Query Parameters (opcionales):**
- `estado`: `DISPONIBLE`, `OCUPADA`, `RESERVADA`, `MANTENIMIENTO`
- `capacidad`: número mínimo de capacidad

**Ejemplo:** `GET /api/mesas?estado=DISPONIBLE&capacidad=4`

**Respuesta exitosa (200):**
```json
{
  "mesas": [
    {
      "id": 1,
      "numero": 1,
      "capacidad": 4,
      "estado": "DISPONIBLE",
      "ubicacion": "Zona principal",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### GET `/api/mesas/disponibles`
Obtener mesas disponibles para reserva

**Query Parameters (opcionales):**
- `capacidad`: capacidad mínima requerida
- `fecha`: fecha en formato YYYY-MM-DD
- `hora`: hora en formato HH:mm

### GET `/api/mesas/:id`
Obtener mesa específica por ID

### POST `/api/mesas/:id/asignar`
Asignar mesa a cliente (requiere MESERO/ADMIN)

**Body:**
```json
{
  "clienteInfo": {
    "nombre": "Carlos Ruiz",
    "telefono": "+34666123456"
  }
}
```

### POST `/api/mesas/:id/liberar`
Liberar mesa ocupada (requiere MESERO/ADMIN)

### PUT `/api/mesas/:id/estado`
Cambiar estado de mesa (requiere MESERO/ADMIN)

**Body:**
```json
{
  "estado": "MANTENIMIENTO",
  "motivo": "Limpieza profunda programada"
}
```

### POST `/api/mesas` (solo ADMIN)
Crear nueva mesa

**Body:**
```json
{
  "numero": 15,
  "capacidad": 6,
  "ubicacion": "Terraza"
}
```

### PUT `/api/mesas/:id` (solo ADMIN)
Actualizar mesa existente

### DELETE `/api/mesas/:id` (solo ADMIN)
Eliminar mesa

---

## 3. RESERVAS (`/api/reservas`)

### GET `/api/reservas`
Obtener lista de reservas (requiere autenticación)

**Query Parameters (opcionales):**
- `fechaDesde`: fecha inicio (YYYY-MM-DD)
- `fechaHasta`: fecha fin (YYYY-MM-DD)
- `estado`: `ACTIVA`, `CONFIRMADA`, `CANCELADA`, `COMPLETADA`
- `mesa`: número de mesa
- `cliente`: nombre de cliente
- `page`: número de página (default: 1)
- `limit`: límite de resultados (max: 100)

### GET `/api/reservas/hoy`
Reservas del día actual (requiere MESERO/ADMIN)

**Respuesta exitosa (200):**
```json
{
  "reservas": [
    {
      "id": 1,
      "fechaReserva": "2024-01-15T00:00:00.000Z",
      "horaReserva": "2024-01-15T20:00:00.000Z",
      "numeroPersonas": 4,
      "nombreCliente": "Ana López",
      "telefonoCliente": "+34666987654",
      "estado": "CONFIRMADA",
      "mesa": {
        "numero": 5,
        "capacidad": 4
      }
    }
  ]
}
```

### GET `/api/reservas/:id`
Obtener reserva específica

### POST `/api/reservas`
Crear nueva reserva (requiere autenticación)

**Body:**
```json
{
  "fechaReserva": "2024-01-20",
  "horaReserva": "20:30",
  "numeroPersonas": 4,
  "nombreCliente": "Roberto Silva",
  "telefonoCliente": "+34666555444",
  "emailCliente": "roberto@email.com",
  "observaciones": "Mesa junto a la ventana si es posible",
  "mesaPreferida": 3
}
```

**Validaciones:**
- `fechaReserva`: debe ser fecha futura
- `horaReserva`: formato HH:mm
- `numeroPersonas`: entre 1 y 20
- `nombreCliente`: entre 2 y 100 caracteres

### POST `/api/reservas/verificar-disponibilidad`
Verificar disponibilidad para fecha/hora específica

**Body:**
```json
{
  "fechaReserva": "2024-01-20",
  "horaReserva": "20:30",
  "numeroPersonas": 4
}
```

**Respuesta exitosa (200):**
```json
{
  "disponible": true,
  "mesasDisponibles": [
    {
      "id": 1,
      "numero": 1,
      "capacidad": 4
    },
    {
      "id": 3,
      "numero": 3,
      "capacidad": 6
    }
  ]
}
```

### PUT `/api/reservas/:id`
Actualizar reserva existente

### PUT `/api/reservas/:id/confirmar`
Confirmar asistencia (requiere MESERO/ADMIN)

### PUT `/api/reservas/:id/cancelar`
Cancelar reserva

**Body:**
```json
{
  "motivo": "Cambio de planes del cliente"
}
```

### PUT `/api/reservas/:id/completar`
Marcar reserva como completada (requiere MESERO/ADMIN)

---

## 4. PEDIDOS (`/api/pedidos`)

### GET `/api/pedidos`
Obtener lista de pedidos

**Query Parameters (opcionales):**
- `estado`: `PENDIENTE`, `EN_PREPARACION`, `LISTO`, `ENTREGADO`, `CANCELADO`
- `mesa`: número de mesa
- `mesero`: ID del mesero
- `fecha`: fecha específica (YYYY-MM-DD)
- `page`: número de página
- `limit`: límite de resultados (max: 100)

**Respuesta exitosa (200):**
```json
{
  "pedidos": [
    {
      "id": 1,
      "numeroPedido": "PED-001-240115",
      "fechaPedido": "2024-01-15T14:30:00.000Z",
      "estado": "EN_PREPARACION",
      "total": 45.50,
      "mesa": {
        "numero": 3
      },
      "usuario": {
        "nombre": "María García"
      },
      "detalles": [
        {
          "id": 1,
          "cantidad": 2,
          "precioUnitario": 12.50,
          "subtotal": 25.00,
          "articulo": {
            "nombre": "Paella Valenciana"
          }
        }
      ]
    }
  ],
  "total": 1,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### GET `/api/pedidos/cocina`
Vista especial para área de cocina (solo pedidos activos)

### GET `/api/pedidos/mesero/:meseroId`
Pedidos asignados a mesero específico

### GET `/api/pedidos/:id`
Obtener pedido específico por ID

### POST `/api/pedidos`
Crear nuevo pedido (requiere autenticación)

**Body:**
```json
{
  "mesaId": 3,
  "items": [
    {
      "articuloId": 1,
      "cantidad": 2,
      "observaciones": "Sin cebolla"
    },
    {
      "articuloId": 5,
      "cantidad": 1
    }
  ],
  "observaciones": "Pedido urgente"
}
```

**Respuesta exitosa (201):**
```json
{
  "id": 15,
  "numeroPedido": "PED-015-240115",
  "estado": "PENDIENTE",
  "total": 32.50,
  "mesa": {
    "numero": 3
  }
}
```

### PUT `/api/pedidos/:id/estado`
Actualizar estado del pedido (requiere autenticación)

**Body:**
```json
{
  "estado": "LISTO",
  "motivo": "Preparación completada"
}
```

**Permisos por rol:**
- `MESERO`: puede cambiar a `ENTREGADO` y `CANCELADO`
- `COCINERO`: puede cambiar a `EN_PREPARACION` y `LISTO`
- `ADMIN`: puede cambiar a cualquier estado

### POST `/api/pedidos/:id/items`
Agregar artículo al pedido existente (solo estado PENDIENTE)

**Body:**
```json
{
  "articuloId": 7,
  "cantidad": 1,
  "observaciones": "Extra picante"
}
```

### PUT `/api/pedidos/:id/items/:itemId`
Actualizar item específico del pedido

### DELETE `/api/pedidos/:id/items/:itemId`
Eliminar item específico del pedido

---

## 5. FACTURAS (`/api/facturas`)

### GET `/api/facturas`
Obtener lista de facturas (requiere autenticación)

**Query Parameters (opcionales):**
- `fechaDesde`: fecha inicio (YYYY-MM-DD)
- `fechaHasta`: fecha fin (YYYY-MM-DD)
- `cliente`: nombre de cliente
- `metodoPago`: `EFECTIVO`, `TARJETA_CREDITO`, `TARJETA_DEBITO`, `TRANSFERENCIA`, `DIGITAL`
- `page`: número de página
- `limit`: límite de resultados

### GET `/api/facturas/estadisticas`
Estadísticas de facturación (requiere ADMIN)

**Respuesta exitosa (200):**
```json
{
  "totalVentasHoy": 1250.75,
  "totalVentasMes": 45300.50,
  "facturasPendientes": 3,
  "metodoPagoMasUsado": "TARJETA_CREDITO",
  "promedioTicket": 32.50
}
```

### GET `/api/facturas/reportes/ventas`
Reporte de ventas (requiere ADMIN)

**Query Parameters:**
- `fechaDesde`: fecha inicio (requerida)
- `fechaHasta`: fecha fin (requerida)
- `agrupadoPor`: `dia`, `semana`, `mes`
- `metodoPago`: filtro por método específico

### GET `/api/facturas/numero/:numero`
Buscar factura por número

### GET `/api/facturas/:id`
Obtener factura específica por ID

### GET `/api/facturas/:id/detalles`
Obtener detalles de la factura

### GET `/api/facturas/:id/imprimir`
Generar PDF de factura (requiere autenticación)

### POST `/api/facturas/generar/:pedidoId`
Generar factura desde pedido (requiere CAJERO/ADMIN)

**Body:**
```json
{
  "metodoPago": "TARJETA_CREDITO",
  "nombreCliente": "Juan Pérez",
  "nifCliente": "12345678X",
  "direccionCliente": "Calle Mayor 123, Madrid",
  "descuento": 10,
  "observaciones": "Cliente VIP"
}
```

**Respuesta exitosa (201):**
```json
{
  "id": 25,
  "numeroFactura": "FAC-025-240115",
  "estado": "FACTURADA",
  "subtotal": 40.00,
  "impuestos": 8.40,
  "total": 48.40,
  "metodoPago": "TARJETA_CREDITO"
}
```

### PUT `/api/facturas/:id/anular`
Anular factura (solo ADMIN, mismo día)

**Body:**
```json
{
  "motivo": "Error en la facturación",
  "autorizadoPor": "Director General"
}
```

---

## 6. HEALTH CHECK

### GET `/health`
Verificar estado del servidor

**Respuesta exitosa (200):**
```json
{
  "status": "OK",
  "message": "Servidor funcionando correctamente",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "environment": "development"
}
```

---

## Modelos de Datos

### Usuario
```typescript
{
  id: number
  nombre: string
  email: string
  rol: "ADMIN" | "MESERO" | "COCINERO" | "CAJERO"
  activo: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Mesa
```typescript
{
  id: number
  numero: number
  capacidad: number
  estado: "DISPONIBLE" | "OCUPADA" | "RESERVADA" | "MANTENIMIENTO"
  ubicacion?: string
  createdAt: Date
  updatedAt: Date
}
```

### Reserva
```typescript
{
  id: number
  fechaReserva: Date
  horaReserva: Date
  numeroPersonas: number
  nombreCliente: string
  telefonoCliente?: string
  emailCliente?: string
  estado: "ACTIVA" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA"
  observaciones?: string
  usuarioId: number
  mesaId: number
  createdAt: Date
  updatedAt: Date
}
```

### Pedido
```typescript
{
  id: number
  numeroPedido: string
  fechaPedido: Date
  estado: "PENDIENTE" | "EN_PREPARACION" | "LISTO" | "ENTREGADO" | "CANCELADO"
  total: number
  observaciones?: string
  usuarioId: number
  mesaId: number
  detalles: PedidoDetalle[]
  createdAt: Date
  updatedAt: Date
}
```

### Factura
```typescript
{
  id: number
  numeroFactura: string
  estado: "PENDIENTE" | "FACTURADA" | "ENVIADA" | "ANULADA"
  fechaFactura: Date
  nombreCliente?: string
  nifCliente?: string
  direccionCliente?: string
  subtotal: number
  impuestos: number
  total: number
  metodoPago: string
  usuarioId: number
  pedidoId: number
  detalles: FacturaDetalle[]
  createdAt: Date
  updatedAt: Date
}
```

---

## Errores Comunes

### Error 400 - Datos inválidos
```json
{
  "error": "Datos de entrada inválidos",
  "details": [
    {
      "field": "email",
      "message": "Debe ser un email válido"
    }
  ]
}
```

### Error 401 - No autorizado
```json
{
  "error": "Token inválido",
  "message": "El token de autenticación no es válido"
}
```

### Error 429 - Rate Limit
```json
{
  "error": "Demasiadas peticiones desde esta IP, intenta de nuevo después de 15 minutos."
}
```

### Error 500 - Error interno
```json
{
  "error": "Error interno del servidor",
  "message": "Algo salió mal"
}
```

---

## Roles y Permisos

| Endpoint | ADMIN | MESERO | COCINERO | CAJERO |
|----------|-------|--------|----------|--------|
| Auth (login/verify) | ✅ | ✅ | ✅ | ✅ |
| Auth (register) | ✅ | ❌ | ❌ | ❌ |
| Mesas (GET) | ✅ | ✅ | ✅ | ✅ |
| Mesas (POST/PUT/DELETE) | ✅ | ❌ | ❌ | ❌ |
| Mesas (asignar/liberar) | ✅ | ✅ | ❌ | ❌ |
| Reservas (todas) | ✅ | ✅ | ❌ | ❌ |
| Pedidos (GET/POST) | ✅ | ✅ | ✅ | ❌ |
| Pedidos cocina | ✅ | ✅ | ✅ | ❌ |
| Facturas (generar) | ✅ | ❌ | ❌ | ✅ |
| Facturas (estadísticas) | ✅ | ❌ | ❌ | ❌ |

---

## Notas de Implementación

### General
1. **Autenticación**: Todas las rutas (excepto login y health) requieren token JWT válido
2. **Rate Limiting**: 100 requests por IP cada 15 minutos
3. **Validaciones**: Todas las entradas son validadas con express-validator
4. **Logging**: Todas las requests son loggeadas con Morgan
5. **Seguridad**: Headers de seguridad configurados con Helmet

### Entorno de Producción (AWS)
- **Base de Datos**: SQLite (optimizado para MVP)
- **URL**: `http://ec2-18-220-22-188.us-east-2.compute.amazonaws.com:3000`
- **Propósito**: Demostración y presentación del MVP
- **CORS**: Configurado para aceptar requests desde múltiples orígenes

### Entorno de Desarrollo (Local)
- **Base de Datos**: MySQL con Prisma ORM
- **URL**: `http://localhost:3000`
- **Propósito**: Desarrollo completo con todas las funcionalidades
- **CORS**: Configurado para aceptar requests desde `http://localhost:4200` (frontend Angular)

## ⚠️ Consideraciones Importantes

### Para el Frontend
- Usar la URL de **producción** para demos y presentaciones
- Usar la URL **local** para desarrollo y testing
- Los datos en producción pueden ser limitados (MVP con SQLite)
- Los schemas de base de datos son idénticos, solo cambia el motor

### Para Testing
- La API de producción está disponible 24/7 para pruebas
- Se recomienda crear usuarios de prueba con diferentes roles
- Los datos de producción pueden ser reiniciados periódicamente

## Contacto y Soporte

Para dudas o reportar problemas con la API, contactar al equipo de desarrollo.