# 🔧 Actualizar Usuario Admin a Owner

## Opción 1: SQL Directo (RECOMENDADO)

Ejecuta esto en tu cliente MySQL:

```sql
-- Conectar a la BD
USE area_privada;

-- Marcar al usuario admin como Owner
UPDATE users 
SET is_owner = true 
WHERE username = 'CarlosAdmin' 
LIMIT 1;

-- Verificar que se actualizó
SELECT id, username, email, is_owner FROM users WHERE username = 'CarlosAdmin';
```

**Resultado esperado:**
```
id: c2d1ae03-12bd-4f1d-bb05-2c1a2bf80c97
username: CarlosAdmin
email: Carlos@asesorialallave.com
is_owner: 1 (true)
```

---

## Opción 2: Usando el Endpoint (Via API)

Una vez que tengas el user_id (obtenido del SQL anterior), ejecuta:

```bash
# 1. Obtener token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"CarlosAdmin",
    "password":"Turleque2026$"
  }' | jq -r '.token')

# 2. Establecer como Owner (reemplaza USER_ID)
curl -X POST "http://localhost:5001/api/users/c2d1ae03-12bd-4f1d-bb05-2c1a2bf80c97/set-owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'

# 3. Verificar
curl -s -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.is_owner'
```

---

## Verificación Final

Después de ejecutar cualquier opción, verifica haciendo login:

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"CarlosAdmin",
    "password":"Turleque2026$"
  }' | jq '.is_owner'
```

**Resultado esperado: `true`**

---

## Nuevo Endpoint Disponible

Ahora está disponible el endpoint para establecer Owner:

**POST** `/api/users/:id/set-owner`
- **Descripción**: Establece un usuario como Owner (solo Admin)
- **Autenticación**: Bearer Token
- **Permisos Requeridos**: `admin:system`
- **Parámetros**: 
  - `:id` - ID del usuario a establecer como Owner
- **Respuesta**: Usuario actualizado con `is_owner: true`

**Nota**: Solo hay un Owner. Al establecer un nuevo Owner, el anterior pierde automáticamente ese rol.

---

## Ejemplo Curl Completo

```bash
# Variables
USUARIO="CarlosAdmin"
CONTRASEÑA="Turleque2026$"
USER_ID="c2d1ae03-12bd-4f1d-bb05-2c1a2bf80c97"  # Reemplazar con el ID real

# 1. Login
RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"username\":\"$USUARIO\",
    \"password\":\"$CONTRASEÑA\"
  }")

TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "✅ Token: $TOKEN"

# 2. Establecer como Owner
curl -s -X POST "http://localhost:5001/api/users/$USER_ID/set-owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' | jq '.'

# 3. Verificar en el profile
curl -s -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.is_owner'
```

