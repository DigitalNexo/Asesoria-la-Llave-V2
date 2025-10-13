# ⚠️ IMPORTANTE - Scripts de Base de Datos

## 🔴 **Problema Identificado**

Los scripts npm mencionados en la documentación **NO existen** en `package.json`. 

### **Scripts que NO funcionan:**
- ❌ `npm run db:push` (usa drizzle-kit, debería usar Prisma)
- ❌ `npm run seed` (no existe)
- ❌ `npm run db:studio` (no existe)

## ✅ **Solución: Usar comandos directos de Prisma**

### **En lugar de scripts npm, usa:**

```bash
# Sincronizar schema con base de datos
npx prisma db push

# Sincronizar con reset (borra datos)
npx prisma db push --force-reset

# Generar Prisma Client
npx prisma generate

# Poblar base de datos con datos de ejemplo
npx tsx prisma/seed.ts

# Abrir Prisma Studio (GUI)
npx prisma studio

# Migraciones (producción)
npx prisma migrate deploy
```

## 📝 **Actualización Recomendada de package.json**

Si quieres agregar los scripts correctos manualmente, edita `package.json`:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    
    "db:push": "prisma db push",
    "db:push:force": "prisma db push --force-reset",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "seed": "tsx prisma/seed.ts"
  }
}
```

## 🚀 **Flujo de trabajo corregido**

### **Setup inicial (Codespaces/Local):**

```bash
# 1. Instalar dependencias
npm install

# 2. Generar Prisma Client
npx prisma generate

# 3. Crear .env
cp .env.example .env
nano .env

# 4. Sincronizar base de datos
npx prisma db push

# 5. Poblar con datos de ejemplo
npx tsx prisma/seed.ts

# 6. Iniciar servidor
npm run dev
```

### **En Hostinger VPS:**

```bash
# Después de clonar el repo
npm install
npx prisma generate

# Configurar .env
cp .env.example .env
nano .env

# Sincronizar BD
npx prisma db push

# Build para producción
npm run build

# Iniciar con PM2
pm2 start npm --name "asesoria" -- start
```

## 📚 **Documentación Afectada**

Los siguientes archivos usan los scripts incorrectos:
- `README.md`
- `DEPLOYMENT.md`
- `setup.sh`
- `.devcontainer/devcontainer.json`
- `.github/workflows/ci.yml`

**Usa los comandos directos de Prisma mostrados arriba** hasta que actualices los scripts en `package.json`.

---

**Resumen:** Siempre usa `npx prisma` directamente en lugar de `npm run` para comandos de base de datos.
