#!/bin/bash

echo "🔧 Arreglando server/jobs.ts..."

perl -i -pe 's/fechaVencimiento:/fecha_vencimiento:/g' server/jobs.ts
perl -i -pe 's/\.fechaVencimiento/.fecha_vencimiento/g' server/jobs.ts
perl -i -pe 's/cliente:/clients:/g' server/jobs.ts
perl -i -pe 's/\.cliente/.clients/g' server/jobs.ts
perl -i -pe 's/\.asignado(?!_)/.users/g' server/jobs.ts
perl -i -pe 's/\.daysToStart/.days_to_start/g' server/jobs.ts
perl -i -pe 's/\.daysToEnd/.days_to_end/g' server/jobs.ts
perl -i -pe 's/daysToStart:/days_to_start:/g' server/jobs.ts
perl -i -pe 's/daysToEnd:/days_to_end:/g' server/jobs.ts
perl -i -pe 's/endedAt:/ended_at:/g' server/jobs.ts
perl -i -pe 's/\.endedAt/.ended_at/g' server/jobs.ts

echo "✅ server/jobs.ts arreglado"
