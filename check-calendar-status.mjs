import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const entries = await prisma.tax_calendar.findMany({
    where: { 
      modelCode: { in: ['349', '303'] },
      year: 2025
    },
    orderBy: [{ modelCode: 'asc' }, { period: 'asc' }],
    select: { modelCode: true, period: true, status: true }
  });
  
  console.log('\n=== Estado del tax_calendar ===');
  entries.forEach(e => {
    console.log(`  ${e.modelCode.padEnd(4)} - ${e.period.padEnd(6)}: ${e.status}`);
  });
  console.log('');
} catch (error) {
  console.error('Error:', error);
} finally {
  await prisma.$disconnect();
}
