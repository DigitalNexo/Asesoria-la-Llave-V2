import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

console.log('🔧 Eliminando todos los @updatedAt del schema...\n');

let content = fs.readFileSync(schemaPath, 'utf-8');

// Reemplazar todos los @updatedAt con @default(now())
// Mantener el tipo DateTime (sin ?) porque MariaDB maneja los defaults
content = content.replace(
  /@updatedAt/g,
  '@default(now())'
);

// Escribir el archivo actualizado
fs.writeFileSync(schemaPath, content, 'utf-8');

console.log('✅ Schema actualizado');
console.log('📊 Verificando...\n');

// Verificar que no quede ningún @updatedAt
const verification = fs.readFileSync(schemaPath, 'utf-8');
const remaining = (verification.match(/@updatedAt/g) || []).length;

if (remaining === 0) {
  console.log('✅ ÉXITO: 0 @updatedAt encontrados en el schema');
  console.log('\n🔄 Siguiente paso: npx prisma generate');
} else {
  console.log(`⚠️  Aún quedan ${remaining} @updatedAt en el schema`);
  process.exit(1);
}
