import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VersionInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  releaseNotes?: string;
  publishedAt?: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

/**
 * Obtiene la versión actual del sistema desde package.json
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(packageJson);
    return pkg.version || '1.0.0';
  } catch (error) {
    console.error('Error al leer package.json:', error);
    return '1.0.0';
  }
}

/**
 * Consulta la última versión disponible en GitHub
 * @param owner Propietario del repositorio (ej: "usuario")
 * @param repo Nombre del repositorio (ej: "mi-proyecto")
 * @returns Información de la última release o null si no hay
 */
export async function getLatestGitHubVersion(
  owner: string,
  repo: string
): Promise<GitHubRelease | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Asesoria-La-Llave-App'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('No se encontraron releases en GitHub');
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release: GitHubRelease = await response.json();
    
    // Filtrar releases que son draft o prerelease
    if (release.draft || release.prerelease) {
      return null;
    }

    return release;
  } catch (error) {
    console.error('Error al consultar GitHub:', error);
    return null;
  }
}

/**
 * Compara dos versiones semánticas (formato: X.Y.Z)
 * @returns 1 si v1 > v2, -1 si v1 < v2, 0 si son iguales
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Verifica si hay una actualización disponible
 * @param owner Propietario del repositorio
 * @param repo Nombre del repositorio
 */
export async function checkForUpdates(
  owner: string,
  repo: string
): Promise<VersionInfo> {
  const currentVersion = await getCurrentVersion();
  const latestRelease = await getLatestGitHubVersion(owner, repo);

  if (!latestRelease) {
    return {
      current: currentVersion,
      latest: null,
      updateAvailable: false
    };
  }

  const latestVersion = latestRelease.tag_name.replace(/^v/, '');
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;

  return {
    current: currentVersion,
    latest: latestVersion,
    updateAvailable,
    releaseNotes: latestRelease.body,
    publishedAt: latestRelease.published_at
  };
}

/**
 * Verifica el estado de salud del sistema después de una actualización
 * @returns Resultado del health check con detalles de cada verificación
 */
export async function performHealthCheck(): Promise<{
  success: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message: string;
  }[];
  timestamp: Date;
}> {
  const checks = [];
  let allPassed = true;

  // 1. Verificar que package.json es legible
  try {
    await getCurrentVersion();
    checks.push({
      name: 'Package.json',
      status: 'pass' as const,
      message: 'Archivo legible y versión disponible'
    });
  } catch (error: any) {
    allPassed = false;
    checks.push({
      name: 'Package.json',
      status: 'fail' as const,
      message: `Error: ${error.message}`
    });
  }

  // 2. Verificar que el servidor puede responder
  try {
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'http://localhost:5000'
      : 'http://localhost:5000';
    
    const response = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response && response.ok) {
      checks.push({
        name: 'API Health',
        status: 'pass' as const,
        message: 'Servidor responde correctamente'
      });
    } else {
      checks.push({
        name: 'API Health',
        status: 'fail' as const,
        message: 'Servidor no responde o endpoint de health no disponible'
      });
    }
  } catch (error: any) {
    checks.push({
      name: 'API Health',
      status: 'fail' as const,
      message: `Error al verificar servidor: ${error.message}`
    });
  }

  // 3. Verificar conectividad con base de datos (si es posible)
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$queryRaw`SELECT 1 as healthcheck`;
    await prisma.$disconnect();

    checks.push({
      name: 'Database',
      status: 'pass' as const,
      message: 'Conexión a base de datos exitosa'
    });
  } catch (error: any) {
    allPassed = false;
    checks.push({
      name: 'Database',
      status: 'fail' as const,
      message: `Error de conexión: ${error.message}`
    });
  }

  return {
    success: allPassed,
    checks,
    timestamp: new Date()
  };
}
