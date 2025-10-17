import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Edit, Trash2, Building2, User, FileText, CheckCircle2, XCircle, UserCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { User as UserType } from "@shared/schema";
import { getAvailableTaxModelsForClientType, ALL_TAX_MODELS } from "@/lib/tax-helpers";

// Tipo Client compatible con Prisma (incluye taxModels, isActive y employees)
interface ClientEmployee {
  userId: string;
  isPrimary: boolean;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface Client {
  id: string;
  razonSocial: string;
  nifCif: string;
  tipo: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  fechaAlta: Date;
  responsableAsignado: string | null;
  taxModels?: string[];
  isActive?: boolean;
  employees?: ClientEmployee[];
}
import Papa from "papaparse";

export default function Clientes() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [primaryEmployeeId, setPrimaryEmployeeId] = useState<string>("");
  const [formData, setFormData] = useState({
    razonSocial: "",
    nifCif: "",
    tipo: "autonomo",
    email: "",
    telefono: "",
    direccion: "",
    responsableAsignado: "",
    taxModels: [] as string[],
    isActive: true,
  });

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Cliente creado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await apiRequest("PATCH", `/api/clients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Cliente actualizado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/clients/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Cliente eliminado exitosamente" });
    },
  });

  const toggleClientActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/clients/${id}/toggle-active`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Estado del cliente actualizado" });
    },
    onError: () => {
      toast({ title: "Error al cambiar el estado del cliente", variant: "destructive" });
    },
  });

  const filteredClients = clients?.filter((client) => {
    const matchesSearch = client.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nifCif.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === "todos" || client.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  }) || [];

  const resetForm = () => {
    setFormData({
      razonSocial: "",
      nifCif: "",
      tipo: "autonomo",
      email: "",
      telefono: "",
      direccion: "",
      responsableAsignado: "",
      taxModels: [],
      isActive: true,
    });
    setSelectedEmployees([]);
    setPrimaryEmployeeId("");
    setEditingClient(null);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      razonSocial: client.razonSocial,
      nifCif: client.nifCif,
      tipo: client.tipo,
      email: client.email || "",
      telefono: client.telefono || "",
      direccion: client.direccion || "",
      responsableAsignado: client.responsableAsignado || "",
      taxModels: client.taxModels || [],
      isActive: client.isActive !== false, // Default to true if undefined
    });
    
    // Cargar empleados asignados
    const employeeIds = client.employees?.map(e => e.userId) || [];
    const primary = client.employees?.find(e => e.isPrimary)?.userId || "";
    setSelectedEmployees(employeeIds);
    setPrimaryEmployeeId(primary);
    
    setIsDialogOpen(true);
  };

  const updateEmployeesMutation = useMutation({
    mutationFn: async ({ clientId, employeeIds, primaryId }: { clientId: string; employeeIds: string[]; primaryId: string }) => {
      return await apiRequest("PUT", `/api/clients/${clientId}/employees`, {
        employeeIds,
        primaryEmployeeId: primaryId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let clientId = editingClient?.id;
      
      if (editingClient) {
        await updateMutation.mutateAsync({ id: editingClient.id, data: formData });
        clientId = editingClient.id;
      } else {
        const newClient = await createMutation.mutateAsync(formData);
        clientId = newClient.id;
      }
      
      // Actualizar empleados asignados (incluye caso de array vacío para desasignar todos)
      if (clientId) {
        await updateEmployeesMutation.mutateAsync({
          clientId,
          employeeIds: selectedEmployees,
          primaryId: selectedEmployees.length > 0 ? (primaryEmployeeId || selectedEmployees[0]) : ""
        });
      }
      
      toast({ title: editingClient ? "Cliente actualizado exitosamente" : "Cliente creado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Error al guardar el cliente",
        variant: "destructive" 
      });
    }
  };

  const exportToCSV = () => {
    if (!clients || clients.length === 0) return;
    const csv = Papa.unparse(clients);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast({ title: "Exportación completada" });
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Sin asignar";
    const user = users?.find(u => u.id === userId);
    return user?.username || "Sin asignar";
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestión de clientes y contactos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="button-add-client">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
              <DialogDescription>
                {editingClient ? "Actualiza los datos del cliente" : "Completa la información del nuevo cliente"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razonSocial">Razón Social *</Label>
                  <Input
                    id="razonSocial"
                    value={formData.razonSocial}
                    onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    required
                    data-testid="input-razon-social"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nifCif">NIF/CIF *</Label>
                  <Input
                    id="nifCif"
                    value={formData.nifCif}
                    onChange={(e) => setFormData({ ...formData, nifCif: e.target.value })}
                    required
                    data-testid="input-nif-cif"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => {
                      // Limpiar modelos fiscales cuando cambia el tipo
                      setFormData({ ...formData, tipo: value, taxModels: [] });
                    }}
                  >
                    <SelectTrigger data-testid="select-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autonomo">Autónomo</SelectItem>
                      <SelectItem value="empresa">Empresa</SelectItem>
                      <SelectItem value="particular">Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 col-span-2">
                  <Label className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Empleados Asignados
                  </Label>
                  <div className="border rounded-md p-4 space-y-3 max-h-48 overflow-y-auto">
                    {users?.filter(u => u.role !== "LECTURA").map((user) => {
                      const isSelected = selectedEmployees.includes(user.id);
                      const isPrimary = primaryEmployeeId === user.id;
                      
                      return (
                        <div key={user.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover-elevate">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`employee-${user.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const newEmployees = [...selectedEmployees, user.id];
                                  setSelectedEmployees(newEmployees);
                                  // Si es el primer empleado, marcarlo como primario
                                  if (newEmployees.length === 1) {
                                    setPrimaryEmployeeId(user.id);
                                  }
                                } else {
                                  setSelectedEmployees(selectedEmployees.filter(id => id !== user.id));
                                  // Si era el primario, limpiar o asignar otro
                                  if (isPrimary) {
                                    const remaining = selectedEmployees.filter(id => id !== user.id);
                                    setPrimaryEmployeeId(remaining[0] || "");
                                  }
                                }
                              }}
                              data-testid={`checkbox-employee-${user.id}`}
                            />
                            <Label 
                              htmlFor={`employee-${user.id}`} 
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              {user.username}
                              {isPrimary && (
                                <Badge variant="default" className="text-xs">
                                  Primario
                                </Badge>
                              )}
                            </Label>
                          </div>
                          {isSelected && !isPrimary && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setPrimaryEmployeeId(user.id)}
                              data-testid={`button-set-primary-${user.id}`}
                            >
                              Marcar como primario
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedEmployees.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selecciona al menos un empleado para asignar al cliente
                    </p>
                  )}
                  {selectedEmployees.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedEmployees.length} empleado{selectedEmployees.length > 1 ? 's' : ''} seleccionado{selectedEmployees.length > 1 ? 's' : ''}
                      {primaryEmployeeId && ` • ${users?.find(u => u.id === primaryEmployeeId)?.username} es el responsable principal`}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    data-testid="input-telefono"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    data-testid="input-direccion"
                  />
                </div>
                
                <div className="space-y-3 col-span-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Modelos Fiscales Asignados
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    {getAvailableTaxModelsForClientType(formData.tipo.toUpperCase()).map((modelCode) => {
                      const modelInfo = ALL_TAX_MODELS.find(m => m.codigo === modelCode);
                      return (
                        <div key={modelCode} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tax-model-${modelCode}`}
                            checked={formData.taxModels.includes(modelCode)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({ ...formData, taxModels: [...formData.taxModels, modelCode] });
                              } else {
                                setFormData({ ...formData, taxModels: formData.taxModels.filter(m => m !== modelCode) });
                              }
                            }}
                            data-testid={`checkbox-tax-model-${modelCode}`}
                          />
                          <Label 
                            htmlFor={`tax-model-${modelCode}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            title={modelInfo?.nombre}
                          >
                            {modelCode}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los impuestos se generarán automáticamente para todos los períodos de los modelos seleccionados
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-submit-client">
                  {editingClient ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razón social o NIF/CIF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="autonomo">Autónomos</SelectItem>
            <SelectItem value="empresa">Empresas</SelectItem>
            <SelectItem value="particular">Particulares</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón Social</TableHead>
                <TableHead>NIF/CIF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Modelos Fiscales</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay clientes registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                    <TableCell className="font-medium">{client.razonSocial}</TableCell>
                    <TableCell>{client.nifCif}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {client.tipo === "autonomo" && <User className="h-3 w-3" />}
                        {client.tipo === "empresa" && <Building2 className="h-3 w-3" />}
                        {client.tipo === "particular" && <UserCircle className="h-3 w-3" />}
                        {client.tipo === "autonomo" && "Autónomo"}
                        {client.tipo === "empresa" && "Empresa"}
                        {client.tipo === "particular" && "Particular"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.taxModels && client.taxModels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.taxModels.map((model) => (
                            <Badge key={model} variant="secondary" className="text-xs">
                              {model}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin modelos</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={client.isActive !== false ? "default" : "secondary"}
                          className="gap-1"
                          data-testid={`badge-status-${client.id}`}
                        >
                          {client.isActive !== false ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Inactivo
                            </>
                          )}
                        </Badge>
                        <Switch
                          checked={client.isActive !== false}
                          onCheckedChange={() => toggleClientActiveMutation.mutate(client.id)}
                          disabled={toggleClientActiveMutation.isPending}
                          data-testid={`switch-active-${client.id}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.employees && client.employees.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.employees.map((emp) => (
                            <Badge 
                              key={emp.userId} 
                              variant={emp.isPrimary ? "default" : "secondary"}
                              className="text-xs"
                              data-testid={`badge-employee-${emp.userId}`}
                            >
                              {emp.user.username}
                              {emp.isPrimary && " ★"}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(client)}
                          data-testid={`button-edit-${client.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(client.id)}
                          data-testid={`button-delete-${client.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
