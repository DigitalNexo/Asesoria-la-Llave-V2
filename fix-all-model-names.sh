#!/bin/bash

echo "🔧 Actualizando referencias de modelos en todos los archivos..."

# List of files to update
FILES=(
  "server/routes.ts"
  "server/services/backup-service.ts"
  "server/services/update-service.ts"
  "server/services/token-service.ts"
  "server/seed-system-config.ts"
  "server/jobs.ts"
  "server/utils/budgets-pdf.ts"
  "server/utils/template-variables.ts"
)

# Create backups
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$file.backup-hybrid"
  fi
done

# Update all files
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  📝 Actualizando $file..."
    perl -i -pe 's/prisma\.taxModelsConfig/prisma.tax_models_config/g' "$file"
    perl -i -pe 's/prisma\.taxCalendar/prisma.tax_calendar/g' "$file"
    perl -i -pe 's/prisma\.taxPeriods/prisma.tax_periods/g' "$file"
    perl -i -pe 's/prisma\.fiscalPeriods/prisma.fiscal_periods/g' "$file"
    perl -i -pe 's/prisma\.clientTaxAssignments/prisma.client_tax_assignments/g' "$file"
    perl -i -pe 's/prisma\.clientTaxFilings/prisma.client_tax_filings/g' "$file"
    perl -i -pe 's/prisma\.budgetTemplates/prisma.budget_templates/g' "$file"
    perl -i -pe 's/prisma\.budgetItems/prisma.budget_items/g' "$file"
    perl -i -pe 's/prisma\.budgetParameters/prisma.budget_parameters/g' "$file"
    perl -i -pe 's/prisma\.systemUpdates/prisma.system_updates/g' "$file"
    perl -i -pe 's/prisma\.systemConfig/prisma.system_config/g' "$file"
    perl -i -pe 's/prisma\.systemBackups/prisma.system_backups/g' "$file"
    perl -i -pe 's/prisma\.rolePermissions/prisma.role_permissions/g' "$file"
    perl -i -pe 's/prisma\.userPermissions/prisma.user_permissions/g' "$file"
    perl -i -pe 's/prisma\.taskComments/prisma.task_comments/g' "$file"
    perl -i -pe 's/prisma\.taskAttachments/prisma.task_attachments/g' "$file"
    perl -i -pe 's/prisma\.taskTimeEntries/prisma.task_time_entries/g' "$file"
    perl -i -pe 's/prisma\.taskActivities/prisma.task_activities/g' "$file"
    perl -i -pe 's/prisma\.taskSubtasks/prisma.task_subtasks/g' "$file"
    perl -i -pe 's/prisma\.auditLogs/prisma.audit_logs/g' "$file"
  fi
done

echo "✅ Todos los archivos actualizados"
