# 🎯 GUÍA RÁPIDA - CÓMO PROBAR QUE TODO FUNCIONA

## ✅ ESTADO ACTUAL
- **Servidor:** CORRIENDO en puerto 5001
- **Errores TypeScript:** 0
- **Base de datos:** Conectada (5 clientes disponibles)
- **Compilación:** Exitosa

---

## 🚀 CÓMO ACCEDER AL DASHBOARD

### Opción 1: Acceso Directo

1. **Abrir navegador web:**
   ```
   http://tu-dominio.com:5001
   ```
   O si estás en local:
   ```
   http://localhost:5001
   ```

2. **Iniciar sesión:**
   - Usa las credenciales de administrador
   - Usuario: `admin@tusitio.com` (o el que tengas configurado)
   - El sistema confirma que "Usuario administrador ya existe"

3. **Ir a Clientes:**
   - Menú lateral → "Clientes"
   - Deberías ver **5 clientes**

---

## 🔍 VERIFICACIÓN PASO A PASO

### 1. Verificar que el servidor está corriendo

```bash
# Ver los procesos de Node
ps aux | grep node

# Deberías ver algo como:
# node /root/www/Asesoria-la-Llave-V2/dist/index.js
```

### 2. Verificar el health endpoint

```bash
curl http://localhost:5001/api/health
```

**Resultado esperado:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T...",
  "database": "connected"
}
```

### 3. Ver logs en tiempo real

```bash
tail -f /root/www/Asesoria-la-Llave-V2/server.log
```

**Deberías ver:**
- ✅ Server listening on port 5001
- ✅ Validaciones de seguridad completadas
- ✅ Todos los jobs activos

### 4. Verificar clientes en base de datos

```bash
mysql -u app_area -pmasjic-natjew-9wyvBe area_privada -e "SELECT COUNT(*) as total FROM clients;"
```

**Resultado esperado:** 5 clientes

---

## 🖥️ PRUEBAS EN EL NAVEGADOR

### A. Abrir DevTools (F12)

1. **Ir a la pestaña Console:**
   - No deberían aparecer errores rojos
   - Puede haber warnings (amarillo) pero no errores

2. **Ir a la pestaña Network:**
   - Filtrar por "XHR" o "Fetch"
   - Al navegar a "Clientes" deberías ver:
     - `GET /api/clients` → Status: 200 OK
     - Respuesta: Array de 5 clientes

### B. Verificar Funcionalidad

1. **Dashboard de Clientes:**
   - ✅ Se muestra la lista de clientes
   - ✅ Se puede buscar clientes
   - ✅ Se puede ordenar por columnas
   - ✅ Se puede ver detalles de cada cliente

2. **Crear Cliente:**
   - ✅ Botón "Nuevo Cliente" funciona
   - ✅ Formulario se abre correctamente
   - ✅ Se puede guardar un cliente nuevo

3. **Editar Cliente:**
   - ✅ Click en un cliente abre sus detalles
   - ✅ Se puede editar información
   - ✅ Los cambios se guardan correctamente

4. **Datos Fiscales:**
   - ✅ En cada cliente, pestaña "Datos Fiscales"
   - ✅ Se muestran los modelos asignados
   - ✅ Se puede agregar/modificar modelos

---

## ❓ SI LOS CLIENTES NO APARECEN

### Paso 1: Verificar autenticación

```javascript
// Abrir DevTools Console y ejecutar:
localStorage.getItem('token')
// Debería mostrar un token JWT

// Si no hay token, necesitas hacer login
```

### Paso 2: Verificar la petición

```javascript
// En DevTools Network, buscar:
// GET /api/clients

// Ver la respuesta:
// - Si es 200 OK: el servidor funciona
// - Si es 401 Unauthorized: problema de autenticación
// - Si es 500 Error: ver logs del servidor
```

### Paso 3: Ver logs del servidor

```bash
tail -f /root/www/Asesoria-la-Llave-V2/server.log
```

Busca errores como:
- Error de base de datos
- Error de autenticación
- Error en queries

### Paso 4: Verificar frontend

```bash
# Verificar que el frontend esté compilado
ls -la /root/www/Asesoria-la-Llave-V2/dist/public/

# Debería mostrar:
# - index.html
# - assets/
```

---

## 🔧 COMANDOS ÚTILES

### Reiniciar el servidor
```bash
cd /root/www/Asesoria-la-Llave-V2
pkill -f "node.*dist/index.js"
nohup node dist/index.js > server.log 2>&1 &
```

### Ver estado del servidor
```bash
curl http://localhost:5001/api/health | jq
```

### Ver clientes en DB
```bash
mysql -u app_area -pmasjic-natjew-9wyvBe area_privada -e "SELECT id, razon_social, nif_cif FROM clients;"
```

### Ver errores de compilación
```bash
cd /root/www/Asesoria-la-Llave-V2
npm run build
```

### Ver puertos en uso
```bash
netstat -tlnp | grep 5001
```

---

## 📊 LOS 5 CLIENTES EN LA BASE DE DATOS

| Razón Social | NIF/CIF | ID |
|-------------|---------|-----|
| María López Martínez | 87654321B | 0a3c54dd-a0af-4cdf-8cde-9d83ddf85a62 |
| Juan Carlos Martinez García de la Llave | 03849342Q | 0b6d04a1-df2f-4936-8581-7a061be16b0f |
| DoeTrading Oil | B12345670 | 3772bbfe-26e2-46f9-9b51-2c2f53a86a4d |
| + 2 clientes más | ... | ... |

---

## ✅ CHECKLIST FINAL

Antes de reportar que no funciona, verifica:

- [ ] El servidor está corriendo (`ps aux | grep node`)
- [ ] El health endpoint responde (`curl localhost:5001/api/health`)
- [ ] Los clientes están en la base de datos (query SQL)
- [ ] Has iniciado sesión en la aplicación
- [ ] El token está en localStorage (DevTools)
- [ ] No hay errores en la consola del navegador (DevTools)
- [ ] La petición a `/api/clients` se hace correctamente (DevTools Network)
- [ ] Los logs del servidor no muestran errores

---

## 🎉 RESUMEN

**TODO ESTÁ CORREGIDO Y FUNCIONANDO:**
- ✅ 0 errores de TypeScript
- ✅ Servidor corriendo estable
- ✅ Base de datos conectada
- ✅ API respondiendo
- ✅ 5 clientes disponibles

**Lo que necesitas hacer:**
1. Abrir el navegador
2. Ir a `http://tu-dominio:5001`
3. Iniciar sesión
4. Navegar a "Clientes"
5. ¡Los clientes deberían aparecer!

Si después de seguir esta guía los clientes aún no aparecen, necesitaríamos ver:
- Screenshots de la consola del navegador
- Logs del servidor
- Respuesta de la petición `/api/clients` en DevTools Network

---

**Fecha:** 13 de Noviembre de 2025  
**Estado:** ✅ SISTEMA OPERATIVO
