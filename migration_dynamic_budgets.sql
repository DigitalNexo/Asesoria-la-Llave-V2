-- DropForeignKey
ALTER TABLE `gestoria_budget_invoice_tiers` DROP FOREIGN KEY `gestoria_budget_invoice_tiers_configId_fkey`;

-- DropForeignKey
ALTER TABLE `gestoria_budget_payroll_tiers` DROP FOREIGN KEY `gestoria_budget_payroll_tiers_configId_fkey`;

-- DropForeignKey
ALTER TABLE `gestoria_budget_annual_billing_tiers` DROP FOREIGN KEY `gestoria_budget_annual_billing_tiers_configId_fkey`;

-- DropForeignKey
ALTER TABLE `gestoria_budget_fiscal_model_pricing` DROP FOREIGN KEY `gestoria_budget_fiscal_model_pricing_configId_fkey`;

-- DropForeignKey
ALTER TABLE `gestoria_budget_additional_service_pricing` DROP FOREIGN KEY `gestoria_budget_additional_service_pricing_configId_fkey`;

-- DropIndex
DROP INDEX `clients_tipoGestoria_idx` ON `clients`;

-- AlterTable
ALTER TABLE `clients` DROP COLUMN `presupuestoOrigenId`,
    DROP COLUMN `tipoGestoria`,
    ADD COLUMN `presupuesto_origen_id` VARCHAR(36) NULL,
    ADD COLUMN `tipo_gestoria` ENUM('OFICIAL', 'ONLINE') NULL;

-- AlterTable
ALTER TABLE `fiscal_periods` MODIFY `kind` enum('QUARTERLY','ANNUAL','SPECIAL') NOT NULL DEFAULT 'QUARTERLY';

-- AlterTable
ALTER TABLE `document_templates` MODIFY `variables` longtext NULL;

-- AlterTable
ALTER TABLE `gestoria_budgets` DROP COLUMN `manualOverride`,
    DROP COLUMN `tipoPresupuesto`;

-- DropTable
DROP TABLE `gestoria_budget_autonomo_config`;

-- DropTable
DROP TABLE `gestoria_budget_invoice_tiers`;

-- DropTable
DROP TABLE `gestoria_budget_payroll_tiers`;

-- DropTable
DROP TABLE `gestoria_budget_annual_billing_tiers`;

-- DropTable
DROP TABLE `gestoria_budget_fiscal_model_pricing`;

-- DropTable
DROP TABLE `gestoria_budget_additional_service_pricing`;

-- CreateIndex
CREATE INDEX `clients_tipo_gestoria_idx` ON `clients`(`tipo_gestoria` ASC);

-- CreateIndex
CREATE INDEX `gestoria_budgets_configId_fkey` ON `gestoria_budgets`(`configId` ASC);

-- RenameIndex
ALTER TABLE `client_tax_assignments` RENAME INDEX `client_tax_assignments_active_flag_start_date_idx` TO `idx_activeFlag_startDate`;

-- RenameIndex
ALTER TABLE `client_tax_assignments` RENAME INDEX `client_tax_assignments_client_id_active_flag_idx` TO `idx_clientId_activeFlag`;

-- RenameIndex
ALTER TABLE `client_tax_filings` RENAME INDEX `client_tax_filings_client_id_status_idx` TO `idx_clientId_status`;

-- RenameIndex
ALTER TABLE `client_tax_filings` RENAME INDEX `client_tax_filings_status_period_id_idx` TO `idx_status_periodId`;

-- RenameIndex
ALTER TABLE `client_tax_filings` RENAME INDEX `client_tax_filings_tax_model_code_status_idx` TO `idx_taxModelCode_status`;

-- RenameIndex
ALTER TABLE `fiscal_periods` RENAME INDEX `fiscal_periods_year_kind_status_idx` TO `idx_year_kind_status`;

-- RenameIndex
ALTER TABLE `fiscal_periods` RENAME INDEX `fiscal_periods_status_starts_at_idx` TO `idx_status_starts_at`;

