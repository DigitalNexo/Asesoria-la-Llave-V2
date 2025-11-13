#!/bin/bash
# COMANDOS PARA APLICAR LOS CAMBIOS AL SISTEMA DE IMPUESTOS
# Copia y pega estos comandos uno por uno

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  APLICAR CAMBIOS AL SISTEMA DE CONTROL DE IMPUESTOS              ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Estos comandos van a:"
echo "   1. Registrar las rutas del sistema de impuestos"
echo "   2. Agregar el campo period_type a la base de datos"
echo "   3. Generar el cliente de Prisma"
echo "   4. Compilar el proyecto"
echo "   5. Reiniciar el servicio"
echo "   6. Verificar que todo funciona"
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de estar en el directorio correcto"
echo ""
read -p "Presiona ENTER para continuar o CTRL+C para cancelar..."

# Ir al directorio del proyecto
cd /root/www/Asesoria-la-Llave-V2

# Ejecutar el script maestro
chmod +x aplicar-cambios-impuestos.sh
./aplicar-cambios-impuestos.sh
