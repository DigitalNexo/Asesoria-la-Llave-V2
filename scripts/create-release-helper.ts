#!/usr/bin/env tsx

/**
 * Script asistente para crear releases de GitHub
 * 
 * Ayuda a los desarrolladores a:
 * 1. Incrementar la versión en package.json
 * 2. Generar changelog
 * 3. Crear commit y tag
 * 4. Mostrar instrucciones para publicar release en GitHub
 * 
 * Uso:
 *   tsx scripts/create-release-helper.ts
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function print(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

interface VersionParts {
  major: number;
  minor: number;
  patch: number;
}

function parseVersion(version: string): VersionParts {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Versión inválida: ${version}`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  };
}

function incrementVersion(current: string, type: 'major' | 'minor' | 'patch'): string {
  const parts = parseVersion(current);
  
  if (type === 'major') {
    return `${parts.major + 1}.0.0`;
  } else if (type === 'minor') {
    return `${parts.major}.${parts.minor + 1}.0`;
  } else {
    return `${parts.major}.${parts.minor}.${parts.patch + 1}`;
  }
}

async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execAsync('git branch --show-current');
  return stdout.trim();
}

async function hasUncommittedChanges(): Promise<boolean> {
  const { stdout } = await execAsync('git status --porcelain');
  return stdout.trim().length > 0;
}

async function getGitRemoteUrl(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git remote get-url origin');
    return stdout.trim();
  } catch {
    return null;
  }
}

function extractGitHubInfo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/\.]+)/);
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2]
  };
}

async function main() {
  print('\n🚀 Asistente de Creación de Releases\n', 'bright');
  print('═'.repeat(50), 'cyan');
  
  const rl = createInterface();
  
  try {
    // 1. Verificar que estamos en un repositorio Git
    try {
      await execAsync('git status');
    } catch {
      print('\n❌ Error: Este directorio no es un repositorio Git', 'red');
      process.exit(1);
    }
    
    // 2. Verificar rama actual
    const currentBranch = await getCurrentBranch();
    print(`\n📌 Rama actual: ${currentBranch}`, 'blue');
    
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      print(`⚠️  Advertencia: No estás en 'main' o 'master'`, 'yellow');
      const continueAnyway = await question(rl, '¿Continuar de todos modos? (s/N): ');
      if (continueAnyway.toLowerCase() !== 's') {
        print('\n❌ Operación cancelada', 'red');
        process.exit(0);
      }
    }
    
    // 3. Verificar cambios sin commit
    if (await hasUncommittedChanges()) {
      print('\n⚠️  Tienes cambios sin commit:', 'yellow');
      const { stdout } = await execAsync('git status --short');
      console.log(stdout);
      
      const continueAnyway = await question(rl, '¿Continuar de todos modos? (s/N): ');
      if (continueAnyway.toLowerCase() !== 's') {
        print('\n💡 Sugerencia: Haz commit de tus cambios primero:', 'cyan');
        print('   git add .', 'cyan');
        print('   git commit -m "tu mensaje"', 'cyan');
        process.exit(0);
      }
    }
    
    // 4. Leer versión actual
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version || '1.0.0';
    
    print(`\n📦 Versión actual: ${currentVersion}`, 'green');
    
    // 5. Preguntar tipo de incremento
    print('\n¿Qué tipo de cambio es?', 'bright');
    print('  1. 🐛 Patch   - Correcciones de bugs     (X.Y.Z → X.Y.Z+1)', 'cyan');
    print('  2. ✨ Minor   - Nuevas funcionalidades   (X.Y.Z → X.Y+1.0)', 'cyan');
    print('  3. 💥 Major   - Cambios incompatibles    (X.Y.Z → X+1.0.0)', 'cyan');
    
    const choice = await question(rl, '\nSelecciona (1/2/3): ');
    
    let versionType: 'major' | 'minor' | 'patch';
    if (choice === '1') versionType = 'patch';
    else if (choice === '2') versionType = 'minor';
    else if (choice === '3') versionType = 'major';
    else {
      print('\n❌ Opción inválida', 'red');
      process.exit(1);
    }
    
    const newVersion = incrementVersion(currentVersion, versionType);
    print(`\n✅ Nueva versión: ${newVersion}`, 'green');
    
    // 6. Confirmar
    const confirm = await question(rl, '\n¿Continuar con esta versión? (S/n): ');
    if (confirm.toLowerCase() === 'n') {
      print('\n❌ Operación cancelada', 'red');
      process.exit(0);
    }
    
    // 7. Actualizar package.json
    print('\n📝 Actualizando package.json...', 'blue');
    packageJson.version = newVersion;
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
    print('✅ package.json actualizado', 'green');
    
    // 8. Generar plantilla de changelog
    print('\n📋 Plantilla de changelog:', 'bright');
    print('═'.repeat(50), 'cyan');
    
    const changelogTemplate = `## 🎉 Versión ${newVersion}

### ✨ Novedades
- [ ] Agrega aquí las nuevas funcionalidades

### 🐛 Correcciones
- [ ] Agrega aquí las correcciones de bugs

### 📚 Documentación
- [ ] Agrega aquí cambios en documentación

### ⚠️  Breaking Changes
- [ ] Si hay cambios incompatibles, descríbelos aquí
`;
    
    console.log(changelogTemplate);
    print('═'.repeat(50), 'cyan');
    
    // 9. Crear commit
    print('\n📌 Creando commit...', 'blue');
    try {
      await execAsync('git add package.json');
      await execAsync(`git commit -m "chore: bump version to ${newVersion}"`);
      print('✅ Commit creado', 'green');
    } catch (error: any) {
      print(`\n⚠️  Error al crear commit: ${error.message}`, 'yellow');
      print('💡 Puedes crearlo manualmente:', 'cyan');
      print(`   git add package.json`, 'cyan');
      print(`   git commit -m "chore: bump version to ${newVersion}"`, 'cyan');
    }
    
    // 10. Crear tag
    print('\n🏷️  Creando tag...', 'blue');
    try {
      await execAsync(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
      print('✅ Tag creado: v' + newVersion, 'green');
    } catch (error: any) {
      print(`\n⚠️  Error al crear tag: ${error.message}`, 'yellow');
      print('💡 Puedes crearlo manualmente:', 'cyan');
      print(`   git tag -a v${newVersion} -m "Release v${newVersion}"`, 'cyan');
    }
    
    // 11. Instrucciones finales
    print('\n═'.repeat(50), 'cyan');
    print('\n🎯 PRÓXIMOS PASOS:', 'bright');
    print('═'.repeat(50), 'cyan');
    
    print('\n1️⃣  Haz push del commit y tag a GitHub:', 'bright');
    print(`   git push origin ${currentBranch}`, 'cyan');
    print(`   git push origin v${newVersion}`, 'cyan');
    
    const remoteUrl = await getGitRemoteUrl();
    if (remoteUrl) {
      const githubInfo = extractGitHubInfo(remoteUrl);
      if (githubInfo) {
        print('\n2️⃣  Crea la release en GitHub:', 'bright');
        const releaseUrl = `https://github.com/${githubInfo.owner}/${githubInfo.repo}/releases/new?tag=v${newVersion}`;
        print(`   ${releaseUrl}`, 'cyan');
        
        print('\n3️⃣  Completa el formulario de release:', 'bright');
        print(`   • Tag: v${newVersion} (ya creado)`, 'cyan');
        print(`   • Title: Versión ${newVersion}`, 'cyan');
        print('   • Description: Copia el changelog de arriba', 'cyan');
        print('   • Click "Publish release"', 'cyan');
      }
    }
    
    print('\n4️⃣  Los administradores podrán actualizar desde:', 'bright');
    print('   Panel Admin → Actualizaciones → Verificar actualizaciones', 'cyan');
    
    print('\n═'.repeat(50), 'cyan');
    print('\n✅ ¡Listo! Release preparada exitosamente\n', 'green');
    
  } catch (error: any) {
    print(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Ejecutar
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
