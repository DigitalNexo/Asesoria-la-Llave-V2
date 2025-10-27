#!/bin/bash

echo "🔧 Arreglando modelos en prisma/seed.ts..."

# prisma.user → prisma.users
perl -i -pe 's/prisma\.user\b/prisma.users/g' prisma/seed.ts

# prisma.client → prisma.clients
perl -i -pe 's/prisma\.client\b/prisma.clients/g' prisma/seed.ts

# prisma.taxModel → prisma.tax_models
perl -i -pe 's/prisma\.taxModel/prisma.tax_models/g' prisma/seed.ts

# prisma.taxPeriod → prisma.tax_periods
perl -i -pe 's/prisma\.taxPeriod/prisma.tax_periods/g' prisma/seed.ts

# prisma.clientTax → prisma.client_tax
perl -i -pe 's/prisma\.clientTax\b/prisma.client_tax/g' prisma/seed.ts

# prisma.task → prisma.tasks  
perl -i -pe 's/prisma\.task\b/prisma.tasks/g' prisma/seed.ts

# prisma.manual → prisma.manuals
perl -i -pe 's/prisma\.manual\b/prisma.manuals/g' prisma/seed.ts

echo "✅ Modelos en seed.ts arreglados"
