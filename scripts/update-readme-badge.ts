#!/usr/bin/env tsx

/**
 * Script CLI para actualizar el badge de versión en README.md
 * 
 * Lee la versión desde package.json y actualiza el badge en README.md
 * 
 * Uso:
 *   tsx scripts/update-readme-badge.ts
 * 
 * La lógica principal está en server/services/readme-badge.ts
 */

import { updateReadmeBadge } from '../server/services/readme-badge.js';

// Ejecutar
updateReadmeBadge().then(result => {
  if (result.success) {
    console.log(`📦 Versión: ${result.oldVersion || 'N/A'} → ${result.newVersion || 'N/A'}`);
    console.log(`✅ ${result.message}`);
    process.exit(0);
  } else {
    console.error(`❌ ${result.message}`);
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Error al actualizar badge:', error.message);
  process.exit(1);
});
