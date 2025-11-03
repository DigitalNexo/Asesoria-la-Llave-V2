-- AlterTable: Añadir campos nuevos a gestoria_budgets
ALTER TABLE `gestoria_budgets` 
  ADD COLUMN `tipoPresupuesto` ENUM('AUTONOMO', 'PYME', 'EMPRESA', 'LABORAL', 'HERENCIA', 'RENTAS', 'OTROS') NOT NULL DEFAULT 'AUTONOMO',
  ADD COLUMN `manualOverride` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Configuración principal para presupuestos de Autónomos
CREATE TABLE `gestoria_budget_autonomo_config` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL DEFAULT 'Configuración Autónomos',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `porcentajePeriodoMensual` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    `porcentajeEDN` DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    `porcentajeModulos` DECIMAL(5, 2) NOT NULL DEFAULT -10.00,
    `minimoMensual` DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaModificacion` DATETIME(3) NOT NULL,
    `creadoPor` VARCHAR(191) NOT NULL,
    `modificadoPor` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Tramos de precios según número de facturas mensuales (DINÁMICO)
CREATE TABLE `gestoria_budget_invoice_tiers` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `minFacturas` INTEGER NOT NULL,
    `maxFacturas` INTEGER NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `etiqueta` VARCHAR(191) NULL,

    INDEX `gestoria_budget_invoice_tiers_configId_idx`(`configId`),
    UNIQUE INDEX `gestoria_budget_invoice_tiers_configId_orden_key`(`configId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Tramos de precios según número de nóminas mensuales (DINÁMICO)
CREATE TABLE `gestoria_budget_payroll_tiers` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `minNominas` INTEGER NOT NULL,
    `maxNominas` INTEGER NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `etiqueta` VARCHAR(191) NULL,

    INDEX `gestoria_budget_payroll_tiers_configId_idx`(`configId`),
    UNIQUE INDEX `gestoria_budget_payroll_tiers_configId_orden_key`(`configId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Tramos de multiplicadores según facturación anual (DINÁMICO)
CREATE TABLE `gestoria_budget_annual_billing_tiers` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `minFacturacion` DECIMAL(12, 2) NOT NULL,
    `maxFacturacion` DECIMAL(12, 2) NULL,
    `multiplicador` DECIMAL(4, 2) NOT NULL,
    `etiqueta` VARCHAR(191) NULL,

    INDEX `gestoria_budget_annual_billing_tiers_configId_idx`(`configId`),
    UNIQUE INDEX `gestoria_budget_annual_billing_tiers_configId_orden_key`(`configId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Precios de modelos fiscales (DINÁMICO)
CREATE TABLE `gestoria_budget_fiscal_model_pricing` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `codigoModelo` VARCHAR(191) NOT NULL,
    `nombreModelo` VARCHAR(191) NOT NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,

    INDEX `gestoria_budget_fiscal_model_pricing_configId_idx`(`configId`),
    UNIQUE INDEX `gestoria_budget_fiscal_model_pricing_configId_codigoModelo_key`(`configId`, `codigoModelo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Precios de servicios adicionales mensuales (DINÁMICO)
CREATE TABLE `gestoria_budget_additional_service_pricing` (
    `id` VARCHAR(191) NOT NULL,
    `configId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `precio` DECIMAL(10, 2) NOT NULL,
    `tipoServicio` ENUM('MENSUAL', 'PUNTUAL') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,

    INDEX `gestoria_budget_additional_service_pricing_configId_idx`(`configId`),
    UNIQUE INDEX `gestoria_budget_additional_service_pricing_configId_codigo_key`(`configId`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: Relaciones entre tablas
ALTER TABLE `gestoria_budget_invoice_tiers` ADD CONSTRAINT `gestoria_budget_invoice_tiers_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `gestoria_budget_autonomo_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `gestoria_budget_payroll_tiers` ADD CONSTRAINT `gestoria_budget_payroll_tiers_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `gestoria_budget_autonomo_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `gestoria_budget_annual_billing_tiers` ADD CONSTRAINT `gestoria_budget_annual_billing_tiers_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `gestoria_budget_autonomo_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `gestoria_budget_fiscal_model_pricing` ADD CONSTRAINT `gestoria_budget_fiscal_model_pricing_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `gestoria_budget_autonomo_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `gestoria_budget_additional_service_pricing` ADD CONSTRAINT `gestoria_budget_additional_service_pricing_configId_fkey` FOREIGN KEY (`configId`) REFERENCES `gestoria_budget_autonomo_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
