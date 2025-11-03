/**
 * Singleton de PrismaClient para evitar múltiples instancias
 * Este archivo debe ser usado en TODOS los lugares que necesiten acceso a Prisma
 */
import { PrismaClient } from '@prisma/client';

// Configuración optimizada de Prisma con connection pooling
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Tipo global para el singleton
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Usar una instancia global en desarrollo para evitar hot-reload issues
// En producción, crear una sola instancia
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Configurar el connection pool para mejor rendimiento
prisma.$connect().catch((err) => {
  console.error('Error conectando a la base de datos:', err);
  process.exit(1);
});

// Manejar cierre limpio
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
