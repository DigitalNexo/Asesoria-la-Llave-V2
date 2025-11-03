import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, X, AlertCircle } from "lucide-react";

interface FilingPresentedDialogProps {
  open: boolean;
  filingData: {
    filingId: string;
    clientId: string;
    clientName: string;
    taxModelCode: string;
    periodId: string;
    periodLabel: string;
    year: number;
  } | null;
  onConfirm: (presentedAt: string, documents: File[]) => Promise<void>;
  onCancel: () => void;
}

export function FilingPresentedDialog({
  open,
  filingData,
  onConfirm,
  onCancel,
}: FilingPresentedDialogProps) {
  const { toast } = useToast();
  const [presentedAt, setPresentedAt] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ date?: string; files?: string }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validar que sean solo PDFs
    const invalidFiles = files.filter((f) => f.type !== "application/pdf");
    if (invalidFiles.length > 0) {
      toast({
        title: "Archivos inválidos",
        description: "Solo se permiten archivos PDF",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 10MB por archivo)
    const oversizedFiles = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Archivos muy grandes",
        description: "El tamaño máximo por archivo es 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    setErrors((prev) => ({ ...prev, files: undefined }));
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: { date?: string; files?: string } = {};

    // Validar fecha
    if (!presentedAt) {
      newErrors.date = "La fecha de presentación es obligatoria";
    } else {
      const selectedDate = new Date(presentedAt);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (selectedDate > today) {
        newErrors.date = "La fecha de presentación no puede ser futura";
      }
    }

    // NO validar archivos - ya no son obligatorios

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(presentedAt, selectedFiles);

      // Limpiar estado
      setPresentedAt(new Date().toISOString().split("T")[0]);
      setSelectedFiles([]);
      setErrors({});
    } catch (error: any) {
      toast({
        title: "Error al presentar",
        description: error?.message || "No se pudo completar la presentación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Limpiar estado
    setPresentedAt(new Date().toISOString().split("T")[0]);
    setSelectedFiles([]);
    setErrors({});
    onCancel();
  };

  if (!filingData) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isSubmitting && handleCancel()}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Marcar como Presentado</DialogTitle>
          <DialogDescription>
            Complete la información de presentación del modelo fiscal. Todos los campos son
            obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información del modelo */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{filingData.clientName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <p className="font-medium">{filingData.taxModelCode}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Periodo:</span>
                <p className="font-medium">{filingData.periodLabel}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Año:</span>
                <p className="font-medium">{filingData.year}</p>
              </div>
            </div>
          </div>

          {/* Fecha de presentación */}
          <div className="space-y-2">
            <label htmlFor="presented-date" className="text-sm font-medium">
              Fecha de presentación *
            </label>
            <Input
              id="presented-date"
              type="date"
              value={presentedAt}
              onChange={(e) => {
                setPresentedAt(e.target.value);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              max={new Date().toISOString().split("T")[0]}
              className={errors.date ? "border-destructive" : ""}
            />
            {errors.date && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.date}
              </p>
            )}
          </div>

          {/* Adjuntar documentos */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Documentos de presentación (opcional)</label>
            <p className="text-xs text-muted-foreground">
              Adjunte los justificantes de presentación si ya los tiene disponibles (solo archivos PDF, máximo 10MB cada uno). Podrá añadirlos más tarde si aún no los tiene.
            </p>

            <div className="space-y-3">
              {/* Botón de selección */}
              <div>
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar archivos PDF
                </Button>
              </div>

              {/* Lista de archivos seleccionados */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        disabled={isSubmitting}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {selectedFiles.length === 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Sin documentos adjuntos. Podrá añadirlos más tarde desde la tarjeta.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : selectedFiles.length === 0 ? (
              "Presentar sin documentos"
            ) : (
              `Presentar con ${selectedFiles.length} documento(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
