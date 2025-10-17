import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Download, Eye, Clock, CheckCircle, Calculator, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientTax, Client, TaxModel, TaxPeriod } from "@shared/schema";

export default function Impuestos() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedEstado, setSelectedEstado] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isYearDialogOpen, setIsYearDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [formData, setFormData] = useState({
    clientId: "",
    taxPeriodId: "",
    estado: "PENDIENTE",
    notas: "",
    displayText: "",
    colorTag: "",
  });
  
  // Nuevo formulario para asignar estados
  const [quickAssignForm, setQuickAssignForm] = useState({
    clientId: "",
    modelId: "",
    year: new Date().getFullYear(),
    trimestre: 1,
    displayText: "",
    colorTag: "",
    estado: "PENDIENTE",
    notas: "",
  });

  const { data: clientTaxes, isLoading } = useQuery<(ClientTax & { client?: Client; taxPeriod?: TaxPeriod & { taxModel?: TaxModel } })[]>({
    queryKey: ["/api/client-tax"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: taxPeriods } = useQuery<(TaxPeriod & { taxModel?: TaxModel })[]>({
    queryKey: ["/api/tax-periods"],
  });

  const { data: taxModels } = useQuery<TaxModel[]>({
    queryKey: ["/api/tax-models"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/client-tax", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-tax"] });
      toast({ title: "Impuesto asignado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      return await apiRequest("PATCH", `/api/client-tax/${id}`, { estado });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-tax"] });
      toast({ title: "Estado actualizado exitosamente" });
    },
  });
  
  const createYearMutation = useMutation({
    mutationFn: async (year: number) => {
      return await apiRequest("POST", "/api/tax-periods/create-year", { year });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-periods"] });
      toast({ title: `Año fiscal ${data.year || selectedYear} creado exitosamente`, description: `Se crearon ${data.created} periodos tributarios` });
      setIsYearDialogOpen(false);
    },
  });
  
  const quickAssignMutation = useMutation({
    mutationFn: async (data: typeof quickAssignForm) => {
      // Encontrar el periodo correspondiente
      const period = taxPeriods?.find(p => 
        p.modeloId === data.modelId && 
        p.anio === data.year && 
        p.trimestre === data.trimestre
      );
      
      if (!period) {
        throw new Error("No se encontró el periodo tributario");
      }
      
      // Buscar si ya existe un ClientTax
      const existing = clientTaxes?.find(ct => 
        ct.clientId === data.clientId && ct.taxPeriodId === period.id
      );
      
      if (existing) {
        // Actualizar
        return await apiRequest("PATCH", `/api/client-tax/${existing.id}`, {
          displayText: data.displayText,
          colorTag: data.colorTag,
          estado: data.estado,
          notas: data.notas,
        });
      } else {
        // Crear
        return await apiRequest("POST", "/api/client-tax", {
          clientId: data.clientId,
          taxPeriodId: period.id,
          displayText: data.displayText,
          colorTag: data.colorTag === "none" ? "" : data.colorTag,
          estado: data.estado,
          notas: data.notas,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-tax"] });
      toast({ title: "Estado asignado exitosamente" });
      resetQuickAssignForm();
    },
  });

  const filteredTaxes = clientTaxes?.filter((tax) => {
    const matchesModel = selectedModel === "all" || tax.taxPeriod?.modeloId === selectedModel;
    const matchesEstado = selectedEstado === "all" || tax.estado === selectedEstado;
    return matchesModel && matchesEstado;
  }) || [];

  const resetForm = () => {
    setFormData({
      clientId: "",
      taxPeriodId: "",
      estado: "PENDIENTE",
      notas: "",
      displayText: "",
      colorTag: "",
    });
  };
  
  const resetQuickAssignForm = () => {
    setQuickAssignForm({
      clientId: "",
      modelId: "",
      year: new Date().getFullYear(),
      trimestre: 1,
      displayText: "",
      colorTag: "",
      estado: "PENDIENTE",
      notas: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };
  
  const handleQuickAssign = (e: React.FormEvent) => {
    e.preventDefault();
    quickAssignMutation.mutate(quickAssignForm);
  };
  
  const handleCreateYear = () => {
    const year = parseInt(selectedYear);
    if (year) {
      createYearMutation.mutate(year);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Impuestos</h1>
          <p className="text-muted-foreground mt-1">Gestión de modelos fiscales y periodos tributarios</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isYearDialogOpen} onOpenChange={setIsYearDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-create-year">
                <Calendar className="h-4 w-4 mr-2" />
                Crear Año Fiscal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Año Fiscal Completo</DialogTitle>
                <DialogDescription>
                  Genera automáticamente todos los periodos tributarios (4 trimestres) para todos los modelos fiscales del año seleccionado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Año Fiscal</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger data-testid="select-year-create">
                      <SelectValue placeholder="Selecciona un año" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsYearDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateYear} disabled={createYearMutation.isPending} data-testid="button-confirm-create-year">
                  {createYearMutation.isPending ? "Creando..." : "Crear Año"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} data-testid="button-add-tax">
                <FileText className="h-4 w-4 mr-2" />
                Asignar Impuesto
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Impuesto a Cliente</DialogTitle>
              <DialogDescription>
                Selecciona el cliente y el periodo tributario
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.razonSocial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Periodo Tributario *</Label>
                <Select value={formData.taxPeriodId} onValueChange={(value) => setFormData({ ...formData, taxPeriodId: value })}>
                  <SelectTrigger data-testid="select-period">
                    <SelectValue placeholder="Selecciona un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxPeriods?.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.taxModel?.nombre} - {period.anio} {period.trimestre ? `T${period.trimestre}` : period.mes ? `M${period.mes}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayText">Texto Visual (ej: "x", "x (No)")</Label>
                <Input
                  id="displayText"
                  value={formData.displayText}
                  onChange={(e) => setFormData({ ...formData, displayText: e.target.value })}
                  placeholder="Texto a mostrar en la tabla..."
                  data-testid="input-display-text"
                />
                <p className="text-xs text-muted-foreground">
                  Este texto se mostrará en la tabla de Control de Impuestos
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="colorTag">Color de Celda (opcional)</Label>
                <Select value={formData.colorTag} onValueChange={(value) => setFormData({ ...formData, colorTag: value === "none" ? "" : value })}>
                  <SelectTrigger data-testid="select-color-tag">
                    <SelectValue placeholder="Selecciona un color (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin color</SelectItem>
                    <SelectItem value="green">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border"></div>
                        Verde
                      </div>
                    </SelectItem>
                    <SelectItem value="blue">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30 border"></div>
                        Azul
                      </div>
                    </SelectItem>
                    <SelectItem value="yellow">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border"></div>
                        Amarillo
                      </div>
                    </SelectItem>
                    <SelectItem value="gray">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-900/30 border"></div>
                        Gris
                      </div>
                    </SelectItem>
                    <SelectItem value="orange">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/30 border"></div>
                        Naranja
                      </div>
                    </SelectItem>
                    <SelectItem value="red">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border"></div>
                        Rojo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas Internas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  data-testid="textarea-notas"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-submit-tax">
                  Asignar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asignar Estado a Cliente</CardTitle>
          <p className="text-sm text-muted-foreground">Selecciona cliente, modelo, periodo y estado para actualizar la tabla de control</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickAssign} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select 
                  value={quickAssignForm.clientId} 
                  onValueChange={(value) => setQuickAssignForm({ ...quickAssignForm, clientId: value })}
                >
                  <SelectTrigger data-testid="select-quick-client">
                    <SelectValue placeholder="Selecciona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.razonSocial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Modelo Fiscal</Label>
                <Select 
                  value={quickAssignForm.modelId} 
                  onValueChange={(value) => setQuickAssignForm({ ...quickAssignForm, modelId: value })}
                >
                  <SelectTrigger data-testid="select-quick-model">
                    <SelectValue placeholder="Selecciona modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxModels?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>{model.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Año</Label>
                <Select 
                  value={quickAssignForm.year.toString()} 
                  onValueChange={(value) => setQuickAssignForm({ ...quickAssignForm, year: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-quick-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Trimestre</Label>
                <Select 
                  value={quickAssignForm.trimestre.toString()} 
                  onValueChange={(value) => setQuickAssignForm({ ...quickAssignForm, trimestre: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-quick-quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">T1 - Primer Trimestre</SelectItem>
                    <SelectItem value="2">T2 - Segundo Trimestre</SelectItem>
                    <SelectItem value="3">T3 - Tercer Trimestre</SelectItem>
                    <SelectItem value="4">T4 - Cuarto Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Texto Visual</Label>
                <Input
                  value={quickAssignForm.displayText}
                  onChange={(e) => setQuickAssignForm({ ...quickAssignForm, displayText: e.target.value })}
                  placeholder="x, ✓, -"
                  data-testid="input-quick-display"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Color</Label>
                <Select 
                  value={quickAssignForm.colorTag || "none"} 
                  onValueChange={(value) => setQuickAssignForm({ ...quickAssignForm, colorTag: value === "none" ? "" : value })}
                >
                  <SelectTrigger data-testid="select-quick-color">
                    <SelectValue placeholder="Sin color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin color</SelectItem>
                    <SelectItem value="green">Verde</SelectItem>
                    <SelectItem value="blue">Azul</SelectItem>
                    <SelectItem value="yellow">Amarillo</SelectItem>
                    <SelectItem value="gray">Gris</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  value={quickAssignForm.estado} 
                  onValueChange={(value) => setQuickAssignForm({ ...quickAssignForm, estado: value })}
                >
                  <SelectTrigger data-testid="select-quick-estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="CALCULADO">Calculado</SelectItem>
                    <SelectItem value="REALIZADO">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!quickAssignForm.clientId || !quickAssignForm.modelId || quickAssignMutation.isPending}
                  data-testid="button-quick-assign"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {quickAssignMutation.isPending ? "Guardando..." : "Asignar Estado"}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={quickAssignForm.notas}
                onChange={(e) => setQuickAssignForm({ ...quickAssignForm, notas: e.target.value })}
                placeholder="Observaciones adicionales..."
                data-testid="textarea-quick-notas"
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
