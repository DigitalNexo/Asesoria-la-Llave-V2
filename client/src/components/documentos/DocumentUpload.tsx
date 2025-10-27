import { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

export function DocumentUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('other');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach((file) => {
      setFiles((prev) => [
        ...prev,
        {
          id: `${file.name}-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
        },
      ]);
    });
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (!documentName || files.length === 0) {
      alert('Por favor completa todos los campos');
      return;
    }

    setUploading(true);

    try {
      // Crear documento
      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: documentName,
          type: documentType,
          description: `Documento cargado: ${files.map((f) => f.name).join(', ')}`,
        }),
      });

      if (!docRes.ok) throw new Error('Error al crear documento');

      const doc = await docRes.json();

      // Subir archivos
      for (const file of files) {
        const formData = new FormData();
        const input = document.querySelector(
          'input[type="file"]'
        ) as HTMLInputElement;
        if (input?.files) {
          formData.append('file', input.files[0]);

          const uploadRes = await fetch(`/api/documents/${doc.id}/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });

          if (!uploadRes.ok) throw new Error('Error al subir archivo');
        }
      }

      alert('Documento cargado exitosamente');
      setDocumentName('');
      setFiles([]);
      setDocumentType('other');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar el documento');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        {/* Nombre del Documento */}
        <div>
          <label className="block text-sm font-semibold mb-2">Nombre del Documento</label>
          <Input
            placeholder="Ej: Recibo de Pago - Octubre 2025"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
          />
        </div>

        {/* Tipo de Documento */}
        <div>
          <label className="block text-sm font-semibold mb-2">Tipo de Documento</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="payment_receipt">Recibo de Pago</option>
            <option value="data_protection">Protección de Datos</option>
            <option value="banking_domiciliation">Domiciliación Bancaria</option>
            <option value="other">Otro</option>
          </select>
        </div>

        {/* Área de Carga */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-4">
            Arrastra archivos aquí o haz clic para seleccionar
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
          <Button onClick={() => document.getElementById('file-input')?.click()} variant="outline">
            Seleccionar Archivos
          </Button>
        </div>

        {/* Lista de Archivos */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Archivos Seleccionados ({files.length})</h3>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <File className="w-4 h-4 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex gap-3">
          <Button
            onClick={handleUpload}
            disabled={!documentName || files.length === 0 || uploading}
            className="flex-1"
          >
            {uploading ? 'Cargando...' : 'Cargar Documento'}
          </Button>
          <Button
            onClick={() => {
              setDocumentName('');
              setFiles([]);
              setDocumentType('other');
            }}
            variant="outline"
            className="flex-1"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}
