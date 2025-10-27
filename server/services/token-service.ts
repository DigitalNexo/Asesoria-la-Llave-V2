import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SEGURIDAD: JWT_SECRET sin fallback
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET no está configurado');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Configuración de tiempos de expiración
const ACCESS_TOKEN_EXPIRY = '1h'; // Token de acceso corto: 1 hora
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // Refresh token: 30 días

export interface TokenPayload {
  id: string;
  username: string;
  roleId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos hasta expiración del access token
}

/**
 * Genera un refresh token seguro aleatorio
 */
function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Crea un par de tokens (access + refresh) para un usuario
 * @param payload Datos del usuario (id, username, roleId)
 * @param sessionInfo Información de la sesión (ip, userAgent, etc.)
 * @returns Par de tokens (access token JWT + refresh token)
 */
export async function createTokenPair(
  payload: TokenPayload,
  sessionInfo: {
    ip: string;
    userAgent: string;
    deviceType?: string;
    platform?: string;
  }
): Promise<TokenPair> {
  // Crear access token (JWT corto)
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  // Crear refresh token (aleatorio seguro)
  const refreshToken = generateRefreshToken();

  // Calcular fecha de expiración del refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  // Guardar refresh token en la base de datos (tabla sessions)
  await prisma.sessions.create({
    data: {
      id: randomUUID(),
      userId: payload.id,
      refreshToken,
      expiresAt,
      ip: sessionInfo.ip,
      user_agent: sessionInfo.userAgent,
      device_type: sessionInfo.deviceType,
      platform: sessionInfo.platform,
      last_seen_at: new Date(),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hora en segundos
  };
}

/**
 * Refresca un access token usando un refresh token válido
 * @param refreshToken Refresh token proporcionado por el cliente
 * @returns Nuevo access token o null si el refresh token es inválido
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    // Buscar sesión con este refresh token
    const session = await prisma.sessions.findUnique({
      where: { refreshToken },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            roleId: true,
            isActive: true,
          },
        },
      },
    });

    // Validaciones de seguridad
    if (!session) {
      console.warn('[SECURITY] Intento de refresh con token inexistente');
      return null;
    }

    if (!session.users.isActive) {
      console.warn('[SECURITY] Intento de refresh con usuario desactivado:', session.userId);
      await prisma.sessions.delete({ where: { id: session.id } });
      return null;
    }

    if (session.expiresAt && session.expiresAt < new Date()) {
      console.warn('[SECURITY] Refresh token expirado:', session.id);
      await prisma.sessions.delete({ where: { id: session.id } });
      return null;
    }

    if (session.ended_at) {
      console.warn('[SECURITY] Intento de usar sesión finalizada:', session.id);
      return null;
    }

    // Actualizar última actividad de la sesión
    await prisma.sessions.update({
      where: { id: session.id },
      data: { last_seen_at: new Date() },
    });

    // Generar nuevo access token
    const accessToken = jwt.sign(
      {
        id: session.users.id,
        username: session.users.username,
        roleId: session.users.roleId,
      },
      JWT_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      }
    );

    return {
      accessToken,
      expiresIn: 3600,
    };
  } catch (error) {
    console.error('[ERROR] Error al refrescar access token:', error);
    return null;
  }
}

/**
 * Revoca un refresh token (logout)
 * @param refreshToken Refresh token a revocar
 */
export async function revokeRefreshToken(refreshToken: string): Promise<boolean> {
  try {
    const session = await prisma.sessions.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      return false;
    }

    // Marcar sesión como finalizada
    await prisma.sessions.update({
      where: { id: session.id },
      data: {
        ended_at: new Date(),
        refreshToken: null, // Limpiar refresh token
      },
    });

    return true;
  } catch (error) {
    console.error('[ERROR] Error al revocar refresh token:', error);
    return false;
  }
}

/**
 * Revoca todas las sesiones de un usuario (logout global)
 * @param userId ID del usuario
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
  try {
    const result = await prisma.sessions.updateMany({
      where: {
        userId,
        ended_at: null,
      },
      data: {
        ended_at: new Date(),
        refreshToken: null,
      },
    });

    return result.count;
  } catch (error) {
    console.error('[ERROR] Error al revocar todos los tokens del usuario:', error);
    return 0;
  }
}

/**
 * Limpia refresh tokens expirados (ejecutar periódicamente)
 */
export async function cleanExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.sessions.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      console.log(`[CLEANUP] ${result.count} refresh tokens expirados eliminados`);
    }

    return result.count;
  } catch (error) {
    console.error('[ERROR] Error al limpiar tokens expirados:', error);
    return 0;
  }
}

/**
 * Valida un access token JWT
 * @param token Access token JWT
 * @returns Payload del token o null si es inválido
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
