/**
 * Página para editar parámetros de presupuestos
 * Permite modificar precios de PYME, AUTONOMO, RENTA, HERENCIAS
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, RefreshCw, Settings, DollarSign, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type BudgetType = 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS';

interface Parameter {
  id: string;
  category: string;
  subcategory?: string;
  key: string;
  label: string;
  value: number;
  minRange?: number | null;
  maxRange?: number | null;
  description?: string;
}

interface ParametersData {
  PYME?: Parameter[];
  AUTONOMO?: Parameter[];
  RENTA?: Parameter[];
  HERENCIAS?: Parameter[];
}

function apiRequest(method: string, url: string, data?: any) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(error.error || `Error ${res.status}`);
    }
    return res.json();
  });
}

function ParameterCard({ parameter, onUpdate }: { parameter: Parameter; onUpdate: (id: string, value: number) => void }) {
  const [value, setValue] = useState(parameter.value);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (value !== parameter.value) {
      onUpdate(parameter.id, value);
    }
    setIsEditing(false);
  };

  const getRangeLabel = () => {
    if (parameter.minRange !== null && parameter.minRange !== undefined) {
      if (parameter.maxRange === null || parameter.maxRange === 999999) {
        return `Desde ${parameter.minRange}`;
      }
      return `${parameter.minRange} - ${parameter.maxRange}`;
    }
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{parameter.label}</h4>
              {getRangeLabel() && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {getRangeLabel()}
                </Badge>
              )}
              {parameter.description && (
                <p className="text-xs text-muted-foreground mt-1">{parameter.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor={parameter.id} className="text-xs text-muted-foreground">
                Precio
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  id={parameter.id}
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => {
                    setValue(parseFloat(e.target.value) || 0);
                    setIsEditing(true);
                  }}
                  className="h-9"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
            </div>

            {isEditing && (
              <Button size="sm" onClick={handleSave} className="mt-6">
                <Save className="h-3 w-3 mr-1" />
                Guardar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ParametersTab({ type, parameters, onUpdate }: { 
  type: BudgetType; 
  parameters: Parameter[]; 
  onUpdate: (id: string, value: number) => void;
}) {
  // Agrupar por categoría
  const grouped = parameters.reduce((acc, param) => {
    const cat = param.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(param);
    return acc;
  }, {} as Record<string, Parameter[]>);

  const getCategoryIcon = (category: string) => {
    if (category.includes('BASE') || category.includes('CONTABILIDAD')) return <Settings className="h-5 w-5" />;
    if (category.includes('TRAMO') || category.includes('NOMINA')) return <TrendingUp className="h-5 w-5" />;
    return <DollarSign className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, params]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            {getCategoryIcon(category)}
            <h3 className="text-lg font-semibold">{category.replace(/_/g, ' ')}</h3>
            <Badge variant="secondary">{params.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {params.map((param) => (
              <ParameterCard key={param.id} parameter={param} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ParametrosPresupuestos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<BudgetType>('PYME');

  const { data: parameters, isLoading, error } = useQuery<ParametersData>({
    queryKey: ['/api/budget-parameters'],
    queryFn: () => apiRequest('GET', '/api/budget-parameters'),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      apiRequest('PUT', `/api/budget-parameters/${id}`, { value }),
    onSuccess: () => {
      toast({
        title: 'Actualizado',
        description: 'Parámetro actualizado correctamente',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/budget-parameters'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el parámetro',
        variant: 'destructive',
      });
    },
  });

  const handleUpdate = (id: string, value: number) => {
    updateMutation.mutate({ id, value });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/budget-parameters'] });
    toast({
      title: 'Recargando',
      description: 'Actualizando parámetros...',
    });
  };

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Error al cargar parámetros</p>
            <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BudgetType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="PYME">
              PYME
              {parameters?.PYME && <Badge variant="secondary" className="ml-2">{parameters.PYME.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="AUTONOMO">
              Autónomo
              {parameters?.AUTONOMO && <Badge variant="secondary" className="ml-2">{parameters.AUTONOMO.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="RENTA">
              Renta
              {parameters?.RENTA && <Badge variant="secondary" className="ml-2">{parameters.RENTA.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="HERENCIAS">
              Herencias
              {parameters?.HERENCIAS && <Badge variant="secondary" className="ml-2">{parameters.HERENCIAS.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="PYME" className="mt-6">
            {parameters?.PYME && (
              <ParametersTab type="PYME" parameters={parameters.PYME} onUpdate={handleUpdate} />
            )}
          </TabsContent>

          <TabsContent value="AUTONOMO" className="mt-6">
            {parameters?.AUTONOMO && (
              <ParametersTab type="AUTONOMO" parameters={parameters.AUTONOMO} onUpdate={handleUpdate} />
            )}
          </TabsContent>

          <TabsContent value="RENTA" className="mt-6">
            {parameters?.RENTA && (
              <ParametersTab type="RENTA" parameters={parameters.RENTA} onUpdate={handleUpdate} />
            )}
          </TabsContent>

          <TabsContent value="HERENCIAS" className="mt-6">
            {parameters?.HERENCIAS && (
              <ParametersTab type="HERENCIAS" parameters={parameters.HERENCIAS} onUpdate={handleUpdate} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
