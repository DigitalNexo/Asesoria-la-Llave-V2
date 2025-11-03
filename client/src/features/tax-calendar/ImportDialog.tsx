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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { importExcelFile } from "./api";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportResult {
  imported: number;
  errors: string[];
  duplicates: string[];
  success: boolean;
}

export function ImportDialog({ open, onClose, onImportSuccess }: ImportDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar que sea Excel
      const isExcel =
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.name.endsWith(".xlsx");

      if (!isExcel) {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx)",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No hay archivo",
        description: "Por favor selecciona un archivo Excel para importar",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      const importResult = await importExcelFile(file);
      setResult(importResult);

      if (importResult.success) {
        toast({
          title: "Importación exitosa",
          description: `Se importaron ${importResult.imported} periodos correctamente`,
        });
        onImportSuccess();
      } else {
        toast({
          title: "Importación con errores",
          description: "Revisa el detalle de errores a continuación",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error en la importación",
        description: error?.message || "No se pudo procesar el archivo",
        variant: "destructive",
      });
      setResult({
        imported: 0,
        errors: [error?.message || "Error desconocido"],
        duplicates: [],
        success: false,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Calendario Fiscal desde Excel</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con los periodos fiscales a importar. Descarga primero la plantilla
            para conocer el formato correcto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instrucciones */}
          <div className="rounded-md border p-4 bg-muted/50">
            <h4 className="font-semibold mb-2">Formato del archivo Excel:</h4>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>
                <strong>Hoja "Periodos"</strong> con las columnas:
              </li>
              <li className="ml-4">
                <code className="bg-background px-1 rounded">modelCode*</code> - Código del modelo
                (ej: 303, 111, 130)
              </li>
              <li className="ml-4">
                <code className="bg-background px-1 rounded">period*</code> - Periodo (ej: 1T, 2T, M01,
                ANUAL)
              </li>
              <li className="ml-4">
                <code className="bg-background px-1 rounded">year*</code> - Año (ej: 2025)
              </li>
              <li className="ml-4">
                <code className="bg-background px-1 rounded">startDate*</code> - Fecha inicio
                (DD/MM/YYYY o YYYY-MM-DD)
              </li>
              <li className="ml-4">
                <code className="bg-background px-1 rounded">endDate*</code> - Fecha fin (DD/MM/YYYY o
                YYYY-MM-DD)
              </li>
              <li className="ml-4">
                <code className="bg-background px-1 rounded">active</code> - SI o NO (por defecto: SI)
              </li>
              <li className="ml-4">
                <code className="bg-background px-1 rounded">locked</code> - SI o NO (por defecto: NO)
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Los campos marcados con <code>*</code> son obligatorios.
            </p>
          </div>

          {/* Input de archivo */}
          <div className="space-y-2">
            <label
              htmlFor="excel-file"
              className="block text-sm font-medium text-foreground"
            >
              Seleccionar archivo Excel
            </label>
            <div className="flex items-center gap-2">
              <input
                id="excel-file"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={importing}
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
              />
              {file && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
          </div>

          {/* Resultado de la importación */}
          {result && (
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <h4 className="font-semibold">
                  {result.success ? "Importación completada" : "Importación con errores"}
                </h4>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <strong>Registros importados:</strong> {result.imported}
                </p>

                {result.duplicates.length > 0 && (
                  <div>
                    <strong className="text-yellow-600">
                      Duplicados omitidos ({result.duplicates.length}):
                    </strong>
                    <ul className="ml-4 mt-1 space-y-1 max-h-32 overflow-y-auto">
                      {result.duplicates.map((dup, idx) => (
                        <li key={idx} className="text-yellow-700">
                          {dup}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div>
                    <strong className="text-destructive">
                      Errores ({result.errors.length}):
                    </strong>
                    <ul className="ml-4 mt-1 space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.map((err, idx) => (
                        <li key={idx} className="text-destructive">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {result?.success ? "Cerrar" : "Cancelar"}
          </Button>
          {!result?.success && (
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
