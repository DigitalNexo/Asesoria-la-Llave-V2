import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const models = Object.keys(p).filter(k => !k.startsWith('_') && !k.startsWith('$'));
console.log(models.sort().join('\n'));
