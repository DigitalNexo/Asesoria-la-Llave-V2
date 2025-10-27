import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Trash2,
  Download,
  File,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  Archive,
  Loader,
} from "lucide-react";

interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date | string;
}

interface TaskAttachmentsProps {
  taskId: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="w-4 h-4" />;
  }
  if (fileType.startsWith("audio/")) {
    return <Music className="w-4 h-4" />;
  }
  if (fileType.startsWith("video/")) {
    return <Video className="w-4 h-4" />;
  }
  if (
    fileType.includes("pdf") ||
    fileType.includes("word") ||
    fileType.includes("spreadsheet")
  ) {
    return <FileText className="w-4 h-4" />;
  }
  if (
    fileType.includes("zip") ||
    fileType.includes("compressed") ||
    fileType.includes("archive")
  ) {
    return <Archive className="w-4 h-4" />;
  }
  return <File className="w-4 h-4" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch attachments
  const { data: attachments, isLoading } = useQuery<TaskAttachment[]>({
    queryKey: [`/api/tasks/${taskId}/attachments`],
    enabled: !!taskId,
  });

  // Upload attachment mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/attachments`],
      });
      toast({ title: "Archivo cargado exitosamente" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast({
        title: "Error al cargar archivo",
        variant: "destructive",
      });
    },
  });

  // Delete attachment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(
        "DELETE",
        `/api/tasks/${taskId}/attachments/${id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/attachments`],
      });
      toast({ title: "Archivo eliminado exitosamente" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({
        title: "Error al eliminar archivo",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo no puede superar 10MB",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDownload = (attachment: TaskAttachment) => {
    const link = document.createElement("a");
    link.href = attachment.filePath;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-secondary rounded-lg animate-pulse"
          >
            <div className="w-8 h-8 bg-primary rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-primary rounded w-1/3" />
              <div className="h-3 bg-primary rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploadMutation.isPending}
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo 10MB por archivo
            </p>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className="mt-2"
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending && (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            )}
            {uploadMutation.isPending ? "Cargando..." : "Seleccionar archivo"}
          </Button>
        </div>
      </div>

      {/* Attachments List */}
      <div className="space-y-2">
        {attachments && attachments.length > 0 ? (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(attachment.fileType)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.originalName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>

              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {attachment.fileType.split("/")[1]?.toUpperCase() || "FILE"}
              </Badge>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  onClick={() => handleDownload(attachment)}
                  size="sm"
                  variant="ghost"
                  title="Descargar"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setDeleteConfirm(attachment.id)}
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay archivos adjuntos</p>
            <p className="text-xs">Carga tu primer archivo</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este archivo? Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              )}
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
