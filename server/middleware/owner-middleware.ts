import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware para verificar que el usuario es Owner
 * Solo el usuario creado desde .env tendrá is_owner=true
 */
export async function requireOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Obtener el usuario y verificar si es owner
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user || !user.is_owner) {
      return res.status(403).json({ 
        error: 'Acceso denegado: Solo el Owner puede acceder a este recurso',
        code: 'OWNER_ONLY'
      });
    }

    next();
  } catch (error) {
    console.error('Error en middleware requireOwner:', error);
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
}

/**
 * Middleware para verificar que el usuario es Owner o tiene un rol específico
 */
export async function requireOwnerOrRole(roleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const user = await prisma.users.findUnique({
        where: { id: userId },
        include: { roles: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }

      // Permitir si es Owner O si tiene el rol requerido
      if (user.is_owner || user.roles?.name === roleName) {
        return next();
      }

      return res.status(403).json({ 
        error: `Acceso denegado: Se requiere rol "${roleName}" o ser Owner`,
        code: 'INSUFFICIENT_PERMISSION'
      });
    } catch (error) {
      console.error('Error en middleware requireOwnerOrRole:', error);
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
}

/**
 * Retorna información del usuario actual incluyendo su estado de Owner
 */
export async function getCurrentUserInfo(userId: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        is_owner: true,
        isActive: true,
        roles: {
          select: {
            name: true,
            description: true,
          }
        }
      }
    });

    return user;
  } catch (error) {
    console.error('Error obteniendo info del usuario:', error);
    throw error;
  }
}

/**
 * Verifica si un usuario es Owner
 */
export async function isUserOwner(userId: string): Promise<boolean> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { is_owner: true }
    });

    return user?.is_owner ?? false;
  } catch (error) {
    console.error('Error verificando Owner status:', error);
    return false;
  }
}
