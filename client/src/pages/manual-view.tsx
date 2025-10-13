import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import type { Manual } from "@shared/schema";
import jsPDF from "jspdf";

export default function ManualView() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: manual, isLoading } = useQuery<Manual>({
    queryKey: ["/api/manuals", params.id],
  });

  const canEdit = user?.role === "ADMIN" || user?.role === "GESTOR";

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
            className="prose prose-sm max-w-none"
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
    </div>
  );
}
