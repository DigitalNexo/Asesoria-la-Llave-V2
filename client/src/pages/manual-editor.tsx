import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, ArrowLeft, FileText, Paperclip, History, Upload, Download, Trash2, FileCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import { manualTemplates, type ManualTemplate } from "@/lib/manual-templates";
import type { Manual, ManualAttachment, ManualVersion } from "@shared/schema";

export default function ManualEditor() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = location === "/manuales/nuevo" || params.id === "nuevo";
  
  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "",
    etiquetas: [] as string[],
    publicado: false,
    contenidoHtml: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  const { data: manual } = useQuery<Manual>({
    queryKey: ["/api/manuals", params.id],
    enabled: !isNew,
  });

  const { data: attachments = [] } = useQuery<ManualAttachment[]>({
    queryKey: ["/api/manuals", params.id, "attachments"],
    enabled: !isNew,
  });

  const { data: versions = [] } = useQuery<ManualVersion[]>({
    queryKey: ["/api/manuals", params.id, "versions"],
    enabled: !isNew,
  });

  useEffect(() => {
    if (manual && !isNew) {
      setFormData({
        titulo: manual.titulo,
        categoria: manual.categoria || "",
        etiquetas: manual.etiquetas || [],
        publicado: manual.publicado,
        contenidoHtml: manual.contenidoHtml,
      });
    }
  }, [manual, isNew]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { createVersion?: boolean }) => {
      if (isNew) {
        return await apiRequest("POST", "/api/manuals", data);
      } else {
        return await apiRequest("PATCH", `/api/manuals/${params.id}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      toast({ title: isNew ? "Manual creado exitosamente" : "Manual actualizado exitosamente" });
      setLocation("/manuales");
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/manuals/${params.id}/attachments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Error al subir adjunto");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals", params.id, "attachments"] });
      toast({ title: "Adjunto subido correctamente" });
      setAttachmentFile(null);
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      await apiRequest("DELETE", `/api/manuals/${params.id}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals", params.id, "attachments"] });
      toast({ title: "Adjunto eliminado" });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return await apiRequest("POST", `/api/manuals/${params.id}/versions/restore/${versionId}`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      setFormData({
        titulo: data.titulo,
        categoria: data.categoria || "",
        etiquetas: data.etiquetas || [],
        publicado: data.publicado,
        contenidoHtml: data.contenidoHtml,
      });
      toast({ title: "Versión restaurada correctamente" });
    },
  });

  const handleSave = (createVersion = false) => {
    if (!formData.titulo) {
      toast({ title: "Error", description: "El título es requerido", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...formData, createVersion });
  };

  const addTag = () => {
    if (tagInput && !formData.etiquetas.includes(tagInput)) {
      setFormData({ ...formData, etiquetas: [...formData.etiquetas, tagInput] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, etiquetas: formData.etiquetas.filter(t => t !== tag) });
  };

  const handleUploadAttachment = () => {
    if (attachmentFile) {
      uploadAttachmentMutation.mutate(attachmentFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const applyTemplate = (template: ManualTemplate) => {
    setFormData({
      ...formData,
      titulo: formData.titulo || template.nombre,
      categoria: template.categoria,
      etiquetas: [...new Set([...formData.etiquetas, ...template.etiquetas])],
      contenidoHtml: template.contenidoHtml,
    });
    setIsTemplateDialogOpen(false);
    toast({ title: "Plantilla aplicada correctamente" });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/manuales")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">
            {isNew ? "Nuevo Manual" : "Editar Manual"}
          </h1>
        </div>
        {isNew && (
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-use-template">
                <FileCode className="h-4 w-4 mr-2" />
                Usar Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Seleccionar Plantilla</DialogTitle>
                <DialogDescription>
                  Elige una plantilla predefinida para comenzar tu manual
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                {manualTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => applyTemplate(template)}
                    data-testid={`template-${template.id}`}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{template.nombre}</h3>
                      <CardDescription className="text-sm mb-3">
                        {template.descripcion}
                      </CardDescription>
                      <div className="flex gap-2">
                        <Badge variant="outline">{template.categoria}</Badge>
                        {template.etiquetas.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
        <Button 
          variant="outline" 
          onClick={() => handleSave(true)}
          disabled={isNew}
          data-testid="button-save-version"
        >
          Guardar Versión
        </Button>
        <Button onClick={() => handleSave(false)} data-testid="button-save">
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor" data-testid="tab-editor">
            <FileText className="h-4 w-4 mr-2" />
            Editor
          </TabsTrigger>
          {!isNew && (
            <>
              <TabsTrigger value="attachments" data-testid="tab-attachments">
                <Paperclip className="h-4 w-4 mr-2" />
                Adjuntos ({attachments.length})
              </TabsTrigger>
              <TabsTrigger value="versions" data-testid="tab-versions">
                <History className="h-4 w-4 mr-2" />
                Versiones ({versions.length})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Título del manual..."
                    data-testid="input-titulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Editor de Contenido</Label>
                  <RichTextEditor
                    content={formData.contenidoHtml}
                    onChange={(html) => setFormData({ ...formData, contenidoHtml: html })}
                    manualId={params.id}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="ej: Fiscal, Laboral"
                    data-testid="input-categoria"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="etiquetas">Etiquetas</Label>
                  <div className="flex gap-2">
                    <Input
                      id="etiquetas"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Añadir etiqueta"
                      data-testid="input-tag"
                    />
                    <Button type="button" onClick={addTag} data-testid="button-add-tag">
                      +
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.etiquetas.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="cursor-pointer hover-elevate" 
                        onClick={() => removeTag(tag)}
                        data-testid={`badge-tag-${tag}`}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="publicado">Publicado</Label>
                  <Switch
                    id="publicado"
                    checked={formData.publicado}
                    onCheckedChange={(checked) => setFormData({ ...formData, publicado: checked })}
                    data-testid="switch-publicado"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="attachment-file">Subir Adjunto</Label>
                  <Input
                    id="attachment-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    data-testid="input-attachment-file"
                  />
                </div>
                <Button 
                  onClick={handleUploadAttachment}
                  disabled={!attachmentFile || uploadAttachmentMutation.isPending}
                  data-testid="button-upload-attachment"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Adjuntos ({attachments.length})</Label>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                      data-testid={`attachment-${attachment.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(attachment.filePath, '_blank')}
                          data-testid={`button-download-${attachment.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                          data-testid={`button-delete-${attachment.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay adjuntos todavía
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Historial de Versiones ({versions.length})</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Restaura una versión anterior del manual
                </p>
              </div>

              <div className="space-y-2">
                {versions.map((version, index) => (
                  <div 
                    key={version.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`version-${version.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Versión {version.versionNumber} - {version.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreVersionMutation.mutate(version.id)}
                      disabled={index === 0}
                      data-testid={`button-restore-${version.id}`}
                    >
                      <History className="h-4 w-4 mr-2" />
                      {index === 0 ? "Versión Actual" : "Restaurar"}
                    </Button>
                  </div>
                ))}
                {versions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay versiones guardadas. Usa "Guardar Versión" para crear una.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
