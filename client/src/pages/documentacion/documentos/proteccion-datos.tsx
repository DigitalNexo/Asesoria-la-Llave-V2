import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Send, FileDown, ArrowLeft, FileCheck, Upload } from 'lucide-react';
import * as documentsApi from '@/lib/api/documents';
import { apiRequest } from '@/lib/queryClient';

export default function ProteccionDatosPage() {
  const [, setLocation] = useLocation();
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ['/api/documents/documents', { type: 'DATA_PROTECTION' }],
    queryFn: () => documentsApi.listDocuments({ type: 'DATA_PROTECTION' }),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest('GET', '/api/clients'),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['/api/documents/templates', { type: 'DATA_PROTECTION' }],
    queryFn: () => documentsApi.listTemplates({ type: 'DATA_PROTECTION', isActive: true }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: documentsApi.createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/documents'] });
      setOpenDialog(false);
      toast({ title: 'Documento creado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: (id: string) => documentsApi.generateDocumentPdf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/documents'] });
      toast({ title: 'PDF generado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ id, to, subject, message }: { id: string; to: string; subject: string; message: string }) =>
      documentsApi.sendDocument(id, to, subject, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/documents'] });
      toast({ title: 'Documento enviado por email correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => documentsApi.acceptDocument(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/documents'] });
      setOpenUploadDialog(false);
      setSignedFile(null);
      toast({ title: 'Documento aceptado y archivo firmado guardado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      type: 'DATA_PROTECTION',
      clientId: formData.get('clientId') as string,
      templateId: formData.get('templateId') as string,
    });
  };

  const handleSend = (document: any) => {
    const client = clients.find((c: any) => c.id === document.clientId);
    if (!client?.email) {
      toast({ title: 'Error', description: 'El cliente no tiene email', variant: 'destructive' });
      return;
    }

    sendMutation.mutate({
      id: document.id,
      to: client.email,
      subject: 'Documento de Protección de Datos - Firma requerida',
      message: 'Adjunto encontrará el documento de protección de datos. Por favor, fírmelo y devuélvalo.',
    });
  };

  const handleUpload = () => {
    if (!selectedDocumentId || !signedFile) {
      toast({ title: 'Error', description: 'Seleccione un archivo', variant: 'destructive' });
      return;
    }

    acceptMutation.mutate({ id: selectedDocumentId, file: signedFile });
  };

  const openUpload = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setOpenUploadDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      BORRADOR: 'secondary',
      ENVIADO: 'default',
      ACEPTADO: 'outline',
      RECHAZADO: 'destructive',
      ARCHIVADO: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getSignatureBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      PENDIENTE: 'secondary',
      FIRMADO: 'default',
      RECHAZADO: 'destructive',
    };
    const colors: Record<string, string> = {
      PENDIENTE: 'text-yellow-600',
      FIRMADO: 'text-green-600',
      RECHAZADO: 'text-red-600',
    };
    return <Badge variant={variants[status] || 'default'} className={colors[status]}>{status}</Badge>;
  };

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
              <FileCheck className="h-8 w-8 text-green-600" />
              Protección de Datos
            </h1>
            <p className="text-muted-foreground">Gestión de documentos de protección de datos</p>
          </div>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Nuevo Documento de Protección de Datos</DialogTitle>
              <DialogDescription>
                Selecciona el cliente y la plantilla para generar el documento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <Select name="clientId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClients ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                      clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nombre_fiscal || client.nombre} - {client.nif}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateId">Plantilla *</Label>
                <Select name="templateId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plantilla..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <SelectItem value="none" disabled>No hay plantillas activas</SelectItem>
                    ) : (
                      templates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando...' : 'Crear Documento'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos de Protección de Datos</CardTitle>
          <CardDescription>Listado de todos los documentos generados</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDocuments ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay documentos. Crea tu primer documento de protección de datos.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plantilla</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Fecha Envío</TableHead>
                  <TableHead>Fecha Firma</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document: any) => {
                  const client = clients.find((c: any) => c.id === document.clientId);
                  const template = templates.find((t: any) => t.id === document.templateId);
                  
                  return (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        {client?.nombre_fiscal || client?.nombre || 'N/A'}
                        <br />
                        <span className="text-xs text-muted-foreground">{client?.nif}</span>
                      </TableCell>
                      <TableCell>{template?.name || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(document.status)}</TableCell>
                      <TableCell>{getSignatureBadge(document.signatureStatus)}</TableCell>
                      <TableCell>
                        {document.sentAt ? new Date(document.sentAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {document.signatureDate ? new Date(document.signatureDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {!document.filePath && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePdfMutation.mutate(document.id)}
                            disabled={generatePdfMutation.isPending}
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            Generar PDF
                          </Button>
                        )}
                        {document.filePath && document.status === 'BORRADOR' && (
                          <Button
                            size="sm"
                            onClick={() => handleSend(document)}
                            disabled={sendMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Enviar
                          </Button>
                        )}
                        {document.status === 'ENVIADO' && document.signatureStatus === 'PENDIENTE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openUpload(document.id)}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Subir Firmado
                          </Button>
                        )}
                        {document.signedFilePath && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/api/documents/documents/${document.id}/signed-pdf`, '_blank')}
                          >
                            <FileCheck className="h-4 w-4 mr-1" />
                            Ver Firmado
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para subir archivo firmado */}
      <Dialog open={openUploadDialog} onOpenChange={setOpenUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento Firmado</DialogTitle>
            <DialogDescription>
              Selecciona el archivo PDF firmado por el cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signedFile">Archivo PDF *</Label>
              <Input
                id="signedFile"
                type="file"
                accept=".pdf"
                onChange={(e) => setSignedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenUploadDialog(false);
                  setSignedFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={!signedFile || acceptMutation.isPending}>
                {acceptMutation.isPending ? 'Subiendo...' : 'Marcar como Aceptado'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
