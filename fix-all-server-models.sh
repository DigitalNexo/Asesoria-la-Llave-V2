#!/bin/bash

echo "🔧 Actualizando TODAS las referencias de modelos en server/..."

# Find all TypeScript files in server/ and update them
find server -name "*.ts" -type f | while read -r file; do
  echo "  📝 Procesando $file..."
  
  # Backup
  cp "$file" "$file.backup-hybrid-final"
  
  # Update singular model references to plural
  perl -i -pe 's/prisma\.user\b/prisma.users/g' "$file"
  perl -i -pe 's/prisma\.client\b/prisma.clients/g' "$file"
  perl -i -pe 's/prisma\.task\b/prisma.tasks/g' "$file"
  perl -i -pe 's/prisma\.role\b/prisma.roles/g' "$file"
  perl -i -pe 's/prisma\.permission\b/prisma.permissions/g' "$file"
  perl -i -pe 's/prisma\.session\b/prisma.sessions/g' "$file"
  perl -i -pe 's/prisma\.manual\b/prisma.manuals/g' "$file"
  perl -i -pe 's/prisma\.budget\b/prisma.budgets/g' "$file"
  
  # Update camelCase singular references that should be snake_case plural
  perl -i -pe 's/prisma\.clientTaxAssignment\b/prisma.client_tax_assignments/g' "$file"
  perl -i -pe 's/prisma\.clientTaxFiling\b/prisma.client_tax_filings/g' "$file"
  perl -i -pe 's/prisma\.fiscalPeriod\b/prisma.fiscal_periods/g' "$file"
  perl -i -pe 's/prisma\.taxPeriod\b/prisma.tax_periods/g' "$file"
  perl -i -pe 's/prisma\.budgetItem\b/prisma.budget_items/g' "$file"
  perl -i -pe 's/prisma\.budgetTemplate\b/prisma.budget_templates/g' "$file"
  perl -i -pe 's/prisma\.budgetParameter\b/prisma.budget_parameters/g' "$file"
  perl -i -pe 's/prisma\.rolePermission\b/prisma.role_permissions/g' "$file"
  perl -i -pe 's/prisma\.userPermission\b/prisma.user_permissions/g' "$file"
  perl -i -pe 's/prisma\.taskComment\b/prisma.task_comments/g' "$file"
  perl -i -pe 's/prisma\.taskAttachment\b/prisma.task_attachments/g' "$file"
  perl -i -pe 's/prisma\.taskTimeEntry\b/prisma.task_time_entries/g' "$file"
  perl -i -pe 's/prisma\.taskActivity\b/prisma.task_activities/g' "$file"
  perl -i -pe 's/prisma\.taskSubtask\b/prisma.task_subtasks/g' "$file"
  perl -i -pe 's/prisma\.auditLog\b/prisma.audit_logs/g' "$file"
  perl -i -pe 's/prisma\.systemBackup\b/prisma.system_backups/g' "$file"
done

echo "✅ Todos los archivos de server/ actualizados"
