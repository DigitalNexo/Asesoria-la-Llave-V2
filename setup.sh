#!/bin/bash

# 🚀 Script de Setup Automático - Asesoría La Llave
# Este script configura el entorno de desarrollo automáticamente

set -e  # Salir si hay algún error

echo "🔧 Iniciando setup de Asesoría La Llave..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Por favor instala Node.js 20.x o superior desde https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
echo ""

# 2. Instalar dependencias
echo "📚 Instalando dependencias de npm..."
npm install
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# 3. Configurar variables de entorno
if [ ! -f .env ]; then
    echo "⚙️  Creando archivo .env desde .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edita el archivo .env con tus valores reales${NC}"
    echo ""
else
    echo -e "${GREEN}✅ Archivo .env ya existe${NC}"
    echo ""
fi

# 4. Generar Prisma Client
echo "🔨 Generando Prisma Client..."
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generado${NC}"
echo ""

# 5. Verificar conexión a base de datos (opcional)
echo "🗄️  Verificando conexión a base de datos..."
if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión a base de datos exitosa${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo conectar a la base de datos${NC}"
    echo "Verifica DATABASE_URL en tu archivo .env"
fi
echo ""

# 6. Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p uploads logs backups
echo -e "${GREEN}✅ Directorios creados${NC}"
echo ""

# 7. Información final
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 ¡Setup completado exitosamente!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Edita el archivo .env con tus credenciales:"
echo "   - DATABASE_URL (tu base de datos MySQL/MariaDB)"
echo "   - JWT_SECRET (genera uno aleatorio)"
echo "   - SMTP_* (configuración de email)"
echo "   - S3_* (opcional, para archivos en la nube)"
echo ""
echo "2. Sincroniza el schema de base de datos:"
echo "   ${YELLOW}npm run db:push${NC}"
echo ""
echo "3. (Opcional) Pobla la base de datos con datos de ejemplo:"
echo "   ${YELLOW}npm run seed${NC}"
echo ""
echo "4. Inicia el servidor de desarrollo:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo "5. Abre tu navegador en:"
echo "   ${GREEN}http://localhost:5000${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentación adicional:"
echo "   - README.md - Guía completa"
echo "   - README_DEPLOY.md - Guía de deployment"
echo "   - .env.example - Ejemplo de variables de entorno"
echo ""
echo "❓ ¿Problemas? Revisa la sección de Troubleshooting en README.md"
echo ""
