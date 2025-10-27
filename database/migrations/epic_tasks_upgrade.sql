-- 🚀 MIGRACIÓN ÉPICA DE TAREAS
-- Añade funcionalidades avanzadas al sistema de tareas

-- 1. Añadir nuevos campos a la tabla tasks
ALTER TABLE `tasks` 
ADD COLUMN `fecha_inicio` DATETIME(3) NULL AFTER `fecha_vencimiento`,
ADD COLUMN `etiquetas` TEXT NULL AFTER `fecha_actualizacion`,
ADD COLUMN `progreso` INT NOT NULL DEFAULT 0 AFTER `etiquetas`,
ADD COLUMN `tiempo_estimado` INT NULL AFTER `progreso`,
ADD COLUMN `tiempo_invertido` INT NOT NULL DEFAULT 0 AFTER `tiempo_estimado`,
ADD COLUMN `color` VARCHAR(7) NULL AFTER `tiempo_invertido`,
ADD COLUMN `parent_task_id` VARCHAR(36) NULL AFTER `color`,
ADD COLUMN `depends_on` TEXT NULL AFTER `parent_task_id`,
ADD COLUMN `orden` INT NOT NULL DEFAULT 0 AFTER `depends_on`,
ADD COLUMN `is_archived` BOOLEAN NOT NULL DEFAULT FALSE AFTER `orden`;

-- 2. Añadir índices para los nuevos campos
ALTER TABLE `tasks`
ADD INDEX `tasks_parent_task_id_idx` (`parent_task_id`),
ADD INDEX `tasks_estado_orden_idx` (`estado`, `orden`),
ADD INDEX `tasks_is_archived_idx` (`is_archived`);

-- 3. Añadir foreign key para subtareas
ALTER TABLE `tasks`
ADD CONSTRAINT `tasks_parent_task_id_fkey` 
FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Crear tabla de comentarios de tareas
CREATE TABLE `task_comments` (
  `id` VARCHAR(36) NOT NULL,
  `task_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `contenido` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `task_comments_task_id_idx` (`task_id`),
  INDEX `task_comments_user_id_idx` (`user_id`),
  INDEX `task_comments_created_at_idx` (`created_at`),
  CONSTRAINT `task_comments_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Crear tabla de adjuntos de tareas
CREATE TABLE `task_attachments` (
  `id` VARCHAR(36) NOT NULL,
  `task_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_path` TEXT NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `file_size` INT NOT NULL,
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `task_attachments_task_id_idx` (`task_id`),
  INDEX `task_attachments_user_id_idx` (`user_id`),
  CONSTRAINT `task_attachments_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_attachments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Crear tabla de registro de tiempo en tareas
CREATE TABLE `task_time_entries` (
  `id` VARCHAR(36) NOT NULL,
  `task_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `descripcion` TEXT NULL,
  `minutos` INT NOT NULL,
  `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `started_at` DATETIME(3) NULL,
  `ended_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `task_time_entries_task_id_idx` (`task_id`),
  INDEX `task_time_entries_user_id_idx` (`user_id`),
  INDEX `task_time_entries_fecha_idx` (`fecha`),
  CONSTRAINT `task_time_entries_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_time_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Crear tabla de actividades de tareas
CREATE TABLE `task_activities` (
  `id` VARCHAR(36) NOT NULL,
  `task_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `accion` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `metadata` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `task_activities_task_id_idx` (`task_id`),
  INDEX `task_activities_user_id_idx` (`user_id`),
  INDEX `task_activities_created_at_idx` (`created_at`),
  CONSTRAINT `task_activities_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_activities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Crear directorio para adjuntos de tareas (esto es solo informativo, se debe hacer manualmente)
-- mkdir -p uploads/tasks/attachments

SELECT 'Migración de tareas épicas completada exitosamente! 🚀' AS status;
