#!/bin/bash

# Script para corregir referencias a campos renombrados en relaciones e índices

SCHEMA_FILE="prisma/schema.prisma"

echo "🔧 Corrigiendo referencias en relaciones e índices..."

# Crear backup
cp "$SCHEMA_FILE" "$SCHEMA_FILE.backup-fix-refs"

# Corregir referencias en @relation fields
perl -i -pe '
  # Corregir fields: [role_id] -> fields: [roleId]
  s/fields:\s*\[role_id\]/fields: [roleId]/g;
  
  # Corregir fields: [client_id] -> fields: [clientId]
  s/fields:\s*\[client_id\]/fields: [clientId]/g;
  
  # Corregir fields: [tax_model_code] -> fields: [taxModelCode]
  s/fields:\s*\[tax_model_code\]/fields: [taxModelCode]/g;
  
  # Corregir fields: [period_id] -> fields: [periodId]
  s/fields:\s*\[period_id\]/fields: [periodId]/g;
  
  # Corregir fields: [user_id] -> fields: [userId]
  s/fields:\s*\[user_id\]/fields: [userId]/g;
  
  # Corregir fields: [task_id] -> fields: [taskId]
  s/fields:\s*\[task_id\]/fields: [taskId]/g;
  
  # Corregir fields: [manual_id] -> fields: [manualId]
  s/fields:\s*\[manual_id\]/fields: [manualId]/g;
  
  # Corregir fields: [budget_id] -> fields: [budgetId]
  s/fields:\s*\[budget_id\]/fields: [budgetId]/g;
  
  # Corregir fields: [assignee_id] -> fields: [assigneeId]
  s/fields:\s*\[assignee_id\]/fields: [assigneeId]/g;
  
  # Corregir fields: [responsable_asignado] -> fields: [responsableAsignado]
  s/fields:\s*\[responsable_asignado\]/fields: [responsableAsignado]/g;
  
  # Corregir fields: [usuario_id] -> fields: [usuarioId] (para activity_logs, etc)
  s/fields:\s*\[usuario_id\]/fields: [usuarioId]/g;
' "$SCHEMA_FILE"

# Corregir referencias en @@index
perl -i -pe '
  # Corregir @@index([role_id]) -> @@index([roleId])
  s/\@\@index\(\[role_id\]\)/\@\@index([roleId])/g;
  
  # Corregir @@index([client_id]) -> @@index([clientId])
  s/\@\@index\(\[client_id\]/\@\@index([clientId]/g;
  
  # Corregir @@index([is_active]) -> @@index([isActive])
  s/\@\@index\(\[is_active\]\)/\@\@index([isActive])/g;
  
  # Corregir @@index([created_at]) -> @@index([createdAt])
  s/\@\@index\(\[created_at\]/\@\@index([createdAt]/g;
  
  # Corregir @@index([updated_at]) -> @@index([updatedAt])
  s/\@\@index\(\[updated_at\]/\@\@index([updatedAt]/g;
  
  # Corregir @@index([fecha_baja]) -> @@index([fechaBaja])
  s/\@\@index\(\[fecha_baja\]\)/\@\@index([fechaBaja])/g;
  
  # Corregir @@index([responsable_asignado]) -> @@index([responsableAsignado])
  s/\@\@index\(\[responsable_asignado\]\)/\@\@index([responsableAsignado])/g;
  
  # Corregir @@index([usuario_id]) -> @@index([usuarioId])
  s/\@\@index\(\[usuario_id\]/\@\@index([usuarioId]/g;
  
  # Corregir @@index([user_id]) -> @@index([userId])
  s/\@\@index\(\[user_id\]/\@\@index([userId]/g;
  
  # Corregir @@index([task_id]) -> @@index([taskId])
  s/\@\@index\(\[task_id\]/\@\@index([taskId]/g;
  
  # Corregir @@index([start_date]) -> @@index([startDate])
  s/\@\@index\(\[start_date\]/\@\@index([startDate]/g;
  
  # Corregir @@index([end_date]) -> @@index([endDate])
  s/\@\@index\(\[end_date\]/\@\@index([endDate]/g;
' "$SCHEMA_FILE"

echo "✅ Referencias corregidas en relaciones e índices"
