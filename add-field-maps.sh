#!/bin/bash

# Script para agregar directivas @map a campos snake_case en Prisma schema
# Convierte campos snake_case a camelCase en la API mientras mantiene snake_case en DB

SCHEMA_FILE="prisma/schema.prisma"

echo "🔧 Agregando directivas @map al schema de Prisma..."

# Crear backup
cp "$SCHEMA_FILE" "$SCHEMA_FILE.backup-before-map"
echo "📋 Backup creado: $SCHEMA_FILE.backup-before-map"

# Función para convertir snake_case a camelCase
# Usaremos perl para hacer el reemplazo campo por campo

# Agregar @map a campos específicos comunes
perl -i -pe '
  # Solo procesar líneas dentro de bloques model
  if (/^model\s+\w+\s*\{/) {
    $in_model = 1;
  }
  if ($in_model && /^\}/) {
    $in_model = 0;
  }
  
  if ($in_model) {
    # role_id -> roleId @map("role_id")
    s/^(\s+)role_id(\s+\S+.*?)(\@|$)/${1}roleId${2}\@map("role_id") $3/g unless /\@map\("role_id"\)/;
    
    # is_active -> isActive @map("is_active")
    s/^(\s+)is_active(\s+\S+.*?)(\@|$)/${1}isActive${2}\@map("is_active") $3/g unless /\@map\("is_active"\)/;
    
    # created_at -> createdAt @map("created_at")
    s/^(\s+)created_at(\s+\S+.*?)(\@|$)/${1}createdAt${2}\@map("created_at") $3/g unless /\@map\("created_at"\)/;
    
    # updated_at -> updatedAt @map("updated_at")
    s/^(\s+)updated_at(\s+\S+.*?)(\@|$)/${1}updatedAt${2}\@map("updated_at") $3/g unless /\@map\("updated_at"\)/;
    
    # client_id -> clientId @map("client_id")
    s/^(\s+)client_id(\s+\S+.*?)(\@|$)/${1}clientId${2}\@map("client_id") $3/g unless /\@map\("client_id"\)/;
    
    # tax_model_code -> taxModelCode @map("tax_model_code")
    s/^(\s+)tax_model_code(\s+\S+.*?)(\@|$)/${1}taxModelCode${2}\@map("tax_model_code") $3/g unless /\@map\("tax_model_code"\)/;
    
    # period_id -> periodId @map("period_id")  
    s/^(\s+)period_id(\s+\S+.*?)(\@|$)/${1}periodId${2}\@map("period_id") $3/g unless /\@map\("period_id"\)/;
    
    # start_date -> startDate @map("start_date")
    s/^(\s+)start_date(\s+\S+.*?)(\@|$)/${1}startDate${2}\@map("start_date") $3/g unless /\@map\("start_date"\)/;
    
    # end_date -> endDate @map("end_date")
    s/^(\s+)end_date(\s+\S+.*?)(\@|$)/${1}endDate${2}\@map("end_date") $3/g unless /\@map\("end_date"\)/;
    
    # active_flag -> activeFlag @map("active_flag")
    s/^(\s+)active_flag(\s+\S+.*?)(\@|$)/${1}activeFlag${2}\@map("active_flag") $3/g unless /\@map\("active_flag"\)/;
    
    # presented_at -> presentedAt @map("presented_at")
    s/^(\s+)presented_at(\s+\S+.*?)(\@|$)/${1}presentedAt${2}\@map("presented_at") $3/g unless /\@map\("presented_at"\)/;
    
    # assignee_id -> assigneeId @map("assignee_id")
    s/^(\s+)assignee_id(\s+\S+.*?)(\@|$)/${1}assigneeId${2}\@map("assignee_id") $3/g unless /\@map\("assignee_id"\)/;
    
    # razon_social -> razonSocial @map("razon_social")
    s/^(\s+)razon_social(\s+\S+.*?)(\@|$)/${1}razonSocial${2}\@map("razon_social") $3/g unless /\@map\("razon_social"\)/;
    
    # nif_cif -> nifCif @map("nif_cif")
    s/^(\s+)nif_cif(\s+\S+.*?)(\@|$)/${1}nifCif${2}\@map("nif_cif") $3/g unless /\@map\("nif_cif"\)/;
    
    # fecha_alta -> fechaAlta @map("fecha_alta")
    s/^(\s+)fecha_alta(\s+\S+.*?)(\@|$)/${1}fechaAlta${2}\@map("fecha_alta") $3/g unless /\@map\("fecha_alta"\)/;
    
    # fecha_baja -> fechaBaja @map("fecha_baja")
    s/^(\s+)fecha_baja(\s+\S+.*?)(\@|$)/${1}fechaBaja${2}\@map("fecha_baja") $3/g unless /\@map\("fecha_baja"\)/;
    
    # responsable_asignado -> responsableAsignado @map("responsable_asignado")
    s/^(\s+)responsable_asignado(\s+\S+.*?)(\@|$)/${1}responsableAsignado${2}\@map("responsable_asignado") $3/g unless /\@map\("responsable_asignado"\)/;
    
    # allowed_types -> allowedTypes @map("allowed_types")
    s/^(\s+)allowed_types(\s+\S+.*?)(\@|$)/${1}allowedTypes${2}\@map("allowed_types") $3/g unless /\@map\("allowed_types"\)/;
    
    # allowed_periods -> allowedPeriods @map("allowed_periods")
    s/^(\s+)allowed_periods(\s+\S+.*?)(\@|$)/${1}allowedPeriods${2}\@map("allowed_periods") $3/g unless /\@map\("allowed_periods"\)/;
    
    # budget_id -> budgetId @map("budget_id")
    s/^(\s+)budget_id(\s+\S+.*?)(\@|$)/${1}budgetId${2}\@map("budget_id") $3/g unless /\@map\("budget_id"\)/;
    
    # user_id -> userId @map("user_id")
    s/^(\s+)user_id(\s+\S+.*?)(\@|$)/${1}userId${2}\@map("user_id") $3/g unless /\@map\("user_id"\)/;
    
    # task_id -> taskId @map("task_id")
    s/^(\s+)task_id(\s+\S+.*?)(\@|$)/${1}taskId${2}\@map("task_id") $3/g unless /\@map\("task_id"\)/;
    
    # manual_id -> manualId @map("manual_id")
    s/^(\s+)manual_id(\s+\S+.*?)(\@|$)/${1}manualId${2}\@map("manual_id") $3/g unless /\@map\("manual_id"\)/;
    
    # file_name -> fileName @map("file_name")
    s/^(\s+)file_name(\s+\S+.*?)(\@|$)/${1}fileName${2}\@map("file_name") $3/g unless /\@map\("file_name"\)/;
    
    # file_path -> filePath @map("file_path")
    s/^(\s+)file_path(\s+\S+.*?)(\@|$)/${1}filePath${2}\@map("file_path") $3/g unless /\@map\("file_path"\)/;
    
    # file_size -> fileSize @map("file_size")
    s/^(\s+)file_size(\s+\S+.*?)(\@|$)/${1}fileSize${2}\@map("file_size") $3/g unless /\@map\("file_size"\)/;
  }
' "$SCHEMA_FILE"

echo "✅ Directivas @map agregadas para campos comunes"
echo ""
echo "🔄 Ahora debes ejecutar:"
echo "   npx prisma generate"
echo ""
echo "Esto regenerará el cliente de Prisma con nombres camelCase"
