import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Send, History, Clock, Plus, Edit, Trash2, Copy, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { RichTextEditor } from "@/components/RichTextEditor";

const AVAILABLE_VARIABLES = [
  { key: "{nombre_cliente}", description: "Nombre del cliente" },
  { key: "{email_cliente}", description: "Email del cliente" },
  { key: "{fecha_vencimiento}", description: "Fecha de vencimiento" },
];

export default function Notificaciones() {
  const [activeTab, setActiveTab] = useState("plantillas");
  const { toast } = useToast();

  // Template state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateFormData, setTemplateFormData] = useState({
    nombre: "",
    asunto: "",
    contenidoHTML: "",
  });

  // Send notification state
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [selectedSmtpId, setSelectedSmtpId] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  // Queries
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/notification-templates"],
  });

  const { data: smtpAccounts } = useQuery({
    queryKey: ["/api/admin/smtp-accounts"],
  });

  const { data: notificationHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/notifications/history"],
    enabled: activeTab === "historial",
  });

  const { data: scheduledNotifications, isLoading: scheduledLoading } = useQuery({
    queryKey: ["/api/notifications/scheduled"],
    enabled: activeTab === "programadas",
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateFormData) => {
      return await apiRequest("POST", "/api/notification-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      toast({
        title: "Plantilla creada",
        description: "La plantilla se ha creado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la plantilla.",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof templateFormData }) => {
      return await apiRequest("PATCH", `/api/notification-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      toast({
        title: "Plantilla actualizada",
        description: "La plantilla se ha actualizado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la plantilla.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/notification-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla.",
        variant: "destructive",
      });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: any) => {
      if (scheduleEnabled) {
        return await apiRequest("POST", "/api/notifications/schedule", data);
      } else {
        return await apiRequest("POST", "/api/notifications/send", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/scheduled"] });
      // Reset form
      setSelectedTemplateId("");
      setRecipientType("all");
      setSelectedSmtpId("");
      setScheduleEnabled(false);
      toast({
        title: scheduleEnabled ? "Notificación programada" : "Notificación enviada",
        description: scheduleEnabled 
          ? "La notificación se ha programado correctamente."
          : "La notificación se ha enviado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la notificación.",
        variant: "destructive",
      });
    },
  });

  // Template handlers
  const resetTemplateForm = () => {
    setTemplateFormData({
      nombre: "",
      asunto: "",
      contenidoHTML: "",
    });
    setEditingTemplate(null);
  };

  // Send notification handler
  const handleSendNotification = () => {
    if (!selectedTemplateId) return;

    const template = (templates as any[])?.find((t: any) => String(t.id) === selectedTemplateId);
    if (!template) return;

    sendNotificationMutation.mutate({
      plantillaId: selectedTemplateId,
      smtpAccountId: selectedSmtpId || null,
      destinatarios: recipientType,
      asunto: template.asunto,
      contenido: template.contenidoHTML,
    });
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateFormData({
      nombre: template.nombre,
      asunto: template.asunto,
      contenidoHTML: template.contenidoHTML,
    });
    setIsTemplateDialogOpen(true);
  };

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateFormData });
    } else {
      createTemplateMutation.mutate(templateFormData);
    }
  };

  const insertVariable = (variable: string) => {
    // Insert variable at cursor position in the editor
    const newContent = templateFormData.contenidoHTML + " " + variable + " ";
    setTemplateFormData({ ...templateFormData, contenidoHTML: newContent });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Sistema de Notificaciones</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="plantillas" data-testid="tab-plantillas">
            <FileText className="h-4 w-4 mr-2" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="enviar" data-testid="tab-enviar">
            <Send className="h-4 w-4 mr-2" />
            Enviar Notificación
          </TabsTrigger>
          <TabsTrigger value="historial" data-testid="tab-historial">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="programadas" data-testid="tab-programadas">
            <Clock className="h-4 w-4 mr-2" />
            Programadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plantillas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-display font-semibold">Plantillas de Notificación</h2>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetTemplateForm()} data-testid="button-add-template">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Plantilla
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? "Editar" : "Nueva"} Plantilla</DialogTitle>
                  <DialogDescription>
                    Crea plantillas de notificación reutilizables con variables dinámicas
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitTemplate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-nombre">Nombre de la Plantilla *</Label>
                      <Input
                        id="template-nombre"
                        value={templateFormData.nombre}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, nombre: e.target.value })}
                        placeholder="Ej: Recordatorio de vencimiento"
                        required
                        data-testid="input-template-nombre"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-asunto">Asunto del Email *</Label>
                      <Input
                        id="template-asunto"
                        value={templateFormData.asunto}
                        onChange={(e) => setTemplateFormData({ ...templateFormData, asunto: e.target.value })}
                        placeholder="Ej: Recordatorio: Vencimiento próximo"
                        required
                        data-testid="input-template-asunto"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Variables Disponibles</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_VARIABLES.map((variable) => (
                        <Button
                          key={variable.key}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variable.key)}
                          data-testid={`button-variable-${variable.key}`}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          {variable.key}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Haz clic en una variable para insertarla en el contenido
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-contenido">Contenido HTML *</Label>
                    <RichTextEditor
                      content={templateFormData.contenidoHTML}
                      onChange={(html) => setTemplateFormData({ ...templateFormData, contenidoHTML: html })}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-template">
                      {editingTemplate ? "Actualizar" : "Crear"} Plantilla
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plantillas Creadas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gestiona tus plantillas de notificación reutilizables
              </p>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : templates && (templates as any[]).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Variables Usadas</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(templates as any[]).map((template: any) => {
                      const usedVars = AVAILABLE_VARIABLES.filter((v) =>
                        template.contenidoHTML.includes(v.key)
                      );
                      return (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium" data-testid={`text-template-nombre-${template.id}`}>
                            {template.nombre}
                          </TableCell>
                          <TableCell data-testid={`text-template-asunto-${template.id}`}>
                            {template.asunto}
                          </TableCell>
                          <TableCell data-testid={`text-template-tipo-${template.id}`}>
                            <Badge 
                              variant={
                                template.tipo === 'RECORDATORIO' ? 'default' : 
                                template.tipo === 'URGENTE' ? 'destructive' : 
                                'secondary'
                              }
                              className="text-xs"
                            >
                              {template.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-template-variables-${template.id}`}>
                            <div className="flex flex-wrap gap-1">
                              {usedVars.length > 0 ? (
                                usedVars.map((v) => (
                                  <Badge 
                                    key={v.key} 
                                    variant="secondary" 
                                    className="text-xs"
                                    data-testid={`badge-variable-${v.key.replace(/[{}]/g, '')}-${template.id}`}
                                  >
                                    {v.key}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">Sin variables</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTemplate(template)}
                                data-testid={`button-edit-template-${template.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                                data-testid={`button-delete-template-${template.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay plantillas creadas. Crea una para empezar.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enviar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Notificación</CardTitle>
              <p className="text-sm text-muted-foreground">
                Envía notificaciones inmediatas o programadas a tus clientes.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                {/* Selector de Plantilla */}
                <div className="space-y-2">
                  <Label htmlFor="template-select" data-testid="label-template-select">
                    Plantilla
                  </Label>
                  <select
                    id="template-select"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    data-testid="select-template"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="">Selecciona una plantilla</option>
                    {(templates as any[])?.map((template: any) => (
                      <option key={template.id} value={template.id} data-testid={`option-template-${template.id}`}>
                        {template.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Destinatarios */}
                <div className="space-y-2">
                  <Label data-testid="label-recipients">Destinatarios</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="all-clients"
                        name="recipients"
                        value="all"
                        checked={recipientType === "all"}
                        onChange={(e) => setRecipientType(e.target.value)}
                        data-testid="radio-recipients-all"
                      />
                      <Label htmlFor="all-clients" className="font-normal cursor-pointer">
                        Todos los clientes activos
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="autonomos"
                        name="recipients"
                        value="AUTONOMO"
                        checked={recipientType === "AUTONOMO"}
                        onChange={(e) => setRecipientType(e.target.value)}
                        data-testid="radio-recipients-autonomo"
                      />
                      <Label htmlFor="autonomos" className="font-normal cursor-pointer">
                        Solo autónomos
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="empresas"
                        name="recipients"
                        value="EMPRESA"
                        checked={recipientType === "EMPRESA"}
                        onChange={(e) => setRecipientType(e.target.value)}
                        data-testid="radio-recipients-empresa"
                      />
                      <Label htmlFor="empresas" className="font-normal cursor-pointer">
                        Solo empresas
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Selector de Cuenta SMTP */}
                <div className="space-y-2">
                  <Label htmlFor="smtp-select" data-testid="label-smtp-select">
                    Cuenta SMTP
                  </Label>
                  <select
                    id="smtp-select"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    data-testid="select-smtp"
                    value={selectedSmtpId}
                    onChange={(e) => setSelectedSmtpId(e.target.value)}
                  >
                    <option value="">Usar cuenta predeterminada</option>
                    {(smtpAccounts as any[])?.map((account: any) => (
                      <option key={account.id} value={account.id} data-testid={`option-smtp-${account.id}`}>
                        {account.nombre} {account.isPredeterminada ? "(Predeterminada)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview de Plantilla */}
                <div className="space-y-2">
                  <Label data-testid="label-preview">Vista Previa</Label>
                  <div className="border rounded-md p-4 bg-muted/50 min-h-[200px]" data-testid="div-preview">
                    {selectedTemplateId ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ 
                          __html: (templates as any[])?.find((t: any) => String(t.id) === selectedTemplateId)?.contenidoHTML
                            ?.replace(/{nombre_cliente}/g, '<strong class="text-primary">Cliente Ejemplo</strong>')
                            ?.replace(/{email_cliente}/g, '<strong class="text-primary">ejemplo@email.com</strong>')
                            ?.replace(/{fecha_vencimiento}/g, '<strong class="text-primary">31/12/2025</strong>') || '<p class="text-sm text-muted-foreground">No se encontró la plantilla</p>'
                        }} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Selecciona una plantilla para ver la vista previa
                      </p>
                    )}
                  </div>
                </div>

                {/* Opciones de Envío */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="schedule-send"
                      data-testid="checkbox-schedule"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                    />
                    <Label htmlFor="schedule-send" className="font-normal cursor-pointer">
                      Programar envío
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="default"
                      data-testid="button-send-notification"
                      disabled={!selectedTemplateId || sendNotificationMutation.isPending}
                      onClick={handleSendNotification}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendNotificationMutation.isPending 
                        ? "Enviando..." 
                        : scheduleEnabled ? "Programar Envío" : "Enviar Ahora"
                      }
                    </Button>
                    <Button
                      variant="outline"
                      data-testid="button-cancel-send"
                      onClick={() => {
                        setSelectedTemplateId("");
                        setRecipientType("all");
                        setSelectedSmtpId("");
                        setScheduleEnabled(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Notificaciones</CardTitle>
              <p className="text-sm text-muted-foreground">
                Consulta todas las notificaciones enviadas y su estado.
              </p>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por destinatario..."
                    data-testid="input-search-history"
                  />
                </div>
                <select
                  className="rounded-md border border-input bg-background px-3 py-2"
                  data-testid="select-status-filter"
                >
                  <option value="">Todos los estados</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="ERROR">Error</option>
                  <option value="PENDIENTE">Pendiente</option>
                </select>
              </div>

              {/* Tabla de Historial */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cuenta SMTP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (notificationHistory as any[])?.length > 0 ? (
                    (notificationHistory as any[]).map((notification: any) => (
                      <TableRow key={notification.id} data-testid={`row-history-${notification.id}`}>
                        <TableCell data-testid={`text-history-date-${notification.id}`}>
                          {new Date(notification.fechaEnvio).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell data-testid={`text-history-template-${notification.id}`}>
                          {notification.template?.nombre || "N/A"}
                        </TableCell>
                        <TableCell data-testid={`text-history-recipients-${notification.id}`}>
                          {notification.destinatarios === "all" ? "Todos" : notification.destinatarios}
                        </TableCell>
                        <TableCell data-testid={`text-history-status-${notification.id}`}>
                          <Badge variant={notification.estado === "ENVIADO" ? "default" : "destructive"}>
                            {notification.estado}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-history-smtp-${notification.id}`}>
                          {notification.smtpAccount?.nombre || "Predeterminada"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground" data-testid="text-empty-history">
                        No hay notificaciones en el historial
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programadas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones Programadas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gestiona y consulta las notificaciones que están programadas para envío futuro.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha Programada</TableHead>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Destinatarios</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (scheduledNotifications as any[])?.length > 0 ? (
                    (scheduledNotifications as any[]).map((notification: any) => (
                      <TableRow key={notification.id} data-testid={`row-scheduled-${notification.id}`}>
                        <TableCell data-testid={`text-scheduled-date-${notification.id}`}>
                          {new Date(notification.fechaProgramada).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell data-testid={`text-scheduled-template-${notification.id}`}>
                          {notification.template?.nombre || "N/A"}
                        </TableCell>
                        <TableCell data-testid={`text-scheduled-recipients-${notification.id}`}>
                          {notification.destinatariosSeleccionados === "all" ? "Todos" : notification.destinatariosSeleccionados}
                        </TableCell>
                        <TableCell data-testid={`text-scheduled-status-${notification.id}`}>
                          <Badge variant="secondary">
                            {notification.estado}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`div-scheduled-actions-${notification.id}`}>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-edit-scheduled-${notification.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-cancel-scheduled-${notification.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground" data-testid="text-empty-scheduled">
                        No hay notificaciones programadas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
