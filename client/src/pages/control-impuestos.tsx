import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Check, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ALL_TAX_MODELS, getTaxStatusColor } from "@/lib/tax-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Tipos
interface Client {
  id: string;
  razonSocial: string;
  nifCif: string;
  tipo: "AUTONOMO" | "EMPRESA";
  taxModels: string[] | null;
}

interface TaxPeriod {
  id: string;
  modeloId: string;
  anio: number;
  trimestre: number | null;
  mes: number | null;
  inicioPresentacion: string;
  finPresentacion: string;
}

interface TaxModel {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface ClientTax {
  id: string;
  clientId: string;
  taxPeriodId: string;
  estado: string;
  notas: string | null;
  displayText: string | null;
  colorTag: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

// Modelos fiscales fijos para las columnas (sin Control)
const TAX_MODEL_COLUMNS = [
  { code: "111", name: "111" },
  { code: "115", name: "115" },
  { code: "123", name: "123" },
  { code: "130", name: "130" },
  { code: "131", name: "131" },
  { code: "202", name: "202" },
  { code: "349", name: "349" },
  { code: "303", name: "303" },
  { code: "390", name: "390" },
];

// Mapa de colores según el colorTag
const COLOR_MAP: { [key: string]: string } = {
  green: "bg-green-100 dark:bg-green-900/30",
  blue: "bg-blue-100 dark:bg-blue-900/30",
  yellow: "bg-yellow-100 dark:bg-yellow-900/30",
  gray: "bg-gray-100 dark:bg-gray-900/30",
  orange: "bg-orange-100 dark:bg-orange-900/30",
  red: "bg-red-100 dark:bg-red-900/30",
};

export default function ControlImpuestos() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedTaxIds, setSelectedTaxIds] = useState<Set<string>>(new Set());
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [bulkUpdateEstado, setBulkUpdateEstado] = useState<string>("PENDIENTE");
  const [selectedModels, setSelectedModels] = useState<string[]>(["303", "390", "130", "131"]);

  // Queries
  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: periods = [], isLoading: loadingPeriods } = useQuery<TaxPeriod[]>({
    queryKey: ["/api/tax-periods"],
  });

  const { data: models = [], isLoading: loadingModels } = useQuery<TaxModel[]>({
    queryKey: ["/api/tax-models"],
  });

  const { data: clientTaxes = [], isLoading: loadingClientTaxes } = useQuery<ClientTax[]>({
    queryKey: ["/api/client-tax"],
  });

  const isLoading = loadingClients || loadingPeriods || loadingModels || loadingClientTaxes;

  // Limpiar selección cuando cambien los filtros
  useEffect(() => {
    setSelectedTaxIds(new Set());
  }, [selectedYear, selectedQuarter]);

  // Mutación para actualizar múltiples impuestos
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { ids: string[]; estado: string }) => {
      return await apiRequest("PATCH", "/api/client-tax/bulk-update", data);
    },
    onSuccess: async () => {
      // Invalidar y refetch para forzar actualización de UI
      await queryClient.invalidateQueries({ queryKey: ["/api/client-tax"] });
      await queryClient.refetchQueries({ queryKey: ["/api/client-tax"] });
      toast({ title: "Impuestos actualizados exitosamente" });
      setSelectedTaxIds(new Set());
      setBulkUpdateDialogOpen(false);
    },
    onError: () => {
      toast({ 
        title: "Error al actualizar impuestos",
        variant: "destructive"
      });
    },
  });

  // Generar años disponibles (últimos 5 años + próximos 2)
  const availableYears = Array.from({ length: 8 }, (_, i) => currentYear - 3 + i);

  // Función para obtener el estado de un cliente en un modelo fiscal específico
  const getClientTaxStatus = (clientId: string, modelCode: string) => {
    // Buscar el periodo que coincida con año y trimestre seleccionados
    const targetPeriod = periods.find(
      (p) => {
        const model = models.find(m => m.id === p.modeloId);
        return model?.nombre === modelCode && p.anio === selectedYear && p.trimestre === selectedQuarter;
      }
    );

    if (!targetPeriod) return null;

    // Buscar el ClientTax correspondiente
    const clientTax = clientTaxes.find(
      (ct) => ct.clientId === clientId && ct.taxPeriodId === targetPeriod.id
    );

    return clientTax ?? null; // Convertir undefined a null
  };

  // Obtener columnas de modelos dinámicamente basadas en selectedModels
  const displayedModels = selectedModels.map(code => ({ 
    code, 
    name: code 
  }));

  // Obtener solo los ClientTax visibles en la tabla actual (filtrados por año y trimestre)
  const getVisibleClientTaxes = () => {
    const visibleTaxes: ClientTax[] = [];
    
    clients.forEach(client => {
      displayedModels.forEach(model => {
        const status = getClientTaxStatus(client.id, model.code);
        if (status) {
          visibleTaxes.push(status);
        }
      });
    });
    
    return visibleTaxes;
  };
  
  const visibleClientTaxes = getVisibleClientTaxes();
  const visibleTaxIds = visibleClientTaxes.map(ct => ct.id);

  // Funciones para manejar selección múltiple (solo impuestos visibles)
  const handleSelectTax = (taxId: string) => {
    setSelectedTaxIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taxId)) {
        newSet.delete(taxId);
      } else {
        newSet.add(taxId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Verificar si todos los impuestos visibles están seleccionados
    const allVisibleSelected = visibleTaxIds.every(id => selectedTaxIds.has(id));
    
    if (allVisibleSelected) {
      // Deseleccionar todos los visibles
      setSelectedTaxIds(prev => {
        const newSet = new Set(prev);
        visibleTaxIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Seleccionar todos los visibles
      setSelectedTaxIds(prev => new Set([...Array.from(prev), ...visibleTaxIds]));
    }
  };

  // Exportar a CSV
  const exportToCSV = () => {
    const filteredClients = clients.filter(c => c.taxModels && c.taxModels.length > 0);
    const headers = ["Cliente", "NIF/CIF", ...displayedModels.map((m) => m.name)];
    const rows = filteredClients.map((client) => {
      const row = [
        client.razonSocial,
        client.nifCif,
        ...displayedModels.map((model) => {
          const status = getClientTaxStatus(client.id, model.code);
          return status?.estado || "";
        }),
      ];
      return row.join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `control-impuestos-${selectedYear}-Q${selectedQuarter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">
          Control de Impuestos
        </h1>
        <div className="flex gap-2">
          {selectedTaxIds.size > 0 && (
            <Dialog open={bulkUpdateDialogOpen} onOpenChange={setBulkUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" data-testid="button-bulk-update">
                  <Check className="h-4 w-4 mr-2" />
                  Actualizar Selección ({selectedTaxIds.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Actualizar Impuestos Seleccionados</DialogTitle>
                  <DialogDescription>
                    Se actualizarán {selectedTaxIds.size} impuestos con el estado seleccionado.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nuevo Estado</Label>
                    <Select value={bulkUpdateEstado} onValueChange={setBulkUpdateEstado}>
                      <SelectTrigger data-testid="select-bulk-estado">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                        <SelectItem value="CALCULADO">Calculado</SelectItem>
                        <SelectItem value="REALIZADO">Realizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkUpdateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      bulkUpdateMutation.mutate({
                        ids: Array.from(selectedTaxIds),
                        estado: bulkUpdateEstado,
                      });
                    }}
                    disabled={bulkUpdateMutation.isPending}
                    data-testid="button-confirm-bulk-update"
                  >
                    {bulkUpdateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Actualizar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button
            variant="outline"
            onClick={exportToCSV}
            data-testid="button-export-csv"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Año</label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Periodo</label>
                <Select
                  value={selectedQuarter.toString()}
                  onValueChange={(value) => setSelectedQuarter(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 - Primer Trimestre</SelectItem>
                    <SelectItem value="2">Q2 - Segundo Trimestre</SelectItem>
                    <SelectItem value="3">Q3 - Tercer Trimestre</SelectItem>
                    <SelectItem value="4">Q4 - Cuarto Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Modelos Fiscales a Mostrar</label>
              <div className="flex flex-wrap gap-3">
                {ALL_TAX_MODELS.map((model) => (
                  <div key={model.codigo} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-model-${model.codigo}`}
                      checked={selectedModels.includes(model.codigo)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModels([...selectedModels, model.codigo]);
                        } else {
                          setSelectedModels(selectedModels.filter(m => m !== model.codigo));
                        }
                      }}
                      data-testid={`checkbox-filter-model-${model.codigo}`}
                    />
                    <Label 
                      htmlFor={`filter-model-${model.codigo}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      title={model.nombre}
                    >
                      {model.codigo}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecciona los modelos fiscales que deseas ver en la tabla
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Control */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="border px-2 py-3 text-center font-semibold w-12">
                    <Checkbox
                      checked={visibleTaxIds.length > 0 && visibleTaxIds.every(id => selectedTaxIds.has(id))}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </th>
                  <th className="border px-4 py-3 text-left font-semibold sticky left-0 bg-muted/50 z-20">
                    Cliente
                  </th>
                  {displayedModels.map((model) => (
                    <th
                      key={model.code}
                      className="border px-4 py-3 text-center font-semibold min-w-[100px]"
                    >
                      {model.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.filter(c => c.taxModels && c.taxModels.length > 0).length === 0 ? (
                  <tr>
                    <td
                      colSpan={displayedModels.length + 2}
                      className="border px-4 py-8 text-center text-muted-foreground"
                    >
                      No hay clientes con modelos fiscales asignados
                    </td>
                  </tr>
                ) : (
                  clients.filter(c => c.taxModels && c.taxModels.length > 0).map((client) => {
                    // Obtener todos los tax IDs de esta fila
                    const rowTaxIds = displayedModels
                      .map(m => getClientTaxStatus(client.id, m.code))
                      .filter(t => t !== null)
                      .map(t => t!.id);
                    
                    // Verificar si todos los impuestos de esta fila están seleccionados
                    const allRowTaxesSelected = rowTaxIds.length > 0 && rowTaxIds.every(id => selectedTaxIds.has(id));

                    return (
                      <tr
                        key={client.id}
                        data-testid={`row-client-${client.id}`}
                      >
                        <td className="border px-2 py-3 text-center bg-inherit">
                          {rowTaxIds.length > 0 && (
                            <Checkbox
                              checked={allRowTaxesSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTaxIds(prev => new Set([...Array.from(prev), ...rowTaxIds]));
                                } else {
                                  setSelectedTaxIds(prev => {
                                    const newSet = new Set(prev);
                                    rowTaxIds.forEach(id => newSet.delete(id));
                                    return newSet;
                                  });
                                }
                              }}
                              data-testid={`checkbox-row-${client.id}`}
                            />
                          )}
                        </td>
                        <td className="border px-4 py-3 sticky left-0 bg-inherit z-10">
                          <div>
                            <div className="font-medium">{client.razonSocial}</div>
                            <div className="text-sm text-muted-foreground">{client.nifCif}</div>
                          </div>
                        </td>
                        {displayedModels.map((model) => {
                          const status = getClientTaxStatus(client.id, model.code);
                          const cellColorClass = status?.estado ? getTaxStatusColor(status.estado) : "";
                          const hasModel = client.taxModels?.includes(model.code);

                          return (
                            <td
                              key={model.code}
                              className={`border px-4 py-3 text-center ${cellColorClass}`}
                              data-testid={`cell-${client.id}-${model.code}`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                {hasModel && (
                                  <span className="text-xs font-bold text-primary" title="Modelo asignado">✓</span>
                                )}
                                <span>{status?.estado || ""}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <div className="text-sm text-muted-foreground">
        Mostrando estado de impuestos para {selectedYear} - Trimestre {selectedQuarter} (
        {clients.filter(c => c.taxModels && c.taxModels.length > 0).length} clientes con modelos asignados)
      </div>
    </div>
  );
}
