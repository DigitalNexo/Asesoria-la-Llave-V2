import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import TemplateEditor from '@/components/TemplateEditor';
import { 
  Plus, Edit, Trash2, Copy, Star, StarOff, Eye, FileText,
  Building2, User, Home, Scale
} from 'lucide-react';

type BudgetType = 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS';
type CompanyBrand = 'LA_LLAVE' | 'GESTORIA_ONLINE';

interface BudgetTemplate {
  id: string;
  name: string;
  description: string | null;
  type: BudgetType;
  companyBrand: CompanyBrand;
  htmlContent: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const BUDGET_TYPE_ICONS = {
  PYME: <Building2 className="h-4 w-4" />,
  AUTONOMO: <User className="h-4 w-4" />,
  RENTA: <Home className="h-4 w-4" />,
  HERENCIAS: <Scale className="h-4 w-4" />,
};

const BUDGET_TYPE_LABELS = {
  PYME: 'Empresas',
  AUTONOMO: 'Autónomos',
  RENTA: 'Renta',
  HERENCIAS: 'Herencias',
};

export default function BudgetTemplatesManager() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateType, setTemplateType] = useState<BudgetType>('PYME');
  const [templateBrand, setTemplateBrand] = useState<CompanyBrand>('LA_LLAVE');
  const [templateContent, setTemplateContent] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<BudgetTemplate | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generar datos de ejemplo según el tipo de presupuesto
  const getMockData = (type: BudgetType, brand: CompanyBrand) => {
    const commonData = {
      codigo: 'PREV-2025-001',
      fecha: new Date().toLocaleDateString('es-ES'),
      nombre_contacto: 'Juan Pérez García',
      email: 'juan.perez@ejemplo.com',
      telefono: '666 777 888',
      subtotal: '150,00 €',
      iva: '31,50 €',
      total: '181,50 €',
      empresa: brand === 'LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online',
      descripcion: 'Este es un presupuesto de ejemplo para visualizar el diseño de la plantilla.',
    };

    const specificData: Record<BudgetType, any> = {
      PYME: {
        nombre_sociedad: 'Tecnologías Avanzadas SL',
        actividad: 'Desarrollo de software',
        periodo_declaraciones: 'Trimestral',
        num_asientos: '50',
        nominas_mes: '5',
      },
      AUTONOMO: {
        sistema_tributacion: 'Estimación Directa',
        facturacion_anual: '45.000,00 €',
        num_facturas: '120',
      },
      RENTA: {
        tipo_declaracion: 'Individual',
        ingresos: '35.000,00 €',
        retenciones: '5.250,00 €',
      },
      HERENCIAS: {
        titulo_sucesorio: 'Testamento',
        num_herederos: '3',
        fincas_madrid: 'Sí',
        caudal: '180.000,00 €',
        tipo_proceso: 'Normal',
      },
    };

    return { ...commonData, ...specificData[type] };
  };

  // Reemplazar variables en el HTML de preview
  const getPreviewHTML = useMemo(() => {
    if (!templateContent) return '<p class="text-muted-foreground text-center py-12">El contenido aparecerá aquí...</p>';
    
    const mockData = getMockData(templateType, templateBrand);
    let html = templateContent;

    // Reemplazar todas las variables {{variable}}
    Object.entries(mockData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      html = html.replace(regex, String(value));
    });

    // Marcar variables no reemplazadas
    html = html.replace(/{{([^}]+)}}/g, '<span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 0.875em;">[$1]</span>');

    return html;
  }, [templateContent, templateType, templateBrand]);

  // Obtener plantillas
  const { data: templates, isLoading } = useQuery<BudgetTemplate[]>({
    queryKey: ['/api/budget-templates'],
  });

  // Crear plantilla
  const createMutation = useMutation({
    mutationFn: async (data: Partial<BudgetTemplate>) => {
      const res = await fetch('/api/budget-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al crear plantilla');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget-templates'] });
      toast({ title: '✅ Plantilla creada correctamente' });
      closeEditor();
    },
    onError: () => {
      toast({ title: '❌ Error al crear plantilla', variant: 'destructive' });
    },
  });

  // Actualizar plantilla
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetTemplate> }) => {
      const res = await fetch(`/api/budget-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al actualizar plantilla');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget-templates'] });
      toast({ title: '✅ Plantilla actualizada correctamente' });
      closeEditor();
    },
    onError: () => {
      toast({ title: '❌ Error al actualizar plantilla', variant: 'destructive' });
    },
  });

  // Eliminar plantilla
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/budget-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al eliminar plantilla');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget-templates'] });
      toast({ title: '✅ Plantilla eliminada correctamente' });
    },
    onError: () => {
      toast({ title: '❌ Error al eliminar plantilla', variant: 'destructive' });
    },
  });

  // Establecer como predeterminada
  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, type, brand }: { id: string; type: BudgetType; brand: CompanyBrand }) => {
      const res = await fetch(`/api/budget-templates/${id}/set-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, companyBrand: brand }),
      });
      if (!res.ok) throw new Error('Error al establecer plantilla predeterminada');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget-templates'] });
      toast({ title: '✅ Plantilla establecida como predeterminada' });
    },
  });

  const openEditor = (template?: BudgetTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setTemplateType(template.type);
      setTemplateBrand(template.companyBrand);
      setTemplateContent(template.htmlContent);
    } else {
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateType('PYME');
      setTemplateBrand('LA_LLAVE');
      setTemplateContent('');
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateContent('');
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }

    if (!templateContent.trim()) {
      toast({ title: 'El contenido no puede estar vacío', variant: 'destructive' });
      return;
    }

    const data = {
      name: templateName,
      description: templateDescription || null,
      type: templateType,
      companyBrand: templateBrand,
      htmlContent: templateContent,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDuplicate = (template: BudgetTemplate) => {
    const data = {
      name: `${template.name} (Copia)`,
      description: template.description,
      type: template.type,
      companyBrand: template.companyBrand,
      htmlContent: template.htmlContent,
      isDefault: false,
    };
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Button onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p>Cargando plantillas...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plantillas disponibles</CardTitle>
            <CardDescription>
              {templates?.length || 0} plantillas configuradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {BUDGET_TYPE_ICONS[template.type]}
                        {template.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {BUDGET_TYPE_LABELS[template.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={template.companyBrand === 'LA_LLAVE' ? 'default' : 'secondary'}
                      >
                        {template.companyBrand === 'LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {template.isDefault && (
                          <Badge variant="default">
                            <Star className="h-3 w-3 mr-1" />
                            Predeterminada
                          </Badge>
                        )}
                        {template.isActive ? (
                          <Badge variant="outline" className="text-green-600">Activa</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">Inactiva</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(template.updatedAt).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {!template.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDefaultMutation.mutate({
                              id: template.id,
                              type: template.type,
                              brand: template.companyBrand
                            })}
                            title="Establecer como predeterminada"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewTemplate(template)}
                          title="Vista previa"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditor(template)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicate(template)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(template.id)}
                          title="Eliminar"
                          disabled={template.isDefault}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!templates || templates.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay plantillas configuradas</p>
                      <p className="text-sm">Crea tu primera plantilla para comenzar</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Editor Dialog with Live Preview */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
            <DialogDescription>
              Personaliza el diseño del PDF. Los cambios se previsualizan en tiempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 h-[75vh]">
            {/* Left Panel - Editor */}
            <div className="space-y-4 overflow-y-auto pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la plantilla *</Label>
                  <Input
                    placeholder="Ej: Presupuesto PYME Estándar"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de presupuesto *</Label>
                  <Select value={templateType} onValueChange={(v: BudgetType) => setTemplateType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PYME">Empresas (PYME)</SelectItem>
                      <SelectItem value="AUTONOMO">Autónomos</SelectItem>
                      <SelectItem value="RENTA">Declaración de Renta</SelectItem>
                      <SelectItem value="HERENCIAS">Herencias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select value={templateBrand} onValueChange={(v: CompanyBrand) => setTemplateBrand(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LA_LLAVE">Asesoría La Llave</SelectItem>
                      <SelectItem value="GESTORIA_ONLINE">Gestoría Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea
                  placeholder="Breve descripción de la plantilla..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Contenido de la plantilla *</Label>
                <TemplateEditor
                  initialContent={templateContent}
                  budgetType={templateType}
                  onChange={setTemplateContent}
                />
              </div>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="border-l pl-6 overflow-y-auto">
              <div className="sticky top-0 bg-background pb-3 mb-3 border-b z-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Vista Previa en Tiempo Real</h3>
                  <Badge variant="secondary" className="text-xs">
                    {templateBrand === 'LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Datos de ejemplo • Las variables se reemplazan automáticamente
                </p>
              </div>
              
              <div 
                className="prose prose-sm max-w-none p-6 bg-white border rounded shadow-sm"
                dangerouslySetInnerHTML={{ 
                  __html: getPreviewHTML
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>Vista previa de la plantilla</DialogDescription>
          </DialogHeader>
          <div 
            className="prose max-w-none p-6 bg-white border rounded"
            dangerouslySetInnerHTML={{ __html: previewTemplate?.htmlContent || '' }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
