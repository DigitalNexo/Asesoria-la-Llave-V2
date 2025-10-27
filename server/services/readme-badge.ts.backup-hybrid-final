import { promises as fs } from 'fs';
import path from 'path';

export interface BadgeResult {
  success: boolean;
  oldVersion?: string | null;
  newVersion?: string | null;
  message: string;
}

/**
 * Actualiza el badge de versión en README.md a partir de package.json
 */
export async function updateReadmeBadge(): Promise<BadgeResult> {
  try {
    const root = path.resolve(__dirname, '../../');

    const pkgPath = path.join(root, 'package.json');
    const readmePath = path.join(root, 'README.md');

    const pkgRaw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    const newVersion = String(pkg.version || '').trim();

    if (!newVersion) {
      return { success: false, message: 'No se pudo leer la versión desde package.json' };
    }

    const readmeRaw = await fs.readFile(readmePath, 'utf8');

    // Buscar badge de versión en el README. Ejemplo:
    // ![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
    const badgeRegex = /(\!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-)([0-9A-Za-z.\-+]+)(-blue\.svg\))/i;

    const match = readmeRaw.match(badgeRegex);
    if (!match) {
      return { success: false, newVersion, message: 'No se encontró badge de versión en README.md' };
    }

    const oldVersion = match[2];
    if (oldVersion === newVersion) {
      return { success: true, oldVersion, newVersion, message: 'Badge ya está actualizado' };
    }

    const replaced = readmeRaw.replace(badgeRegex, `$1${newVersion}$3`);
    await fs.writeFile(readmePath, replaced, 'utf8');

    return { success: true, oldVersion, newVersion, message: 'Badge actualizado correctamente' };
  } catch (error: any) {
    return { success: false, message: `Error actualizando badge: ${error?.message || String(error)}` };
  }
}

export default updateReadmeBadge;
