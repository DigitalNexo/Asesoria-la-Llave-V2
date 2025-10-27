#!/bin/bash

# Script para agregar @@map a modelos con snake_case y renombrarlos a PascalCase

SCHEMA_FILE="prisma/schema.prisma"

echo "🔧 Agregando @@map a modelos y renombrándolos a PascalCase..."

# Crear backup
cp "$SCHEMA_FILE" "$SCHEMA_FILE.backup-model-maps"

# Renombrar modelos y agregar @@map
# Usaremos perl para hacer el cambio modelo por modelo

perl -i -pe '
  # Definir función para convertir snake_case a PascalCase
  sub snake_to_pascal {
    my $s = shift;
    return join "", map { ucfirst lc } split /_/, $s;
  }
  
  # Detectar model con snake_case
  if (/^model\s+(\w+)\s*\{/ && $1 =~ /_/) {
    $original_name = $1;
    $pascal_name = snake_to_pascal($original_name);
    $current_model = $pascal_name;
    $original_model = $original_name;
    $_ = "model $pascal_name {\n";
    $in_model = 1;
  }
  # Al final del modelo, agregar @@map antes del cierre
  elsif ($in_model && /^\}/) {
    $_ = "  \@\@map(\"$original_model\")\n}\n";
    $in_model = 0;
    $current_model = "";
    $original_model = "";
  }
' "$SCHEMA_FILE"

echo "✅ Modelos renombrados a PascalCase con @@map agregado"
