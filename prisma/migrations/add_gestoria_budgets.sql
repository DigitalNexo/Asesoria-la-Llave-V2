-- AlterTable clients - Agregar campos para gestorías
ALTER TABLE `clients` 
ADD COLUMN `tipo_gestoria` ENUM('OFICIAL', 'ONLINE') NULL,
ADD COLUMN `presupuesto_origen_id` VARCHAR(36) NULL,
ADD INDEX `clients_tipo_gestoria_idx`(`tipo_gestoria`);

-- CreateTable gestoria_budget_configurations
CREATE TABLE `gestoria_budget_configurations` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('OFICIAL', 'ONLINE') NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `precioBasePorFactura` DECIMAL(10, 2) NOT NULL,
    `precioBasePorNomina` DECIMAL(10, 2) NOT NULL,
    `porcentajeRegimenGeneral` DECIMAL(5, 2) NOT NULL,
    `porcentajeModulos` DECIMAL(5, 2) NOT NULL,
    `porcentajeEDN` DECIMAL(5, 2) NOT NULL,
    `recargoPeriodoMensual` DECIMAL(5, 2) NOT NULL,
    `minimoMensual` DECIMAL(10, 2) NOT NULL,
    `precioModelo303` DECIMAL(10, 2) NOT NULL,
    `precioModelo111` DECIMAL(10, 2) NOT NULL,
    `precioModelo115` DECIMAL(10, 2) NOT NULL,
    `precioModelo130` DECIMAL(10, 2) NOT NULL,
    `precioModelo100` DECIMAL(10, 2) NOT NULL,
    `precioModelo349` DECIMAL(10, 2) NOT NULL,
    `precioModelo347` DECIMAL(10, 2) NOT NULL,
    `precioCertificados` DECIMAL(10, 2) NOT NULL,
    `precioCensos` DECIMAL(10, 2) NOT NULL,
    `precioNotificaciones` DECIMAL(10, 2) NOT NULL,
    `precioEstadisticas` DECIMAL(10, 2) NOT NULL,
    `precioAyudas` DECIMAL(10, 2) NOT NULL,
    `nombreEmpresa` VARCHAR(191) NOT NULL,
    `nifEmpresa` VARCHAR(191) NOT NULL,
    `direccionEmpresa` VARCHAR(191) NOT NULL,
    `telefonoEmpresa` VARCHAR(191) NOT NULL,
    `emailEmpresa` VARCHAR(191) NOT NULL,
    `logoPath` VARCHAR(191) NULL,
    `colorPrimario` VARCHAR(191) NOT NULL DEFAULT '#1e40af',
    `colorSecundario` VARCHAR(191) NOT NULL DEFAULT '#3b82f6',
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaModificacion` DATETIME(3) NOT NULL,
    `creadoPor` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable gestoria_budgets
CREATE TABLE `gestoria_budgets` (
    `id` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `tipoGestoria` ENUM('OFICIAL', 'ONLINE') NOT NULL,
    `estado` ENUM('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'FACTURADO') NOT NULL,
    `nombreCliente` VARCHAR(191) NOT NULL,
    `nifCif` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NULL,
    `personaContacto` VARCHAR(191) NULL,
    `facturasMes` INTEGER NOT NULL,
    `nominasMes` INTEGER NOT NULL DEFAULT 0,
    `facturacion` DECIMAL(12, 2) NOT NULL,
    `sistemaTributacion` VARCHAR(191) NOT NULL,
    `periodoDeclaraciones` VARCHAR(191) NOT NULL,
    `modelo303` BOOLEAN NOT NULL DEFAULT false,
    `modelo111` BOOLEAN NOT NULL DEFAULT false,
    `modelo115` BOOLEAN NOT NULL DEFAULT false,
    `modelo130` BOOLEAN NOT NULL DEFAULT false,
    `modelo100` BOOLEAN NOT NULL DEFAULT false,
    `modelo349` BOOLEAN NOT NULL DEFAULT false,
    `modelo347` BOOLEAN NOT NULL DEFAULT false,
    `solicitudCertificados` BOOLEAN NOT NULL DEFAULT false,
    `censosAEAT` BOOLEAN NOT NULL DEFAULT false,
    `recepcionNotificaciones` BOOLEAN NOT NULL DEFAULT false,
    `estadisticasINE` BOOLEAN NOT NULL DEFAULT false,
    `solicitudAyudas` BOOLEAN NOT NULL DEFAULT false,
    `conLaboralSocial` BOOLEAN NOT NULL DEFAULT false,
    `totalContabilidad` DECIMAL(12, 2) NOT NULL,
    `totalLaboral` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `aplicaDescuento` BOOLEAN NOT NULL DEFAULT false,
    `tipoDescuento` VARCHAR(191) NULL,
    `valorDescuento` DECIMAL(10, 2) NULL,
    `descuentoCalculado` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `totalFinal` DECIMAL(12, 2) NOT NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaEnvio` DATETIME(3) NULL,
    `fechaAceptacion` DATETIME(3) NULL,
    `fechaRechazo` DATETIME(3) NULL,
    `motivoRechazo` TEXT NULL,
    `creadoPor` VARCHAR(191) NOT NULL,
    `modificadoPor` VARCHAR(191) NULL,
    `clienteId` VARCHAR(191) NULL,
    `configId` VARCHAR(191) NOT NULL,
    `pdfPath` VARCHAR(191) NULL,

    UNIQUE INDEX `gestoria_budgets_numero_key`(`numero`),
    INDEX `gestoria_budgets_estado_idx`(`estado`),
    INDEX `gestoria_budgets_tipoGestoria_idx`(`tipoGestoria`),
    INDEX `gestoria_budgets_nifCif_idx`(`nifCif`),
    INDEX `gestoria_budgets_fechaCreacion_idx`(`fechaCreacion`),
    INDEX `gestoria_budgets_clienteId_idx`(`clienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable gestoria_budget_additional_services
CREATE TABLE `gestoria_budget_additional_services` (
    `id` VARCHAR(191) NOT NULL,
    `budgetId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `tipoServicio` ENUM('MENSUAL', 'PUNTUAL') NOT NULL,
    `incluido` BOOLEAN NOT NULL DEFAULT true,

    INDEX `gestoria_budget_additional_services_budgetId_idx`(`budgetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable gestoria_budget_statistics_events
CREATE TABLE `gestoria_budget_statistics_events` (
    `id` VARCHAR(191) NOT NULL,
    `budgetId` VARCHAR(191) NOT NULL,
    `evento` ENUM('CREADO', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'CONVERTIDO') NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,
    `metadata` TEXT NULL,

    INDEX `gestoria_budget_statistics_events_budgetId_idx`(`budgetId`),
    INDEX `gestoria_budget_statistics_events_evento_idx`(`evento`),
    INDEX `gestoria_budget_statistics_events_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `gestoria_budgets` ADD CONSTRAINT `gestoria_budgets_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `gestoria_budget_configurations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gestoria_budget_additional_services` ADD CONSTRAINT `gestoria_budget_additional_services_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `gestoria_budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gestoria_budget_statistics_events` ADD CONSTRAINT `gestoria_budget_statistics_events_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `gestoria_budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
