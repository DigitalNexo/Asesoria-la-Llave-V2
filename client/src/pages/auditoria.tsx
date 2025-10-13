import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileTextIcon, UserIcon, ClockIcon, FilterIcon } from "lucide-react";

interface AuditEntry {
  id: string;
  usuarioId: string;
  accion: 'CREATE' | 'UPDATE' | 'DELETE';
  tabla: string;
  registroId: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  cambios: string | null;
  fecha: string;
  usuario?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

const tablaNames: Record<string, string> = {
  clients: 'Clientes',
  tasks: 'Tareas',
  client_tax: 'Impuestos',
  manuals: 'Manuales',
  users: 'Usuarios',
};

const accionColors: Record<string, 'default' | 'destructive' | 'secondary'> = {
  CREATE: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
};

const accionLabels: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
};

export default function Auditoria() {
  const [filterTable, setFilterTable] = useState<string>('all');
  
  const { data: audits = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['/api/audit', filterTable],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterTable !== 'all') {
        params.append('table', filterTable);
      }
      const response = await fetch(`/api/audit?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Error al cargar auditoría');
      return response.json();
    },
  });

  const DiffViewer = ({ anterior, nuevo }: { anterior: any, nuevo: any }) => {
    if (!anterior && !nuevo) return null;
    
    const oldData = anterior ? JSON.parse(anterior) : {};
    const newData = nuevo ? JSON.parse(nuevo) : {};
    
    return (
      <div className="mt-2 space-y-1">
        {Object.keys({ ...oldData, ...newData }).map(key => {
          if (['id', 'fechaActualizacion', 'fechaCreacion', 'created_at', 'updated_at'].includes(key)) return null;
          
          const oldValue = oldData[key];
          const newValue = newData[key];
          
          if (oldValue === newValue) return null;
          
          return (
            <div key={key} className="text-sm">
              <span className="font-medium text-muted-foreground">{key}:</span>{' '}
              {oldValue !== undefined && (
                <span className="line-through text-destructive">{String(oldValue)}</span>
              )}
              {oldValue !== undefined && newValue !== undefined && ' → '}
              {newValue !== undefined && (
                <span className="text-primary">{String(newValue)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Auditoría del Sistema</h1>
        <p className="text-muted-foreground">
          Registro completo de cambios y modificaciones
        </p>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-[200px]" data-testid="select-filter-table">
              <SelectValue placeholder="Filtrar por módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los módulos</SelectItem>
              <SelectItem value="clients">Clientes</SelectItem>
              <SelectItem value="tasks">Tareas</SelectItem>
              <SelectItem value="client_tax">Impuestos</SelectItem>
              <SelectItem value="manuals">Manuales</SelectItem>
              <SelectItem value="users">Usuarios</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : audits.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontraron registros de auditoría</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {audits.map((audit) => (
            <Card key={audit.id} data-testid={`audit-entry-${audit.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge variant={accionColors[audit.accion]}>
                        {accionLabels[audit.accion]}
                      </Badge>
                      <span>{tablaNames[audit.tabla] || audit.tabla}</span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {audit.cambios || 'Sin descripción de cambios'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      <span>{audit.usuario?.username || 'Usuario desconocido'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>
                        {format(new Date(audit.fecha), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                  
                  {(audit.valorAnterior || audit.valorNuevo) && (
                    <DiffViewer anterior={audit.valorAnterior} nuevo={audit.valorNuevo} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
