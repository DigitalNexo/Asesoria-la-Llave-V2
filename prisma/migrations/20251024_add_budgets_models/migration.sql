-- CreateTable
CREATE TABLE `price_catalog` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `vatPct` DECIMAL(5, 2) NOT NULL DEFAULT 21,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `price_catalog_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` VARCHAR(191) NOT NULL,
    `series` ENUM('AL', 'GO') NOT NULL,
    `number` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validDays` INTEGER NOT NULL DEFAULT 30,
    `expiresAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `acceptedByIp` VARCHAR(191) NULL,
    `acceptedByAgent` VARCHAR(191) NULL,
    `acceptanceHash` VARCHAR(191) NULL,
    `remindSentAt` DATETIME(3) NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NULL,
    `clientPhone` VARCHAR(191) NULL,
    `activity` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `periodicity` VARCHAR(191) NULL,
    `billingRange` VARCHAR(191) NULL,
    `payrollPerMonth` INTEGER NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `vatMode` VARCHAR(191) NOT NULL DEFAULT 'IVA_NO_INCLUIDO',
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `vatTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `templateId` VARCHAR(191) NULL,
    `templateName` VARCHAR(191) NULL,
    `templateSnapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `budgets_code_key`(`code`),
    INDEX `budgets_series_year_number_idx`(`series`, `year`, `number`),
    INDEX `budgets_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_items` (
    `id` VARCHAR(191) NOT NULL,
    `budget_id` VARCHAR(191) NOT NULL,
    `concept` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `vatPct` DECIMAL(5, 2) NOT NULL DEFAULT 21,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budget_items_budget_id_idx`(`budget_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_email_logs` (
    `id` VARCHAR(191) NOT NULL,
    `budget_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `toEmail` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `response` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `budget_email_logs_budget_id_idx`(`budget_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_pdfs` (
    `id` VARCHAR(191) NOT NULL,
    `budget_id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `budget_pdfs_budget_id_idx`(`budget_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_email_logs` ADD CONSTRAINT `budget_email_logs_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_pdfs` ADD CONSTRAINT `budget_pdfs_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

