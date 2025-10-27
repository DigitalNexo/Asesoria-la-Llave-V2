/*
  Warnings:

  - You are about to drop the column `createdAt` on the `budget_email_logs` table. All the data in the column will be lost.
  - You are about to drop the column `toEmail` on the `budget_email_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `budget_items` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `budget_items` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `budget_items` table. All the data in the column will be lost.
  - You are about to drop the column `vatPct` on the `budget_items` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `budget_pdfs` table. All the data in the column will be lost.
  - You are about to drop the column `billingRange` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `clientEmail` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `clientPhone` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `payrollPerMonth` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `templateName` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `templateSnapshot` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `vatMode` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `vatTotal` on the `budgets` table. All the data in the column will be lost.
  - Added the required column `unit_price` to the `budget_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `budget_email_logs` DROP COLUMN `createdAt`,
    DROP COLUMN `toEmail`,
    ADD COLUMN `created_at` DATETIME(3) NULL,
    ADD COLUMN `to_email` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `budget_items` DROP COLUMN `createdAt`,
    DROP COLUMN `unitPrice`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `vatPct`,
    ADD COLUMN `category` VARCHAR(191) NULL,
    ADD COLUMN `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `is_manually_edited` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `position` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `unit_price` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `vat_pct` DECIMAL(5, 2) NULL;

-- AlterTable
ALTER TABLE `budget_pdfs` DROP COLUMN `createdAt`,
    ADD COLUMN `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `budgets` DROP COLUMN `billingRange`,
    DROP COLUMN `clientEmail`,
    DROP COLUMN `clientPhone`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `payrollPerMonth`,
    DROP COLUMN `templateId`,
    DROP COLUMN `templateName`,
    DROP COLUMN `templateSnapshot`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `vatMode`,
    DROP COLUMN `vatTotal`,
    ADD COLUMN `billing_range` VARCHAR(100) NULL,
    ADD COLUMN `client_address` VARCHAR(500) NULL,
    ADD COLUMN `client_email` VARCHAR(255) NULL,
    ADD COLUMN `client_nif` VARCHAR(50) NULL,
    ADD COLUMN `client_phone` VARCHAR(50) NULL,
    ADD COLUMN `company_brand` VARCHAR(50) NOT NULL DEFAULT 'LA_LLAVE',
    ADD COLUMN `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `custom_total` DECIMAL(12, 2) NULL,
    ADD COLUMN `manually_edited` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `payroll_per_month` INTEGER NULL,
    ADD COLUMN `template_id` VARCHAR(255) NULL,
    ADD COLUMN `template_name` VARCHAR(255) NULL,
    ADD COLUMN `template_snapshot` LONGTEXT NULL,
    ADD COLUMN `type` ENUM('PYME', 'AUTONOMO', 'RENTA', 'HERENCIAS') NOT NULL DEFAULT 'PYME',
    ADD COLUMN `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `vat_mode` VARCHAR(50) NULL DEFAULT 'IVA_NO_INCLUIDO',
    ADD COLUMN `vat_total` DECIMAL(12, 2) NULL;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(36) NOT NULL,
    `usuario_id` VARCHAR(36) NOT NULL,
    `accion` TEXT NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `detalles` TEXT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_usuario_id_modulo_fecha_idx`(`usuario_id`, `modulo`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_trail` (
    `id` VARCHAR(36) NOT NULL,
    `usuario_id` VARCHAR(36) NOT NULL,
    `accion` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `tabla` VARCHAR(191) NOT NULL,
    `registro_id` VARCHAR(36) NOT NULL,
    `valor_anterior` TEXT NULL,
    `valor_nuevo` TEXT NULL,
    `cambios` TEXT NULL,
    `request_id` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_trail_fecha_idx`(`fecha`),
    INDEX `audit_trail_tabla_registro_id_idx`(`tabla`, `registro_id`),
    INDEX `audit_trail_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_parameters` (
    `id` VARCHAR(36) NOT NULL,
    `budget_type` ENUM('PYME', 'AUTONOMO', 'RENTA', 'HERENCIAS') NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `subcategory` VARCHAR(100) NULL,
    `param_key` VARCHAR(100) NOT NULL,
    `param_label` TEXT NOT NULL,
    `param_value` DECIMAL(12, 2) NOT NULL,
    `min_range` INTEGER NULL,
    `max_range` INTEGER NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_budget_type`(`budget_type`),
    INDEX `idx_category`(`category`),
    UNIQUE INDEX `unique_param`(`budget_type`, `param_key`, `min_range`, `max_range`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('PYME', 'AUTONOMO', 'RENTA', 'HERENCIAS') NOT NULL,
    `companyBrand` VARCHAR(191) NOT NULL DEFAULT 'LA_LLAVE',
    `htmlContent` LONGTEXT NOT NULL,
    `availableVars` LONGTEXT NULL,
    `customCss` TEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_companyBrand`(`companyBrand`),
    INDEX `idx_isActive`(`isActive`),
    INDEX `idx_isDefault`(`isDefault`),
    INDEX `idx_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendario_aeat` (
    `id` VARCHAR(36) NOT NULL,
    `modelo` VARCHAR(10) NOT NULL,
    `periodicidad` ENUM('MENSUAL', 'TRIMESTRAL', 'ANUAL', 'ESPECIAL_FRACCIONADO') NOT NULL,
    `periodo_contable` VARCHAR(20) NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_employees` (
    `client_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_employees_client_id_idx`(`client_id`),
    INDEX `client_employees_user_id_idx`(`user_id`),
    PRIMARY KEY (`client_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_tax` (
    `id` VARCHAR(36) NOT NULL,
    `client_id` VARCHAR(36) NOT NULL,
    `tax_period_id` VARCHAR(36) NOT NULL,
    `estado` VARCHAR(50) NOT NULL,
    `notas` TEXT NULL,
    `display_text` VARCHAR(191) NULL,
    `color_tag` VARCHAR(191) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL,
    `fecha_actualizacion` DATETIME(3) NOT NULL,

    INDEX `client_tax_client_id_fkey`(`client_id`),
    INDEX `client_tax_tax_period_id_fkey`(`tax_period_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_tax_assignments` (
    `id` VARCHAR(36) NOT NULL,
    `client_id` VARCHAR(36) NOT NULL,
    `tax_model_code` VARCHAR(20) NOT NULL,
    `periodicidad` ENUM('MENSUAL', 'TRIMESTRAL', 'ANUAL', 'ESPECIAL_FRACCIONADO') NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `active_flag` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_tax_assignments_tax_model_code_idx`(`tax_model_code`),
    UNIQUE INDEX `client_tax_assignments_client_id_tax_model_code_key`(`client_id`, `tax_model_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_tax_filings` (
    `id` VARCHAR(36) NOT NULL,
    `client_id` VARCHAR(36) NOT NULL,
    `tax_model_code` VARCHAR(50) NOT NULL,
    `period_id` VARCHAR(36) NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'PRESENTED') NOT NULL DEFAULT 'NOT_STARTED',
    `notes` TEXT NULL,
    `presented_at` DATETIME(3) NULL,
    `assignee_id` VARCHAR(36) NULL,

    INDEX `client_tax_filings_assignee_id_fkey`(`assignee_id`),
    INDEX `client_tax_filings_period_id_fkey`(`period_id`),
    UNIQUE INDEX `clientId_taxModelCode_periodId`(`client_id`, `tax_model_code`, `period_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_tax_requirements` (
    `id` VARCHAR(36) NOT NULL,
    `client_id` VARCHAR(36) NOT NULL,
    `impuesto` VARCHAR(191) NOT NULL,
    `detalle` TEXT NULL,
    `tax_model_code` VARCHAR(50) NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `note` TEXT NULL,
    `color_tag` VARCHAR(50) NULL,

    INDEX `client_tax_requirements_client_id_fkey`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(36) NOT NULL,
    `razon_social` TEXT NOT NULL,
    `nif_cif` VARCHAR(191) NOT NULL,
    `tipo` ENUM('AUTONOMO', 'EMPRESA', 'PARTICULAR') NOT NULL,
    `email` TEXT NULL,
    `telefono` TEXT NULL,
    `direccion` TEXT NULL,
    `fecha_alta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responsable_asignado` VARCHAR(36) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `tax_models` LONGTEXT NULL,
    `fecha_baja` DATETIME(3) NULL,
    `notes` TEXT NULL,

    UNIQUE INDEX `clients_nif_cif_key`(`nif_cif`),
    INDEX `clients_fecha_baja_idx`(`fecha_baja`),
    INDEX `clients_is_active_idx`(`is_active`),
    INDEX `clients_responsable_asignado_idx`(`responsable_asignado`),
    INDEX `clients_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `declaraciones` (
    `id` VARCHAR(36) NOT NULL,
    `obligacion_id` VARCHAR(36) NOT NULL,
    `calendario_id` VARCHAR(36) NULL,
    `estado` ENUM('PENDIENTE', 'CALCULADO', 'PRESENTADO') NOT NULL DEFAULT 'PENDIENTE',
    `fecha_presentacion` DATETIME(3) NULL,
    `archivo_pdf` VARCHAR(500) NULL,
    `notas` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `declaraciones_calendario_id_idx`(`calendario_id`),
    INDEX `declaraciones_estado_idx`(`estado`),
    INDEX `declaraciones_fecha_presentacion_idx`(`fecha_presentacion`),
    INDEX `declaraciones_obligacion_id_idx`(`obligacion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fiscal_periods` (
    `id` VARCHAR(36) NOT NULL,
    `year` INTEGER NOT NULL,
    `quarter` INTEGER NULL,
    `label` VARCHAR(50) NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NOT NULL,
    `closed_by` VARCHAR(36) NULL,
    `kind` ENUM('QUARTERLY', 'ANNUAL', 'SPECIAL') NOT NULL DEFAULT 'QUARTERLY',
    `locked_at` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',

    INDEX `fiscal_periods_closed_by_fkey`(`closed_by`),
    UNIQUE INDEX `fiscal_periods_year_label_key`(`year`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `impuestos` (
    `id` VARCHAR(36) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `modelo` VARCHAR(10) NOT NULL,
    `descripcion` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `impuestos_modelo_key`(`modelo`),
    INDEX `impuestos_modelo_idx`(`modelo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_runs` (
    `id` VARCHAR(36) NOT NULL,
    `job_name` VARCHAR(191) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `status` VARCHAR(50) NOT NULL,
    `records_processed` INTEGER NULL,
    `error_message` TEXT NULL,
    `metadata` TEXT NULL,

    INDEX `job_runs_job_name_started_at_idx`(`job_name`, `started_at`),
    INDEX `job_runs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manual_attachments` (
    `id` VARCHAR(36) NOT NULL,
    `manual_id` VARCHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_path` TEXT NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `uploaded_by` VARCHAR(36) NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `manual_attachments_manual_id_idx`(`manual_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manual_versions` (
    `id` VARCHAR(36) NOT NULL,
    `manual_id` VARCHAR(36) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `titulo` TEXT NOT NULL,
    `contenido_html` TEXT NOT NULL,
    `etiquetas` TEXT NULL,
    `categoria` VARCHAR(191) NULL,
    `created_by` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `manual_versions_created_at_idx`(`created_at`),
    INDEX `manual_versions_manual_id_idx`(`manual_id`),
    UNIQUE INDEX `manual_versions_manual_id_version_number_key`(`manual_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manuals` (
    `id` VARCHAR(36) NOT NULL,
    `titulo` TEXT NOT NULL,
    `contenido_html` TEXT NOT NULL,
    `autor_id` VARCHAR(36) NOT NULL,
    `etiquetas` TEXT NULL,
    `categoria` VARCHAR(191) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,
    `fecha_publicacion` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',

    INDEX `manuals_autor_id_idx`(`autor_id`),
    INDEX `manuals_categoria_idx`(`categoria`),
    INDEX `manuals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificaciones` (
    `id` VARCHAR(36) NOT NULL,
    `cliente_id` VARCHAR(36) NOT NULL,
    `periodo` VARCHAR(20) NOT NULL,
    `tipo` ENUM('SOLICITUD_INFO', 'CONFIRMACION_PRESENTACION') NOT NULL,
    `fecha_envio` DATETIME(3) NOT NULL,
    `enviada` BOOLEAN NOT NULL DEFAULT true,
    `asunto` VARCHAR(500) NULL,
    `mensaje` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificaciones_cliente_id_idx`(`cliente_id`),
    INDEX `notificaciones_fecha_envio_idx`(`fecha_envio`),
    INDEX `notificaciones_periodo_idx`(`periodo`),
    INDEX `notificaciones_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_logs` (
    `id` VARCHAR(36) NOT NULL,
    `plantilla_id` VARCHAR(36) NULL,
    `smtp_account_id` VARCHAR(36) NULL,
    `destinatarios` LONGTEXT NOT NULL,
    `asunto` TEXT NOT NULL,
    `contenido` TEXT NOT NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `estado` VARCHAR(50) NOT NULL,
    `fecha_envio` DATETIME(3) NOT NULL,
    `enviado_por` VARCHAR(36) NULL,
    `metadata` LONGTEXT NULL,

    INDEX `notification_logs_enviado_por_fkey`(`enviado_por`),
    INDEX `notification_logs_estado_idx`(`estado`),
    INDEX `notification_logs_fecha_envio_idx`(`fecha_envio`),
    INDEX `notification_logs_plantilla_id_fkey`(`plantilla_id`),
    INDEX `notification_logs_smtp_account_id_fkey`(`smtp_account_id`),
    INDEX `notification_logs_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` VARCHAR(36) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `asunto` TEXT NOT NULL,
    `contenido_html` TEXT NOT NULL,
    `variables` LONGTEXT NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `creado_por` VARCHAR(36) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,

    INDEX `notification_templates_activa_idx`(`activa`),
    INDEX `notification_templates_creado_por_fkey`(`creado_por`),
    INDEX `notification_templates_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `obligaciones_fiscales` (
    `id` VARCHAR(36) NOT NULL,
    `cliente_id` VARCHAR(36) NOT NULL,
    `impuesto_id` VARCHAR(36) NOT NULL,
    `periodicidad` ENUM('MENSUAL', 'TRIMESTRAL', 'ANUAL', 'ESPECIAL_FRACCIONADO') NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `dia_vencimiento` INTEGER NULL,
    `fecha_asignacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observaciones` TEXT NULL,

    INDEX `obligaciones_fiscales_activo_idx`(`activo`),
    INDEX `obligaciones_fiscales_cliente_id_idx`(`cliente_id`),
    INDEX `obligaciones_fiscales_fecha_fin_idx`(`fecha_fin`),
    INDEX `obligaciones_fiscales_impuesto_id_idx`(`impuesto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(36) NOT NULL,
    `resource` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `permissions_resource_idx`(`resource`),
    UNIQUE INDEX `permissions_resource_action_key`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `permission_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    INDEX `role_permissions_role_id_idx`(`role_id`),
    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheduled_notifications` (
    `id` VARCHAR(36) NOT NULL,
    `plantilla_id` VARCHAR(36) NOT NULL,
    `smtp_account_id` VARCHAR(36) NULL,
    `destinatarios_seleccionados` LONGTEXT NOT NULL,
    `fecha_programada` DATETIME(3) NOT NULL,
    `estado` VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    `recurrencia` VARCHAR(50) NOT NULL DEFAULT 'NINGUNA',
    `creado_por` VARCHAR(36) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scheduled_notifications_creado_por_fkey`(`creado_por`),
    INDEX `scheduled_notifications_estado_idx`(`estado`),
    INDEX `scheduled_notifications_fecha_programada_idx`(`fecha_programada`),
    INDEX `scheduled_notifications_plantilla_id_fkey`(`plantilla_id`),
    INDEX `scheduled_notifications_smtp_account_id_fkey`(`smtp_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `ip` VARCHAR(45) NOT NULL,
    `isp` VARCHAR(191) NULL,
    `asn` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `region` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `isVpn` BOOLEAN NULL,
    `vpnScore` DOUBLE NULL,
    `user_agent` TEXT NOT NULL,
    `device_type` VARCHAR(50) NULL,
    `platform` VARCHAR(100) NULL,
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `socket_id` VARCHAR(191) NULL,
    `ended_at` DATETIME(3) NULL,
    `suspicious` BOOLEAN NULL DEFAULT false,
    `expires_at` DATETIME(3) NULL,
    `refresh_token` VARCHAR(500) NULL,

    UNIQUE INDEX `sessions_refresh_token_key`(`refresh_token`),
    INDEX `sessions_ip_idx`(`ip`),
    INDEX `sessions_last_seen_at_idx`(`last_seen_at`),
    INDEX `sessions_refresh_token_idx`(`refresh_token`),
    INDEX `sessions_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smtp_accounts` (
    `id` VARCHAR(36) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `user` VARCHAR(191) NOT NULL,
    `password` TEXT NOT NULL,
    `is_predeterminada` BOOLEAN NOT NULL DEFAULT false,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `creada_por` VARCHAR(36) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `smtp_accounts_activa_idx`(`activa`),
    INDEX `smtp_accounts_creada_por_fkey`(`creada_por`),
    INDEX `smtp_accounts_is_predeterminada_idx`(`is_predeterminada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smtp_config` (
    `id` VARCHAR(36) NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL,
    `user` VARCHAR(191) NOT NULL,
    `password` TEXT NOT NULL,
    `secure` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storage_configs` (
    `id` VARCHAR(36) NOT NULL,
    `type` ENUM('LOCAL', 'FTP', 'SMB') NOT NULL DEFAULT 'LOCAL',
    `name` VARCHAR(200) NOT NULL,
    `host` VARCHAR(500) NULL,
    `port` INTEGER NULL,
    `username` VARCHAR(200) NULL,
    `encrypted_password` TEXT NULL,
    `base_path` VARCHAR(1000) NOT NULL DEFAULT '/uploads',
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `storage_configs_is_active_idx`(`is_active`),
    INDEX `storage_configs_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_backups` (
    `id` VARCHAR(36) NOT NULL,
    `version` VARCHAR(50) NOT NULL,
    `db_file` VARCHAR(500) NOT NULL,
    `files_file` VARCHAR(500) NOT NULL,
    `db_size` BIGINT NOT NULL DEFAULT 0,
    `files_size` BIGINT NOT NULL DEFAULT 0,
    `status` ENUM('CREATING', 'COMPLETED', 'FAILED', 'RESTORING', 'RESTORED') NOT NULL DEFAULT 'CREATING',
    `error_message` TEXT NULL,
    `created_by` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `system_backups_created_at_idx`(`created_at`),
    INDEX `system_backups_created_by_fkey`(`created_by`),
    INDEX `system_backups_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `description` TEXT NULL,
    `is_editable` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(36) NOT NULL,
    `registration_enabled` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_updates` (
    `id` VARCHAR(36) NOT NULL,
    `from_version` VARCHAR(50) NOT NULL,
    `to_version` VARCHAR(50) NOT NULL,
    `status` ENUM('CHECKING', 'BACKING_UP', 'DOWNLOADING', 'INSTALLING', 'COMPLETED', 'FAILED', 'ROLLED_BACK') NOT NULL DEFAULT 'CHECKING',
    `logs` LONGTEXT NULL,
    `backup_id` VARCHAR(36) NULL,
    `error_message` TEXT NULL,
    `initiated_by` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `system_updates_created_at_idx`(`created_at`),
    INDEX `system_updates_initiated_by_fkey`(`initiated_by`),
    INDEX `system_updates_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_activities` (
    `id` VARCHAR(36) NOT NULL,
    `task_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `accion` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `metadata` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_activities_created_at_idx`(`created_at`),
    INDEX `task_activities_task_id_idx`(`task_id`),
    INDEX `task_activities_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_attachments` (
    `id` VARCHAR(36) NOT NULL,
    `task_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_path` TEXT NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_attachments_task_id_idx`(`task_id`),
    INDEX `task_attachments_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_comments` (
    `id` VARCHAR(36) NOT NULL,
    `task_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `contenido` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `task_comments_created_at_idx`(`created_at`),
    INDEX `task_comments_task_id_idx`(`task_id`),
    INDEX `task_comments_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_time_entries` (
    `id` VARCHAR(36) NOT NULL,
    `task_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `descripcion` TEXT NULL,
    `minutos` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,

    INDEX `task_time_entries_fecha_idx`(`fecha`),
    INDEX `task_time_entries_task_id_idx`(`task_id`),
    INDEX `task_time_entries_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(36) NOT NULL,
    `titulo` TEXT NOT NULL,
    `descripcion` TEXT NULL,
    `cliente_id` VARCHAR(36) NULL,
    `asignado_a` VARCHAR(36) NULL,
    `prioridad` ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL DEFAULT 'MEDIA',
    `estado` ENUM('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA') NOT NULL DEFAULT 'PENDIENTE',
    `visibilidad` ENUM('GENERAL', 'PERSONAL') NOT NULL DEFAULT 'GENERAL',
    `fecha_vencimiento` DATETIME(3) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,
    `color` VARCHAR(7) NULL,
    `depends_on` TEXT NULL,
    `etiquetas` TEXT NULL,
    `fecha_inicio` DATETIME(3) NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `parent_task_id` VARCHAR(36) NULL,
    `progreso` INTEGER NOT NULL DEFAULT 0,
    `tiempo_estimado` INTEGER NULL,
    `tiempo_invertido` INTEGER NOT NULL DEFAULT 0,

    INDEX `tasks_asignado_a_idx`(`asignado_a`),
    INDEX `tasks_cliente_id_estado_idx`(`cliente_id`, `estado`),
    INDEX `tasks_estado_orden_idx`(`estado`, `orden`),
    INDEX `tasks_fecha_vencimiento_idx`(`fecha_vencimiento`),
    INDEX `tasks_is_archived_idx`(`is_archived`),
    INDEX `tasks_parent_task_id_idx`(`parent_task_id`),
    INDEX `tasks_visibilidad_idx`(`visibilidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_calendar` (
    `id` VARCHAR(36) NOT NULL,
    `modelCode` VARCHAR(20) NOT NULL,
    `period` VARCHAR(20) NOT NULL,
    `year` INTEGER NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `status` ENUM('PENDIENTE', 'ABIERTO', 'CERRADO') NOT NULL DEFAULT 'PENDIENTE',
    `days_to_start` INTEGER NULL,
    `days_to_end` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tax_calendar_modelCode_idx`(`modelCode`),
    INDEX `tax_calendar_year_status_idx`(`year`, `status`),
    UNIQUE INDEX `tax_calendar_modelCode_period_year_key`(`modelCode`, `period`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_files` (
    `id` VARCHAR(36) NOT NULL,
    `client_tax_id` VARCHAR(36) NOT NULL,
    `nombre_archivo` TEXT NOT NULL,
    `s3_url` TEXT NOT NULL,
    `s3_key` TEXT NOT NULL,
    `tipo` VARCHAR(50) NULL,
    `tamanio` INTEGER NULL,
    `fecha_subida` DATETIME(3) NOT NULL,
    `subido_por` VARCHAR(36) NULL,

    INDEX `tax_files_client_tax_id_fkey`(`client_tax_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_models` (
    `id` VARCHAR(36) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_models_config` (
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `allowed_types` LONGTEXT NOT NULL,
    `allowed_periods` LONGTEXT NOT NULL,
    `labels` LONGTEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_periods` (
    `id` VARCHAR(36) NOT NULL,
    `modelo_id` VARCHAR(36) NOT NULL,
    `anio` INTEGER NOT NULL,
    `trimestre` INTEGER NULL,
    `mes` INTEGER NULL,
    `inicio_presentacion` DATETIME(3) NOT NULL,
    `fin_presentacion` DATETIME(3) NOT NULL,

    INDEX `tax_periods_modelo_id_fkey`(`modelo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `role_id` VARCHAR(36) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_id_idx`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `template_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(191) NULL,
    `file_name` VARCHAR(191) NULL,
    `file_size` INTEGER NULL,
    `file_type` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `signature_status` VARCHAR(191) NULL DEFAULT 'unsigned',
    `signature_date` DATETIME(3) NULL,
    `signed_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `documents_client_id_idx`(`client_id`),
    INDEX `documents_created_by_idx`(`created_by`),
    INDEX `documents_template_id_idx`(`template_id`),
    INDEX `documents_status_idx`(`status`),
    INDEX `documents_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_templates` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `variables` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_templates_name_key`(`name`),
    INDEX `document_templates_type_idx`(`type`),
    INDEX `document_templates_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_signatures` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `signed_by` VARCHAR(191) NOT NULL,
    `signature_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `signature_type` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `document_signatures_document_id_idx`(`document_id`),
    INDEX `document_signatures_signed_by_idx`(`signed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_versions` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `document_versions_document_id_idx`(`document_id`),
    INDEX `document_versions_created_by_idx`(`created_by`),
    UNIQUE INDEX `document_versions_document_id_version_key`(`document_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `budgets_type_idx` ON `budgets`(`type`);

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_trail` ADD CONSTRAINT `audit_trail_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_employees` ADD CONSTRAINT `client_employees_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_employees` ADD CONSTRAINT `client_employees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax` ADD CONSTRAINT `client_tax_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax` ADD CONSTRAINT `client_tax_tax_period_id_fkey` FOREIGN KEY (`tax_period_id`) REFERENCES `tax_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax_assignments` ADD CONSTRAINT `client_tax_assignments_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax_assignments` ADD CONSTRAINT `client_tax_assignments_tax_model_code_fkey` FOREIGN KEY (`tax_model_code`) REFERENCES `tax_models_config`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax_filings` ADD CONSTRAINT `client_tax_filings_assignee_id_fkey` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax_filings` ADD CONSTRAINT `client_tax_filings_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax_filings` ADD CONSTRAINT `client_tax_filings_period_id_fkey` FOREIGN KEY (`period_id`) REFERENCES `fiscal_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_tax_requirements` ADD CONSTRAINT `client_tax_requirements_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_responsable_asignado_fkey` FOREIGN KEY (`responsable_asignado`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `declaraciones` ADD CONSTRAINT `declaraciones_obligacion_id_fkey` FOREIGN KEY (`obligacion_id`) REFERENCES `obligaciones_fiscales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fiscal_periods` ADD CONSTRAINT `fiscal_periods_closed_by_fkey` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manual_attachments` ADD CONSTRAINT `manual_attachments_manual_id_fkey` FOREIGN KEY (`manual_id`) REFERENCES `manuals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manual_versions` ADD CONSTRAINT `manual_versions_manual_id_fkey` FOREIGN KEY (`manual_id`) REFERENCES `manuals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manuals` ADD CONSTRAINT `manuals_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_enviado_por_fkey` FOREIGN KEY (`enviado_por`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_plantilla_id_fkey` FOREIGN KEY (`plantilla_id`) REFERENCES `notification_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_smtp_account_id_fkey` FOREIGN KEY (`smtp_account_id`) REFERENCES `smtp_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_templates` ADD CONSTRAINT `notification_templates_creado_por_fkey` FOREIGN KEY (`creado_por`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `obligaciones_fiscales` ADD CONSTRAINT `obligaciones_fiscales_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `obligaciones_fiscales` ADD CONSTRAINT `obligaciones_fiscales_impuesto_id_fkey` FOREIGN KEY (`impuesto_id`) REFERENCES `impuestos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_notifications` ADD CONSTRAINT `scheduled_notifications_creado_por_fkey` FOREIGN KEY (`creado_por`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_notifications` ADD CONSTRAINT `scheduled_notifications_plantilla_id_fkey` FOREIGN KEY (`plantilla_id`) REFERENCES `notification_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_notifications` ADD CONSTRAINT `scheduled_notifications_smtp_account_id_fkey` FOREIGN KEY (`smtp_account_id`) REFERENCES `smtp_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smtp_accounts` ADD CONSTRAINT `smtp_accounts_creada_por_fkey` FOREIGN KEY (`creada_por`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_backups` ADD CONSTRAINT `system_backups_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_updates` ADD CONSTRAINT `system_updates_initiated_by_fkey` FOREIGN KEY (`initiated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_activities` ADD CONSTRAINT `task_activities_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_activities` ADD CONSTRAINT `task_activities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_attachments` ADD CONSTRAINT `task_attachments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_comments` ADD CONSTRAINT `task_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_time_entries` ADD CONSTRAINT `task_time_entries_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_time_entries` ADD CONSTRAINT `task_time_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_asignado_a_fkey` FOREIGN KEY (`asignado_a`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_parent_task_id_fkey` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_files` ADD CONSTRAINT `tax_files_client_tax_id_fkey` FOREIGN KEY (`client_tax_id`) REFERENCES `client_tax`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_periods` ADD CONSTRAINT `tax_periods_modelo_id_fkey` FOREIGN KEY (`modelo_id`) REFERENCES `tax_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `document_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_signatures` ADD CONSTRAINT `document_signatures_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_signatures` ADD CONSTRAINT `document_signatures_signed_by_fkey` FOREIGN KEY (`signed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
