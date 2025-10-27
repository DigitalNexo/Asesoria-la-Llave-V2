-- Añadir campos de refresh token a la tabla sessions
-- SEGURIDAD: Sistema de refresh tokens para mejorar seguridad JWT

-- Añadir columna refresh_token (puede ser null para sesiones antiguas)
ALTER TABLE `sessions` 
ADD COLUMN `refresh_token` VARCHAR(500) NULL AFTER `user_id`,
ADD UNIQUE INDEX `sessions_refresh_token_key` (`refresh_token`);

-- Añadir columna expires_at para refresh tokens
ALTER TABLE `sessions` 
ADD COLUMN `expires_at` DATETIME(3) NULL AFTER `refresh_token`;

-- Añadir índice para búsquedas por refresh_token (ya añadido con UNIQUE)
-- El índice único también sirve para búsquedas rápidas
