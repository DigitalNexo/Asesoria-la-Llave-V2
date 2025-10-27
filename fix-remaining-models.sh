#!/bin/bash

echo "🔧 Arreglando referencias de modelos restantes..."

# Archivos en la raíz
FILES=(
  "check-budgets.ts"
  "prisma/seed.ts"
  "scripts/seed-budget-parameters.ts"
  "scripts/seed-budget-templates.ts"
  "scripts/test-budget-creation.ts"
  "scripts/test-budget-details.ts"
  "scripts/test-budget-simple.ts"
  "scripts/test-budget-system.ts"
  "scripts/test-complete-budgets.ts"
  "scripts/test-decimal-serialization.ts"
  "scripts/test-template-system.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Procesando $file..."
    
    # Singular → Plural
    perl -i -pe 's/prisma\.budget(?!s|_)/prisma.budgets/g' "$file"
    perl -i -pe 's/prisma\.permission(?!s)/prisma.permissions/g' "$file"
    perl -i -pe 's/prisma\.role(?!s|_)/prisma.roles/g' "$file"
    perl -i -pe 's/prisma\.user(?!s)/prisma.users/g' "$file"
    perl -i -pe 's/prisma\.client(?!s|_)/prisma.clients/g' "$file"
    perl -i -pe 's/prisma\.task(?!s)/prisma.tasks/g' "$file"
    perl -i -pe 's/prisma\.manual(?!s|_)/prisma.manuals/g' "$file"
    
    # camelCase → snake_case
    perl -i -pe 's/prisma\.rolePermission/prisma.role_permissions/g' "$file"
    perl -i -pe 's/prisma\.budgetParameter/prisma.budget_parameters/g' "$file"
    perl -i -pe 's/prisma\.budgetTemplate/prisma.budget_templates/g' "$file"
    perl -i -pe 's/prisma\.budgetItem/prisma.budget_items/g' "$file"
    perl -i -pe 's/prisma\.taxModel/prisma.tax_models/g' "$file"
    perl -i -pe 's/prisma\.taxPeriod/prisma.tax_periods/g' "$file"
    perl -i -pe 's/prisma\.clientTax(?!_)/prisma.client_tax/g' "$file"
    perl -i -pe 's/prisma\.systemConfig/prisma.system_config/g' "$file"
    
    # Tipos Prisma camelCase → snake_case
    perl -i -pe 's/Prisma\.clientTaxUncheckedCreateInput/Prisma.client_taxUncheckedCreateInput/g' "$file"
    perl -i -pe 's/Prisma\.ClientWhereInput/Prisma.clientsWhereInput/g' "$file"
    perl -i -pe 's/Prisma\.ClientTaxAssignmentWhereInput/Prisma.client_tax_assignmentsWhereInput/g' "$file"
    perl -i -pe 's/Prisma\.clientTaxFilingWhereInput/Prisma.client_tax_filingsWhereInput/g' "$file"
    perl -i -pe 's/Prisma\.fiscalPeriodWhereInput/Prisma.fiscal_periodsWhereInput/g' "$file"
    perl -i -pe 's/Prisma\.fiscalPeriodUncheckedUpdateInput/Prisma.fiscal_periodsUncheckedUpdateInput/g' "$file"
  fi
done

# Ahora archivos en server/ que tienen errores específicos no cubiertos
echo "📝 Procesando archivos server/ con casos especiales..."

# server/prisma-storage.ts - casos específicos
if [ -f "server/prisma-storage.ts" ]; then
  # Importaciones
  perl -i -pe 's/import.*fiscalPeriod.*from.*@prisma\/client.*/\/\/ fiscalPeriod removed - use fiscal_periods/g' "server/prisma-storage.ts"
  
  # Propiedades en include/select
  perl -i -pe 's/include:\s*\{\s*role:/include: { roles:/g' "server/prisma-storage.ts"
  perl -i -pe 's/employees:/client_employees:/g' "server/prisma-storage.ts"
  perl -i -pe 's/taxAssignments:/client_tax_assignments:/g' "server/prisma-storage.ts"
  perl -i -pe 's/taxModel:/tax_models:/g' "server/prisma-storage.ts"
  perl -i -pe 's/(?<!_)period:/tax_periods:/g' "server/prisma-storage.ts"
  perl -i -pe 's/responsable:/users:/g' "server/prisma-storage.ts"
  perl -i -pe 's/permissions:/role_permissions:/g' "server/prisma-storage.ts"
  
  # Propiedades en orderBy
  perl -i -pe 's/orderBy:\s*\{\s*period:/orderBy: { tax_periods:/g' "server/prisma-storage.ts"
  perl -i -pe 's/orderBy:\s*\{\s*startsAt:/orderBy: { starts_at:/g' "server/prisma-storage.ts"
  perl -i -pe 's/orderBy:\s*\{\s*client:/orderBy: { clients:/g' "server/prisma-storage.ts"
  
  # Acceso a propiedades snake_case
  perl -i -pe 's/\.startsAt/.starts_at/g' "server/prisma-storage.ts"
  perl -i -pe 's/\.endsAt/.ends_at/g' "server/prisma-storage.ts"
  perl -i -pe 's/\.lockedAt/.locked_at/g' "server/prisma-storage.ts"
  perl -i -pe 's/\.isSystem/.is_system/g' "server/prisma-storage.ts"
  perl -i -pe 's/\.daysToStart/.days_to_start/g' "server/prisma-storage.ts"
  perl -i -pe 's/\.daysToEnd/.days_to_end/g' "server/prisma-storage.ts"
  
  # Modelos singulares adicionales
  perl -i -pe 's/prisma\.clientTaxAssignment/prisma.client_tax_assignments/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.clientTaxFiling/prisma.client_tax_filings/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.fiscalPeriod/prisma.fiscal_periods/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.obligacionFiscal/prisma.obligaciones_fiscales/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.declaracion(?!es)/prisma.declaraciones/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.impuesto(?!s)/prisma.impuestos/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.manualAttachment/prisma.manual_attachments/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.manualVersion/prisma.manual_versions/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.activityLog/prisma.activity_logs/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.auditTrail/prisma.audit_trail/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.systemSettings/prisma.system_settings/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.sMTPAccount/prisma.smtp_accounts/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.notificationTemplate/prisma.notification_templates/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.notificationLog/prisma.notification_logs/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.scheduledNotification/prisma.scheduled_notifications/g' "server/prisma-storage.ts"
  perl -i -pe 's/prisma\.taxModelsConfig/prisma.tax_models_config/g' "server/prisma-storage.ts"
  
  # Propiedades en data objects
  perl -i -pe 's/clienteId:/cliente_id:/g' "server/prisma-storage.ts"
  perl -i -pe 's/contenidoHtml:/contenido_html:/g' "server/prisma-storage.ts"
  perl -i -pe 's/autorId:/autor_id:/g' "server/prisma-storage.ts"
  perl -i -pe 's/isEditable:/is_editable:/g' "server/prisma-storage.ts"
fi

# server/routes.ts - casos específicos
if [ -f "server/routes.ts" ]; then
  perl -i -pe 's/prisma\.clientTax(?!_)/prisma.client_tax/g' "server/routes.ts"
  perl -i -pe 's/prisma\.clientEmployee/prisma.client_employees/g' "server/routes.ts"
  perl -i -pe 's/prisma\.activityLog/prisma.activity_logs/g' "server/routes.ts"
  perl -i -pe 's/prisma\.auditTrail/prisma.audit_trail/g' "server/routes.ts"
  perl -i -pe 's/prisma\.storageConfig/prisma.storage_configs/g' "server/routes.ts"
  perl -i -pe 's/prisma\.clientTaxRequirement/prisma.client_tax_requirements/g' "server/routes.ts"
  
  # Propiedades
  perl -i -pe 's/autorId:/autor_id:/g' "server/routes.ts"
  perl -i -pe 's/\.isEditable/.is_editable/g' "server/routes.ts"
  perl -i -pe 's/isEditable:/is_editable:/g' "server/routes.ts"
  perl -i -pe 's/\.daysToStart/.days_to_start/g' "server/routes.ts"
  perl -i -pe 's/\.daysToEnd/.days_to_end/g' "server/routes.ts"
  perl -i -pe 's/endedAt:/ended_at:/g' "server/routes.ts"
  perl -i -pe 's/socketId:/socket_id:/g' "server/routes.ts"
fi

# server/index.ts - roleId en create
if [ -f "server/index.ts" ]; then
  # Este es un error de tipo - el roleId debe conectarse usando roles: { connect: { id } }
  # Pero por ahora solo reportamos
  echo "⚠️  server/index.ts necesita revisar admin creation (roleId → roles: { connect: { id: roleId } })"
fi

echo "✅ Referencias de modelos restantes actualizadas"
