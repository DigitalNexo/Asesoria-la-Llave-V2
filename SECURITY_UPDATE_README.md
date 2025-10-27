# 🔒 INSTRUCCIONES DE SEGURIDAD - ACTUALIZACIÓN CRÍTICA

## ⚠️ CAMBIOS IMPLEMENTADOS

Se han implementado mejoras **CRÍTICAS** de seguridad en la aplicación:

### 1. ✅ Rate Limiting (YA ACTIVO)
- **Login**: Máximo 5 intentos cada 15 minutos por IP
- **Registro**: Máximo 3 registros por hora por IP
- **API General**: Máximo 100 requests cada 15 minutos por IP
- **Operaciones críticas**: Máximo 10 operaciones por hora

### 2. ✅ Validación JWT_SECRET Obligatoria (YA ACTIVA)
- **JWT_SECRET es ahora OBLIGATORIO** - Sin fallback inseguro
- La aplicación NO ARRANCARÁ si:
  - JWT_SECRET no está configurado en `.env`
  - JWT_SECRET usa un valor de ejemplo o predecible
  - JWT_SECRET es menor a 64 caracteres en producción

### 3. ⏳ Refresh Tokens (REQUIERE MIGRACIÓN DE BD)

Se ha preparado un sistema de refresh tokens para mejorar la seguridad, pero **REQUIERE actualizar la base de datos**.

## 🚨 ACCIÓN REQUERIDA

### Paso 1: Verificar JWT_SECRET

**CRÍTICO**: Verifica que tu archivo `.env` tenga un JWT_SECRET fuerte.

```bash
# Genera un JWT_SECRET seguro con uno de estos comandos:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# O con OpenSSL:
openssl rand -hex 64
```

Luego añade o actualiza en `.env`:
```env
JWT_SECRET=<el-valor-generado-aqui>
```

### Paso 2: Aplicar Migración de Base de Datos (OPCIONAL pero RECOMENDADO)

Para habilitar refresh tokens (tokens de larga duración + tokens de acceso cortos):

```bash
# Opción 1: Ejecutar migración SQL directamente
mysql -u usuario -p area_privada < database/migrations/add_refresh_tokens.sql

# Opción 2: Usar Prisma (te preguntará confirmación)
npx prisma db push
```

**ADVERTENCIA**: La migración añade campos nuevos a la tabla `sessions`:
- `refresh_token` (VARCHAR 500, UNIQUE)
- `expires_at` (DATETIME)

Si hay datos duplicados en refresh_token (no debería haberlos), la migración fallará.

### Paso 3: Reiniciar Servidor

Después de verificar JWT_SECRET y OPCIONALMENTE aplicar la migración:

```bash
# Detener servidor actual
# Ctrl+C

# Reiniciar
npm run dev
```

## 📋 Verificación de Seguridad

Al arrancar, el servidor verificará:

1. ✅ JWT_SECRET configurado y seguro
2. ✅ DATABASE_URL configurado
3. ✅ Rate limiting activo
4. ⚠️ FRONTEND_URL configurado (advertencia en producción)

Si alguna validación falla, el servidor **NO ARRANCARÁ** por seguridad.

## 🔐 Mejoras de Seguridad Implementadas

### Protección contra SQL Injection
- ✅ Todos los endpoints de producción usan Prisma ORM (queries parametrizadas)
- ✅ NO hay queries raw SQL en endpoints públicos
- ✅ Scripts administrativos aislados (no expuestos como endpoints)

### Protección contra Brute Force
- ✅ Rate limiting en login (5 intentos / 15min)
- ✅ Rate limiting en registro (3 registros / hora)
- ✅ Rate limiting general en API (100 req / 15min)

### Protección de Tokens
- ✅ JWT_SECRET obligatorio sin fallback
- ✅ Validación de fortaleza de JWT_SECRET
- ✅ Tokens JWT con expiración de 24h (actualmente)
- 🔄 Refresh tokens preparados (requiere migración BD)

### Headers de Seguridad
- ✅ Helmet.js configurado
- ✅ CSP (Content Security Policy)
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ Referrer Policy
- ✅ CORS configurado

## 🎯 Próximas Mejoras Recomendadas

1. **Reducir expiración de JWT**: De 24h a 1-2 horas (después de activar refresh tokens)
2. **Auditar validación de inputs**: Asegurar Zod en todos los endpoints
3. **Reforzar CSP**: Política más restrictiva
4. **Proteger archivos sensibles**: Configurar nginx para bloquear acceso a .env, logs, backups

## 📞 Soporte

Si tienes problemas con la migración o configuración de seguridad, contacta al administrador del sistema.

---

**Fecha de implementación**: ${new Date().toISOString().split('T')[0]}
**Prioridad**: 🔴 CRÍTICA
**Estado**: ✅ Rate limiting activo | ✅ JWT validation activa | ⏳ Refresh tokens preparados
