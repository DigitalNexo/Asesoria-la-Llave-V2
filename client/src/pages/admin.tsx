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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Activity, Settings as SettingsIcon, Users as UsersIcon, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { User, ActivityLog } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "LECTURA",
  });
  const [smtpData, setSmtpData] = useState({
    host: "",
    port: "",
    user: "",
    pass: "",
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<(ActivityLog & { user?: User })[]>({
    queryKey: ["/api/activity-logs"],
  });

  const { data: smtpConfig } = useQuery<{ configured: boolean; host?: string; port?: number; user?: string }>({
    queryKey: ["/api/admin/smtp-config"],
    onSuccess: (data) => {
      if (data.configured && data.host && data.port && data.user) {
        setSmtpData({
          host: data.host,
          port: data.port.toString(),
          user: data.user,
          pass: "",
        });
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario creado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario actualizado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuario eliminado exitosamente" });
    },
  });

  const saveSMTPMutation = useMutation({
    mutationFn: async (data: typeof smtpData) => {
      return await apiRequest("POST", "/api/admin/smtp-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-config"] });
      toast({ title: "Configuración SMTP guardada exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al guardar configuración", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "LECTURA",
    });
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updateData: any = { 
        username: formData.username, 
        email: formData.email, 
        role: formData.role 
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: "text-primary bg-primary/10",
      GESTOR: "text-chart-2 bg-chart-2/10",
      LECTURA: "text-muted-foreground bg-muted",
    };
    return (
      <Badge variant="outline" className={variants[role as keyof typeof variants]}>
        {role}
      </Badge>
    );
  };

  const getModuloBadge = (modulo: string) => {
    const colors = {
      clientes: "text-chart-1 bg-chart-1/10",
      impuestos: "text-chart-2 bg-chart-2/10",
      tareas: "text-chart-3 bg-chart-3/10",
      manuales: "text-chart-4 bg-chart-4/10",
      usuarios: "text-chart-5 bg-chart-5/10",
    };
    return (
      <Badge variant="outline" className={colors[modulo as keyof typeof colors] || "text-muted-foreground bg-muted"}>
        {modulo}
      </Badge>
    );
  };

  if (usersLoading || logsLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Administración</h1>
        <p className="text-muted-foreground mt-1">Gestión de usuarios y configuración del sistema</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <UsersIcon className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            <Activity className="h-4 w-4 mr-2" />
            Logs de Actividad
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-semibold">Gestión de Usuarios</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} data-testid="button-add-user">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? "Actualiza los datos del usuario" : "Crea un nuevo usuario del sistema"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuario *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      data-testid="input-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{editingUser ? "Nueva Contraseña (dejar en blanco para no cambiar)" : "Contraseña *"}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      data-testid="input-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="GESTOR">Gestor</SelectItem>
                        <SelectItem value="LECTURA">Lectura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="button-submit-user">
                      {editingUser ? "Actualizar" : "Crear"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios del Sistema ({users?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!users || users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay usuarios registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(user.id)}
                              data-testid={`button-delete-${user.id}`}
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
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Registro de Actividad</h2>
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!logs || logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  No hay actividad registrada
                </div>
              ) : (
                <div className="divide-y">
                  {logs.slice(0, 50).map((log) => (
                    <div key={log.id} className="p-4 hover-elevate" data-testid={`row-log-${log.id}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-medium">{log.user?.username || "Usuario desconocido"}</p>
                            {getModuloBadge(log.modulo)}
                          </div>
                          <p className="text-sm text-muted-foreground">{log.accion}</p>
                          {log.detalles && (
                            <p className="text-xs text-muted-foreground mt-1">{log.detalles}</p>
                          )}
                        </div>
                        <time className="text-sm text-muted-foreground">
                          {new Date(log.fecha).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Configuración del Sistema</h2>
          <Card>
            <CardHeader>
              <CardTitle>Configuración SMTP para Notificaciones</CardTitle>
              {smtpConfig?.configured && (
                <p className="text-sm text-muted-foreground">
                  Configuración activa - Las notificaciones automáticas están habilitadas
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Servidor SMTP *</Label>
                  <Input 
                    id="smtp-host" 
                    placeholder="smtp.gmail.com" 
                    value={smtpData.host}
                    onChange={(e) => setSmtpData({ ...smtpData, host: e.target.value })}
                    data-testid="input-smtp-host" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Puerto *</Label>
                  <Input 
                    id="smtp-port" 
                    placeholder="587" 
                    type="number"
                    value={smtpData.port}
                    onChange={(e) => setSmtpData({ ...smtpData, port: e.target.value })}
                    data-testid="input-smtp-port" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuario SMTP *</Label>
                  <Input 
                    id="smtp-user" 
                    placeholder="usuario@gmail.com" 
                    value={smtpData.user}
                    onChange={(e) => setSmtpData({ ...smtpData, user: e.target.value })}
                    data-testid="input-smtp-user" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">Contraseña SMTP *</Label>
                  <Input 
                    id="smtp-pass" 
                    type="password" 
                    placeholder={smtpConfig?.configured ? "••••••••" : "Contraseña de aplicación"}
                    value={smtpData.pass}
                    onChange={(e) => setSmtpData({ ...smtpData, pass: e.target.value })}
                    data-testid="input-smtp-pass" 
                  />
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Nota:</strong> Las notificaciones automáticas se enviarán:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Tareas: 3 días antes del vencimiento</li>
                  <li>Impuestos: 7 días antes de la fecha límite</li>
                </ul>
              </div>
              <Button 
                onClick={() => saveSMTPMutation.mutate(smtpData)}
                disabled={!smtpData.host || !smtpData.port || !smtpData.user || !smtpData.pass}
                data-testid="button-save-smtp"
              >
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nombre de la Empresa</Label>
                <Input id="company-name" defaultValue="Asesoría La Llave" data-testid="input-company-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo de la Empresa</Label>
                <Input id="logo" type="file" accept="image/*" data-testid="input-logo" />
              </div>
              <Button data-testid="button-save-branding">Guardar Cambios</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
