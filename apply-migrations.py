#!/usr/bin/env python3

import requests
import json
import sys

BASE_URL = "http://localhost:5001"

# 1. Login
print("🔐 Obteniendo token...")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={
        "username": "CarlosAdmin",
        "password": "Turleque2026$"
    }
)

if login_response.status_code != 200:
    print(f"❌ Error en login: {login_response.status_code}")
    print(login_response.text)
    sys.exit(1)

login_data = login_response.json()
token = login_data.get('token')
user_id = login_data.get('id')

if not token:
    print("❌ No se obtuvo token")
    sys.exit(1)

print(f"✅ Token obtenido: {token[:50]}...")
print(f"👤 User ID: {user_id}")
print()

# 2. Aplicar migraciones
print("🚀 Aplicando migraciones...")
migration_response = requests.post(
    f"{BASE_URL}/api/admin/apply-migrations",
    headers={"Authorization": f"Bearer {token}"},
    json={}
)

if migration_response.status_code != 200:
    print(f"❌ Error aplicando migraciones: {migration_response.status_code}")
    print(migration_response.text)
    sys.exit(1)

migration_data = migration_response.json()
print(json.dumps(migration_data, indent=2))

# 3. Verificar que el admin tiene is_owner = true
print()
print("✅ Verificando admin...")
profile_response = requests.get(
    f"{BASE_URL}/api/auth/profile",
    headers={"Authorization": f"Bearer {token}"}
)

profile_data = profile_response.json()
is_owner = profile_data.get('is_owner')

print(f"Is Owner: {is_owner}")

if is_owner:
    print()
    print("✅ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!")
    print("   - Admin marcado como Owner: ✅")
    print("   - Roles prontos para nuevos campos: ✅")
    print()
    print("📋 Próximo paso: Reinicia el servidor para que cargue los cambios")
else:
    print()
    print("⚠️  El admin no fue marcado como Owner")

