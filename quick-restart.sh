#!/bin/bash
# Script para reinicio rápido (solo reinicia el servicio, sin build)
# Útil cuando solo cambias .env

set -e

echo "🔄 Reiniciando servicio..."
systemctl restart asesoria-llave

sleep 2

if systemctl is-active --quiet asesoria-llave; then
    echo "✅ Servicio reiniciado correctamente"
    systemctl status asesoria-llave --no-pager -l
else
    echo "❌ Error al reiniciar el servicio"
    journalctl -u asesoria-llave -n 20 --no-pager
    exit 1
fi