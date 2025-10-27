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

interface BankingDomiciliationDoc {
  id: string;
  clientName: string;
  email: string;
  bankAccount: string;
  monthlyAmount: number;
  concept: string;
  status: 'pending' | 'signed' | 'active' | 'cancelled';
  signedDate?: string;
  startDate?: string;
}

export function BankingDomiciliation() {
  const [documents, setDocuments] = useState<BankingDomiciliationDoc[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    bankAccount: '',
    monthlyAmount: '',
    concept: 'Honorarios profesionales de asesoramiento',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerateDocument = async () => {
    if (!formData.clientName || !formData.email || !formData.bankAccount || !formData.monthlyAmount) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar IBAN
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(formData.bankAccount.replace(/\s/g, ''))) {
      alert('Por favor ingresa un IBAN válido');
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
          type: 'banking_domiciliation',
          name: `Domiciliación Bancaria - ${formData.clientName}`,
          description: `Autorización de domiciliación de ${formData.monthlyAmount}€ mensuales`,
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
          bankAccount: formData.bankAccount,
          monthlyAmount: parseFloat(formData.monthlyAmount),
          concept: formData.concept,
          status: 'pending',
        },
      ]);

      setFormData({
        clientName: '',
        email: '',
        bankAccount: '',
        monthlyAmount: '',
        concept: 'Honorarios profesionales de asesoramiento',
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

      alert('Documento de domiciliación firmado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al firmar el documento');
    }
  };

  const handleActivateDomiciliation = async (docId: string) => {
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: 'active',
        }),
      });

      if (!response.ok) throw new Error('Error al activar domiciliación');

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                status: 'active',
                startDate: new Date().toISOString().split('T')[0],
              }
            : doc
        )
      );

      alert('Domiciliación activada correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al activar domiciliación');
    }
  };

  const handleCancelDomiciliation = async (docId: string) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta domiciliación?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      });

      if (!response.ok) throw new Error('Error al cancelar domiciliación');

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === docId ? { ...doc, status: 'cancelled' } : doc
        )
      );

      alert('Domiciliación cancelada correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cancelar domiciliación');
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
      a.download = `domiciliacion-${clientName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'signed':
        return 'bg-blue-50 border-blue-200';
      case 'active':
        return 'bg-green-50 border-green-200';
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente Firma', color: 'text-yellow-600' };
      case 'signed':
        return { label: 'Firmado (Pendiente Activar)', color: 'text-blue-600' };
      case 'active':
        return { label: 'Activo', color: 'text-green-600' };
      case 'cancelled':
        return { label: 'Cancelado', color: 'text-red-600' };
      default:
        return { label: status, color: 'text-gray-600' };
    }
  };

  const maskIBAN = (iban: string) => {
    const cleaned = iban.replace(/\s/g, '');
    return `${cleaned.substring(0, 4)}...${cleaned.substring(cleaned.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Domiciliación Bancaria de Honorarios</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Domiciliación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Domiciliación Bancaria</DialogTitle>
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
                <label className="block text-sm font-semibold mb-2">IBAN *</label>
                <Input
                  name="bankAccount"
                  placeholder="Ej: ES91 1234 5678 9123 4567 8901"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-gray-500 mt-1">Formato: ES + 20 dígitos</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Importe Mensual (€) *</label>
                <Input
                  name="monthlyAmount"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 500.00"
                  value={formData.monthlyAmount}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Concepto</label>
                <textarea
                  name="concept"
                  placeholder="Concepto de los honorarios"
                  value={formData.concept}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
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
          <p>No hay domiciliaciones bancarias registradas</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`p-4 border rounded-lg hover:shadow-md transition ${getStatusColor(
                doc.status
              )}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{doc.clientName}</h3>
                  <p className="text-sm text-gray-600">{doc.email}</p>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>IBAN: <strong>{maskIBAN(doc.bankAccount)}</strong></p>
                    <p>Importe: <strong>{doc.monthlyAmount.toFixed(2)}€ mensuales</strong></p>
                    <p>Concepto: <strong>{doc.concept}</strong></p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-sm font-semibold ${getStatusLabel(doc.status).color}`}>
                    {getStatusLabel(doc.status).label}
                  </span>
                  {doc.startDate && (
                    <span className="text-xs text-gray-500">
                      Desde: {new Date(doc.startDate).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                {doc.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => handleSignDocument(doc.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Firmar
                  </Button>
                )}
                {doc.status === 'signed' && (
                  <Button
                    size="sm"
                    onClick={() => handleActivateDomiciliation(doc.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Activar Domiciliación
                  </Button>
                )}
                {doc.status === 'active' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleCancelDomiciliation(doc.id)}
                  >
                    Cancelar
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
