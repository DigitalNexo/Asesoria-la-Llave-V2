import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, Eye, Download, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import type { Manual } from "@shared/schema";
import { useLocation } from "wouter";

export default function Manuales() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: manuals, isLoading } = useQuery<Manual[]>({
    queryKey: ["/api/manuals"],
  });

  const canEdit = user?.role === "ADMIN" || user?.role === "GESTOR";

  const filteredManuals = manuals?.filter((manual) => {
    const matchesSearch = manual.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Manuales</h1>
          <p className="text-muted-foreground mt-1">Base de conocimientos y documentación interna</p>
        </div>
        {canEdit && (
          <Button onClick={() => setLocation("/manuales/nuevo")} data-testid="button-add-manual">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Manual
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar manuales..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-manuals"
        />
      </div>

      {filteredManuals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay manuales disponibles</h3>
            <p className="text-muted-foreground text-center mb-4">
              {canEdit ? "Comienza creando tu primer manual" : "Aún no se han publicado manuales"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredManuals.map((manual) => (
            <Card key={manual.id} className="hover-elevate cursor-pointer" onClick={() => setLocation(`/manuales/${manual.id}`)} data-testid={`card-manual-${manual.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <FileText className="h-8 w-8 text-primary" />
                  {manual.publicado ? (
                    <Badge variant="outline" className="text-chart-3 bg-chart-3/10">Publicado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground bg-muted">Borrador</Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{manual.titulo}</CardTitle>
                <CardDescription>
                  {manual.categoria || "Sin categoría"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {manual.etiquetas && manual.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {manual.etiquetas.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {new Date(manual.fechaCreacion).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/manuales/${manual.id}`);
                      }}
                      data-testid={`button-view-${manual.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/manuales/${manual.id}/editar`);
                        }}
                        data-testid={`button-edit-${manual.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
