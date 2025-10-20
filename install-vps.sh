#!/bin/bash

# Script de instalación para VPS (Producción) - Asesoría La Llave
# Este script configura la base de datos y prepara el sistema para producción

set -e  # Detener si hay errores

echo "═══════════════════════════════════════════════════════════════"
echo "  🔧 INSTALACIÓN VPS - Asesoría La Llave"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Verificar que existe el archivo .env
if [ ! -f .env ]; then
    echo "❌ ERROR: No se encontró el archivo .env"
    echo ""
    echo "Por favor copia .env.example a .env y configura las variables:"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edita las credenciales del administrador"
    echo ""
    exit 1
fi

# Verificar que las variables de administrador están configuradas
source .env
if [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ ERROR: Variables de administrador no configuradas en .env"
    echo ""
    echo "Configura estas variables en tu archivo .env:"
    echo "  ADMIN_EMAIL=tu-email@ejemplo.com"
    echo "  ADMIN_USERNAME=tu-usuario"
    echo "  ADMIN_PASSWORD=tu-contraseña-segura"
    echo ""
    exit 1
fi

# Verificar que no se están usando valores de ejemplo
if [[ "$ADMIN_EMAIL" == *"CAMBIAR"* ]] || [[ "$ADMIN_USERNAME" == *"CAMBIAR"* ]] || [[ "$ADMIN_PASSWORD" == *"CAMBIAR"* ]]; then
    echo "❌ ERROR: Debes cambiar los valores de ejemplo en .env"
    echo ""
    echo "Valores detectados:"
    echo "  ADMIN_EMAIL=$ADMIN_EMAIL"
    echo "  ADMIN_USERNAME=$ADMIN_USERNAME"
    echo "  ADMIN_PASSWORD=***"
    echo ""
    exit 1
fi

# Verificar contraseñas débiles comunes
WEAK_PASSWORDS=("admin123" "password" "password123" "Admin123!" "123456" "12345678")
for weak in "${WEAK_PASSWORDS[@]}"; do
    if [ "$ADMIN_PASSWORD" == "$weak" ]; then
        echo "❌ ERROR: La contraseña '$weak' es demasiado débil"
        echo ""
        echo "Usa una contraseña segura con al menos:"
        echo "  - 8 caracteres"
        echo "  - Mayúsculas y minúsculas"
        echo "  - Números y símbolos"
        echo ""
        exit 1
    fi
done

echo "✓ Archivo .env configurado correctamente"
echo ""

# Paso 1: Instalar dependencias
echo "📦 Paso 1/5: Instalando dependencias de Node.js..."
npm install
echo ""

# Paso 2: Generar cliente Prisma
echo "🔨 Paso 2/5: Generando cliente Prisma..."
npx prisma generate
echo ""

# Paso 3: Sincronizar esquema de base de datos
echo "🗄️  Paso 3/5: Sincronizando esquema de base de datos..."
npx prisma db push --accept-data-loss
echo ""

# Paso 4: Crear roles y permisos
echo "👥 Paso 4/5: Creando roles y permisos del sistema..."
npx tsx server/migrate-rbac.ts
echo ""

# Paso 5: Crear directorios necesarios
echo "📁 Paso 5/5: Creando directorios necesarios..."
mkdir -p uploads logs backups
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ INSTALACIÓN COMPLETADA"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 Para iniciar el servidor en producción:"
echo "   npm run build"
echo "   npm start"
echo ""
echo "   O con PM2 (recomendado para producción):"
echo "   pm2 start npm --name \"asesoria-lallave\" -- start"
echo "   pm2 save"
echo ""
echo "🧑‍💻 Para desarrollo:"
echo "   npm run dev"
echo ""
echo "💡 El usuario administrador se creará automáticamente al"
echo "   iniciar el servidor por primera vez usando las credenciales"
echo "   configuradas en el archivo .env"
echo ""
echo "📝 Credenciales configuradas:"
echo "   Email:    $ADMIN_EMAIL"
echo "   Usuario:  $ADMIN_USERNAME"
echo "   Password: *** (se hasheará con bcrypt al crear el usuario)"
echo ""
echo "🔒 IMPORTANTE: Cambia la contraseña después del primer login"
echo "              desde el panel de administración"
echo ""
echo "═══════════════════════════════════════════════════════════════"
