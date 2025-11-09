-- MIGRACIÓN POSTGRESQL: Sistema Dinámico de Presupuestos para Autónomos
-- Fecha: 2025-11-04
-- Compatible con PostgreSQL

-- 1. Añadir campos nuevos a gestoria_budgets (si no existen)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gestoria_budgets' AND column_name='tipoPresupuesto') THEN
        ALTER TABLE "gestoria_budgets" ADD COLUMN "tipoPresupuesto" VARCHAR(50) NOT NULL DEFAULT 'AUTONOMO';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gestoria_budgets' AND column_name='manualOverride') THEN
        ALTER TABLE "gestoria_budgets" ADD COLUMN "manualOverride" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 2. Crear tabla de configuración principal (gestoria_budget_autonomo_config)
CREATE TABLE IF NOT EXISTS "gestoria_budget_autonomo_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL DEFAULT 'Configuración Autónomos',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "porcentajePeriodoMensual" DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    "porcentajeEDN" DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    "porcentajeModulos" DECIMAL(5, 2) NOT NULL DEFAULT -10.00,
    "minimoMensual" DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaModificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT NOT NULL,
    "modificadoPor" TEXT
);

-- 3. Crear tabla de tramos de facturas (gestoria_budget_invoice_tiers)
CREATE TABLE IF NOT EXISTS "gestoria_budget_invoice_tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "minFacturas" INTEGER NOT NULL,
    "maxFacturas" INTEGER,
    "precio" DECIMAL(10, 2) NOT NULL,
    "etiqueta" TEXT,
    CONSTRAINT "gestoria_budget_invoice_tiers_configId_fkey" 
        FOREIGN KEY ("configId") REFERENCES "gestoria_budget_autonomo_config"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gestoria_budget_invoice_tiers_configId_orden_key" 
        UNIQUE ("configId", "orden")
);

CREATE INDEX IF NOT EXISTS "gestoria_budget_invoice_tiers_configId_idx" ON "gestoria_budget_invoice_tiers"("configId");

-- 4. Crear tabla de tramos de nóminas (gestoria_budget_payroll_tiers)
CREATE TABLE IF NOT EXISTS "gestoria_budget_payroll_tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "minNominas" INTEGER NOT NULL,
    "maxNominas" INTEGER,
    "precio" DECIMAL(10, 2) NOT NULL,
    "etiqueta" TEXT,
    CONSTRAINT "gestoria_budget_payroll_tiers_configId_fkey" 
        FOREIGN KEY ("configId") REFERENCES "gestoria_budget_autonomo_config"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gestoria_budget_payroll_tiers_configId_orden_key" 
        UNIQUE ("configId", "orden")
);

CREATE INDEX IF NOT EXISTS "gestoria_budget_payroll_tiers_configId_idx" ON "gestoria_budget_payroll_tiers"("configId");

-- 5. Crear tabla de tramos de facturación anual (gestoria_budget_annual_billing_tiers)
CREATE TABLE IF NOT EXISTS "gestoria_budget_annual_billing_tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "minFacturacion" DECIMAL(12, 2) NOT NULL,
    "maxFacturacion" DECIMAL(12, 2),
    "multiplicador" DECIMAL(4, 2) NOT NULL,
    "etiqueta" TEXT,
    CONSTRAINT "gestoria_budget_annual_billing_tiers_configId_fkey" 
        FOREIGN KEY ("configId") REFERENCES "gestoria_budget_autonomo_config"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gestoria_budget_annual_billing_tiers_configId_orden_key" 
        UNIQUE ("configId", "orden")
);

CREATE INDEX IF NOT EXISTS "gestoria_budget_annual_billing_tiers_configId_idx" ON "gestoria_budget_annual_billing_tiers"("configId");

-- 6. Crear tabla de precios de modelos fiscales (gestoria_budget_fiscal_model_pricing)
CREATE TABLE IF NOT EXISTS "gestoria_budget_fiscal_model_pricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "codigoModelo" TEXT NOT NULL,
    "nombreModelo" TEXT NOT NULL,
    "precio" DECIMAL(10, 2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "gestoria_budget_fiscal_model_pricing_configId_fkey" 
        FOREIGN KEY ("configId") REFERENCES "gestoria_budget_autonomo_config"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gestoria_budget_fiscal_model_pricing_configId_codigoModelo_key" 
        UNIQUE ("configId", "codigoModelo")
);

CREATE INDEX IF NOT EXISTS "gestoria_budget_fiscal_model_pricing_configId_idx" ON "gestoria_budget_fiscal_model_pricing"("configId");

-- 7. Crear tabla de servicios adicionales (gestoria_budget_additional_service_pricing)
CREATE TABLE IF NOT EXISTS "gestoria_budget_additional_service_pricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "configId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10, 2) NOT NULL,
    "tipoServicio" TEXT NOT NULL CHECK ("tipoServicio" IN ('MENSUAL', 'PUNTUAL')),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "gestoria_budget_additional_service_pricing_configId_fkey" 
        FOREIGN KEY ("configId") REFERENCES "gestoria_budget_autonomo_config"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gestoria_budget_additional_service_pricing_configId_codigo_key" 
        UNIQUE ("configId", "codigo")
);

CREATE INDEX IF NOT EXISTS "gestoria_budget_additional_service_pricing_configId_idx" ON "gestoria_budget_additional_service_pricing"("configId");

-- Mensaje de confirmación
SELECT 'Tablas creadas exitosamente' AS status;
