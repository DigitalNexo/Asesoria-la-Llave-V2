import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllTemplates() {
  try {
    console.log('🗑️  Eliminando todas las plantillas de presupuestos...');
    
    const result = await prisma.budget_templates.deleteMany({});
    
    console.log(`✅ ${result.count} plantillas eliminadas exitosamente`);
    
  } catch (error) {
    console.error('❌ Error al eliminar plantillas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllTemplates();
