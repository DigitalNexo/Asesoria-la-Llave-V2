import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, FileStack, Edit, Trash2, Copy } from 'lucide-react';
import * as documentsApi from '@/lib/api/documents';

const AVAILABLE_VARIABLES = [
  { key: 'CLIENTE_NOMBRE', description: 'Nombre del cliente' },
  { key: 'CLIENTE_NIF', description: 'NIF del cliente' },
  { key: 'CLIENTE_EMAIL', description: 'Email del cliente' },
  { key: 'CLIENTE_TELEFONO', description: 'Teléfono del cliente' },
  { key: 'CLIENTE_DIRECCION', description: 'Dirección completa del cliente' },
  { key: 'FECHA', description: 'Fecha actual' },
  { key: 'FECHA_FORMATO', description: 'Fecha con formato (dd/mm/yyyy)' },
];

export default function PlantillasPage() {
  const [, setLocation] = useLocation();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<'DATA_PROTECTION' | 'BANKING_DOMICILIATION'>('DATA_PROTECTION');
  const queryClient = useQueryClient();

  // Queries
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/documents/templates'],
    queryFn: () => documentsApi.listTemplates({}),
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      type: formData.get('type') as string,
      name: formData.get('name') as string,
      content: formData.get('content') as string,
      isActive: formData.get('isActive') === 'on',
      availableVars: AVAILABLE_VARIABLES.map(v => v.key),
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast({ title: 'Variable copiada', description: `{{${variable}}} copiado al portapapeles` });
  };

  const openNewDialog = () => {
    setEditingTemplate(null);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditingTemplate(null);
  };

  const filteredTemplates = selectedType 
    ? templates.filter((t: any) => t.type === selectedType)
    : templates;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/documentacion/documentos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileStack className="h-8 w-8 text-orange-600" />
              Plantillas de Documentos
            </h1>
            <p className="text-muted-foreground">Gestión de plantillas para documentos</p>
          </div>
        </div>
        <Dialog open={openDialog} onOpenChange={(open) => !open && closeDialog()}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate 
                  ? 'Modifica los datos de la plantilla' 
                  : 'Crea una nueva plantilla de documento'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Documento *</Label>
                  <Select name="type" required defaultValue={editingTemplate?.type || 'DATA_PROTECTION'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DATA_PROTECTION">Protección de Datos</SelectItem>
                      <SelectItem value="BANKING_DOMICILIATION">Domiciliación Bancaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Plantilla *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ej: Plantilla RGPD Estándar"
                    required
                    defaultValue={editingTemplate?.name || ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive" className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    name="isActive"
                    defaultChecked={editingTemplate?.isActive ?? true}
                  />
                  <span>Plantilla activa</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las plantillas inactivas no aparecerán al crear documentos
                </p>
              </div>

              <div className="space-y-2">
                <Label>Variables Disponibles</Label>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-md">
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <div key={variable.key} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex-1">
                        <code className="text-sm font-mono text-blue-600">
                          {`{{${variable.key}}}`}
                        </code>
                        <p className="text-xs text-muted-foreground">{variable.description}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyVariable(variable.key)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Haz clic en el icono para copiar la variable. Las variables se sustituirán automáticamente al generar el documento.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenido de la Plantilla *</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Escribe el contenido de la plantilla aquí. Usa las variables de arriba para incluir datos dinámicos..."
                  required
                  rows={15}
                  className="font-mono text-sm"
                  defaultValue={editingTemplate?.content || ''}
                />
                <p className="text-sm text-muted-foreground">
                  Ejemplo: "Don/Doña {'{{CLIENTE_NOMBRE}}'}, con NIF {'{{CLIENTE_NIF}}'}, acepta..."
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingTemplate ? 'Actualizar' : 'Crear Plantilla'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar Plantillas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={selectedType === 'DATA_PROTECTION' ? 'default' : 'outline'}
              onClick={() => setSelectedType('DATA_PROTECTION')}
            >
              Protección de Datos
            </Button>
            <Button
              variant={selectedType === 'BANKING_DOMICILIATION' ? 'default' : 'outline'}
              onClick={() => setSelectedType('BANKING_DOMICILIATION')}
            >
              Domiciliación Bancaria
            </Button>
            <Button
              variant={!selectedType ? 'default' : 'outline'}
              onClick={() => setSelectedType('' as any)}
            >
              Todas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de plantillas */}
      <Card>
        <CardHeader>
          <CardTitle>Plantillas</CardTitle>
          <CardDescription>
            {filteredTemplates.length} plantilla(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay plantillas. Crea tu primera plantilla.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contenido</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template: any) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      {template.type === 'DATA_PROTECTION' ? (
                        <Badge variant="outline" className="bg-green-50">Protección de Datos</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-50">Domiciliación Bancaria</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.isActive ? (
                        <Badge variant="default">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate text-sm text-muted-foreground">
                        {template.content.substring(0, 100)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(template.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
