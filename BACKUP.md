# Sistema de Backups Automáticos

## 📋 Descripción

Sistema completo de backups automáticos para Asesoría La Llave con:
- ✅ Backups automáticos programables
- ✅ Compresión automática con gzip
- ✅ Rotación automática (retención de 14 días)
- ✅ Restauración interactiva
- ✅ Logs detallados
- ✅ Backups de seguridad pre-restauración

## 📁 Estructura

```
/app/backups/
├── asesoria_backup_20241013_140000.sql.gz
├── asesoria_backup_20241012_020000.sql.gz
└── pre_restore_safety_20241013_150000.dump  # Formato custom de PostgreSQL

/app/scripts/
├── backup.sh          # Script de backup
├── restore.sh         # Script de restauración
└── crontab.example    # Ejemplos de configuración cron
```

## 🔄 Backup Automático

### Script de Backup

El script `scripts/backup.sh`:
- Realiza dump de PostgreSQL en formato custom
- Comprime automáticamente con gzip
- Limpia backups antiguos (>14 días)
- Genera logs detallados
- Verifica espacio en disco

### Ejecutar Backup Manual

```bash
# Desde el host
docker-compose exec app /app/scripts/backup.sh

# Desde dentro del contenedor
/app/scripts/backup.sh
```

### Configurar Backups Automáticos

#### Opción 1: Cron en el Host

```bash
# Editar crontab
crontab -e

# Añadir línea para backup diario a las 2 AM
0 2 * * * cd /opt/asesoria-la-llave && docker-compose exec -T app /app/scripts/backup.sh >> /var/log/asesoria/backup.log 2>&1

# Crear directorio de logs
sudo mkdir -p /var/log/asesoria
sudo chown $USER:$USER /var/log/asesoria
```

#### Opción 2: Cron dentro del Contenedor

```bash
# Acceder al contenedor
docker-compose exec app sh

# Instalar cron (si no está)
apk add --no-cache dcron

# Crear crontab
cat > /etc/crontabs/root << EOF
0 2 * * * /app/scripts/backup.sh >> /var/log/backup.log 2>&1
EOF

# Iniciar cron
crond

# Verificar
crontab -l
```

#### Opción 3: Systemd Timer (Linux)

```bash
# Crear servicio
sudo nano /etc/systemd/system/asesoria-backup.service
```

```ini
[Unit]
Description=Backup Asesoría La Llave
Wants=asesoria-backup.timer

[Service]
Type=oneshot
WorkingDirectory=/opt/asesoria-la-llave
ExecStart=/usr/bin/docker-compose exec -T app /app/scripts/backup.sh
StandardOutput=append:/var/log/asesoria/backup.log
StandardError=append:/var/log/asesoria/backup.log

[Install]
WantedBy=multi-user.target
```

```bash
# Crear timer
sudo nano /etc/systemd/system/asesoria-backup.timer
```

```ini
[Unit]
Description=Backup Asesoría La Llave Timer
Requires=asesoria-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Activar timer
sudo systemctl enable asesoria-backup.timer
sudo systemctl start asesoria-backup.timer

# Verificar
sudo systemctl status asesoria-backup.timer
sudo systemctl list-timers
```

## 🔙 Restauración de Backups

### Variables de Entorno Requeridas

Para que la restauración funcione correctamente, necesitas configurar:

```bash
# En docker-compose.yml o .env
POSTGRES_PASSWORD=tu-password-postgres  # Password del usuario postgres (superuser)
```

**Nota**: El script de restauración necesita privilegios de superusuario para eliminar/crear la base de datos.

### Restauración Interactiva

```bash
# Ejecutar script de restauración (asegúrate de tener POSTGRES_PASSWORD configurado)
docker-compose exec app /app/scripts/restore.sh

# El script mostrará:
# 1. Lista de backups disponibles
# 2. Solicita confirmación
# 3. Crea backup de seguridad
# 4. Restaura el backup seleccionado
```

### Restauración desde Archivo Específico

```bash
# Restaurar backup específico
docker-compose exec app /app/scripts/restore.sh /app/backups/asesoria_backup_20241013_140000.sql.gz
```

### Restauración Manual (Avanzado)

```bash
# Descomprimir backup
gunzip -c /app/backups/asesoria_backup_20241013_140000.sql.gz > /tmp/restore.sql

# Acceder a PostgreSQL
docker-compose exec postgres psql -U asesoria_user -d postgres

# Eliminar y recrear base de datos
DROP DATABASE asesoria_db;
CREATE DATABASE asesoria_db;
\q

# Restaurar
docker-compose exec -T postgres pg_restore -U asesoria_user -d asesoria_db < /tmp/restore.sql
```

## 📊 Monitoreo de Backups

### Verificar Backups Disponibles

```bash
# Listar backups
docker-compose exec app ls -lh /app/backups/

# Contar backups
docker-compose exec app sh -c 'ls -1 /app/backups/asesoria_backup_*.sql* | wc -l'

# Espacio usado
docker-compose exec app du -sh /app/backups/
```

### Ver Logs de Backup

```bash
# Si usas cron en host
tail -f /var/log/asesoria/backup.log

# Si usas systemd
sudo journalctl -u asesoria-backup.service -f

# Últimos 50 logs
sudo journalctl -u asesoria-backup.service -n 50
```

### Verificar Último Backup

```bash
# Ver último backup creado
docker-compose exec app ls -lt /app/backups/ | head -2

# Verificar tamaño
docker-compose exec app sh -c 'ls -lth /app/backups/asesoria_backup_*.sql.gz | head -1'
```

## 🚨 Escenarios de Recuperación

### Recuperación después de Error

```bash
# 1. Detener aplicación
docker-compose stop app

# 2. Restaurar último backup
docker-compose exec app /app/scripts/restore.sh

# 3. Verificar restauración
docker-compose exec postgres psql -U asesoria_user -d asesoria_db -c "\dt"

# 4. Reiniciar aplicación
docker-compose start app
```

### Migración a Nuevo Servidor

```bash
# En servidor original
docker-compose exec app /app/scripts/backup.sh

# Copiar backup a nuevo servidor
scp /path/to/backups/asesoria_backup_*.sql.gz user@new-server:/opt/asesoria-la-llave/backups/

# En nuevo servidor
cd /opt/asesoria-la-llave
docker-compose up -d
docker-compose exec app /app/scripts/restore.sh /app/backups/asesoria_backup_*.sql.gz
```

### Recuperación de Datos Específicos

```bash
# Restaurar en base de datos temporal
docker-compose exec postgres psql -U asesoria_user -d postgres -c "CREATE DATABASE temp_restore;"
docker-compose exec -T postgres pg_restore -U asesoria_user -d temp_restore < backup.sql

# Exportar datos específicos
docker-compose exec postgres psql -U asesoria_user -d temp_restore -c "COPY (SELECT * FROM clients WHERE id='123') TO STDOUT CSV HEADER;" > clients_export.csv

# Importar en base de datos principal
docker-compose exec -T postgres psql -U asesoria_user -d asesoria_db -c "\COPY clients FROM STDIN CSV HEADER;" < clients_export.csv
```

## ⚙️ Configuración Avanzada

### Cambiar Retención de Backups

Editar `scripts/backup.sh`:

```bash
# Cambiar de 14 a 30 días
RETENTION_DAYS=30
```

### Backups Remotos (AWS S3)

```bash
# Instalar AWS CLI
apk add --no-cache aws-cli

# Configurar credenciales
aws configure

# Añadir al final de backup.sh
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" s3://mi-bucket/backups/
```

### Backups Incrementales

```bash
# Usar pg_basebackup para backups incrementales
docker-compose exec postgres pg_basebackup -D /backup/base -F tar -z -P
```

### Notificaciones de Backup

Añadir al script de backup:

```bash
# Enviar email al completar
echo "Backup completado: $BACKUP_FILE" | mail -s "Backup Exitoso" admin@asesoria.com

# Webhook a Slack/Discord
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ Backup completado: $BACKUP_FILE\"}" \
  https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 📈 Mejores Prácticas

1. **Frecuencia**: Backups diarios mínimo, cada 6 horas para datos críticos
2. **Retención**: Mantener al menos 14 días de backups
3. **Ubicación**: Guardar backups en volumen separado o almacenamiento remoto
4. **Verificación**: Probar restauración mensualmente
5. **Monitoreo**: Configurar alertas si falla un backup
6. **Documentación**: Mantener registro de backups y restauraciones
7. **Encriptación**: Considerar encriptar backups sensibles

## 🔐 Seguridad

### Encriptar Backups

```bash
# Encriptar con GPG
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Desencriptar
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

### Permisos

```bash
# Restringir acceso a backups
chmod 600 /app/backups/*
chown postgres:postgres /app/backups/*
```

## ❓ Troubleshooting

### Error: pg_dump command not found

```bash
# Instalar postgresql-client
apk add --no-cache postgresql-client
```

### Error: Permission denied

```bash
# Verificar permisos
ls -la /app/backups/
chmod +x /app/scripts/backup.sh
```

### Backup muy lento

```bash
# Usar compresión de PostgreSQL
pg_dump -F c -Z 9 ...  # Máxima compresión

# O sin compresión y comprimir después
pg_dump -F c -Z 0 ... && gzip -9 backup.sql
```

### Espacio insuficiente

```bash
# Limpiar backups manualmente
find /app/backups -name "*.sql*" -mtime +7 -delete

# Verificar espacio
df -h /app/backups
```

## 📞 Soporte

Para problemas con backups:
1. Verificar logs: `/var/log/asesoria/backup.log`
2. Probar backup manual
3. Verificar espacio en disco
4. Revisar permisos de archivos
5. Consultar documentación de PostgreSQL

---

**Última actualización**: 13 de octubre de 2025
