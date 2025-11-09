import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

const router = express.Router();
const prisma = new PrismaClient();

// Verificar firma de GitHub webhook
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Webhook receiver desde GitHub
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;

    // Solo procesamos eventos de push
    if (event !== 'push') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    // Obtener configuración
    const config = await prisma.system_update_config.findFirst();
    
    if (!config) {
      console.error('No GitHub config found');
      return res.status(500).json({ error: 'Configuration not found' });
    }

    // Verificar firma si hay secret configurado
    if (config.githubWebhookSecret && signature) {
      const payload = JSON.stringify(req.body);
      const isValid = verifyGitHubSignature(payload, signature, config.githubWebhookSecret);
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { commits, ref, repository, pusher } = req.body;

    // Solo procesamos la rama configurada
    const branch = ref.replace('refs/heads/', '');
    if (branch !== config.githubBranch) {
      console.log(`Ignoring push to branch ${branch}, configured branch is ${config.githubBranch}`);
      return res.status(200).json({ message: 'Branch ignored' });
    }

    // Obtener el último commit
    const lastCommit = commits[commits.length - 1];
    
    if (!lastCommit) {
      return res.status(400).json({ error: 'No commits found' });
    }

    const commitHash = lastCommit.id;
    const commitMessage = lastCommit.message;
    const commitAuthor = lastCommit.author?.name || pusher?.name || 'Unknown';
    const commitDate = new Date(lastCommit.timestamp);

    console.log(`Received GitHub webhook for commit ${commitHash.substring(0, 7)}: ${commitMessage}`);

    // Verificar si ya existe este commit
    const existingUpdate = await prisma.system_updates.findFirst({
      where: { commit_hash: commitHash }
    });

    if (existingUpdate) {
      console.log(`Update for commit ${commitHash.substring(0, 7)} already exists`);
      return res.status(200).json({ message: 'Update already exists', updateId: existingUpdate.id });
    }

    // Crear registro de actualización
    const update = await prisma.system_updates.create({
      data: {
        id: uuidv4(),
        update_type: 'GITHUB',
        commit_hash: commitHash,
        commit_message: commitMessage,
        commit_author: commitAuthor,
        commit_date: commitDate,
        branch: branch,
        status: 'PENDING',
        auto_applied: false,
        logs: `Commit recibido desde GitHub:\nAutor: ${commitAuthor}\nFecha: ${commitDate.toISOString()}\nMensaje: ${commitMessage}\n\n`,
      }
    });

    console.log(`Created update record ${update.id} for commit ${commitHash.substring(0, 7)}`);

    // Si auto-update está activado, aplicar inmediatamente
    if (config.autoUpdateEnabled) {
      console.log('Auto-update enabled, triggering update...');
      
      // Importar y ejecutar en segundo plano
      const { executeGitUpdate } = await import('../services/git-update.service');
      executeGitUpdate(update.id).catch(err => {
        console.error('Error executing auto-update:', err);
      });

      return res.status(200).json({ 
        message: 'Update received and auto-apply triggered', 
        updateId: update.id,
        autoApplied: true 
      });
    }

    return res.status(200).json({ 
      message: 'Update received', 
      updateId: update.id,
      autoApplied: false 
    });

  } catch (error: any) {
    console.error('Error processing GitHub webhook:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Listar actualizaciones de GitHub
router.get('/updates', async (req: Request, res: Response) => {
  try {
    const updates = await prisma.system_updates.findMany({
      where: { update_type: 'GITHUB' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return res.json(updates);
  } catch (error: any) {
    console.error('Error fetching GitHub updates:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Aplicar una actualización manualmente
router.post('/updates/:id/apply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const update = await prisma.system_updates.findUnique({
      where: { id }
    });

    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    if (update.status !== 'PENDING' && update.status !== 'FAILED') {
      return res.status(400).json({ error: `Cannot apply update with status ${update.status}` });
    }

    // Actualizar initiated_by
    await prisma.system_updates.update({
      where: { id },
      data: { 
        initiated_by: userId,
        status: 'APPLYING'
      }
    });

    // Ejecutar en segundo plano
    const { executeGitUpdate } = await import('../services/git-update.service');
    executeGitUpdate(id).catch(err => {
      console.error('Error executing update:', err);
    });

    return res.json({ message: 'Update started', updateId: id });

  } catch (error: any) {
    console.error('Error applying update:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Obtener logs de una actualización
router.get('/updates/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const update = await prisma.system_updates.findUnique({
      where: { id },
      select: {
        id: true,
        commit_hash: true,
        commit_message: true,
        status: true,
        logs: true,
        error_message: true,
        createdAt: true,
        completed_at: true
      }
    });

    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    return res.json(update);
  } catch (error: any) {
    console.error('Error fetching update logs:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Obtener configuración de GitHub
router.get('/config', async (req: Request, res: Response) => {
  try {
    let config = await prisma.system_update_config.findFirst();

    if (!config) {
      // Crear configuración por defecto
      config = await prisma.system_update_config.create({
        data: {
          id: uuidv4(),
          githubRepo: '',
          githubBranch: 'main',
          autoUpdateEnabled: false
        }
      });
    }

    // No enviar el token ni el secret al frontend
    const { githubToken, githubWebhookSecret, ...safeConfig } = config;

    return res.json(safeConfig);
  } catch (error: any) {
    console.error('Error fetching GitHub config:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Actualizar configuración de GitHub
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { githubRepo, githubBranch, autoUpdateEnabled, githubToken, githubWebhookSecret } = req.body;

    let config = await prisma.system_update_config.findFirst();

    const data: any = {};
    
    if (githubRepo !== undefined) data.githubRepo = githubRepo;
    if (githubBranch !== undefined) data.githubBranch = githubBranch;
    if (autoUpdateEnabled !== undefined) data.autoUpdateEnabled = autoUpdateEnabled;
    if (githubToken !== undefined) data.githubToken = githubToken;
    if (githubWebhookSecret !== undefined) data.githubWebhookSecret = githubWebhookSecret;

    if (config) {
      config = await prisma.system_update_config.update({
        where: { id: config.id },
        data
      });
    } else {
      config = await prisma.system_update_config.create({
        data: {
          id: uuidv4(),
          githubRepo: githubRepo || '',
          githubBranch: githubBranch || 'main',
          autoUpdateEnabled: autoUpdateEnabled || false,
          githubToken: githubToken || null,
          githubWebhookSecret: githubWebhookSecret || null
        }
      });
    }

    // No enviar el token ni el secret al frontend
    const { githubToken: _, githubWebhookSecret: __, ...safeConfig } = config;

    return res.json(safeConfig);
  } catch (error: any) {
    console.error('Error updating GitHub config:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Obtener el hash del commit actual
router.get('/current-commit', async (req: Request, res: Response) => {
  try {
    const currentCommit = execSync('git rev-parse HEAD', { 
      encoding: 'utf-8',
      cwd: '/root/www/Asesoria-la-Llave-V2'
    }).trim();

    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
      encoding: 'utf-8',
      cwd: '/root/www/Asesoria-la-Llave-V2'
    }).trim();

    return res.json({ 
      commitHash: currentCommit,
      branch: currentBranch
    });
  } catch (error: any) {
    console.error('Error getting current commit:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
