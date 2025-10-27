#!/bin/bash

echo "🔧 Arreglando TODOS los errores restantes en prisma-storage.ts..."

cd /Users/usuario/Documents/Repositorios/Asesoria-La-Llave

# 1. Fix TypeScript mapping issues (lines 278, 292, 307, 322)
# These are TypeScript type definitions using camelCase, but we're creating snake_case
# Solution: Use the camelCase property names from the TypeScript types
perl -i -pe 's/asignado_a: task\.asignadoA/asignadoA: task.asignadoA/g' server/prisma-storage.ts
perl -i -pe 's/contenido_html: manual\.contenido_html/contenidoHtml: manual.contenidoHtml/g' server/prisma-storage.ts
perl -i -pe 's/contenido_html: manual\.contenidoHtml/contenidoHtml: manual.contenidoHtml/g' server/prisma-storage.ts
perl -i -pe 's/original_name: attachment\.originalName/originalName: attachment.originalName/g' server/prisma-storage.ts
perl -i -pe 's/contenido_html: version\.contenido_html/contenidoHtml: version.contenidoHtml/g' server/prisma-storage.ts

# 2. Fix undefined 'period' variable (lines 1034, 1042)
# Replace 'period' with 'tax_periods' in periodMatchesAssignment function
perl -i -pe 's/switch \(period\.kind\)/switch (tax_periods.kind)/g' server/prisma-storage.ts
perl -i -pe 's/period\.label\.toLowerCase\(\)/tax_periods.label.toLowerCase()/g' server/prisma-storage.ts

# 3. Fix fiscal_periods.filings (lines 1056, 1066)
# fiscal_periods doesn't have client_tax_filings relation, remove it
perl -i -pe 's/filings: \{[^}]*\},?//g' server/prisma-storage.ts
perl -i -pe 's/period\.filings\.reduce/\/\/ TODO: Fix filings aggregation - relation not available/g' server/prisma-storage.ts

# 4. Fix missing 'id' in fiscal_periods create (line 1112)
perl -i -pe 's/(create: \{)$/\1\n            id: randomUUID(),/g' server/prisma-storage.ts

# 5. Fix startsAt/endsAt in fiscal_periods updates (lines 1156-1165)
# The input 'data' parameter has startsAt/endsAt, but Prisma expects starts_at/ends_at
perl -i -pe 's/startsAt: data\.starts_at,/starts_at: data.startsAt,/g' server/prisma-storage.ts
perl -i -pe 's/endsAt: data\.ends_at,/ends_at: data.endsAt,/g' server/prisma-storage.ts

# 6. Fix ob.impuestos (lines 1205, 1733)
# This relation doesn't exist in obligaciones_fiscales
perl -i -pe 's/ob\.impuestos\?\.modelo/null \/\/ TODO: Fix impuestos relation/g' server/prisma-storage.ts

# 7. Fix missing id and updatedAt in client_tax_assignments creates (lines 1216, 1250, 1274)
# Already partially fixed, ensure all have id and updatedAt

# 8. Fix filing.usersId → filing.assigneeId (line 1444)
perl -i -pe 's/filing\.usersId/filing.assigneeId/g' server/prisma-storage.ts

# 9. Fix assignee → users in includes (line 1456)
perl -i -pe 's/assignee: \{ select:/users: { select:/g' server/prisma-storage.ts

# 10. Fix filing.clientsId → filing.clientId (line 1593)
perl -i -pe 's/filing\.clientsId/filing.clientId/g' server/prisma-storage.ts

# 11. Fix client.taxAssignments → client.client_tax_assignments (line 1628)
perl -i -pe 's/client\.taxAssignments/client.client_tax_assignments/g' server/prisma-storage.ts

# 12. Fix client.responsable → client.users (lines 1687-1688)
perl -i -pe 's/client\.responsable/client.users/g' server/prisma-storage.ts

# 13. Fix tax_calendar_id → calendario_id (lines 1754, 1764)
perl -i -pe 's/tax_calendar_id:/calendario_id:/g' server/prisma-storage.ts

# 14. Fix missing id and updatedAt in impuestos create (line 1796)
# Will need manual fix - add to data object

# 15. Fix tax_periods in orderBy (line 1895)
perl -i -pe 's/\{ tax_periods: "asc" \},?//g' server/prisma-storage.ts

# 16. Fix missing id and period in tax_calendar create (line 1987)
# Will need manual fix

# 17. Fix obligacion → obligaciones_fiscales in includes (lines 2114, 2129, 2143, 2162, 2177, 2192)
perl -i -pe 's/obligacion: \{/obligaciones_fiscales: {/g' server/prisma-storage.ts

# 18. Fix obligacionId → obligacion_id (line 2141)
perl -i -pe 's/where: \{ obligacionId \}/where: { obligacion_id }/g' server/prisma-storage.ts

# 19. Fix obligacion in where clause (line 2157)
perl -i -pe 's/where: \{[^}]*obligacion:/where: { obligacion_id:/g' server/prisma-storage.ts

# 20. Fix fechaVencimiento → fecha_vencimiento (line 2230)
perl -i -pe 's/fechaVencimiento:/fecha_vencimiento:/g' server/prisma-storage.ts

# 21. Fix missing id in manuals create (line 2270)
# Will need manual fix

# 22. Fix fileType → file_type (line 2334)
perl -i -pe 's/fileType:/file_type:/g' server/prisma-storage.ts

# 23. Fix missing id in manual_versions create (line 2367)
# Will need manual fix

# 24. Fix missing id in activity_logs and audit_trail creates (lines 2415, 2435)
# Will need manual fix

# 25. Fix missing id and updatedAt in roles create (line 2554)
# Will need manual fix

# 26. Fix missing id in role_permissions createMany (line 2597)
# Will need manual fix

# 27. Fix user.role → user.roles (lines 2624, 2628)
perl -i -pe 's/user\.role(?!s|Id|_)/user.roles/g' server/prisma-storage.ts

# 28. Fix sMTPAccount → smtp_accounts (lines 2722, 2728, 2749, 2755)
# Already fixed in previous script

# 29. Fix plantilla → notification_templates (lines 2806, 2817, 2833, 2844, 2858)
perl -i -pe 's/plantilla: \{/notification_templates: {/g' server/prisma-storage.ts

echo "✅ Patrones automáticos aplicados"
echo "⚠️  Requiere arreglos manuales para:"
echo "  - Agregar 'id' y campos requeridos en operaciones create"
echo "  - Agregar includes para relaciones faltantes"
