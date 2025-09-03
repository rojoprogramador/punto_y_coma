-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `rol` ENUM('ADMIN', 'MESERO', 'COCINERO', 'CAJERO') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mesas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `capacidad` INTEGER NOT NULL,
    `estado` ENUM('DISPONIBLE', 'OCUPADA', 'RESERVADA', 'MANTENIMIENTO') NOT NULL DEFAULT 'DISPONIBLE',
    `ubicacion` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mesas_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `articulos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL,
    `disponible` BOOLEAN NOT NULL DEFAULT true,
    `imagen` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservas_enc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fechaReserva` DATETIME(3) NOT NULL,
    `horaReserva` DATETIME(3) NOT NULL,
    `numeroPersonas` INTEGER NOT NULL,
    `nombreCliente` VARCHAR(100) NOT NULL,
    `telefonoCliente` VARCHAR(20) NULL,
    `emailCliente` VARCHAR(100) NULL,
    `estado` ENUM('ACTIVA', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA') NOT NULL DEFAULT 'ACTIVA',
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `mesaId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservas_det` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL,
    `precioUnitario` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `observaciones` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reservaId` INTEGER NOT NULL,
    `articuloId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos_enc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroPedido` VARCHAR(20) NOT NULL,
    `fechaPedido` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
    `total` DECIMAL(10, 2) NOT NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `mesaId` INTEGER NOT NULL,

    UNIQUE INDEX `pedidos_enc_numeroPedido_key`(`numeroPedido`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos_det` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL,
    `precioUnitario` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO') NOT NULL DEFAULT 'PENDIENTE',
    `observaciones` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pedidoId` INTEGER NOT NULL,
    `articuloId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facturas_enc` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroFactura` VARCHAR(20) NOT NULL,
    `fechaFactura` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nombreCliente` VARCHAR(100) NULL,
    `nifCliente` VARCHAR(20) NULL,
    `direccionCliente` VARCHAR(255) NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `impuestos` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `metodoPago` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `usuarioId` INTEGER NOT NULL,
    `pedidoId` INTEGER NOT NULL,

    UNIQUE INDEX `facturas_enc_numeroFactura_key`(`numeroFactura`),
    UNIQUE INDEX `facturas_enc_pedidoId_key`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facturas_det` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL,
    `precioUnitario` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `facturaId` INTEGER NOT NULL,
    `articuloId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reservas_enc` ADD CONSTRAINT `reservas_enc_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservas_enc` ADD CONSTRAINT `reservas_enc_mesaId_fkey` FOREIGN KEY (`mesaId`) REFERENCES `mesas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservas_det` ADD CONSTRAINT `reservas_det_reservaId_fkey` FOREIGN KEY (`reservaId`) REFERENCES `reservas_enc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservas_det` ADD CONSTRAINT `reservas_det_articuloId_fkey` FOREIGN KEY (`articuloId`) REFERENCES `articulos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_enc` ADD CONSTRAINT `pedidos_enc_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_enc` ADD CONSTRAINT `pedidos_enc_mesaId_fkey` FOREIGN KEY (`mesaId`) REFERENCES `mesas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_det` ADD CONSTRAINT `pedidos_det_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos_enc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos_det` ADD CONSTRAINT `pedidos_det_articuloId_fkey` FOREIGN KEY (`articuloId`) REFERENCES `articulos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facturas_enc` ADD CONSTRAINT `facturas_enc_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facturas_enc` ADD CONSTRAINT `facturas_enc_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos_enc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facturas_det` ADD CONSTRAINT `facturas_det_facturaId_fkey` FOREIGN KEY (`facturaId`) REFERENCES `facturas_enc`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facturas_det` ADD CONSTRAINT `facturas_det_articuloId_fkey` FOREIGN KEY (`articuloId`) REFERENCES `articulos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
