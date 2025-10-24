DB Audit & Archive Recommendations
=================================

Fecha: 2025-10-23

Resumen ejecutivo
-----------------
Ejecuté una auditoría read-only y generé un script de archivado conservador. La estrategia recomendada es renombrar/archivar tablas candidatas en lugar de borrarlas directamente. Esto minimiza el riesgo y permite rollback inmediato.

Acciones realizadas
-------------------
- `scripts/db-audit.ts` (ya ejecutado) — conteos, rango de fechas y muestras por tabla.
- `scripts/db-archive.ts` — script que crea tablas `archive_<table>` (si no existen) y copia los datos actuales ahí.
- `scripts/prepare-archive.sh` — wrapper shell para ejecutar el script TS.

Tablas candidatas (sugeridas para archivar primero)
--------------------------------------------------
- smtp_config
- smtp_accounts
- storage_configs
- system_backups
- system_updates
- job_runs
- tax_models
- tax_periods
- client_tax
- tax_files
- client_tax_requirements
- notificaciones
- scheduled_notifications

Para cada tabla candidata se recomienda:
1. Ejecutar `SELECT COUNT(*)`, `SELECT MIN(...), MAX(...)` (si hay created_at) y `SELECT * LIMIT 5` para confirmar.
2. Ejecutar el archivador (`scripts/prepare-archive.sh`) que copiará datos a `archive_<table>`.
3. Verificar `archive_<table>` y comparar counts.
4. Renombrar la tabla original (ej: `RENAME TABLE client_tax TO old_client_tax_20251023`) como paso reversible.
5. Ejecutar test smoke y monitorear 7 días.
6. Si todo ok, eliminar `old_...` o mantener por política de retención.

Checklist pre-ejecución
-----------------------
- [ ] Backup completo de la base de datos (mysqldump) y verificación del restore en staging.
- [ ] Informar ventana de mantenimiento (si aplica).
- [ ] Asegurar que `DATABASE_URL` apunta al entorno correcto.

Rollback rápido (ejemplo)
-------------------------
- Para restaurar una tabla renombrada:

  RENAME TABLE old_client_tax_20251023 TO client_tax;

- Para restaurar desde archive:

  -- Vaciar la tabla actual
  TRUNCATE TABLE client_tax;
  -- Insertar desde archivo
  INSERT INTO client_tax SELECT * FROM archive_client_tax;

Siguientes pasos
----------------
- Ejecutar `./scripts/prepare-archive.sh` (esto NO elimina tablas, solo copia a `archive_*`).
- Revisar `reports/archive-report-<ts>.json` y confirmar que counts coinciden.
- Planificar ventana para renombrar tablas `RENAME TABLE ... TO old_...` y validar.

Notas
-----
- Algunas tablas están vacías por ahora pero son referenciadas en el código (por ejemplo `client_tax` y `tax_models`) y se llenan por jobs/seeders. Archivar/renombrar permite comprobar impacto sin pérdida.
- Mantener backups y documentar los ids/archivos generados.

Si quieres, procedo a ejecutar `./scripts/prepare-archive.sh` ahora (hará copias a tablas `archive_*` y generará `reports/archive-report-<ts>.json`).
