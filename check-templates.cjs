const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('🔍 Verificando plantillas en la base de datos...\n');
    
    const templates = await prisma.document_templates.findMany({
      orderBy: { created_at: 'desc' }
    });
    
    console.log(`📋 Total de plantillas encontradas: ${templates.length}\n`);
    
    if (templates.length === 0) {
      console.log('❌ No hay plantillas en la base de datos\n');
    } else {
      templates.forEach((t, idx) => {
        console.log(`${idx + 1}. ${t.name}`);
        console.log(`   Tipo: ${t.type}`);
        console.log(`   Activa: ${t.is_active ? '✅ Sí' : '❌ No'}`);
        console.log(`   Descripción: ${t.description || 'N/A'}`);
        console.log(`   Creada: ${t.created_at}`);
        console.log('');
      });
    }
    
    console.log('🔎 Verificando tipos de plantillas usados:');
    const types = [...new Set(templates.map(t => t.type))];
    types.forEach(type => {
      const count = templates.filter(t => t.type === type).length;
      console.log(`   - ${type}: ${count} plantilla(s)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
