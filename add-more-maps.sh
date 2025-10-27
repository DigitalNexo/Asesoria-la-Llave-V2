#!/bin/bash

# Script para agregar @map a campos adicionales que faltaron

SCHEMA_FILE="prisma/schema.prisma"

echo "🔧 Agregando @map a campos adicionales..."

# Crear backup
cp "$SCHEMA_FILE" "$SCHEMA_FILE.backup-additional"

perl -i -pe '
  if (/^model\s+\w+\s*\{/) {
    $in_model = 1;
  }
  if ($in_model && /^\}/) {
    $in_model = 0;
  }
  
  if ($in_model) {
    # usuario_id -> usuarioId @map("usuario_id")
    s/^(\s+)usuario_id(\s+\S+.*?)(\@|$)/${1}usuarioId${2}\@map("usuario_id") $3/g unless /\@map\("usuario_id"\)/;
    
    # registro_id -> registroId @map("registro_id")
    s/^(\s+)registro_id(\s+\S+.*?)(\@|$)/${1}registroId${2}\@map("registro_id") $3/g unless /\@map\("registro_id"\)/;
    
    # valor_anterior -> valorAnterior @map("valor_anterior")
    s/^(\s+)valor_anterior(\s+\S+.*?)(\@|$)/${1}valorAnterior${2}\@map("valor_anterior") $3/g unless /\@map\("valor_anterior"\)/;
    
    # valor_nuevo -> valorNuevo @map("valor_nuevo")
    s/^(\s+)valor_nuevo(\s+\S+.*?)(\@|$)/${1}valorNuevo${2}\@map("valor_nuevo") $3/g unless /\@map\("valor_nuevo"\)/;
    
    # request_id -> requestId @map("request_id")
    s/^(\s+)request_id(\s+\S+.*?)(\@|$)/${1}requestId${2}\@map("request_id") $3/g unless /\@map\("request_id"\)/;
    
    # unit_price -> unitPrice @map("unit_price")
    s/^(\s+)unit_price(\s+\S+.*?)(\@|$)/${1}unitPrice${2}\@map("unit_price") $3/g unless /\@map\("unit_price"\)/;
    
    # vat_pct -> vatPct @map("vat_pct")
    s/^(\s+)vat_pct(\s+\S+.*?)(\@|$)/${1}vatPct${2}\@map("vat_pct") $3/g unless /\@map\("vat_pct"\)/;
    
    # is_manually_edited -> isManuallyEdited @map("is_manually_edited")
    s/^(\s+)is_manually_edited(\s+\S+.*?)(\@|$)/${1}isManuallyEdited${2}\@map("is_manually_edited") $3/g unless /\@map\("is_manually_edited"\)/;
    
    # budget_type -> budgetType @map("budget_type")
    s/^(\s+)budget_type(\s+\S+.*?)(\@|$)/${1}budgetType${2}\@map("budget_type") $3/g unless /\@map\("budget_type"\)/;
    
    # param_key -> paramKey @map("param_key")
    s/^(\s+)param_key(\s+\S+.*?)(\@|$)/${1}paramKey${2}\@map("param_key") $3/g unless /\@map\("param_key"\)/;
    
    # param_label -> paramLabel @map("param_label")
    s/^(\s+)param_label(\s+\S+.*?)(\@|$)/${1}paramLabel${2}\@map("param_label") $3/g unless /\@map\("param_label"\)/;
    
    # param_value -> paramValue @map("param_value")
    s/^(\s+)param_value(\s+\S+.*?)(\@|$)/${1}paramValue${2}\@map("param_value") $3/g unless /\@map\("param_value"\)/;
    
    # min_range -> minRange @map("min_range")
    s/^(\s+)min_range(\s+\S+.*?)(\@|$)/${1}minRange${2}\@map("min_range") $3/g unless /\@map\("min_range"\)/;
    
    # max_range -> maxRange @map("max_range")
    s/^(\s+)max_range(\s+\S+.*?)(\@|$)/${1}maxRange${2}\@map("max_range") $3/g unless /\@map\("max_range"\)/;
    
    # version_number -> versionNumber @map("version_number")
    s/^(\s+)version_number(\s+\S+.*?)(\@|$)/${1}versionNumber${2}\@map("version_number") $3/g unless /\@map\("version_number"\)/;
    
    # created_by -> createdBy @map("created_by")
    s/^(\s+)created_by(\s+\S+.*?)(\@|$)/${1}createdBy${2}\@map("created_by") $3/g unless /\@map\("created_by"\)/;
    
    # parent_id -> parentId @map("parent_id")
    s/^(\s+)parent_id(\s+\S+.*?)(\@|$)/${1}parentId${2}\@map("parent_id") $3/g unless /\@map\("parent_id"\)/;
    
    # refresh_token -> refreshToken @map("refresh_token")
    s/^(\s+)refresh_token(\s+\S+.*?)(\@|$)/${1}refreshToken${2}\@map("refresh_token") $3/g unless /\@map\("refresh_token"\)/;
    
    # expires_at -> expiresAt @map("expires_at")
    s/^(\s+)expires_at(\s+\S+.*?)(\@|$)/${1}expiresAt${2}\@map("expires_at") $3/g unless /\@map\("expires_at"\)/;
  }
' "$SCHEMA_FILE"

echo "✅ Campos adicionales mapeados"
