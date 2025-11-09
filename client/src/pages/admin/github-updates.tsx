import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  GitBranch, 
  RefreshCw, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Code2,
  Play,
  Eye
} from 'lucide-react';
import { 
  getGitHubConfig, 
  updateGitHubConfig, 
  listGitHubUpdates, 
  applyGitHubUpdate,
  getCurrentCommit,
  type GitHubUpdate,
  type GitHubConfig 
} from '@/lib/api/github-updates';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function GitHubUpdatesPage() {
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [updates, setUpdates] = useState<GitHubUpdate[]>([]);
  const [currentCommit, setCurrentCommit] = useState<{ commitHash: string; branch: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<GitHubUpdate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    githubRepo: '',
    githubBranch: 'main',
    autoUpdateEnabled: false,
    githubToken: '',
    githubWebhookSecret: ''
  });

  useEffect(() => {
    loadData();
    // Recargar cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [configData, updatesData, commitData] = await Promise.all([
        getGitHubConfig(),
        listGitHubUpdates(),
        getCurrentCommit()
      ]);
      
      setConfig(configData);
      setUpdates(updatesData);
      setCurrentCommit(commitData);
      
      setFormData({
        githubRepo: configData.githubRepo,
        githubBranch: configData.githubBranch,
        autoUpdateEnabled: configData.autoUpdateEnabled,
        githubToken: '',
        githubWebhookSecret: ''
      });
    } catch (error) {
      console.error('Error loading GitHub data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const dataToSend: any = {
        githubRepo: formData.githubRepo,
        githubBranch: formData.githubBranch,
        autoUpdateEnabled: formData.autoUpdateEnabled
      };
      
      // Solo enviar token/secret si se han modificado
      if (formData.githubToken) {
        dataToSend.githubToken = formData.githubToken;
      }
      if (formData.githubWebhookSecret) {
        dataToSend.githubWebhookSecret = formData.githubWebhookSecret;
      }

      const updatedConfig = await updateGitHubConfig(dataToSend);
      setConfig(updatedConfig);
      
      // Limpiar campos sensibles
      setFormData(prev => ({
        ...prev,
        githubToken: '',
        githubWebhookSecret: ''
      }));
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyUpdate = async (updateId: string) => {
    if (!confirm('¿Estás seguro de aplicar esta actualización? La aplicación se reiniciará.')) {
      return;
    }

    setApplyingUpdate(updateId);
    try {
      await applyGitHubUpdate(updateId);
      alert('Actualización iniciada. Recarga la página en unos segundos.');
      setTimeout(loadData, 3000);
    } catch (error) {
      console.error('Error applying update:', error);
      alert('Error al aplicar la actualización');
    } finally {
      setApplyingUpdate(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any, text: string }> = {
      PENDING: { variant: 'outline', icon: Clock, text: 'Pendiente' },
      APPLYING: { variant: 'default', icon: RefreshCw, text: 'Aplicando...' },
      COMPLETED: { variant: 'secondary', icon: CheckCircle, text: 'Completada' },
      FAILED: { variant: 'destructive', icon: XCircle, text: 'Fallida' },
      CHECKING: { variant: 'outline', icon: RefreshCw, text: 'Verificando' },
      DOWNLOADING: { variant: 'default', icon: Download, text: 'Descargando' },
      INSTALLING: { variant: 'default', icon: RefreshCw, text: 'Instalando' },
      ROLLED_BACK: { variant: 'destructive', icon: AlertTriangle, text: 'Revertida' }
    };

    const config = statusMap[status] || { variant: 'outline' as const, icon: Clock, text: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Actualizaciones desde GitHub</h1>
        <p className="text-muted-foreground">
          Configura el sistema de actualizaciones automáticas desde tu repositorio de GitHub
        </p>
      </div>

      {/* Estado actual */}
      {currentCommit && (
        <Alert>
          <Code2 className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold">Commit actual del servidor:</div>
            <div className="font-mono text-sm mt-1">
              {currentCommit.commitHash.substring(0, 7)} en rama <code>{currentCommit.branch}</code>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Configuración de GitHub
          </CardTitle>
          <CardDescription>
            Configura el repositorio y las opciones de actualización automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="githubRepo">Repositorio (owner/repo)</Label>
              <Input
                id="githubRepo"
                placeholder="DigitalNexo/Asesoria-la-Llave-V2"
                value={formData.githubRepo}
                onChange={(e) => setFormData(prev => ({ ...prev, githubRepo: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Ejemplo: DigitalNexo/Asesoria-la-Llave-V2
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubBranch">Rama</Label>
              <Input
                id="githubBranch"
                placeholder="main"
                value={formData.githubBranch}
                onChange={(e) => setFormData(prev => ({ ...prev, githubBranch: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="githubToken">GitHub Personal Access Token</Label>
              <Input
                id="githubToken"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxx (opcional)"
                value={formData.githubToken}
                onChange={(e) => setFormData(prev => ({ ...prev, githubToken: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Necesario solo para repositorios privados
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubWebhookSecret">Webhook Secret</Label>
              <Input
                id="githubWebhookSecret"
                type="password"
                placeholder="Tu secret para validar webhooks"
                value={formData.githubWebhookSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, githubWebhookSecret: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Para validar las peticiones del webhook
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="autoUpdate"
              checked={formData.autoUpdateEnabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoUpdateEnabled: checked }))}
            />
            <Label htmlFor="autoUpdate" className="cursor-pointer">
              Aplicar actualizaciones automáticamente
            </Label>
          </div>

          <Button onClick={handleSaveConfig} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Configuración'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* URL del Webhook */}
      {config && config.githubRepo && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Webhook en GitHub</CardTitle>
            <CardDescription>
              Copia esta URL y añádela como webhook en tu repositorio de GitHub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Payload URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`https://digitalnexo.es/api/system/github/webhook`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://digitalnexo.es/api/system/github/webhook`);
                    alert('URL copiada al portapapeles');
                  }}
                >
                  Copiar
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Content type: <code className="bg-muted px-1 py-0.5 rounded">application/json</code></p>
                <p>Evento: <code className="bg-muted px-1 py-0.5 rounded">push</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de actualizaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Actualizaciones Disponibles</span>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </CardTitle>
          <CardDescription>
            Historial de commits recibidos desde GitHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Download className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay actualizaciones disponibles</p>
              <p className="text-sm">Los commits se detectarán automáticamente cuando hagas push a GitHub</p>
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {update.commit_hash?.substring(0, 7)}
                        </code>
                        {getStatusBadge(update.status)}
                        {update.auto_applied && (
                          <Badge variant="outline" className="text-xs">Auto</Badge>
                        )}
                      </div>
                      <p className="font-medium">{update.commit_message}</p>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span>{update.commit_author}</span>
                        {' · '}
                        <span>{new Date(update.commit_date!).toLocaleString('es-ES')}</span>
                        {update.branch && (
                          <>
                            {' · '}
                            <span className="font-mono">{update.branch}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(update.status === 'PENDING' || update.status === 'FAILED') && (
                        <Button
                          size="sm"
                          onClick={() => handleApplyUpdate(update.id)}
                          disabled={applyingUpdate === update.id}
                        >
                          {applyingUpdate === update.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Aplicar
                            </>
                          )}
                        </Button>
                      )}
                      {update.logs && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLogs(update)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Logs
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de logs */}
      <Dialog open={!!selectedLogs} onOpenChange={() => setSelectedLogs(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Logs de Actualización
              {selectedLogs && (
                <code className="ml-2 text-sm font-mono">
                  {selectedLogs.commit_hash?.substring(0, 7)}
                </code>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedLogs?.commit_message}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap">
              {selectedLogs?.logs || 'Sin logs disponibles'}
            </pre>
            {selectedLogs?.error_message && (
              <div className="mt-4">
                <div className="font-semibold text-red-600 mb-2">Error:</div>
                <pre className="bg-red-50 border border-red-200 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap text-red-800">
                  {selectedLogs.error_message}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
