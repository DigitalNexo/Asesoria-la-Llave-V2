import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  History,
  Info,
  Loader2,
  ExternalLink,
  Trash2,
  Upload,
} from "lucide-react";

interface FilingDocument {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

interface FilingHistory {
  status: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

interface FilingDetailsDialogProps {
  open: boolean;
  filingData: {
    id: string;
    clientId: string;
    clientName: string;
    taxModelCode: string;
    periodLabel: string;
    year: number;
    status: string;
    presentedAt?: string;
    notes?: string;
  } | null;
  onClose: () => void;
}

export function FilingDetailsDialog({
  open,
  filingData,
  onClose,
}: FilingDetailsDialogProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<FilingDocument[]>([]);
  const [history, setHistory] = useState<FilingHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && filingData) {
      loadFilingDetails();
    }
  }, [open, filingData]);

  const loadFilingDetails = async () => {
    if (!filingData) return;

    setLoading(true);
    try {
      // Cargar documentos asociados al filing
      const docsRes = await fetch(
        `/api/documents?clientId=${filingData.clientId}&type=tax_filing_document`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        }
      );

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        // Filtrar documentos que pertenecen a este filing específico
        const filingDocs = docsData.filter((doc: any) => {
          try {
            const metadata = JSON.parse(doc.description || "{}");
            return metadata.filingId === filingData.id;
          } catch {
            return false;
          }
        });

        setDocuments(
          filingDocs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            fileName: doc.file_name || "documento.pdf",
            fileSize: doc.file_size || 0,
            createdAt: doc.created_at,
          }))
        );
      }

      // Parsear historial desde notes
      if (filingData.notes) {
        try {
          const notesData = JSON.parse(filingData.notes);
          if (notesData.history && Array.isArray(notesData.history)) {
            setHistory(notesData.history);
          }
        } catch {
          // Si notes no es JSON, no hay historial
          setHistory([]);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (docId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Error al descargar");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Descarga iniciada",
        description: `Descargando ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive",
      });
    }
  };

  const downloadAllDocuments = async () => {
    // Descargar todos los documentos uno por uno
    for (const doc of documents) {
      await downloadDocument(doc.id, doc.fileName);
      // Pequeña pausa entre descargas
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este documento?")) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
      });

      if (!res.ok) throw new Error("Error al eliminar");

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado correctamente",
      });

      // Recargar documentos
      await loadFilingDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const uploadNewDocuments = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (files.length === 0) return;

      setLoading(true);
      try {
        // Metadata para los documentos
        const metadata = {
          filingId: filingData.id,
          clientId: filingData.clientId,
          taxModelCode: filingData.taxModelCode,
          periodId: filingData.periodId,
          periodLabel: filingData.periodLabel || "",
          year: new Date().getFullYear(),
          filingStatus: filingData.status,
          linkedAt: new Date().toISOString(),
        };

        for (const file of files) {
          // Crear documento
          const createRes = await fetch("/api/documents", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            credentials: "include",
            body: JSON.stringify({
              name: file.name,
              file_name: file.name,
              type: "tax_filing_document",
              description: JSON.stringify(metadata),
              clientId: filingData.clientId,
              category: "TAX_FILING",
            }),
          });

          if (!createRes.ok) throw new Error(`Error al crear documento: ${file.name}`);

          const doc = await createRes.json();

          // Subir archivo
          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await fetch(`/api/documents/${doc.id}/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            credentials: "include",
            body: formData,
          });

          if (!uploadRes.ok) throw new Error(`Error al subir archivo: ${file.name}`);
        }

        toast({
          title: "Documentos subidos",
          description: `${files.length} documento(s) subido(s) correctamente`,
        });

        // Recargar documentos
        await loadFilingDetails();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudieron subir los documentos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    input.click();
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      NOT_STARTED: "PENDIENTE",
      IN_PROGRESS: "CALCULADO",
      PRESENTED: "PRESENTADO",
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      NOT_STARTED: "bg-red-100 text-red-700",
      IN_PROGRESS: "bg-amber-100 text-amber-700",
      PRESENTED: "bg-green-100 text-green-700",
    };

    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-700"}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!filingData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Presentación Fiscal</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">
                <Info className="h-4 w-4 mr-2" />
                Información
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documentos ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Historial
              </TabsTrigger>
            </TabsList>

            {/* Tab de Información */}
            <TabsContent value="info" className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{filingData.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo</p>
                    <p className="font-medium">{filingData.taxModelCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Periodo</p>
                    <p className="font-medium">{filingData.periodLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Año</p>
                    <p className="font-medium">{filingData.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estado actual</p>
                    <div className="mt-1">{getStatusBadge(filingData.status)}</div>
                  </div>
                  {filingData.presentedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de presentación</p>
                      <p className="font-medium">
                        {new Date(filingData.presentedAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">Resumen</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>📄 {documents.length} documento(s) adjunto(s)</p>
                  <p>📅 {history.length} cambio(s) de estado registrado(s)</p>
                  {filingData.presentedAt && (
                    <p>✅ Presentado hace {Math.floor((Date.now() - new Date(filingData.presentedAt).getTime()) / (1000 * 60 * 60 * 24))} día(s)</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab de Documentos */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={uploadNewDocuments}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir documentos
                </Button>
                {documents.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAllDocuments}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar todos
                  </Button>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay documentos adjuntos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-10 w-10 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.fileName} • {formatFileSize(doc.fileSize)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Subido el {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadDocument(doc.id, doc.fileName)}
                          title="Descargar documento"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDocument(doc.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab de Historial */}
            <TabsContent value="history" className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay historial de cambios disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                    >
                      <div className="mt-1">{getStatusBadge(entry.status)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Cambio a {getStatusLabel(entry.status)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.timestamp)}
                        </p>
                        {entry.userName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            por {entry.userName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
