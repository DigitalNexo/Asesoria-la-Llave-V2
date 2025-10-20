import { useParams, useLocation } from "wouter";
type ManualParams = { id?: string };
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Download, Paperclip } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { TableOfContents } from "@/components/TableOfContents";
import type { Manual, ManualAttachment } from "@shared/schema";
import jsPDF from "jspdf";

export default function ManualView() {
  const params = useParams<ManualParams>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: manual, isLoading } = useQuery<Manual>({
    queryKey: ["/api/manuals", params.id],
  });

  const { data: attachments = [] } = useQuery<ManualAttachment[]>({
    queryKey: ["/api/manuals", params.id, "attachments"],
    enabled: !!params.id,
  });

  const canEdit = user?.role === "ADMIN" || user?.role === "GESTOR";

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const exportToPDF = () => {
    if (!manual) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(manual.titulo, 20, 20);
    doc.setFontSize(12);
    const content = manual.contenidoHtml.replace(/<[^>]*>/g, "");
    const lines = doc.splitTextToSize(content, 170);
    doc.text(lines, 20, 40);
    doc.save(`${manual.titulo}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!manual) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-medium mb-2">Manual no encontrado</h3>
            <Button onClick={() => setLocation("/manuales")}>Volver a Manuales</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/manuales")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">{manual.titulo}</h1>
        </div>
        <Button variant="outline" onClick={exportToPDF} data-testid="button-export-pdf">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
        {canEdit && (
          <Button onClick={() => setLocation(`/manuales/${manual.id}/editar`)} data-testid="button-edit">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{manual.titulo}</CardTitle>
                  {manual.categoria && (
                    <p className="text-muted-foreground">{manual.categoria}</p>
                  )}
                </div>
                {manual.publicado ? (
                  <Badge variant="outline" className="text-chart-3 bg-chart-3/10">Publicado</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground bg-muted">Borrador</Badge>
                )}
              </div>
              {manual.etiquetas && manual.etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {manual.etiquetas.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none [&_.editor-table]:border-collapse [&_.editor-table]:w-full [&_.editor-table]:my-4 [&_.editor-table_th]:border-2 [&_.editor-table_th]:border-black [&_.editor-table_th]:p-2 [&_.editor-table_th]:bg-muted [&_.editor-table_th]:font-semibold [&_.editor-table_th]:text-left [&_.editor-table_td]:border-2 [&_.editor-table_td]:border-black [&_.editor-table_td]:p-2"
                dangerouslySetInnerHTML={{ __html: manual.contenidoHtml }}
              />
              <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
                Creado el {new Date(manual.fechaCreacion).toLocaleDateString()}
                {manual.fechaActualizacion !== manual.fechaCreacion && (
                  <> · Actualizado el {new Date(manual.fechaActualizacion).toLocaleDateString()}</>
                )}
              </div>
            </CardContent>
          </Card>

          {attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Adjuntos ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => window.open(attachment.filePath, '_blank')}
                      data-testid={`attachment-${attachment.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)}
                          </p>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:sticky lg:top-8 lg:h-fit">
          <TableOfContents htmlContent={manual.contenidoHtml} />
        </div>
      </div>
    </div>
  );
}
