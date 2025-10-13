#!/usr/bin/env tsx
/**
 * Export SQL Schema for MariaDB
 * Genera un dump SQL completo para crear todas las tablas en MariaDB
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const SQL_HEADER = `-- =====================================================
-- Asesoría La Llave - MariaDB Schema
-- Charset: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- Compatible con MariaDB 10.11+
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

`;

const SQL_TABLES = `
-- ==================== TABLA: users ====================
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`username\` VARCHAR(191) NOT NULL,
  \`email\` VARCHAR(191) NOT NULL,
  \`password\` TEXT NOT NULL,
  \`role\` ENUM('ADMIN', 'GESTOR', 'LECTURA') NOT NULL DEFAULT 'LECTURA',
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`users_username_key\` (\`username\`),
  UNIQUE KEY \`users_email_key\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: clients ====================
DROP TABLE IF EXISTS \`clients\`;
CREATE TABLE \`clients\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`razon_social\` TEXT NOT NULL,
  \`nif_cif\` VARCHAR(191) NOT NULL,
  \`tipo\` ENUM('AUTONOMO', 'EMPRESA') NOT NULL,
  \`email\` TEXT,
  \`telefono\` TEXT,
  \`direccion\` TEXT,
  \`fecha_alta\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`responsable_asignado\` VARCHAR(36),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`clients_nif_cif_key\` (\`nif_cif\`),
  KEY \`clients_responsable_asignado_idx\` (\`responsable_asignado\`),
  KEY \`clients_tipo_idx\` (\`tipo\`),
  CONSTRAINT \`clients_responsable_asignado_fkey\` FOREIGN KEY (\`responsable_asignado\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: tax_models ====================
DROP TABLE IF EXISTS \`tax_models\`;
CREATE TABLE \`tax_models\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`nombre\` VARCHAR(191) NOT NULL,
  \`descripcion\` TEXT,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: tax_periods ====================
DROP TABLE IF EXISTS \`tax_periods\`;
CREATE TABLE \`tax_periods\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`modelo_id\` VARCHAR(36) NOT NULL,
  \`anio\` INT NOT NULL,
  \`trimestre\` INT,
  \`mes\` INT,
  \`inicio_presentacion\` DATETIME(3) NOT NULL,
  \`fin_presentacion\` DATETIME(3) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`tax_periods_modelo_id_idx\` (\`modelo_id\`),
  KEY \`tax_periods_anio_idx\` (\`anio\`),
  CONSTRAINT \`tax_periods_modelo_id_fkey\` FOREIGN KEY (\`modelo_id\`) REFERENCES \`tax_models\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: client_tax ====================
DROP TABLE IF EXISTS \`client_tax\`;
CREATE TABLE \`client_tax\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_id\` VARCHAR(36) NOT NULL,
  \`tax_period_id\` VARCHAR(36) NOT NULL,
  \`estado\` ENUM('PENDIENTE', 'CALCULADO', 'REALIZADO') NOT NULL DEFAULT 'PENDIENTE',
  \`notas\` TEXT,
  \`fecha_creacion\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`fecha_actualizacion\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`client_tax_client_id_tax_period_id_idx\` (\`client_id\`, \`tax_period_id\`),
  KEY \`client_tax_estado_idx\` (\`estado\`),
  KEY \`client_tax_fecha_creacion_idx\` (\`fecha_creacion\`),
  CONSTRAINT \`client_tax_client_id_fkey\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`client_tax_tax_period_id_fkey\` FOREIGN KEY (\`tax_period_id\`) REFERENCES \`tax_periods\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: tax_files ====================
DROP TABLE IF EXISTS \`tax_files\`;
CREATE TABLE \`tax_files\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`client_tax_id\` VARCHAR(36) NOT NULL,
  \`nombre_archivo\` TEXT NOT NULL,
  \`s3_url\` TEXT NOT NULL,
  \`s3_key\` TEXT NOT NULL,
  \`tipo\` VARCHAR(50),
  \`tamanio\` INT,
  \`fecha_subida\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`subido_por\` VARCHAR(36),
  PRIMARY KEY (\`id\`),
  KEY \`tax_files_client_tax_id_idx\` (\`client_tax_id\`),
  CONSTRAINT \`tax_files_client_tax_id_fkey\` FOREIGN KEY (\`client_tax_id\`) REFERENCES \`client_tax\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT \`tax_files_subido_por_fkey\` FOREIGN KEY (\`subido_por\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: tasks ====================
DROP TABLE IF EXISTS \`tasks\`;
CREATE TABLE \`tasks\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`titulo\` TEXT NOT NULL,
  \`descripcion\` TEXT,
  \`cliente_id\` VARCHAR(36),
  \`asignado_a\` VARCHAR(36),
  \`prioridad\` ENUM('BAJA', 'MEDIA', 'ALTA') NOT NULL DEFAULT 'MEDIA',
  \`estado\` ENUM('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA') NOT NULL DEFAULT 'PENDIENTE',
  \`visibilidad\` ENUM('GENERAL', 'PERSONAL') NOT NULL DEFAULT 'GENERAL',
  \`fecha_vencimiento\` DATETIME(3),
  \`fecha_creacion\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`fecha_actualizacion\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`tasks_visibilidad_idx\` (\`visibilidad\`),
  KEY \`tasks_asignado_a_idx\` (\`asignado_a\`),
  KEY \`tasks_cliente_id_estado_idx\` (\`cliente_id\`, \`estado\`),
  KEY \`tasks_fecha_vencimiento_idx\` (\`fecha_vencimiento\`),
  CONSTRAINT \`tasks_cliente_id_fkey\` FOREIGN KEY (\`cliente_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT \`tasks_asignado_a_fkey\` FOREIGN KEY (\`asignado_a\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: manuals ====================
DROP TABLE IF EXISTS \`manuals\`;
CREATE TABLE \`manuals\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`titulo\` TEXT NOT NULL,
  \`contenido_html\` LONGTEXT NOT NULL,
  \`autor_id\` VARCHAR(36) NOT NULL,
  \`etiquetas\` TEXT,
  \`categoria\` VARCHAR(191),
  \`publicado\` BOOLEAN NOT NULL DEFAULT FALSE,
  \`fecha_creacion\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`fecha_actualizacion\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`manuals_publicado_idx\` (\`publicado\`),
  KEY \`manuals_categoria_idx\` (\`categoria\`),
  KEY \`manuals_autor_id_idx\` (\`autor_id\`),
  CONSTRAINT \`manuals_autor_id_fkey\` FOREIGN KEY (\`autor_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: activity_logs ====================
DROP TABLE IF EXISTS \`activity_logs\`;
CREATE TABLE \`activity_logs\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`usuario_id\` VARCHAR(36) NOT NULL,
  \`accion\` TEXT NOT NULL,
  \`modulo\` VARCHAR(191) NOT NULL,
  \`detalles\` TEXT,
  \`fecha\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`activity_logs_usuario_id_modulo_fecha_idx\` (\`usuario_id\`, \`modulo\`, \`fecha\`),
  CONSTRAINT \`activity_logs_usuario_id_fkey\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: audit_trail ====================
DROP TABLE IF EXISTS \`audit_trail\`;
CREATE TABLE \`audit_trail\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`usuario_id\` VARCHAR(36) NOT NULL,
  \`accion\` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  \`tabla\` VARCHAR(191) NOT NULL,
  \`registro_id\` VARCHAR(36) NOT NULL,
  \`valor_anterior\` TEXT,
  \`valor_nuevo\` TEXT,
  \`cambios\` TEXT,
  \`request_id\` VARCHAR(191),
  \`fecha\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  KEY \`audit_trail_usuario_id_idx\` (\`usuario_id\`),
  KEY \`audit_trail_tabla_registro_id_idx\` (\`tabla\`, \`registro_id\`),
  KEY \`audit_trail_fecha_idx\` (\`fecha\`),
  CONSTRAINT \`audit_trail_usuario_id_fkey\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: smtp_config ====================
DROP TABLE IF EXISTS \`smtp_config\`;
CREATE TABLE \`smtp_config\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`host\` VARCHAR(191) NOT NULL,
  \`port\` INT NOT NULL,
  \`user\` VARCHAR(191) NOT NULL,
  \`password\` TEXT NOT NULL,
  \`secure\` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TABLA: job_runs ====================
DROP TABLE IF EXISTS \`job_runs\`;
CREATE TABLE \`job_runs\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`job_name\` VARCHAR(191) NOT NULL,
  \`started_at\` DATETIME(3) NOT NULL,
  \`completed_at\` DATETIME(3),
  \`status\` VARCHAR(50) NOT NULL,
  \`records_processed\` INT,
  \`error_message\` TEXT,
  \`metadata\` TEXT,
  PRIMARY KEY (\`id\`),
  KEY \`job_runs_job_name_started_at_idx\` (\`job_name\`, \`started_at\`),
  KEY \`job_runs_status_idx\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- Fin del Schema
-- =====================================================
`;

async function main() {
  const sqlContent = SQL_HEADER + SQL_TABLES;
  const outputPath = join(process.cwd(), 'database', 'schema_mariadb.sql');
  
  writeFileSync(outputPath, sqlContent, 'utf-8');
  
  console.log('✅ SQL Schema exportado correctamente');
  console.log(`📁 Ubicación: ${outputPath}`);
  console.log('\nPuedes importar este schema en tu MariaDB con:');
  console.log('  mysql -u user -p asesoria_llave < database/schema_mariadb.sql');
}

main().catch(console.error);
