import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, Edit2, Send, Loader } from "lucide-react";
import type { User } from "@shared/schema";

interface TaskComment {
  id: string;
  taskId: string;
  usuarioId: string;
  contenido: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  usuario?: User;
}

interface TaskCommentsProps {
  taskId: string;
  currentUser?: User;
}

export function TaskComments({ taskId, currentUser }: TaskCommentsProps) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments
  const { data: comments, isLoading } = useQuery<TaskComment[]>({
    queryKey: [`/api/tasks/${taskId}/comments`],
    enabled: !!taskId,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/tasks/${taskId}/comments`, {
        contenido: content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      toast({ title: "Comentario agregado exitosamente" });
      setNewComment("");
      setIsSubmitting(false);
    },
    onError: () => {
      toast({
        title: "Error al agregar comentario",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}/comments/${id}`, {
        contenido: content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      toast({ title: "Comentario actualizado exitosamente" });
      setEditingId(null);
      setEditingContent("");
    },
    onError: () => {
      toast({
        title: "Error al actualizar comentario",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
      toast({ title: "Comentario eliminado exitosamente" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({
        title: "Error al eliminar comentario",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast({
        title: "El comentario no puede estar vacío",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    createCommentMutation.mutate(newComment);
  };

  const handleUpdateComment = (id: string) => {
    if (!editingContent.trim()) {
      toast({
        title: "El comentario no puede estar vacío",
        variant: "destructive",
      });
      return;
    }
    updateCommentMutation.mutate({ id, content: editingContent });
  };

  const handleDeleteComment = (id: string) => {
    deleteCommentMutation.mutate(id);
  };

  const handleEditStart = (id: string, content: string) => {
    setEditingId(id);
    setEditingContent(content);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingContent("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 bg-secondary rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-secondary rounded w-1/4" />
              <div className="h-12 bg-secondary rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {currentUser?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{currentUser?.username || "Anónimo"}</p>
            <p className="text-xs text-muted-foreground">Ahora</p>
          </div>
        </div>
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario..."
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button
            onClick={() => setNewComment("")}
            variant="outline"
            size="sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitComment}
            size="sm"
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Comentar
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {comment.usuario?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {comment.usuario?.username || "Anónimo"}
                    </p>
                    {currentUser?.id === comment.usuarioId && (
                      <Badge variant="secondary" className="text-xs">
                        Tú
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comment.createdAt), "PPpp", { locale: es })}
                    {new Date(comment.updatedAt).getTime() >
                      new Date(comment.createdAt).getTime() && (
                      <span className="ml-2">(editado)</span>
                    )}
                  </p>
                </div>
                {currentUser?.id === comment.usuarioId && (
                  <div className="flex gap-1">
                    {editingId === comment.id ? (
                      <>
                        <Button
                          onClick={() => handleUpdateComment(comment.id)}
                          size="sm"
                          variant="ghost"
                          disabled={updateCommentMutation.isPending}
                        >
                          {updateCommentMutation.isPending && (
                            <Loader className="w-4 h-4 animate-spin" />
                          )}
                          {!updateCommentMutation.isPending && "Guardar"}
                        </Button>
                        <Button
                          onClick={handleEditCancel}
                          size="sm"
                          variant="ghost"
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() =>
                            handleEditStart(comment.id, comment.contenido)
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setDeleteConfirm(comment.id)}
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Comment Content or Edit Form */}
              {editingId === comment.id ? (
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {comment.contenido}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay comentarios aún</p>
            <p className="text-xs">Sé el primero en comentar</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar comentario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este comentario? Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirm && handleDeleteComment(deleteConfirm)
              }
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteCommentMutation.isPending}
            >
              {deleteCommentMutation.isPending && (
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
