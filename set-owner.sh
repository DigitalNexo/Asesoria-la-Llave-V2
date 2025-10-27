#!/bin/bash

# Script para establecer CarlosAdmin como Owner

echo "🔧 Actualizando usuario CarlosAdmin para ser Owner..."

# Obtener el ID del usuario
USER_ID=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"CarlosAdmin",
    "password":"Turleque2026$"
  }' | jq -r '.id' 2>/dev/null)

if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
  echo "❌ Error: No se pudo obtener el token"
  exit 1
fi

TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"CarlosAdmin",
    "password":"Turleque2026$"
  }' | jq -r '.token' 2>/dev/null)

echo "🔑 Token obtenido"

# Obtener ID del usuario
USER_DATA=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"CarlosAdmin",
    "password":"Turleque2026$"
  }' | jq '.' 2>/dev/null)

USER_ID=$(echo "$USER_DATA" | jq -r '.id')

echo "👤 User ID: $USER_ID"
echo "🚀 Estableciendo como Owner..."

# Establecer como owner
RESPONSE=$(curl -s -X POST "http://localhost:5001/api/users/$USER_ID/set-owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

echo "$RESPONSE" | jq '.'

# Verificar
echo ""
echo "✅ Verificando..."
curl -s -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.is_owner'
