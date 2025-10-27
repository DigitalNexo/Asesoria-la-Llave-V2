import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addClientNif() {
  try {
    console.log('Añadiendo columna client_nif...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE budgets ADD COLUMN client_nif VARCHAR(50) AFTER clientName
    `);
    console.log('✅ Columna client_nif añadida correctamente');
  } catch (error: any) {
    if (error.message.includes('Duplicate column')) {
      console.log('⚠️  La columna client_nif ya existe');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addClientNif();
