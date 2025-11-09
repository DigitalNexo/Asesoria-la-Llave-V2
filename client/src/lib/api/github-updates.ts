import { apiRequest } from '../queryClient';

export interface GitHubUpdate {
  id: string;
  update_type: 'VERSION' | 'GITHUB';
  commit_hash: string | null;
  commit_message: string | null;
  commit_author: string | null;
  commit_date: string | null;
  branch: string | null;
  auto_applied: boolean;
  status: 'CHECKING' | 'BACKING_UP' | 'DOWNLOADING' | 'INSTALLING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK' | 'PENDING' | 'APPLYING';
  logs: string | null;
  error_message: string | null;
  initiated_by: string | null;
  createdAt: string;
  completed_at: string | null;
  users?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface GitHubConfig {
  id: string;
  githubRepo: string;
  githubBranch: string;
  autoUpdateEnabled: boolean;
  lastCheckedAt: string | null;
  currentCommitHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentCommit {
  commitHash: string;
  branch: string;
}

// Listar actualizaciones de GitHub
export async function listGitHubUpdates(): Promise<GitHubUpdate[]> {
  return apiRequest('GET', '/api/system/github/updates');
}

// Obtener configuración de GitHub
export async function getGitHubConfig(): Promise<GitHubConfig> {
  return apiRequest('GET', '/api/system/github/config');
}

// Actualizar configuración de GitHub
export async function updateGitHubConfig(data: Partial<{
  githubRepo: string;
  githubBranch: string;
  autoUpdateEnabled: boolean;
  githubToken: string;
  githubWebhookSecret: string;
}>): Promise<GitHubConfig> {
  return apiRequest('PUT', '/api/system/github/config', data);
}

// Aplicar una actualización manualmente
export async function applyGitHubUpdate(updateId: string): Promise<{ message: string; updateId: string }> {
  return apiRequest('POST', `/api/system/github/updates/${updateId}/apply`);
}

// Obtener logs de una actualización
export async function getUpdateLogs(updateId: string): Promise<{
  id: string;
  commit_hash: string | null;
  commit_message: string | null;
  status: string;
  logs: string | null;
  error_message: string | null;
  createdAt: string;
  completed_at: string | null;
}> {
  return apiRequest('GET', `/api/system/github/updates/${updateId}/logs`);
}

// Obtener commit actual del servidor
export async function getCurrentCommit(): Promise<CurrentCommit> {
  return apiRequest('GET', '/api/system/github/current-commit');
}
