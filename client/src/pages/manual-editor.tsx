import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bold, Italic, List, ListOrdered, Link2, Image as ImageIcon, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Manual } from "@shared/schema";

export default function ManualEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = params.id === "nuevo";
  
  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "",
    etiquetas: [] as string[],
    publicado: false,
    contenidoHtml: "",
  });
  const [tagInput, setTagInput] = useState("");

  const { data: manual } = useQuery<Manual>({
    queryKey: ["/api/manuals", params.id],
    enabled: !isNew,
  });

  useEffect(() => {
    if (manual && !isNew) {
      setFormData({
        titulo: manual.titulo,
        categoria: manual.categoria || "",
        etiquetas: manual.etiquetas || [],
        publicado: manual.publicado,
        contenidoHtml: manual.contenidoHtml,
      });
    }
  }, [manual, isNew]);

  const editor = useEditor({
    extensions: [StarterKit, Image, Link.configure({ openOnClick: false })],
    content: formData.contenidoHtml,
    onUpdate: ({ editor }) => {
      setFormData({ ...formData, contenidoHtml: editor.getHTML() });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isNew) {
        return await apiRequest("POST", "/api/manuals", data);
      } else {
        return await apiRequest("PATCH", `/api/manuals/${params.id}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manuals"] });
      toast({ title: isNew ? "Manual creado exitosamente" : "Manual actualizado exitosamente" });
      setLocation("/manuales");
    },
  });

  const handleSave = () => {
    if (!formData.titulo) {
      toast({ title: "Error", description: "El título es requerido", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  const addTag = () => {
    if (tagInput && !formData.etiquetas.includes(tagInput)) {
      setFormData({ ...formData, etiquetas: [...formData.etiquetas, tagInput] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, etiquetas: formData.etiquetas.filter(t => t !== tag) });
  };

  const addImage = () => {
    const url = window.prompt("URL de la imagen:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt("URL del enlace:");
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/manuales")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold">
            {isNew ? "Nuevo Manual" : "Editar Manual"}
          </h1>
        </div>
        <Button onClick={handleSave} data-testid="button-save">
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título del manual..."
                data-testid="input-titulo"
              />
            </div>

            <div className="space-y-2">
              <Label>Editor de Contenido</Label>
              <div className="border rounded-md">
                <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={editor?.isActive("bold") ? "bg-accent" : ""}
                    data-testid="button-bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={editor?.isActive("italic") ? "bg-accent" : ""}
                    data-testid="button-italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={editor?.isActive("bulletList") ? "bg-accent" : ""}
                    data-testid="button-bullet-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={editor?.isActive("orderedList") ? "bg-accent" : ""}
                    data-testid="button-ordered-list"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addLink}
                    data-testid="button-link"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addImage}
                    data-testid="button-image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                <EditorContent 
                  editor={editor} 
                  className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="ej: Fiscal, Laboral"
                data-testid="input-categoria"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="etiquetas">Etiquetas</Label>
              <div className="flex gap-2">
                <Input
                  id="etiquetas"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Añadir etiqueta"
                  data-testid="input-tag"
                />
                <Button type="button" onClick={addTag} data-testid="button-add-tag">
                  +
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.etiquetas.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="publicado">Publicado</Label>
              <Switch
                id="publicado"
                checked={formData.publicado}
                onCheckedChange={(checked) => setFormData({ ...formData, publicado: checked })}
                data-testid="switch-publicado"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
