import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
  success: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientsImportDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token disponible:', token ? 'Sí' : 'No');
      
      if (!token) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
      }

      const response = await fetch('/api/clients/import-template', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      console.log('📡 Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al descargar la plantilla');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-importacion-clientes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Plantilla descargada',
        description: 'El archivo Excel se ha descargado correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error al descargar',
        description: error?.message || 'No se pudo descargar la plantilla',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
        setResult(null);
      } else {
        toast({
          title: 'Archivo no válido',
          description: 'Por favor selecciona un archivo Excel (.xlsx o .xls)',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'Sin archivo',
        description: 'Por favor selecciona un archivo Excel',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/clients/import-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.result) {
          setResult(data.result);
        }
        throw new Error(data.error || 'Error en la importación');
      }

      setResult(data.result);

      // Refrescar lista de clientes
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });

      toast({
        title: 'Importación exitosa',
        description: `${data.result.imported} clientes nuevos, ${data.result.updated} actualizados`,
      });
    } catch (error: any) {
      toast({
        title: 'Error en la importación',
        description: error?.message || 'No se pudo importar el archivo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Clientes desde Excel
          </DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala con los datos de tus clientes y sube el archivo para importarlos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Botón de descarga de plantilla */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">1. Descargar plantilla Excel</p>
              <p className="text-sm text-muted-foreground">
                Plantilla con instrucciones y ejemplos incluidos
              </p>
            </div>
            <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>

          {/* Zona de drag & drop */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">2. Subir archivo completado</p>
              <p className="text-sm text-muted-foreground mb-4">
                Arrastra el archivo aquí o haz clic para seleccionarlo
              </p>
              <label htmlFor="file-upload">
                <Button variant="outline" type="button" className="cursor-pointer" asChild>
                  <span>Seleccionar archivo</span>
                </Button>
              </label>
            </div>

            {file && (
              <div className="mt-4 p-3 bg-primary/10 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress bar durante importación */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando clientes...</span>
                <span>Por favor espera</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          {/* Resultado de la importación */}
          {result && (
            <div className="space-y-3">
              {result.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <p className="font-medium mb-1">Importación completada exitosamente</p>
                    <ul className="text-sm space-y-1">
                      <li>✓ {result.imported} clientes nuevos importados</li>
                      <li>✓ {result.updated} clientes actualizados</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Importación con errores</p>
                    <p className="text-sm">
                      Registros importados: {result.imported + result.updated}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Lista de errores */}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Errores encontrados ({result.errors.length}):
                  </p>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-destructive/5">
                    <ul className="space-y-1 text-sm">
                      {result.errors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-destructive">•</span>
                          <span className="flex-1">{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Información adicional */}
          <Alert>
            <AlertDescription className="text-sm">
              <p className="font-medium mb-2">💡 Información importante:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Los clientes existentes (mismo NIF/CIF) serán actualizados</li>
                <li>• Los modelos fiscales se asignarán automáticamente</li>
                <li>• Los campos obligatorios deben estar completos</li>
                <li>• Revisa la hoja "Instrucciones" en la plantilla para más detalles</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar Clientes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
