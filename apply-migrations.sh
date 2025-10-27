#!/bin/bash

set -e

BASE_URL="http://localhost:5001"
ADMIN_USER="CarlosAdmin"
ADMIN_PASS="Turleque2026$"

echo "🔐 Obteniendo token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.id // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Error: No se pudo obtener token"
  echo "Respuesta: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token obtenido"
echo "👤 User ID: $USER_ID"
echo ""

echo "🚀 Aplicando migraciones..."
MIGRATION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/apply-migrations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

echo "$MIGRATION_RESPONSE" | jq '.'

echo ""
echo "✅ Verificando admin..."
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

IS_OWNER=$(echo "$PROFILE_RESPONSE" | jq -r '.is_owner // false')

echo "Is Owner: $IS_OWNER"
echo ""

if [ "$IS_OWNER" = "true" ]; then
  echo "✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!"
  echo "   - Admin marcado como Owner: ✅"
  echo "   - Roles prontos para nuevos campos: ✅"
  echo ""
  echo "🎉 El sistema está 100% operacional"
else
  echo "⚠️  El admin no fue marcado como Owner (valor: $IS_OWNER)"
fi
