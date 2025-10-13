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
import { FileText, Upload, Download, Eye, Clock, CheckCircle, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientTax, Client, TaxModel, TaxPeriod } from "@shared/schema";

export default function Impuestos() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedEstado, setSelectedEstado] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    taxPeriodId: "",
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
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      PENDIENTE: { color: "text-chart-4 bg-chart-4/10", icon: Clock },
      CALCULADO: { color: "text-chart-2 bg-chart-2/10", icon: Calculator },
      REALIZADO: { color: "text-chart-3 bg-chart-3/10", icon: CheckCircle },
    };
    const variant = variants[estado as keyof typeof variants] || variants.PENDIENTE;
    const Icon = variant.icon;
    return (
      <Badge variant="outline" className={variant.color}>
        <Icon className="h-3 w-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const modelStats = taxModels?.map(model => ({
    id: model.id,
    nombre: model.nombre,
    descripcion: model.descripcion,
    total: clientTaxes?.filter(t => t.taxPeriod?.modeloId === model.id).length || 0,
    pendientes: clientTaxes?.filter(t => t.taxPeriod?.modeloId === model.id && t.estado === "PENDIENTE").length || 0,
  })) || [];

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
                <Label htmlFor="notas">Notas</Label>
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {modelStats.map((model) => (
          <Card key={model.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedModel(model.id)}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelo {model.nombre}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{model.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {model.pendientes} pendientes
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-model">
            <SelectValue placeholder="Todos los modelos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los modelos</SelectItem>
            {taxModels?.map((model) => (
              <SelectItem key={model.id} value={model.id}>Modelo {model.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-estado">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="CALCULADO">Calculado</SelectItem>
            <SelectItem value="REALIZADO">Realizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Impuestos Asignados ({filteredTaxes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTaxes.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No hay impuestos asignados
            </div>
          ) : (
            <div className="divide-y">
              {filteredTaxes.map((tax) => (
                <div key={tax.id} className="p-4 hover-elevate" data-testid={`row-tax-${tax.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{tax.client?.razonSocial}</h3>
                        <Badge variant="outline">
                          Modelo {tax.taxPeriod?.taxModel?.nombre}
                        </Badge>
                        {getEstadoBadge(tax.estado)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tax.taxPeriod?.anio} {tax.taxPeriod?.trimestre ? `- Trimestre ${tax.taxPeriod.trimestre}` : tax.taxPeriod?.mes ? `- Mes ${tax.taxPeriod.mes}` : ""}
                      </p>
                      {tax.notas && (
                        <p className="text-sm text-muted-foreground mt-2">{tax.notas}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Select value={tax.estado} onValueChange={(value) => updateEstadoMutation.mutate({ id: tax.id, estado: value })}>
                        <SelectTrigger className="w-[140px]" data-testid={`select-estado-${tax.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                          <SelectItem value="CALCULADO">Calculado</SelectItem>
                          <SelectItem value="REALIZADO">Realizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" data-testid={`button-upload-${tax.id}`}>
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" data-testid={`button-view-${tax.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
