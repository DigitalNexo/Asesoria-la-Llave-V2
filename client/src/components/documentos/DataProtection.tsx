import { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DataProtectionDoc {
  id: string;
  clientName: string;
  email: string;
  consentDate: string;
  dataTypes: string[];
  status: 'pending' | 'signed' | 'archived';
  signedDate?: string;
}

const DEFAULT_DATA_PROTECTION_TEMPLATE = `
DOCUMENTO DE PROTECCIÓN DE DATOS
================================

En cumplimiento con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo de 27 de abril de 2016 (RGPD), 
así como con la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD),

RESPONSABLE DEL TRATAMIENTO:
[Nombre de la Empresa]
[Dirección]
[Correo Electrónico]

INTERESADO:
[Nombre del Cliente]
[Email]

El cliente ACEPTA Y CONSIENTE:

1. El tratamiento de sus datos personales para la prestación de servicios de asesoramiento fiscal y contable.

2. El almacenamiento seguro de sus datos en sistemas informáticos de la empresa.

3. La comunicación de sus datos a terceros únicamente cuando sea legalmente requerido.

4. El derecho a acceder, rectificar o suprimir sus datos personales.

5. La política de confidencialidad y protección de datos de la empresa.

FIRMA DEL CLIENTE:

Fdo.: _________________________
Fecha: _________________________

FIRMA DE LA EMPRESA:

Fdo.: _________________________
Fecha: _________________________
`;

export function DataProtection() {
  const [documents, setDocuments] = useState<DataProtectionDoc[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    dataTypes: ['personal', 'fiscal', 'bancaria'] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (dataType: string) => {
    setFormData((prev) => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(dataType)
        ? prev.dataTypes.filter((dt) => dt !== dataType)
        : [...prev.dataTypes, dataType],
    }));
  };

  const handleGenerateDocument = async () => {
    if (!formData.clientName || !formData.email || formData.dataTypes.length === 0) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const doc = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type: 'data_protection',
          name: `Documento Protección Datos - ${formData.clientName}`,
          description: `Consentimiento RGPD para: ${formData.dataTypes.join(', ')}`,
        }),
      });

      if (!doc.ok) throw new Error('Error al crear documento');

      const newDoc = await doc.json();

      setDocuments((prev) => [
        ...prev,
        {
          id: newDoc.id,
          clientName: formData.clientName,
          email: formData.email,
          consentDate: new Date().toISOString().split('T')[0],
          dataTypes: formData.dataTypes,
          status: 'pending',
        },
      ]);

      setFormData({
        clientName: '',
        email: '',
        dataTypes: ['personal', 'fiscal', 'bancaria'],
      });
      setShowDialog(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar el documento');
    }
  };

  const handleSignDocument = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          signatureType: 'digital',
        }),
      });

      if (!response.ok) throw new Error('Error al firmar documento');

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                status: 'signed',
                signedDate: new Date().toISOString().split('T')[0],
              }
            : doc
        )
      );

      alert('Documento firmado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al firmar el documento');
    }
  };

  const handleDownloadDocument = async (docId: string, clientName: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proteccion-datos-${clientName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Documentos Protección de Datos (RGPD)</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generar Documento RGPD</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nombre del Cliente *</label>
                <Input
                  name="clientName"
                  placeholder="Ej: Juan García López"
                  value={formData.clientName}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email del Cliente *</label>
                <Input
                  name="email"
                  type="email"
                  placeholder="Ej: juan@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Tipos de Datos *</label>
                <div className="space-y-2">
                  {[
                    { id: 'personal', label: 'Datos Personales' },
                    { id: 'fiscal', label: 'Datos Fiscales' },
                    { id: 'bancaria', label: 'Datos Bancarios' },
                    { id: 'empleados', label: 'Datos de Empleados' },
                  ].map((type) => (
                    <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.dataTypes.includes(type.id)}
                        onChange={() => handleCheckboxChange(type.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGenerateDocument}>
                  Generar Documento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No hay documentos de protección de datos</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 border rounded-lg hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{doc.clientName}</h3>
                  <p className="text-sm text-gray-600">{doc.email}</p>
                  <div className="flex gap-2 mt-2">
                    {doc.dataTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                      >
                        {type === 'personal'
                          ? 'Personales'
                          : type === 'fiscal'
                          ? 'Fiscales'
                          : type === 'bancaria'
                          ? 'Bancarios'
                          : 'Empleados'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {doc.status === 'signed' ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold">Firmado</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold">Pendiente</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(doc.consentDate).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {doc.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => handleSignDocument(doc.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Firmar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadDocument(doc.id, doc.clientName)}
                >
                  Descargar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
