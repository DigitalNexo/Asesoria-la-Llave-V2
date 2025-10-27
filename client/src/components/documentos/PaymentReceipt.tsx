import { useState } from 'react';
import { FileText, Download, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PaymentReceiptData {
  id: string;
  clientName: string;
  amount: number;
  concept: string;
  date: string;
  reference: string;
  status: 'draft' | 'generated' | 'sent';
}

export function PaymentReceipt() {
  const [receipts, setReceipts] = useState<PaymentReceiptData[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    amount: '',
    concept: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerateReceipt = async () => {
    if (!formData.clientName || !formData.amount || !formData.concept) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const receipt = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type: 'payment_receipt',
          name: `Recibo de Pago - ${formData.clientName} - ${formData.date}`,
          description: `Recibo por concepto: ${formData.concept}`,
          client_id: null,
        }),
      });

      if (!receipt.ok) throw new Error('Error al crear recibo');

      const newReceipt = await receipt.json();

      setReceipts((prev) => [
        ...prev,
        {
          id: newReceipt.id,
          clientName: formData.clientName,
          amount: parseFloat(formData.amount),
          concept: formData.concept,
          date: formData.date,
          reference: formData.reference,
          status: 'generated',
        },
      ]);

      setFormData({
        clientName: '',
        amount: '',
        concept: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
      });
      setShowDialog(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar el recibo');
    }
  };

  const handleDownloadReceipt = async (receipt: PaymentReceiptData) => {
    try {
      const response = await fetch(`/api/documents/${receipt.id}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-${receipt.reference || receipt.clientName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleViewReceipt = (receipt: PaymentReceiptData) => {
    // Implementar visor de recibos
    console.log('Viewing receipt:', receipt);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Recibos de Pago</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Recibo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generar Recibo de Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Nombre del Cliente *</label>
                <Input
                  name="clientName"
                  placeholder="Ej: Juan García"
                  value={formData.clientName}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Importe (€) *</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 1500.00"
                  value={formData.amount}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Concepto *</label>
                <textarea
                  name="concept"
                  placeholder="Ej: Asesoramiento fiscal trimestral Q3 2025"
                  value={formData.concept}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Fecha</label>
                <Input
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Referencia / Número de Recibo</label>
                <Input
                  name="reference"
                  placeholder="Ej: RCP-2025-001"
                  value={formData.reference}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleGenerateReceipt}>
                  Generar Recibo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No hay recibos generados</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="p-4 border rounded-lg hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{receipt.clientName}</h3>
                  <p className="text-sm text-gray-600">{receipt.concept}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>Importe: <strong className="text-gray-900">{receipt.amount.toFixed(2)}€</strong></span>
                    <span>Fecha: <strong className="text-gray-900">{new Date(receipt.date).toLocaleDateString('es-ES')}</strong></span>
                    {receipt.reference && (
                      <span>Ref: <strong className="text-gray-900">{receipt.reference}</strong></span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    {receipt.status === 'draft' ? 'Borrador' : receipt.status === 'generated' ? 'Generado' : 'Enviado'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewReceipt(receipt)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadReceipt(receipt)}
                >
                  <Download className="w-4 h-4 mr-1" />
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
