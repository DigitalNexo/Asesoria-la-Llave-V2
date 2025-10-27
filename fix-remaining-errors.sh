#!/bin/bash

echo "🔧 Fixing remaining TypeScript errors in prisma-storage.ts and jobs.ts..."

# Fix filing.period → Need to access via include
# This requires manual fixes for relation includes

# Fix descriptor property names: starts_at/ends_at → startsAt/endsAt
perl -i -pe 's/descriptor\.starts_at/descriptor.startsAt/g' server/prisma-storage.ts
perl -i -pe 's/descriptor\.ends_at/descriptor.endsAt/g' server/prisma-storage.ts

# Fix closedBy → closed_by in fiscal_periods updates
perl -i -pe 's/closedBy:/closed_by:/g' server/prisma-storage.ts

# Fix endsAt → ends_at in select
perl -i -pe 's/select:.*endsAt:/select: { ends_at:/g' server/prisma-storage.ts

# Fix period → periodId in where clauses
perl -i -pe 's/where:.*period:/where: { periodId:/g' server/prisma-storage.ts

# Fix cliente → clients in includes
perl -i -pe 's/include:.*\{.*cliente:/include: { clients:/g' server/prisma-storage.ts

# Fix fechaFin → fecha_fin in where clauses
perl -i -pe 's/fechaFin:/fecha_fin:/g' server/prisma-storage.ts

# Fix obligacionId → obligacion_id
perl -i -pe 's/obligacionId:/obligacion_id:/g' server/prisma-storage.ts

# Fix obligacion → obligaciones_fiscales in includes
perl -i -pe 's/include:.*\{.*obligacion:/include: { obligaciones_fiscales:/g' server/prisma-storage.ts

# Fix fechaPresentacion → fecha_presentacion in orderBy
perl -i -pe 's/fechaPresentacion:/fecha_presentacion:/g' server/prisma-storage.ts

# Fix fechaAsignacion → fecha_asignacion in orderBy
perl -i -pe 's/fechaAsignacion:/fecha_asignacion:/g' server/prisma-storage.ts

# Fix obligacion → obligacion_id in where
perl -i -pe 's/where:.*\{.*obligacion:/where: { obligacion_id:/g' server/prisma-storage.ts

# Fix asignadoA → asignado_a
perl -i -pe 's/asignadoA:/asignado_a:/g' server/prisma-storage.ts

# Fix fechaPublicacion → fecha_publicacion
perl -i -pe 's/fechaPublicacion:/fecha_publicacion:/g' server/prisma-storage.ts

# Fix originalName → original_name
perl -i -pe 's/originalName:/original_name:/g' server/prisma-storage.ts

# Fix uploadedAt → uploaded_at in orderBy
perl -i -pe 's/uploadedAt:/uploaded_at:/g' server/prisma-storage.ts

# Fix contenidoHtml → contenido_html
perl -i -pe 's/contenidoHtml:/contenido_html:/g' server/prisma-storage.ts

# Fix isPredeterminada → is_predeterminada
perl -i -pe 's/isPredeterminada:/is_predeterminada:/g' server/prisma-storage.ts

# Fix isSystem → is_system
perl -i -pe 's/isSystem:/is_system:/g' server/prisma-storage.ts

# Fix sMTPAccount → smtp_accounts
perl -i -pe 's/prisma\.sMTPAccount/prisma.smtp_accounts/g' server/prisma-storage.ts

# Fix fechaCreacion → fecha_creacion in orderBy
perl -i -pe 's/fechaCreacion:/fecha_creacion:/g' server/prisma-storage.ts

# Fix creador → users in includes
perl -i -pe 's/include:.*\{.*creador:/include: { users:/g' server/prisma-storage.ts

# Fix plantilla → notification_templates in includes
perl -i -pe 's/include:.*\{.*plantilla:/include: { notification_templates:/g' server/prisma-storage.ts

# Fix fechaEnvio → fecha_envio in orderBy
perl -i -pe 's/fechaEnvio:/fecha_envio:/g' server/prisma-storage.ts

# Fix fechaProgramada → fecha_programada
perl -i -pe 's/fechaProgramada:/fecha_programada:/g' server/prisma-storage.ts

# Fix property access: days_to_start → daysToStart, days_to_end → daysToEnd
perl -i -pe 's/\.days_to_start/.daysToStart/g' server/prisma-storage.ts
perl -i -pe 's/\.days_to_end/.daysToEnd/g' server/prisma-storage.ts

# Fix property access: registrationEnabled → registration_enabled
perl -i -pe 's/\.registrationEnabled/.registration_enabled/g' server/prisma-storage.ts

# Fix jobs.ts errors
# Fix asignado → users in includes
perl -i -pe 's/include:.*\{.*asignado:/include: { users:/g' server/jobs.ts

# Fix lastSeenAt → last_seen_at
perl -i -pe 's/lastSeenAt:/last_seen_at:/g' server/jobs.ts

# Fix property access in jobs.ts
perl -i -pe 's/\.days_to_start/.daysToStart/g' server/jobs.ts
perl -i -pe 's/\.days_to_end/.daysToEnd/g' server/jobs.ts

echo "✅ Basic pattern fixes applied"
echo "⚠️  Manual fixes still needed for:"
echo "  - Relation includes (filing.period requires include: { fiscal_periods: true })"
echo "  - Missing 'id' fields in create operations"
echo "  - Property access on non-included relations"
