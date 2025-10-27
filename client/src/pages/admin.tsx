import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from 'wouter';
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Activity, Settings as SettingsIcon, Users as UsersIcon, Edit, Trash2, Lock, Mail, RefreshCw, RotateCcw, Download, HardDrive, FileArchive, Database, CheckCircle2, XCircle, Loader2, Save, Upload } from "lucide-react";
import { SystemLogs } from "@/components/system-logs";
import { Link } from 'wouter';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { User, ActivityLog } from "@shared/schema";

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  _count?: { users: number };
  permissions?: Array<{
    permission: {
      id: string;
      resource: string;
      action: string;
      description?: string;
    };
  }>;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

export default function Admin() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    roleId: "",
  });

  // Roles & Permissions
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: "",
    description: "",
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // SMTP Accounts (múltiples cuentas)
  const [isSMTPDialogOpen, setIsSMTPDialogOpen] = useState(false);
  const [editingSMTP, setEditingSMTP] = useState<any | null>(null);
  const [smtpFormData, setSMTPFormData] = useState({
    nombre: "",
    host: "",
    port: "587",
    user: "",
    password: "",
    isPredeterminada: false,
    activa: true,
  });
  const [testingSMTP, setTestingSMTP] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<(ActivityLog & { user?: User })[]>({
    queryKey: ["/api/activity-logs"],
  });

  const { data: systemSettings } = useQuery<{ registrationEnabled: boolean }>({
    queryKey: ["/api/admin/system-settings"],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  const { data: smtpAccounts, isLoading: smtpAccountsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/smtp-accounts"],
  });

  

  interface SystemConfig {
    id: string;
    key: string;
    value: string;
    description: string | null;
    isEditable: boolean;
  }

  const { data: systemConfigs } = useQuery<SystemConfig[]>({
    queryKey: ["/api/system/config"],
  });

  const [backupPatterns, setBackupPatterns] = useState({
    backup_db_pattern: "",
    backup_files_pattern: "",
  });

  // Cargar patrones de backup cuando se obtengan las configuraciones
  useEffect(() => {
    if (systemConfigs) {
      const dbPattern = systemConfigs.find(c => c.key === "backup_db_pattern");
      const filesPattern = systemConfigs.find(c => c.key === "backup_files_pattern");
      
      setBackupPatterns({
        backup_db_pattern: dbPattern?.value || "",
        backup_files_pattern: filesPattern?.value || "",
      });
    }
  }, [systemConfigs]);

  // Sistema de Actualizaciones
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; changelog?: string } | null>(null);

  const { data: versionInfo } = useQuery<{
    currentVersion: string;
    latestVersion: string | null;
    updateAvailable: boolean;
    changelog?: string;
  }>({
    queryKey: ["/api/system/version"],
  });

  const { data: backups, isLoading: backupsLoading } = useQuery<Array<{
    id: string;
    createdAt: string;
    version: string;
    dbSize: string;
    filesSize: string;
    dbPath: string;
    filesPath: string;
  }>>({
    queryKey: ["/api/system/backups"],
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
    onError: (error: any) => {
      toast({ title: "Error al eliminar usuario", description: error.message, variant: "destructive" });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/users/${id}/toggle-active`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Estado del usuario actualizado" });
    },
    onError: (error: any) => {
      toast({ title: "Error al cambiar estado", description: error.message, variant: "destructive" });
    },
  });

  const updateSystemSettingsMutation = useMutation({
    mutationFn: async (registrationEnabled: boolean) => {
      return await apiRequest("PATCH", "/api/admin/system-settings", { registrationEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
      toast({ title: "Configuración actualizada exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar configuración", description: error.message, variant: "destructive" });
    },
  });

  // Role Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: typeof roleFormData) => {
      const role = await apiRequest("POST", "/api/roles", data);
      // Asignar permisos
      if (selectedPermissions.length > 0) {
        await apiRequest("POST", `/api/roles/${role.id}/permissions`, { permissionIds: selectedPermissions });
      }
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Rol creado exitosamente" });
      setIsRoleDialogOpen(false);
      resetRoleForm();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof roleFormData }) => {
      const role = await apiRequest("PATCH", `/api/roles/${id}`, data);
      // Actualizar permisos
      await apiRequest("POST", `/api/roles/${id}/permissions`, { permissionIds: selectedPermissions });
      return role;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Rol actualizado exitosamente" });
      setIsRoleDialogOpen(false);
      resetRoleForm();
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/roles/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Rol eliminado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al eliminar rol", description: error.message, variant: "destructive" });
    },
  });

  // Mutations para SMTP Accounts
  const createSMTPAccountMutation = useMutation({
    mutationFn: async (data: typeof smtpFormData) => {
      return await apiRequest("POST", "/api/admin/smtp-accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-accounts"] });
      toast({ title: "Cuenta SMTP creada exitosamente" });
      setIsSMTPDialogOpen(false);
      resetSMTPForm();
    },
  });

  const updateSMTPAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof smtpFormData> }) => {
      return await apiRequest("PATCH", `/api/admin/smtp-accounts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-accounts"] });
      toast({ title: "Cuenta SMTP actualizada exitosamente" });
      setIsSMTPDialogOpen(false);
      resetSMTPForm();
    },
  });

  const deleteSMTPAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/smtp-accounts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smtp-accounts"] });
      toast({ title: "Cuenta SMTP eliminada exitosamente" });
    },
  });

  const testSMTPConnectionMutation = useMutation({
    mutationFn: async (data: { host: string; port: string; user: string; password: string }) => {
      return await apiRequest("POST", "/api/admin/smtp-accounts/test", data);
    },
    onSuccess: () => {
      toast({ title: "Conexión SMTP exitosa", description: "La configuración es válida" });
    },
    onError: (error: any) => {
      toast({ title: "Error de conexión SMTP", description: error.message, variant: "destructive" });
    },
  });

  const updateBackupPatternMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return await apiRequest("PUT", `/api/system/config/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/config"] });
      toast({ title: "Patrón de backup actualizado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar patrón", description: error.message, variant: "destructive" });
    },
  });

  // GitHub Configuration
  const [githubConfig, setGithubConfig] = useState({ repoUrl: '', branch: 'main' });
  
  const { data: githubData } = useQuery<{
    repoUrl: string;
    branch: string;
    configured: boolean;
  }>({
    queryKey: ["/api/admin/github-config"],
  });

  useEffect(() => {
    if (githubData) {
      setGithubConfig({
        repoUrl: githubData.repoUrl || '',
        branch: githubData.branch || 'main'
      });
    }
  }, [githubData]);

  const saveGithubConfigMutation = useMutation({
    mutationFn: async (data: typeof githubConfig) => {
      return await apiRequest("PUT", "/api/admin/github-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/github-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/version"] });
      toast({ title: "Configuración de GitHub guardada exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al guardar configuración", description: error.message, variant: "destructive" });
    },
  });

  const checkUpdatesMutation = useMutation({
    mutationFn: async () => {
      setCheckingUpdates(true);
      const response = await apiRequest("GET", "/api/system/version");
      return response;
    },
    onSuccess: (data: any) => {
      setCheckingUpdates(false);
      queryClient.invalidateQueries({ queryKey: ["/api/system/version"] });
      if (data.updateAvailable) {
        setUpdateAvailable({ version: data.latestVersion, changelog: data.changelog });
        toast({ 
          title: "Actualización disponible", 
          description: `Versión ${data.latestVersion} disponible` 
        });
      } else {
        toast({ 
          title: "Sistema actualizado", 
          description: "Ya tienes la última versión instalada" 
        });
      }
    },
    onError: (error: any) => {
      setCheckingUpdates(false);
      toast({ 
        title: "Error al comprobar actualizaciones", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const performUpdateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/system/update", {});
    },
    onSuccess: () => {
      toast({ 
        title: "Actualización iniciada", 
        description: "El sistema se actualizará y reiniciará automáticamente" 
      });
      setUpdateAvailable(null);
      queryClient.invalidateQueries({ queryKey: ["/api/system/version"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      return await apiRequest("POST", `/api/system/restore/${backupId}`, {});
    },
    onSuccess: () => {
      toast({ 
        title: "Restauración iniciada", 
        description: "El sistema se restaurará y reiniciará automáticamente" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system/backups"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al restaurar", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Función para generar vista previa del nombre de backup
  const generateBackupPreview = (pattern: string) => {
    if (!pattern) return '';
    
    const now = new Date();
    
    // Función para calcular número de semana ISO-8601
    function getISOWeekNumber(date: Date): number {
      const tempDate = new Date(date.getTime());
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      return Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    // Función para calcular semana del mes (lunes como primer día)
    function getWeekOfMonth(date: Date): number {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const startDay = startOfMonth.getDay();
      const daysToMonday = startDay === 0 ? 1 : startDay === 1 ? 0 : 8 - startDay;
      const firstMonday = 1 + daysToMonday;
      const dayOfMonth = date.getDate();
      
      if (dayOfMonth < firstMonday) return 0;
      return Math.floor((dayOfMonth - firstMonday) / 7) + 1;
    }

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const variables: Record<string, string> = {
      '{fecha}': now.toISOString().split('T')[0].replace(/-/g, ''),
      '{hora}': now.toTimeString().split(' ')[0].replace(/:/g, ''),
      '{version}': '1.0.0',
      '{timestamp}': Date.now().toString(),
      '{YEAR_4}': now.getFullYear().toString(),
      '{YEAR_2}': now.getFullYear().toString().slice(-2),
      '{MONTH_NUMBER}': (now.getMonth() + 1).toString().padStart(2, '0'),
      '{MONTH_NAME}': monthNames[now.getMonth()],
      '{MONTH_DAY_NUMBER}': now.getDate().toString().padStart(2, '0'),
      '{WEEK_DAY_NUMBER}': ((now.getDay() || 7)).toString(),
      '{WEEK_DAY_NAME}': dayNames[now.getDay()],
      '{HOURS}': now.getHours().toString().padStart(2, '0'),
      '{MINUTES}': now.getMinutes().toString().padStart(2, '0'),
      '{SECONDS}': now.getSeconds().toString().padStart(2, '0'),
      '{WEEK_NUMBER}': getISOWeekNumber(now).toString(),
      '{WEEK_NUMBER_IN_THE_MONTH}': getWeekOfMonth(now).toString(),
    };
    
    let preview = pattern;
    Object.entries(variables).forEach(([key, value]) => {
      preview = preview.replaceAll(key, value);
    });
    
    return preview;
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      roleId: roles?.[0]?.id || "",
    });
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      roleId: user.roleId || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updateData: any = { 
        username: formData.username, 
        email: formData.email, 
        roleId: formData.roleId 
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Role Handlers
  const resetRoleForm = () => {
    setRoleFormData({ name: "", description: "" });
    setSelectedPermissions([]);
    setEditingRole(null);
  };

  const resetSMTPForm = () => {
    setSMTPFormData({
      nombre: "",
      host: "",
      port: "587",
      user: "",
      password: "",
      isPredeterminada: false,
      activa: true,
    });
    setEditingSMTP(null);
  };

  const handleEditSMTP = (account: any) => {
    setEditingSMTP(account);
    setSMTPFormData({
      nombre: account.nombre,
      host: account.host,
      port: account.port.toString(),
      user: account.user,
      password: "", // No mostrar password existente
      isPredeterminada: account.isPredeterminada,
      activa: account.activa,
    });
    setIsSMTPDialogOpen(true);
  };

  const handleSubmitSMTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSMTP) {
      const updateData: any = { ...smtpFormData };
      if (!updateData.password) {
        delete updateData.password; // No actualizar password si está vacío
      }
      updateSMTPAccountMutation.mutate({ id: editingSMTP.id, data: updateData });
    } else {
      createSMTPAccountMutation.mutate(smtpFormData);
    }
  };

  const handleTestSMTP = () => {
    setTestingSMTP(true);
    testSMTPConnectionMutation.mutate(
      {
        host: smtpFormData.host,
        port: smtpFormData.port,
        user: smtpFormData.user,
        password: smtpFormData.password,
      },
      {
        onSettled: () => setTestingSMTP(false),
      }
    );
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || "",
    });
    const rolePermissionIds = role.permissions?.map(p => p.permission.id) || [];
    setSelectedPermissions(rolePermissionIds);
    setIsRoleDialogOpen(true);
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: roleFormData });
    } else {
      createRoleMutation.mutate(roleFormData);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const getRoleBadge = (roleId: string | null) => {
    if (!roleId) {
      return <Badge variant="outline">Sin rol</Badge>;
    }
    const role = roles?.find(r => r.id === roleId);
    if (!role) {
      return <Badge variant="outline">Sin rol</Badge>;
    }
    
    // Usar colores diferentes basados en si es sistema o no
    const className = role.isSystem 
      ? "text-primary bg-primary/10"
      : "text-chart-2 bg-chart-2/10";
    
    return (
      <Badge variant="outline" className={className}>
        {role.name}
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

  // Tabs state that syncs with URL (e.g. /admin/sessions)
  const determineTabFromLocation = (loc: string) => {
    if (!loc) return 'users';
    if (loc.startsWith('/admin/sessions')) return 'sessions';
    if (loc.startsWith('/admin/smtp-accounts')) return 'smtp-accounts';
    if (loc.startsWith('/admin/storage-config')) return 'storage';
    return 'users';
  };

  const [tab, setTab] = useState<string>(() => determineTabFromLocation(location));

  useEffect(() => {
    setTab(determineTabFromLocation(location));
  }, [location]);

  // Sessions (Usuarios conectados) - fetch only when sessions tab is active
  const [showAllSessions, setShowAllSessions] = useState(false);
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery<any>({
    queryKey: ["/api/admin/sessions", showAllSessions ? "all" : "active"],
    queryFn: async () => {
      const endpoint = showAllSessions ? "/api/admin/sessions/all" : "/api/admin/sessions";
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Error al cargar sesiones');
      return response.json();
    },
    enabled: tab === 'sessions',
    refetchInterval: 5000, // Refrescar cada 5 segundos
  });

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

  <Tabs value={tab} onValueChange={(v) => setTab(v)} className="space-y-6">
        <TabsList className="h-auto grid grid-cols-2 md:grid-cols-4 gap-1 p-1">
          <TabsTrigger value="users" data-testid="tab-users">
            <UsersIcon className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="h-4 w-4 mr-2" />
            Roles y Permisos
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            <Activity className="h-4 w-4 mr-2" />
            Logs de Actividad
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="smtp-accounts" data-testid="tab-smtp-accounts">
            <Mail className="h-4 w-4 mr-2" />
            Cuentas SMTP
          </TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">
            <Link href="/admin/sessions" className="flex items-center">
              <UsersIcon className="h-4 w-4 mr-2" />
              Usuarios conectados
            </Link>
          </TabsTrigger>
          <TabsTrigger value="system-updates" data-testid="tab-system-updates">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizaciones
          </TabsTrigger>
          <TabsTrigger value="storage" data-testid="tab-storage">
            <Database className="h-4 w-4 mr-2" />
            Almacenamiento
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
                    <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
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
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!users || users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay usuarios registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.roleId)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={user.isActive ? "default" : "secondary"} data-testid={`badge-status-${user.id}`}>
                              {user.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                            <Switch
                              checked={user.isActive}
                              onCheckedChange={() => toggleUserActiveMutation.mutate(user.id)}
                              disabled={toggleUserActiveMutation.isPending}
                              data-testid={`switch-active-${user.id}`}
                            />
                          </div>
                        </TableCell>
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

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-semibold">Gestión de Roles y Permisos</h2>
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetRoleForm} data-testid="button-add-role">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Rol
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRole ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
                  <DialogDescription>
                    {editingRole ? "Actualiza el rol y sus permisos" : "Crea un nuevo rol personalizado con permisos específicos"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRoleSubmit} className="space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-name">Nombre del Rol *</Label>
                      <Input
                        id="role-name"
                        value={roleFormData.name}
                        onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                        required
                        disabled={editingRole?.isSystem}
                        placeholder="Ej: Contable Senior"
                        data-testid="input-role-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role-description">Descripción</Label>
                      <Input
                        id="role-description"
                        value={roleFormData.description}
                        onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                        placeholder="Descripción del rol..."
                        data-testid="input-role-description"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Permisos</Label>
                    <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                      {Object.entries(
                        permissions?.reduce((acc, perm) => {
                          if (!acc[perm.resource]) acc[perm.resource] = [];
                          acc[perm.resource].push(perm);
                          return acc;
                        }, {} as Record<string, Permission[]>) || {}
                      ).map(([resource, perms]) => (
                        <div key={resource} className="space-y-2">
                          <h4 className="font-medium capitalize text-sm">{resource}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-4">
                            {perms.map((perm) => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={perm.id}
                                  checked={selectedPermissions.includes(perm.id)}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                  data-testid={`checkbox-permission-${perm.resource}-${perm.action}`}
                                />
                                <Label htmlFor={perm.id} className="text-sm font-normal cursor-pointer">
                                  {perm.action}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedPermissions.length} permiso(s) seleccionado(s)
                    </p>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setIsRoleDialogOpen(false); resetRoleForm(); }}>
                      Cancelar
                    </Button>
                    <Button type="submit" data-testid="button-submit-role">
                      {editingRole ? "Actualizar" : "Crear"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Roles del Sistema ({roles?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre del Rol</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!roles || roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay roles configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id} data-testid={`row-role-${role.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {role.name}
                            {role.isSystem && (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Sistema
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{role.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{role._count?.users || 0} usuarios</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{role.permissions?.length || 0} permisos</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRole(role)}
                              data-testid={`button-edit-role-${role.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!role.isSystem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteRoleMutation.mutate(role.id)}
                                data-testid={`button-delete-role-${role.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
              <CardTitle>Control de Acceso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="registration-enabled">Permitir registro de nuevos usuarios</Label>
                  <p className="text-sm text-muted-foreground">
                    Cuando está deshabilitado, solo los administradores pueden crear usuarios
                  </p>
                </div>
                <Switch
                  id="registration-enabled"
                  checked={systemSettings?.registrationEnabled ?? true}
                  onCheckedChange={(checked) => updateSystemSettingsMutation.mutate(checked)}
                  data-testid="switch-registration"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuración de Backups</CardTitle>
              <p className="text-sm text-muted-foreground">
                Personaliza los patrones de nombres para los archivos de respaldo
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-db-pattern">Patrón para Backup de Base de Datos</Label>
                  <Input
                    id="backup-db-pattern"
                    value={backupPatterns.backup_db_pattern}
                    onChange={(e) => setBackupPatterns({ ...backupPatterns, backup_db_pattern: e.target.value })}
                    placeholder="backup_db_{fecha}_{hora}"
                    data-testid="input-backup-db-pattern"
                  />
                  <p className="text-xs text-muted-foreground">
                    Vista previa: <code className="bg-muted px-1 py-0.5 rounded">{generateBackupPreview(backupPatterns.backup_db_pattern)}.sql</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-files-pattern">Patrón para Backup de Archivos</Label>
                  <Input
                    id="backup-files-pattern"
                    value={backupPatterns.backup_files_pattern}
                    onChange={(e) => setBackupPatterns({ ...backupPatterns, backup_files_pattern: e.target.value })}
                    placeholder="backup_files_{fecha}_{hora}"
                    data-testid="input-backup-files-pattern"
                  />
                  <p className="text-xs text-muted-foreground">
                    Vista previa: <code className="bg-muted px-1 py-0.5 rounded">{generateBackupPreview(backupPatterns.backup_files_pattern)}.zip</code>
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <p className="text-sm font-medium">Variables disponibles:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;fecha&#125;</code> - Fecha actual (YYYYMMDD)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;hora&#125;</code> - Hora actual (HHMMSS)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;version&#125;</code> - Versión del sistema</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;timestamp&#125;</code> - Timestamp Unix</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;YEAR_4&#125;</code> - Año 4 dígitos (2025)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;YEAR_2&#125;</code> - Año 2 dígitos (25)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;MONTH_NUMBER&#125;</code> - Mes numérico (01-12)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;MONTH_NAME&#125;</code> - Nombre del mes (Enero-Diciembre)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;MONTH_DAY_NUMBER&#125;</code> - Día del mes (01-31)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;WEEK_DAY_NUMBER&#125;</code> - Día semana numérico (1-7)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;WEEK_DAY_NAME&#125;</code> - Día de la semana (Lunes-Domingo)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;HOURS&#125;</code> - Hora en formato 24h (00-23)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;MINUTES&#125;</code> - Minutos (00-59)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;SECONDS&#125;</code> - Segundos (00-59)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;WEEK_NUMBER&#125;</code> - Semana ISO-8601 del año (1-53)</div>
                  <div><code className="bg-background px-1 py-0.5 rounded">&#123;WEEK_NUMBER_IN_THE_MONTH&#125;</code> - Semana del mes (0-5)</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    updateBackupPatternMutation.mutate({
                      key: "backup_db_pattern",
                      value: backupPatterns.backup_db_pattern,
                    });
                  }}
                  disabled={!backupPatterns.backup_db_pattern}
                  data-testid="button-save-db-pattern"
                >
                  Guardar Patrón BD
                </Button>
                <Button
                  onClick={() => {
                    updateBackupPatternMutation.mutate({
                      key: "backup_files_pattern",
                      value: backupPatterns.backup_files_pattern,
                    });
                  }}
                  disabled={!backupPatterns.backup_files_pattern}
                  data-testid="button-save-files-pattern"
                  variant="outline"
                >
                  Guardar Patrón Archivos
                </Button>
              </div>
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

        <TabsContent value="smtp-accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-semibold">Cuentas SMTP</h2>
            <Dialog open={isSMTPDialogOpen} onOpenChange={setIsSMTPDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetSMTPForm()} data-testid="button-add-smtp-account">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cuenta SMTP
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingSMTP ? "Editar" : "Nueva"} Cuenta SMTP</DialogTitle>
                  <DialogDescription>
                    Configure una cuenta SMTP para el envío de notificaciones
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitSMTP} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="smtp-nombre">Nombre de la Cuenta *</Label>
                      <Input
                        id="smtp-nombre"
                        value={smtpFormData.nombre}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, nombre: e.target.value })}
                        placeholder="Ej: Gmail Principal"
                        required
                        data-testid="input-smtp-nombre"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-form-host">Servidor SMTP *</Label>
                      <Input
                        id="smtp-form-host"
                        value={smtpFormData.host}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        required
                        data-testid="input-smtp-form-host"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-form-port">Puerto *</Label>
                      <Input
                        id="smtp-form-port"
                        type="number"
                        value={smtpFormData.port}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, port: e.target.value })}
                        placeholder="587"
                        required
                        data-testid="input-smtp-form-port"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-form-user">Usuario *</Label>
                      <Input
                        id="smtp-form-user"
                        value={smtpFormData.user}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, user: e.target.value })}
                        placeholder="usuario@gmail.com"
                        required
                        data-testid="input-smtp-form-user"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-form-password">Contraseña *</Label>
                      <Input
                        id="smtp-form-password"
                        type="password"
                        value={smtpFormData.password}
                        onChange={(e) => setSMTPFormData({ ...smtpFormData, password: e.target.value })}
                        placeholder={editingSMTP ? "(dejar vacío para mantener)" : ""}
                        required={!editingSMTP}
                        data-testid="input-smtp-form-password"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smtp-predeterminada"
                        checked={smtpFormData.isPredeterminada}
                        onCheckedChange={(checked) => setSMTPFormData({ ...smtpFormData, isPredeterminada: Boolean(checked) })}
                        data-testid="checkbox-smtp-predeterminada"
                      />
                      <Label htmlFor="smtp-predeterminada" className="text-sm">Cuenta Predeterminada</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smtp-activa"
                        checked={smtpFormData.activa}
                        onCheckedChange={(checked) => setSMTPFormData({ ...smtpFormData, activa: Boolean(checked) })}
                        data-testid="checkbox-smtp-activa"
                      />
                      <Label htmlFor="smtp-activa" className="text-sm">Activa</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestSMTP}
                      disabled={!smtpFormData.host || !smtpFormData.port || !smtpFormData.user || !smtpFormData.password || testingSMTP}
                      data-testid="button-test-smtp"
                    >
                      {testingSMTP ? "Probando..." : "Probar Conexión"}
                    </Button>
                    <Button type="submit" data-testid="button-submit-smtp">
                      {editingSMTP ? "Actualizar" : "Crear"} Cuenta
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas SMTP Configuradas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gestiona múltiples cuentas SMTP para el envío de notificaciones
              </p>
            </CardHeader>
            <CardContent>
              {smtpAccountsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : smtpAccounts && smtpAccounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Servidor</TableHead>
                      <TableHead>Puerto</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smtpAccounts.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.nombre}
                          {account.isPredeterminada && (
                            <Badge variant="secondary" className="ml-2">Predeterminada</Badge>
                          )}
                        </TableCell>
                        <TableCell>{account.host}</TableCell>
                        <TableCell>{account.port}</TableCell>
                        <TableCell>{account.user}</TableCell>
                        <TableCell>
                          <Badge variant={account.activa ? "default" : "secondary"}>
                            {account.activa ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSMTP(account)}
                              data-testid={`button-edit-smtp-${account.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSMTPAccountMutation.mutate(account.id)}
                              data-testid={`button-delete-smtp-${account.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay cuentas SMTP configuradas. Crea una para empezar.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-display font-semibold">Gestión de Sesiones</h2>
              <p className="text-muted-foreground mt-1">Monitoreo avanzado de sesiones de usuario</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showAllSessions ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAllSessions(!showAllSessions)}
              >
                {showAllSessions ? "Solo Activas" : "Ver Todas"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const result = await apiRequest('POST', '/api/admin/sessions/cleanup');
                    queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
                    toast({ 
                      title: 'Limpieza completada', 
                      description: `${result.totalCleaned} sesiones procesadas (${result.deletedCount} eliminadas, ${result.markedInactiveCount} marcadas como inactivas)`
                    });
                  } catch (err: any) {
                    toast({ title: 'Error', description: err.message || String(err), variant: 'destructive' });
                  }
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar Sesiones
              </Button>
            </div>
          </div>

          {/* Estadísticas de sesiones */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sesiones Activas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {sessionsData?.items?.filter((s: any) => s.status === 'active').length || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sesiones Inactivas</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {sessionsData?.items?.filter((s: any) => s.status === 'idle').length || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sospechosas</p>
                    <p className="text-2xl font-bold text-red-600">
                      {sessionsData?.items?.filter((s: any) => s.suspicious).length || 0}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sesiones</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {sessionsData?.total || 0}
                    </p>
                  </div>
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {showAllSessions ? 'Todas las Sesiones' : 'Sesiones Activas'} ({sessionsData?.total ?? 0})
                {showAllSessions && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Incluye sesiones cerradas)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !sessionsData || !sessionsData.items || sessionsData.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay sesiones</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>IP / Ubicación</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Última Actividad</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsData.items.map((s: any) => (
                      <TableRow key={s.id} className={s.suspicious ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">{s.user?.username || '—'}</p>
                              <p className="text-sm text-muted-foreground">{s.user?.role?.name || '—'}</p>
                            </div>
                            {s.suspicious && <Shield className="h-4 w-4 text-red-500" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={s.status === 'active' ? 'default' : s.status === 'idle' ? 'secondary' : 'outline'}
                            className={
                              s.status === 'active' ? 'bg-green-100 text-green-800' :
                              s.status === 'idle' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {s.status === 'active' ? 'Activo' : s.status === 'idle' ? 'Inactivo' : 'Cerrado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm">{s.ip}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.location?.city}, {s.location?.country}
                              {s.location?.isVpn && <span className="text-red-500 ml-1">(VPN)</span>}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{s.deviceInfo?.type || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{s.deviceInfo?.platform || 'Unknown'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : '-'}</p>
                            {s.minutesSinceLastSeen !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                {s.minutesSinceLastSeen < 60 
                                  ? `Hace ${s.minutesSinceLastSeen} min`
                                  : `Hace ${Math.floor(s.minutesSinceLastSeen / 60)}h ${s.minutesSinceLastSeen % 60}min`
                                }
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {s.createdAt ? Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60)) : 0}h
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await apiRequest('POST', `/api/admin/sessions/${s.id}/terminate`);
                                  queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
                                  toast({ 
                                    title: 'Sesión terminada', 
                                    description: `La sesión de ${s.user?.username} ha sido terminada y el usuario será redirigido al login`
                                  });
                                } catch (err: any) {
                                  toast({ title: 'Error', description: err.message || String(err), variant: 'destructive' });
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={s.suspicious ? "destructive" : "outline"}
                              size="sm"
                              onClick={async () => {
                                try {
                                  const endpoint = s.suspicious ? 'unflag' : 'flag';
                                  await apiRequest('POST', `/api/admin/sessions/${s.id}/${endpoint}`);
                                  queryClient.invalidateQueries({ queryKey: ['/api/admin/sessions'] });
                                  toast({ 
                                    title: s.suspicious ? 'Marcado como seguro' : 'Marcado como sospechoso',
                                    description: s.suspicious ? 'La sesión ya no está marcada como sospechosa' : 'La sesión ha sido marcada como sospechosa'
                                  });
                                } catch (err: any) {
                                  toast({ title: 'Error', description: err.message || String(err), variant: 'destructive' });
                                }
                              }}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-updates" className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-semibold">Actualizaciones del Sistema</h2>
            <p className="text-sm text-muted-foreground mt-1">Gestiona las actualizaciones automáticas del sistema</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuración de Repositorio GitHub</CardTitle>
              <CardDescription>
                Configura el repositorio de GitHub para comprobar y descargar actualizaciones automáticas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="github-repo">Repositorio (owner/repo)</Label>
                  <Input
                    id="github-repo"
                    placeholder="ejemplo: usuario/repositorio"
                    value={githubConfig.repoUrl}
                    onChange={(e) => setGithubConfig({ ...githubConfig, repoUrl: e.target.value })}
                    data-testid="input-github-repo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato: owner/repo o URL completa de GitHub
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github-branch">Rama</Label>
                  <Input
                    id="github-branch"
                    placeholder="main"
                    value={githubConfig.branch}
                    onChange={(e) => setGithubConfig({ ...githubConfig, branch: e.target.value })}
                    data-testid="input-github-branch"
                  />
                  <p className="text-xs text-muted-foreground">
                    Rama a usar para actualizaciones (por defecto: main)
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveGithubConfigMutation.mutate(githubConfig)}
                  disabled={saveGithubConfigMutation.isPending || !githubConfig.repoUrl}
                  data-testid="button-save-github-config"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveGithubConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Versión Actual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Versión instalada</p>
                  <p className="text-2xl font-bold" data-testid="text-current-version">
                    {versionInfo?.currentVersion || "Cargando..."}
                  </p>
                </div>
                <Button 
                  onClick={() => checkUpdatesMutation.mutate()}
                  disabled={checkingUpdates || checkUpdatesMutation.isPending}
                  className="w-full"
                  data-testid="button-check-updates"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
                  {checkingUpdates ? "Comprobando..." : "Comprobar Actualizaciones"}
                </Button>
              </CardContent>
            </Card>

            {versionInfo?.updateAvailable && (
              <Card>
                <CardHeader>
                  <CardTitle>Actualización Disponible</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nueva versión</p>
                    <p className="text-2xl font-bold text-primary" data-testid="text-latest-version">
                      {versionInfo.latestVersion}
                    </p>
                  </div>
                  {versionInfo.changelog && (
                    <div>
                      <p className="text-sm font-medium mb-1">Novedades:</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-changelog">
                        {versionInfo.changelog}
                      </p>
                    </div>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="default" 
                        className="w-full"
                        data-testid="button-update-now"
                      >
                        Actualizar Ahora
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirmar Actualización</DialogTitle>
                        <DialogDescription>
                          Esta acción actualizará el sistema a la versión {versionInfo.latestVersion}.
                          Se creará un backup automático antes de la actualización.
                          El sistema se reiniciará automáticamente cuando termine.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={(e) => {
                            const dialog = e.currentTarget.closest('[role="dialog"]');
                            dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                          }}
                          data-testid="button-cancel-update"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={() => {
                            performUpdateMutation.mutate();
                            const dialog = document.querySelector('[role="dialog"]');
                            dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                          }}
                          disabled={performUpdateMutation.isPending}
                          data-testid="button-confirm-update"
                        >
                          {performUpdateMutation.isPending ? "Actualizando..." : "Confirmar Actualización"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            {!versionInfo?.updateAvailable && versionInfo?.currentVersion && (
              <Card>
                <CardHeader>
                  <CardTitle>Sistema Actualizado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tu sistema está ejecutando la última versión disponible.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <SystemLogs />

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Backups del Sistema</CardTitle>
              <p className="text-sm text-muted-foreground">
                Historial de backups automáticos y manuales
              </p>
            </CardHeader>
            <CardContent>
              {backupsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : backups && backups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Versión</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          <span>BD</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <FileArchive className="h-3 w-3" />
                          <span>Archivos</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id} data-testid={`row-backup-${backup.id}`}>
                        <TableCell>
                          {new Date(backup.createdAt).toLocaleString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-version-${backup.id}`}>
                            v{backup.version}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-db-size-${backup.id}`}>
                          {backup.dbSize}
                        </TableCell>
                        <TableCell data-testid={`text-files-size-${backup.id}`}>
                          {backup.filesSize}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-restore-${backup.id}`}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restaurar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmar Restauración</DialogTitle>
                                <DialogDescription>
                                  Esta acción restaurará el sistema al estado del backup creado el{' '}
                                  {new Date(backup.createdAt).toLocaleString('es-ES')}.
                                  <br /><br />
                                  <strong>Advertencia:</strong> Esta operación sobrescribirá todos los datos actuales
                                  y el sistema se reiniciará automáticamente.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button 
                                  variant="outline" 
                                  onClick={(e) => {
                                    const dialog = e.currentTarget.closest('[role="dialog"]');
                                    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                                  }}
                                  data-testid={`button-cancel-restore-${backup.id}`}
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => {
                                    restoreBackupMutation.mutate(backup.id);
                                    const dialog = document.querySelector('[role="dialog"]');
                                    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                                  }}
                                  disabled={restoreBackupMutation.isPending}
                                  data-testid={`button-confirm-restore-${backup.id}`}
                                >
                                  {restoreBackupMutation.isPending ? "Restaurando..." : "Confirmar Restauración"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay backups disponibles. Se crean automáticamente durante las actualizaciones.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <StorageConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente de Configuración de Almacenamiento
function StorageConfiguration() {
  const { toast } = useToast();
  const [storageType, setStorageType] = useState<'LOCAL' | 'FTP' | 'SMB'>('LOCAL');
  const [isActive, setIsActive] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [ftpConfig, setFtpConfig] = useState({
    host: '',
    port: '21',
    username: '',
    password: '',
    basePath: '/uploads'
  });

  const [smbConfig, setSmbConfig] = useState({
    host: '',
    shareName: '',
    username: '',
    password: '',
    domain: '',
    basePath: '/uploads'
  });

  // Cargar configuración actual
  const { data: currentConfig, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/storage-config'],
  });

  // Actualizar estado cuando cambian los datos
  useEffect(() => {
    if (currentConfig) {
      setStorageType(currentConfig.type);
      setIsActive(currentConfig.active);
      if (currentConfig.type === 'FTP' && currentConfig.config) {
        setFtpConfig({
          host: currentConfig.config.host || '',
          port: (currentConfig.config.port || 21).toString(),
          username: currentConfig.config.username || '',
          password: '',
          basePath: currentConfig.config.basePath || '/uploads'
        });
      } else if (currentConfig.type === 'SMB' && currentConfig.config) {
        setSmbConfig({
          host: currentConfig.config.host || '',
          shareName: currentConfig.config.shareName || '',
          username: currentConfig.config.username || '',
          password: '',
          domain: currentConfig.config.domain || '',
          basePath: currentConfig.config.basePath || '/uploads'
        });
      }
    }
  }, [currentConfig]);

  // Guardar configuración
  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/admin/storage-config', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/storage-config'] });
      toast({
        title: "Configuración guardada",
        description: "La configuración de almacenamiento se ha actualizado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  });

  // Probar conexión
  const testConnection = async () => {
    setIsTesting(true);
    try {
      const config = storageType === 'FTP' ? ftpConfig : storageType === 'SMB' ? smbConfig : null;
      const response = await apiRequest('POST', '/api/admin/storage-config/test', {
        type: storageType,
        config
      });
      
      toast({
        title: "Conexión exitosa",
        description: response.message || "La conexión se estableció correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error de conexión",
        description: error.message || "No se pudo conectar al servidor",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const config = storageType === 'LOCAL' 
      ? null 
      : storageType === 'FTP'
        ? { ...ftpConfig, port: parseInt(ftpConfig.port) }
        : smbConfig;

    saveConfigMutation.mutate({
      type: storageType,
      active: isActive,
      config
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold">Configuración de Almacenamiento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura dónde se almacenan los archivos del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Proveedor de Almacenamiento</span>
            {currentConfig && (
              <Badge variant={currentConfig.active ? "default" : "secondary"}>
                {currentConfig.active ? "Activo" : "Inactivo"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de tipo */}
          <div className="space-y-2">
            <Label>Tipo de Almacenamiento</Label>
            <Select value={storageType} onValueChange={(value: any) => setStorageType(value)}>
              <SelectTrigger data-testid="select-storage-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">Local (Servidor)</SelectItem>
                <SelectItem value="FTP">FTP</SelectItem>
                <SelectItem value="SMB">SMB/CIFS (NAS)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configuración LOCAL */}
          {storageType === 'LOCAL' && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">Almacenamiento Local</p>
                  <p className="text-sm text-muted-foreground">
                    Los archivos se guardan en el servidor en: <code className="px-1 py-0.5 bg-background rounded text-xs">/uploads</code>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    No requiere configuración adicional.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Configuración FTP */}
          {storageType === 'FTP' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ftp-host">Servidor FTP *</Label>
                  <Input
                    id="ftp-host"
                    value={ftpConfig.host}
                    onChange={(e) => setFtpConfig({ ...ftpConfig, host: e.target.value })}
                    placeholder="ftp.ejemplo.com"
                    data-testid="input-ftp-host"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ftp-port">Puerto *</Label>
                  <Input
                    id="ftp-port"
                    type="number"
                    value={ftpConfig.port}
                    onChange={(e) => setFtpConfig({ ...ftpConfig, port: e.target.value })}
                    placeholder="21"
                    data-testid="input-ftp-port"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ftp-username">Usuario *</Label>
                  <Input
                    id="ftp-username"
                    value={ftpConfig.username}
                    onChange={(e) => setFtpConfig({ ...ftpConfig, username: e.target.value })}
                    data-testid="input-ftp-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ftp-password">Contraseña *</Label>
                  <Input
                    id="ftp-password"
                    type="password"
                    value={ftpConfig.password}
                    onChange={(e) => setFtpConfig({ ...ftpConfig, password: e.target.value })}
                    placeholder="Dejar vacío para mantener actual"
                    data-testid="input-ftp-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftp-basePath">Ruta Base</Label>
                <Input
                  id="ftp-basePath"
                  value={ftpConfig.basePath}
                  onChange={(e) => setFtpConfig({ ...ftpConfig, basePath: e.target.value })}
                  placeholder="/uploads"
                  data-testid="input-ftp-basepath"
                />
              </div>
            </div>
          )}

          {/* Configuración SMB */}
          {storageType === 'SMB' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smb-host">Servidor SMB *</Label>
                  <Input
                    id="smb-host"
                    value={smbConfig.host}
                    onChange={(e) => setSmbConfig({ ...smbConfig, host: e.target.value })}
                    placeholder="192.168.1.100"
                    data-testid="input-smb-host"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smb-share">Nombre del Recurso Compartido *</Label>
                  <Input
                    id="smb-share"
                    value={smbConfig.shareName}
                    onChange={(e) => setSmbConfig({ ...smbConfig, shareName: e.target.value })}
                    placeholder="archivos"
                    data-testid="input-smb-share"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smb-username">Usuario *</Label>
                  <Input
                    id="smb-username"
                    value={smbConfig.username}
                    onChange={(e) => setSmbConfig({ ...smbConfig, username: e.target.value })}
                    data-testid="input-smb-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smb-password">Contraseña *</Label>
                  <Input
                    id="smb-password"
                    type="password"
                    value={smbConfig.password}
                    onChange={(e) => setSmbConfig({ ...smbConfig, password: e.target.value })}
                    placeholder="Dejar vacío para mantener actual"
                    data-testid="input-smb-password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smb-domain">Dominio (opcional)</Label>
                  <Input
                    id="smb-domain"
                    value={smbConfig.domain}
                    onChange={(e) => setSmbConfig({ ...smbConfig, domain: e.target.value })}
                    placeholder="WORKGROUP"
                    data-testid="input-smb-domain"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smb-basePath">Ruta Base</Label>
                  <Input
                    id="smb-basePath"
                    value={smbConfig.basePath}
                    onChange={(e) => setSmbConfig({ ...smbConfig, basePath: e.target.value })}
                    placeholder="/uploads"
                    data-testid="input-smb-basepath"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Switch para activar */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="storage-active" className="font-medium">
                Activar Configuración
              </Label>
              <p className="text-sm text-muted-foreground">
                {isActive 
                  ? "Esta configuración está activa y se usa para nuevos archivos"
                  : "Activa esta configuración para empezar a usarla"
                }
              </p>
            </div>
            <Switch
              id="storage-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid="switch-storage-active"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            {storageType !== 'LOCAL' && (
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTesting}
                data-testid="button-test-connection"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Probando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Probar Conexión
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saveConfigMutation.isPending}
              data-testid="button-save-storage-config"
            >
              {saveConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información sobre migración */}
      {currentConfig && currentConfig.type !== storageType && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <FileArchive className="h-5 w-5" />
              Migración de Archivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Al cambiar el tipo de almacenamiento, los archivos existentes permanecerán en {currentConfig.type}.
              Puedes migrarlos al nuevo almacenamiento desde la sección de mantenimiento.
            </p>
            <Button variant="outline" disabled>
              <FileArchive className="h-4 w-4 mr-2" />
              Migrar Archivos (Próximamente)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
