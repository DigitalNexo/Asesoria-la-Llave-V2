import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, FileText, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import * as documentsApi from '@/lib/api/documents';

export default function PlantillasPage() {
  const [, setLocation] = useLocation();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [templateContent, setTemplateContent] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const queryClient = useQueryClient();

  // Generar datos de ejemplo para la previsualización
  const getMockData = () => {
    return {
      NUMERO: 'REC-2025-001',
      NOMBRE: 'Ejemplo Cliente SL',
      NIF: 'B12345678',
      EMAIL: 'cliente@ejemplo.com',
      FECHA: new Date().toLocaleDateString('es-ES'),
      CONCEPTO: 'Servicios de asesoría fiscal - Enero 2025',
      BASE: '150.00',
      IVA_PORCENTAJE: '21',
      IVA_IMPORTE: '31.50',
      TOTAL: '181.50',
      NOTAS: 'Gracias por confiar en nuestros servicios.'
    };
  };

  // Reemplazar variables en el HTML de preview
  const getPreviewHTML = useMemo(() => {
    if (!templateContent) return '<p class="text-muted-foreground text-center py-12">El contenido aparecerá aquí...</p>';
    
    const mockData = getMockData();
    let html = templateContent;

    // Reemplazar todas las variables {{variable}}
    Object.entries(mockData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      html = html.replace(regex, String(value));
    });

    // Marcar variables no reemplazadas
    html = html.replace(/{{([^}]+)}}/g, '<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 0.875em;">[$1]</span>');

    return html;
  }, [templateContent]);

  // Queries
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/documents/templates'],
    queryFn: () => documentsApi.listTemplates(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: documentsApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/templates'] });
      setOpenDialog(false);
      setEditingTemplate(null);
      toast({ title: 'Plantilla creada correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => documentsApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/templates'] });
      setOpenDialog(false);
      setEditingTemplate(null);
      toast({ title: 'Plantilla actualizada correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/templates'] });
      toast({ title: 'Plantilla eliminada correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      documentsApi.updateTemplate(id, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/templates'] });
      toast({ title: 'Estado actualizado correctamente' });
    },
  });

  // Handlers
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: any = {
      type: formData.get('type') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      content: formData.get('content') as string,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setTemplateContent(template.content || '');
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenDialog = () => {
    setEditingTemplate(null);
    setTemplateContent('');
    setOpenDialog(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'DATA_PROTECTION': 'Protección de Datos',
      'BANKING_DOMICILIATION': 'Domiciliación Bancaria',
      'RECEIPT': 'Recibo',
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'DATA_PROTECTION': 'bg-blue-100 text-blue-800',
      'BANKING_DOMICILIATION': 'bg-green-100 text-green-800',
      'RECEIPT': 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Filtrar plantillas
  const filteredTemplates = selectedType === 'all'
    ? templates
    : templates.filter((t: any) => t.type === selectedType);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation('/documentacion/documentos')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Plantillas de Documentos</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las plantillas para generar documentos PDF
            </p>
          </div>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </DialogTitle>
              <DialogDescription>
                Las variables disponibles son: {'{{NUMERO}}'}, {'{{NOMBRE}}'}, {'{{NIF}}'}, {'{{EMAIL}}'}, {'{{FECHA}}'}, {'{{CONCEPTO}}'}, {'{{BASE}}'}, {'{{IVA_PORCENTAJE}}'}, {'{{IVA_IMPORTE}}'}, {'{{TOTAL}}'}, {'{{NOTAS}}'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo de Plantilla</Label>
                <Select name="type" defaultValue={editingTemplate?.type || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DATA_PROTECTION">Protección de Datos</SelectItem>
                    <SelectItem value="BANKING_DOMICILIATION">Domiciliación Bancaria</SelectItem>
                    <SelectItem value="RECEIPT">Recibo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Nombre de la Plantilla</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTemplate?.name || ''}
                  placeholder="Ej: Plantilla de Recibo Estándar"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingTemplate?.description || ''}
                  placeholder="Describe el propósito de esta plantilla"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="content">Contenido HTML</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTemplate({ 
                      name: editingTemplate?.name || 'Vista previa',
                      content: templateContent 
                    })}
                    disabled={!templateContent}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Vista Previa
                  </Button>
                </div>
                <Textarea
                  id="content"
                  name="content"
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder="Ingresa el código HTML de la plantilla con las variables {{VARIABLE}}"
                  rows={15}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usa HTML válido. Las variables se reemplazarán automáticamente al generar el PDF.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenDialog(false);
                    setEditingTemplate(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Filtrar por tipo:</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las plantillas</SelectItem>
                <SelectItem value="DATA_PROTECTION">Protección de Datos</SelectItem>
                <SelectItem value="BANKING_DOMICILIATION">Domiciliación Bancaria</SelectItem>
                <SelectItem value="RECEIPT">Recibos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Plantillas */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas Registradas</CardTitle>
          <CardDescription>
            {filteredTemplates.length} plantilla(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando plantillas...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay plantillas registradas. Crea una nueva para comenzar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template: any) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {template.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(template.type)}>
                        {getTypeLabel(template.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActiveMutation.mutate({
                          id: template.id,
                          isActive: template.is_active
                        })}
                      >
                        {template.is_active ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Eye className="w-3 h-3 mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Inactiva
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {new Date(template.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTemplate(template)}
                          title="Vista previa"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal de Vista Previa */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>Vista previa de la plantilla con datos de ejemplo</DialogDescription>
          </DialogHeader>
          <div 
            className="prose max-w-none p-6 bg-white border rounded"
            dangerouslySetInnerHTML={{ 
              __html: previewTemplate?.content 
                ? (() => {
                    const mockData = getMockData();
                    let html = previewTemplate.content;
                    Object.entries(mockData).forEach(([key, value]) => {
                      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
                      html = html.replace(regex, String(value));
                    });
                    html = html.replace(/{{([^}]+)}}/g, '<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 0.875em;">[$1]</span>');
                    return html;
                  })()
                : ''
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
