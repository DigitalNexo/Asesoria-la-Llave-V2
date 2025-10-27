import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Eye, Edit2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  signature_status: string;
  created_at: string;
  file_name?: string;
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const query = filter !== 'all' ? `?type=${filter}` : '';
      const response = await fetch(`/api/documents${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents && Array.isArray(documents) 
    ? documents.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      draft: { label: 'Borrador', color: 'bg-gray-100' },
      pending_signature: { label: 'Pendiente Firma', color: 'bg-yellow-100' },
      signed: { label: 'Firmado', color: 'bg-green-100' },
      archived: { label: 'Archivado', color: 'bg-gray-200' },
    };
    const s = statuses[status] || statuses.draft;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      payment_receipt: 'Recibo de Pago',
      data_protection: 'Protección de Datos',
      banking_domiciliation: 'Domiciliación Bancaria',
      other: 'Otro',
    };
    return types[type] || type;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Error al eliminar');

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      alert('Documento eliminado correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el documento');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documento-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al descargar el documento');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Buscar documento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">Todos</option>
          <option value="payment_receipt">Recibos de Pago</option>
          <option value="data_protection">Protección de Datos</option>
          <option value="banking_domiciliation">Domiciliación Bancaria</option>
          <option value="other">Otros</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando documentos...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No hay documentos</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="p-4 border rounded-lg hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-5 h-5 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{doc.name}</h3>
                    <p className="text-sm text-gray-500">{getTypeLabel(doc.type)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(doc.status)}
                  {doc.signature_status === 'signed_by_client' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc.id)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Descargar
                </Button>
                <Button size="sm" variant="outline">
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
