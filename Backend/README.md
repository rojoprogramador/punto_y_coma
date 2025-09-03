# Sistema Restaurante - Backend API

Backend completo para sistema de gestión de restaurante con autenticación, gestión de mesas, pedidos, reservas y facturación.

## 🚀 Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Prisma** - ORM para base de datos
- **MySQL** - Base de datos relacional
- **JWT** - Autenticación
- **Jest** - Testing framework
- **bcrypt** - Encriptación de passwords

## 📁 Estructura del Proyecto

```
Backend/
├── src/
│   ├── controllers/          # Lógica de negocio
│   │   ├── authController.js
│   │   ├── mesaController.js
│   │   ├── pedidoController.js
│   │   ├── facturaController.js
│   │   └── reservaController.js
│   ├── routes/              # Rutas de la API
│   │   ├── authRoutes.js
│   │   ├── mesaRoutes.js
│   │   ├── pedidoRoutes.js
│   │   ├── facturaRoutes.js
│   │   └── reservaRoutes.js
│   ├── middleware/          # Middlewares
│   │   └── auth.js
│   ├── utils/              # Utilidades
│   │   └── helpers.js
│   ├── __tests__/          # Tests
│   └── app.js              # Servidor Express
├── prisma/
│   └── schema.prisma       # Esquema de base de datos
├── package.json
├── .env                    # Variables de entorno
├── .env.example           # Ejemplo de variables
└── README.md
```

## 🛠️ Instalación y Configuración

### 1. Requisitos Previos

- Node.js 18 o superior
- MySQL 8.0 o superior
- npm o yarn

### 2. Configurar MySQL

**Instalar MySQL:**
```bash
# Windows (con Chocolatey)
choco install mysql

# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS (con Homebrew)
brew install mysql
```

**Crear base de datos y usuario:**
```sql
-- Conectar como root
mysql -u root -p

-- Crear base de datos
CREATE DATABASE puntoycoma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario
CREATE USER 'root'@'localhost' IDENTIFIED BY 'password123';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON puntoycoma* TO 'restaurante_user'@'localhost';
FLUSH PRIVILEGES;

-- Salir
EXIT;
```

### 3. Configurar Proyecto

**Clonar e instalar dependencias:**
```bash
cd Backend
npm install
```

**Configurar variables de entorno:**
```bash
cp .envExample .env
```

**Editar `.env` con tus datos:**
```env
DATABASE_URL="mysql://restaurante_user:password123@localhost:3306/punto_coma_db"
JWT_SECRET="tu_secreto_jwt_super_seguro"
NODE_ENV=development
PORT=3000
FRONTEND_URL="http://localhost:4200"
```

### 4. Configurar Base de Datos con Prisma

```bash
# Generar cliente de Prisma
npm run db:generate

# Crear y ejecutar migraciones
npm run db:migrate

# Ver base de datos (opcional)
npm run db:studio
```

### 5. Ejecutar Proyecto

```bash
# Desarrollo
npm run dev

# Producción
npm start

# Tests
npm test
npm run test:coverage
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Generar reporte de coverage
npm run test:coverage
```

## 📡 API Endpoints

El servidor corre en `http://localhost:3000`

### Health Check
- `GET /health` - Estado del servidor

### Autenticación (`/api/auth`)
- `POST /login` - Iniciar sesión
- `POST /register` - Registrar usuario
- `GET /verify` - Verificar token
- `POST /refresh` - Renovar token
- `POST /logout` - Cerrar sesión

### Mesas (`/api/mesas`)
- `GET /` - Obtener todas las mesas
- `GET /disponibles` - Obtener mesas disponibles
- `GET /:id` - Obtener mesa por ID
- `POST /:id/asignar` - Asignar mesa
- `POST /:id/liberar` - Liberar mesa
- `PUT /:id/estado` - Cambiar estado

### Pedidos (`/api/pedidos`)
- `GET /` - Obtener pedidos
- `GET /cocina` - Vista para cocina
- `GET /:id` - Obtener pedido por ID
- `POST /` - Crear pedido
- `PUT /:id/estado` - Actualizar estado

### Facturas (`/api/facturas`)
- `GET /` - Obtener facturas
- `GET /:id` - Obtener factura por ID
- `POST /generar/:pedidoId` - Generar factura
- `GET /reportes/ventas` - Reportes de ventas

### Reservas (`/api/reservas`)
- `GET /` - Obtener reservas
- `GET /hoy` - Reservas del día
- `GET /:id` - Obtener reserva por ID
- `POST /` - Crear reserva
- `PUT /:id/confirmar` - Confirmar reserva

## 👥 División de Trabajo por Desarrolladores

### Desarrollador 1 - Rama: `feature/auth`
**Archivos a implementar:**
- `src/controllers/authController.js`
- `src/routes/authRoutes.js` 
- `src/middleware/auth.js`
- Tests correspondientes

**Funcionalidades:**
- Sistema de login/registro
- Verificación JWT
- Middleware de autenticación
- Hash de passwords con bcrypt

### Desarrollador 2 - Rama: `feature/mesas`
**Archivos a implementar:**
- `src/controllers/mesaController.js`
- `src/routes/mesaRoutes.js`
- Tests correspondientes

**Funcionalidades:**
- CRUD de mesas
- Asignación y liberación
- Estados de mesas
- Consulta de disponibilidad

### Desarrollador 3 - Rama: `feature/pedidos`
**Archivos a implementar:**
- `src/controllers/pedidoController.js`
- `src/routes/pedidoRoutes.js`
- Tests correspondientes

**Funcionalidades:**
- Creación y gestión de pedidos
- Estados de pedidos
- Vista para cocina
- Gestión de items

### Desarrollador 4 - Rama: `feature/facturas`
**Archivos a implementar:**
- `src/controllers/facturaController.js`
- `src/routes/facturaRoutes.js`
- Tests correspondientes

**Funcionalidades:**
- Generación de facturas
- Reportes de ventas
- Estadísticas
- Anulación de facturas

### Desarrollador 5 - Rama: `feature/reservas`
**Archivos a implementar:**
- `src/controllers/reservaController.js`
- `src/routes/reservaRoutes.js`
- Tests correspondientes

**Funcionalidades:**
- CRUD de reservas
- Verificación de disponibilidad
- Confirmación y cancelación
- Vista del día

## 🔧 Comandos Útiles

```bash
# Base de datos
npm run db:generate    # Generar cliente Prisma
npm run dev      # Sincronizar schema con BD
npm run db:migrate    # Crear migración
npm run db:studio     # Abrir Prisma Studio

# Desarrollo
npm run dev           # Servidor en modo desarrollo
npm start            # Servidor en modo producción

# Testing
npm test             # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Coverage de tests
```

## 🐛 Solución de Problemas Comunes

### Error: "Can't connect to MySQL server"
```bash
# Verificar que MySQL esté corriendo
sudo service mysql start

# Verificar conexión
mysql -u restaurante_user -p punto_coma_db
```

### Error: "Environment variable not found: DATABASE_URL"
- Verificar que el archivo `.env` existe
- Verificar que `DATABASE_URL` está configurado correctamente

### Error: "prisma command not found"
```bash
# Instalar Prisma CLI globalmente
npm install -g prisma

# O usar con npx
npx prisma generate
```

### Error en migraciones de Prisma
```bash
# Reset de la base de datos (⚠️ borra todos los datos)
npx prisma migrate reset

# Aplicar migraciones pendientes
npx prisma migrate deploy
```

## 📝 Notas de Desarrollo

1. **Todos los endpoints están estructurados** pero retornan 501 (Not Implemented)
2. **Los tests están configurados** pero contienen placeholders
3. **El middleware de auth** está preparado pero no implementado
4. **La validación de datos** está configurada en las rutas
5. **El servidor arranca sin errores** y responde al health check

## 🚀 Próximos Pasos

1. Cada desarrollador debe:
   - Crear su rama específica
   - Implementar los controladores asignados
   - Escribir tests para su módulo
   - Probar endpoints con Postman/Insomnia

2. Integración:
   - Hacer merge de ramas completadas
   - Ejecutar tests de integración
   - Deploy a entorno de staging

## 🤝 Contribución

1. Crear rama específica: `feature/nombre-modulo`
2. Implementar funcionalidad asignada
3. Escribir tests correspondientes
4. Crear Pull Request hacia `main`
5. Review de código por el equipo

## 📞 Soporte

Si tienes problemas o dudas:
1. Revisar este README
2. Consultar documentación de Prisma
3. Revisar issues del proyecto
4. Contactar al lead técnico