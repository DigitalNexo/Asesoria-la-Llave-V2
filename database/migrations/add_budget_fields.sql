-- Migración: Añadir campos faltantes a budgets y budget_items
-- Fecha: 2025-10-25
-- Descripción: Añade campos de cliente (NIF, dirección), control manual, y timestamps

-- ==================== TABLA BUDGETS ====================

-- Añadir campos de cliente
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_nif VARCHAR(50) AFTER clientName;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_email VARCHAR(255) AFTER client_nif;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50) AFTER client_email;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_address TEXT AFTER client_phone;

-- Migrar datos existentes de clientEmail y clientPhone a los nuevos nombres
UPDATE budgets SET client_email = clientEmail WHERE client_email IS NULL AND clientEmail IS NOT NULL;
UPDATE budgets SET client_phone = clientPhone WHERE client_phone IS NULL AND clientPhone IS NOT NULL;

-- Eliminar columnas antiguas (si existen)
-- ALTER TABLE budgets DROP COLUMN IF EXISTS clientEmail;
-- ALTER TABLE budgets DROP COLUMN IF EXISTS clientPhone;

-- Añadir campos de control manual
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN DEFAULT FALSE AFTER total;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS custom_total DECIMAL(12,2) AFTER manually_edited;

-- Añadir template_id, template_name si no existen
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS template_id VARCHAR(255) AFTER custom_total;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS template_name VARCHAR(255) AFTER template_id;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS template_snapshot JSON AFTER template_name;

-- Renombrar campos si tienen nombres diferentes
ALTER TABLE budgets CHANGE COLUMN IF EXISTS vatMode vat_mode VARCHAR(50);
ALTER TABLE budgets CHANGE COLUMN IF EXISTS vatTotal vat_total DECIMAL(12,2);
ALTER TABLE budgets CHANGE COLUMN IF EXISTS billingRange billing_range VARCHAR(100);
ALTER TABLE budgets CHANGE COLUMN IF EXISTS payrollPerMonth payroll_per_month INT;
ALTER TABLE budgets CHANGE COLUMN IF EXISTS templateId template_id VARCHAR(255);
ALTER TABLE budgets CHANGE COLUMN IF EXISTS templateName template_name VARCHAR(255);
ALTER TABLE budgets CHANGE COLUMN IF EXISTS templateSnapshot template_snapshot JSON;

-- Añadir timestamps
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) AFTER template_snapshot;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER created_at;

-- Actualizar created_at y updated_at con valores de createdAt y updatedAt si existen
UPDATE budgets SET created_at = createdAt WHERE created_at IS NULL AND createdAt IS NOT NULL;
UPDATE budgets SET updated_at = updatedAt WHERE updated_at IS NULL AND updatedAt IS NOT NULL;

-- Añadir índices
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
CREATE INDEX IF NOT EXISTS idx_budgets_client_nif ON budgets(client_nif);

-- ==================== TABLA BUDGET_ITEMS ====================

-- Renombrar unitPrice a unit_price
ALTER TABLE budget_items CHANGE COLUMN IF EXISTS unitPrice unit_price DECIMAL(12,2);
ALTER TABLE budget_items CHANGE COLUMN IF EXISTS vatPct vat_pct DECIMAL(5,2);

-- Añadir campo is_manually_edited
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS is_manually_edited BOOLEAN DEFAULT FALSE AFTER total;

-- Añadir timestamps
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) AFTER is_manually_edited;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) AFTER created_at;

-- Actualizar timestamps con valores existentes
UPDATE budget_items SET created_at = createdAt WHERE created_at IS NULL AND createdAt IS NOT NULL;
UPDATE budget_items SET updated_at = updatedAt WHERE updated_at IS NULL AND updatedAt IS NOT NULL;

-- Añadir índice en category
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON budget_items(category);

-- ==================== TABLA BUDGET_PARAMETERS (Nueva) ====================

CREATE TABLE IF NOT EXISTS budget_parameters (
  id VARCHAR(36) PRIMARY KEY,
  budget_type ENUM('PYME', 'AUTONOMO', 'RENTA', 'HERENCIAS') NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  param_key VARCHAR(100) NOT NULL,
  param_label TEXT NOT NULL,
  param_value DECIMAL(12,2) NOT NULL,
  min_range INT,
  max_range INT,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY unique_param (budget_type, param_key, min_range, max_range),
  INDEX idx_budget_type (budget_type),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== BUDGET_EMAIL_LOGS ====================

-- Renombrar toEmail a to_email si existe
ALTER TABLE budget_email_logs CHANGE COLUMN IF EXISTS toEmail to_email VARCHAR(255);
ALTER TABLE budget_email_logs CHANGE COLUMN IF EXISTS createdAt created_at DATETIME(3);

-- ==================== BUDGET_PDFS ====================

-- Renombrar createdAt a created_at si existe
ALTER TABLE budget_pdfs CHANGE COLUMN IF EXISTS createdAt created_at DATETIME(3);
