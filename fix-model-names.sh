#!/bin/bash

echo "🔧 Actualizando referencias de modelos a snake_case..."

# Backup
cp server/prisma-storage.ts server/prisma-storage.ts.backup-hybrid

# Update model names in prisma-storage.ts
perl -i -pe 's/prisma\.taxModelsConfig/prisma.tax_models_config/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taxCalendar/prisma.tax_calendar/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taxPeriods/prisma.tax_periods/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.fiscalPeriods/prisma.fiscal_periods/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.clientTaxAssignments/prisma.client_tax_assignments/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.clientTaxFilings/prisma.client_tax_filings/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.budgetTemplates/prisma.budget_templates/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.budgetItems/prisma.budget_items/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.budgetParameters/prisma.budget_parameters/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.systemUpdates/prisma.system_updates/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.rolePermissions/prisma.role_permissions/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.userPermissions/prisma.user_permissions/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskComments/prisma.task_comments/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskAttachments/prisma.task_attachments/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskTimeEntries/prisma.task_time_entries/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskActivities/prisma.task_activities/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskSubtasks/prisma.task_subtasks/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.auditLogs/prisma.audit_logs/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.systemBackups/prisma.system_backups/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.systemConfig/prisma.system_config/g' server/prisma-storage.ts

echo "✅ Referencias de modelos actualizadas a snake_case"
