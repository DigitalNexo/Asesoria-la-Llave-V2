import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import {
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  UserCircle,
  Building2,
  User,
} from "lucide-react";

import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";
import type { ClientType } from "@shared/tax-rules";
import {
  ClientFiscalForm,
} from "@/features/clients/ClientFiscalForm";
import {
  createClient as createClientApi,
  updateClient as updateClientApi,
  fetchClientDetail,
  fetchTaxModelsConfig,
} from "@/features/clients/api";
import type {
  ClientDetail,
  ClientTaxAssignment,
  ClientPayload,
  TaxModelsConfig,
} from "@/features/clients/types";

interface ClientEmployee {
  userId: string;
  isPrimary: boolean;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface ClientListItem {
  id: string;
  razonSocial: string;
  nifCif: string;
  tipo: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  fechaAlta: string;
  fechaBaja: string | null;
  responsableAsignado: string | null;
  isActive: boolean;
  notes?: string | null;
  employees?: ClientEmployee[];
  taxAssignments?: ClientTaxAssignment[];
}

type FormState = {
  razonSocial: string;
  nifCif: string;
  tipo: ClientType;
  email: string;
  telefono: string;
  direccion: string;
  responsableAsignado: string;
  fechaAlta: string;
  fechaBaja: string;
  isActive: boolean;
  notes: string;
};

const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: "AUTONOMO", label: "Autónomo" },
  { value: "EMPRESA", label: "Empresa" },
  { value: "PARTICULAR", label: "Particular" },
];

const NO_RESPONSABLE_VALUE = "__none__";

function formatInputDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayInputDate(): string {
  return formatInputDate(new Date().toISOString());
}

const defaultFormState: FormState = {
  razonSocial: "",
  nifCif: "",
  tipo: "AUTONOMO",
  email: "",
  telefono: "",
  direccion: "",
  responsableAsignado: NO_RESPONSABLE_VALUE,
  fechaAlta: todayInputDate(),
  fechaBaja: "",
  isActive: true,
  notes: "",
};

function buildClientPayload(form: FormState): ClientPayload {
  return {
    razonSocial: form.razonSocial.trim(),
    nifCif: form.nifCif.trim(),
    tipo: form.tipo,
    email: form.email.trim() ? form.email.trim() : null,
    telefono: form.telefono.trim() ? form.telefono.trim() : null,
    direccion: form.direccion.trim() ? form.direccion.trim() : null,
    responsableAsignado:
      form.responsableAsignado === NO_RESPONSABLE_VALUE ? null : form.responsableAsignado,
    isActive: form.isActive,
    fechaAlta: form.fechaAlta || null,
    fechaBaja: form.fechaBaja || null,
    notes: form.notes.trim() ? form.notes.trim() : null,
  };
}

export default function Clientes() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "fiscal">("general");
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null);
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ClientTaxAssignment[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [primaryEmployeeId, setPrimaryEmployeeId] = useState<string>("");
  const [formData, setFormData] = useState<FormState>(defaultFormState);

  const { data: clients = [], isLoading } = useQuery<ClientListItem[]>({
    queryKey: ["/api/clients", { view: 'list' }],
    queryFn: () => apiRequest('GET', '/api/clients?full=0'),
    staleTime: 60_000,
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    staleTime: 5 * 60_000,
  });

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach(u => map.set(u.id, u.username));
    return map;
  }, [users]);

  const { data: taxModelsConfig = [] } = useQuery<TaxModelsConfig[]>({
    queryKey: ["tax-models-config"],
    queryFn: () => fetchTaxModelsConfig(),
  });

  const {
    data: fetchedClientDetail,
    isFetching: isFetchingDetail,
  } = useQuery<ClientDetail>({
    queryKey: ["client-detail", selectedClientId],
    queryFn: () => fetchClientDetail(selectedClientId!),
    enabled: Boolean(selectedClientId && isDialogOpen),
  });

  useEffect(() => {
    if (!fetchedClientDetail) {
      return;
    }
    setClientDetail(fetchedClientDetail);
    setAssignments(fetchedClientDetail.taxAssignments ?? []);
    setFormData({
      razonSocial: fetchedClientDetail.razonSocial ?? "",
      nifCif: fetchedClientDetail.nifCif ?? "",
      tipo: (fetchedClientDetail.tipo || "AUTONOMO") as ClientType,
      email: fetchedClientDetail.email ?? "",
      telefono: fetchedClientDetail.telefono ?? "",
      direccion: fetchedClientDetail.direccion ?? "",
      responsableAsignado:
        fetchedClientDetail.responsableAsignado ?? NO_RESPONSABLE_VALUE,
      fechaAlta: formatInputDate(fetchedClientDetail.fechaAlta) || todayInputDate(),
      fechaBaja: formatInputDate(fetchedClientDetail.fechaBaja),
      isActive: fetchedClientDetail.isActive ?? true,
      notes: fetchedClientDetail.notes ?? "",
    });
    const employeeIds =
      fetchedClientDetail.employees?.map((employee) => employee.userId) ?? [];
    const primary =
      fetchedClientDetail.employees?.find((employee) => employee.isPrimary)?.userId ?? "";
    setSelectedEmployees(employeeIds);
    setPrimaryEmployeeId(primary);
  }, [fetchedClientDetail]);

  const createMutation = useMutation({
    mutationFn: async (payload: ClientPayload) => {
      const created = await createClientApi(payload);
      return created;
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditingClient({
        ...client,
        tipo: client.tipo,
        fechaAlta: client.fechaAlta,
        fechaBaja: client.fechaBaja,
      });
      setClientDetail(client);
      setFormData({
        razonSocial: client.razonSocial ?? "",
        nifCif: client.nifCif ?? "",
        tipo: (client.tipo || "AUTONOMO") as ClientType,
        email: client.email ?? "",
        telefono: client.telefono ?? "",
        direccion: client.direccion ?? "",
        responsableAsignado: client.responsableAsignado ?? NO_RESPONSABLE_VALUE,
        fechaAlta: formatInputDate(client.fechaAlta) || todayInputDate(),
        fechaBaja: formatInputDate(client.fechaBaja),
        isActive: client.isActive ?? true,
        notes: client.notes ?? "",
      });
      setSelectedClientId(client.id);
      setAssignments(client.taxAssignments ?? []);
      setActiveTab("fiscal");
      toast({ title: "Cliente creado exitosamente" });
    },
    onError: (error: any) => {
      toast({
        title: "No se pudo crear el cliente",
        description: error?.message ?? "Intenta de nuevo",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ClientPayload }) => {
      const updated = await updateClientApi(id, payload);
      return updated;
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setClientDetail(client);
      setFormData({
        razonSocial: client.razonSocial ?? "",
        nifCif: client.nifCif ?? "",
        tipo: (client.tipo || "AUTONOMO") as ClientType,
        email: client.email ?? "",
        telefono: client.telefono ?? "",
        direccion: client.direccion ?? "",
        responsableAsignado: client.responsableAsignado ?? NO_RESPONSABLE_VALUE,
        fechaAlta: formatInputDate(client.fechaAlta) || todayInputDate(),
        fechaBaja: formatInputDate(client.fechaBaja),
        isActive: client.isActive ?? true,
        notes: client.notes ?? "",
      });
      setAssignments(client.taxAssignments ?? []);
      setEditingClient((prev) =>
        prev
          ? {
              ...prev,
              ...client,
            }
          : null
      );
      toast({ title: "Cliente actualizado exitosamente" });
    },
    onError: (error: any) => {
      toast({
        title: "No se pudo actualizar el cliente",
        description: error?.message ?? "Intenta de nuevo",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/clients/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Cliente eliminado exitosamente" });
      if (isDialogOpen) {
        handleCloseDialog();
      }
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

  const updateEmployeesMutation = useMutation({
    mutationFn: async ({
      clientId,
      employeeIds,
      primaryId,
    }: {
      clientId: string;
      employeeIds: string[];
      primaryId: string;
    }) => {
      return await apiRequest("PUT", `/api/clients/${clientId}/employees`, {
        employeeIds,
        primaryEmployeeId: primaryId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.nifCif.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo =
        filterTipo === "todos" || client.tipo.toUpperCase() === filterTipo.toUpperCase();
      return matchesSearch && matchesTipo;
    });
  }, [clients, searchTerm, filterTipo]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      resetForm();
    }, 200);
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setSelectedEmployees([]);
    setPrimaryEmployeeId("");
    setEditingClient(null);
    setClientDetail(null);
    setSelectedClientId(null);
    setAssignments([]);
    setActiveTab("general");
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (client: ClientListItem) => {
    setEditingClient(client);
    setFormData({
      razonSocial: client.razonSocial,
      nifCif: client.nifCif,
      tipo: (client.tipo || "AUTONOMO").toUpperCase() as ClientType,
      email: client.email ?? "",
      telefono: client.telefono ?? "",
      direccion: client.direccion ?? "",
      responsableAsignado: client.responsableAsignado ?? NO_RESPONSABLE_VALUE,
      fechaAlta: formatInputDate(client.fechaAlta) || todayInputDate(),
      fechaBaja: formatInputDate(client.fechaBaja),
      isActive: client.isActive ?? true,
      notes: client.notes ?? "",
    });
    const employeeIds = client.employees?.map((employee) => employee.userId) ?? [];
    const primary =
      client.employees?.find((employee) => employee.isPrimary)?.userId ?? "";
    setSelectedEmployees(employeeIds);
    setPrimaryEmployeeId(primary);
    setAssignments(client.taxAssignments ?? []);
    setSelectedClientId(client.id);
    setActiveTab("general");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildClientPayload(formData);

    try {
      let clientId = editingClient?.id || clientDetail?.id || selectedClientId;
      if (clientId) {
        const updated = await updateMutation.mutateAsync({
          id: clientId,
          payload,
        });
        clientId = updated.id;
      } else {
        const created = await createMutation.mutateAsync(payload);
        clientId = created.id;
      }

      if (clientId) {
        await updateEmployeesMutation.mutateAsync({
          clientId,
          employeeIds: selectedEmployees,
          primaryId:
            selectedEmployees.length > 0
              ? primaryEmployeeId || selectedEmployees[0]
              : "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error al guardar el cliente",
        description: error?.message ?? "Intenta de nuevo más tarde",
        variant: "destructive",
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
    return userMap.get(userId) || "Sin asignar";
  };

  const handleDeleteClient = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const isSaving =
    createMutation.isPending || updateMutation.isPending || updateEmployeesMutation.isPending;

  const currentClientId = clientDetail?.id ?? editingClient?.id ?? null;

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
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-12 w-full mb-2" />
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
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseDialog();
            } else {
              setIsDialogOpen(true);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate} data-testid="button-add-client">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader className="space-y-1">
              <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
              <DialogDescription>
                {editingClient
                  ? "Actualiza la información del cliente"
                  : "Completa la información para crear un nuevo cliente"}
              </DialogDescription>
            </DialogHeader>
            <form id="client-editor-form" onSubmit={handleSubmit} className="space-y-6 mt-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <div className="flex items-center justify-between gap-4">
                  <TabsList>
                    <TabsTrigger value="general">Datos del cliente</TabsTrigger>
                    <TabsTrigger value="fiscal" disabled={!currentClientId}>
                      Datos fiscales y contables
                    </TabsTrigger>
                  </TabsList>
                  <Button type="submit" disabled={isSaving} className="shrink-0">
                    {isSaving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
                <TabsContent value="general">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="razonSocial">Razón Social *</Label>
                      <Input
                        id="razonSocial"
                        value={formData.razonSocial}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, razonSocial: event.target.value }))
                        }
                        required
                        data-testid="input-razon-social"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nifCif">NIF/CIF *</Label>
                      <Input
                        id="nifCif"
                        value={formData.nifCif}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, nifCif: event.target.value }))
                        }
                        required
                        data-testid="input-nif-cif"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            tipo: value as ClientType,
                          }))
                        }
                      >
                        <SelectTrigger data-testid="select-tipo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIENT_TYPE_OPTIONS.map((option) => (
                            <SelectItem value={option.value} key={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsableAsignado">Responsable</Label>
                      <Select
                        value={formData.responsableAsignado ?? NO_RESPONSABLE_VALUE}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, responsableAsignado: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_RESPONSABLE_VALUE}>Sin asignar</SelectItem>
                          {users.map((user) => (
                            <SelectItem value={user.id} key={user.id}>
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaAlta">Fecha de alta</Label>
                      <Input
                        id="fechaAlta"
                        type="date"
                        value={formData.fechaAlta}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, fechaAlta: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaBaja">Fecha de baja</Label>
                      <Input
                        id="fechaBaja"
                        type="date"
                        value={formData.fechaBaja}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, fechaBaja: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, email: event.target.value }))
                        }
                        data-testid="input-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, telefono: event.target.value }))
                        }
                        data-testid="input-telefono"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="direccion">Dirección</Label>
                      <Input
                        id="direccion"
                        value={formData.direccion}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, direccion: event.target.value }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="notes">Notas internas</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between rounded-md border p-4">
                        <div>
                          <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Building2 className="h-4 w-4" />
                            Cliente activo
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Desactiva el cliente cuando ya no se gestione para mantener el histórico.
                          </p>
                        </div>
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={(value) =>
                            setFormData((prev) => ({ ...prev, isActive: value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <Label className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        Empleados asignados
                      </Label>
                      <div className="border rounded-md p-4 space-y-3 max-h-48 overflow-y-auto">
                        {users.map((user) => {
                          const isSelected = selectedEmployees.includes(user.id);
                          const isPrimary = primaryEmployeeId === user.id;
                          return (
                            <div
                              key={user.id}
                              className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/40"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`employee-${user.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      const newEmployees = [...selectedEmployees, user.id];
                                      setSelectedEmployees(newEmployees);
                                      if (newEmployees.length === 1) {
                                        setPrimaryEmployeeId(user.id);
                                      }
                                    } else {
                                      setSelectedEmployees((prev) =>
                                        prev.filter((id) => id !== user.id)
                                      );
                                      if (isPrimary) {
                                        setPrimaryEmployeeId((prev) => {
                                          const remaining = selectedEmployees.filter(
                                            (id) => id !== user.id
                                          );
                                          return remaining[0] || "";
                                        });
                                      }
                                    }
                                  }}
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
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="fiscal">
                  {isFetchingDetail && (
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-64 w-full" />
                    </div>
                  )}
                  {!isFetchingDetail && (
                    <ClientFiscalForm
                      clientId={currentClientId ?? undefined}
                      clientType={formData.tipo}
                      assignments={assignments}
                      taxModelsConfig={taxModelsConfig}
                      disabled={!currentClientId}
                      onAssignmentsChange={(updater) =>
                        setAssignments((prev) => updater(prev))
                      }
                    />
                  )}
                </TabsContent>
              </Tabs>
              <DialogFooter className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por razón social o NIF/CIF"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {CLIENT_TYPE_OPTIONS.map((option) => (
                <SelectItem value={option.value} key={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de clientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right w-[150px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.razonSocial}</span>
                      <span className="text-xs text-muted-foreground">{client.nifCif}</span>
                    </div>
                  </TableCell>
                  <TableCell>{client.tipo?.toUpperCase()}</TableCell>
                  <TableCell>{getUserName(client.responsableAsignado)}</TableCell>
                  <TableCell>{client.telefono || "—"}</TableCell>
                  <TableCell>{client.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={client.isActive ? "default" : "outline"}>
                      {client.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleClientActiveMutation.mutate(client.id)}
                        title={client.isActive ? "Desactivar" : "Activar"}
                      >
                        {client.isActive ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteClient(client.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No se encontraron clientes con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
