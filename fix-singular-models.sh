#!/bin/bash

echo "🔧 Actualizando referencias singulares y plurales de modelos..."

# Backup
cp server/prisma-storage.ts server/prisma-storage.ts.backup-singular

# Update singular model references
perl -i -pe 's/prisma\.user\b/prisma.users/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.client\b/prisma.clients/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.task\b/prisma.tasks/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.role\b/prisma.roles/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.permission\b/prisma.permissions/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.session\b/prisma.sessions/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.manual\b/prisma.manuals/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.budget\b/prisma.budgets/g' server/prisma-storage.ts

# Update camelCase singular references that should be snake_case plural
perl -i -pe 's/prisma\.clientTaxAssignment\b/prisma.client_tax_assignments/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.clientTaxFiling\b/prisma.client_tax_filings/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.fiscalPeriod\b/prisma.fiscal_periods/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taxPeriod\b/prisma.tax_periods/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.budgetItem\b/prisma.budget_items/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.budgetTemplate\b/prisma.budget_templates/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.budgetParameter\b/prisma.budget_parameters/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.rolePermission\b/prisma.role_permissions/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.userPermission\b/prisma.user_permissions/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskComment\b/prisma.task_comments/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskAttachment\b/prisma.task_attachments/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskTimeEntry\b/prisma.task_time_entries/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskActivity\b/prisma.task_activities/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.taskSubtask\b/prisma.task_subtasks/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.auditLog\b/prisma.audit_logs/g' server/prisma-storage.ts
perl -i -pe 's/prisma\.systemBackup\b/prisma.system_backups/g' server/prisma-storage.ts

echo "✅ Referencias actualizadas"
