import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { TextAlign as TiptapTextAlign } from "@tiptap/extension-text-align";
import { TextStyle as TiptapTextStyle } from "@tiptap/extension-text-style";
import { Color as TiptapColor } from "@tiptap/extension-color";
import { Highlight as TiptapHighlight } from "@tiptap/extension-highlight";
import { CodeBlockLowlight as TiptapCodeBlock } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow as TiptapTableRow } from '@tiptap/extension-table-row';
import { TableCell as TiptapTableCell } from '@tiptap/extension-table-cell';
import { TableHeader as TiptapTableHeader } from '@tiptap/extension-table-header';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Image as ImageIcon,
  Link2,
  Highlighter,
  FileCode,
  Plus,
  Minus,
  Trash2,
  Columns,
  Rows,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ExcelTableEditor } from "@/components/ExcelTableEditor";

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  manualId?: string;
}

export function RichTextEditor({ content, onChange, manualId }: RichTextEditorProps) {
  const { toast } = useToast();
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [editingTableData, setEditingTableData] = useState<string[][] | undefined>(undefined);
  const [selectedTableHTML, setSelectedTableHTML] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [highlightColorOpen, setHighlightColorOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      TiptapImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      TiptapLink.configure({ openOnClick: false }),
      TiptapTextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TiptapTextStyle,
      TiptapColor,
      TiptapHighlight.configure({ multicolor: true }),
      TiptapCodeBlock.configure({
        lowlight,
      }),
      TiptapTable.configure({
        resizable: false,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TiptapTableRow,
      TiptapTableHeader,
      TiptapTableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageDrop(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          const itemsArray = Array.from(items);
          for (const item of itemsArray) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                handleImageDrop(file);
              }
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  if (!editor) {
    return null;
  }

  const handleImageDrop = async (file: File) => {
    if (!manualId) {
      toast({ title: "Error", description: "Debes guardar el manual primero", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/manuals/upload-image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Error al subir imagen");

      const data = await response.json();
      editor.chain().focus().setImage({ src: data.url }).run();
      toast({ title: "Imagen insertada correctamente" });
    } catch (error) {
      toast({ title: "Error al subir imagen", variant: "destructive" });
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !manualId) {
      toast({ title: "Error", description: "Selecciona una imagen primero", variant: "destructive" });
      return;
    }

    await handleImageDrop(imageFile);
    setIsImageDialogOpen(false);
    setImageFile(null);
  };

  const handleInsertLink = () => {
    if (!linkUrl) return;

    if (linkText) {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }

    setIsLinkDialogOpen(false);
    setLinkUrl("");
    setLinkText("");
  };

  const colors = [
    "#000000", "#374151", "#6B7280", "#9CA3AF",
    "#EF4444", "#F97316", "#F59E0B", "#EAB308",
    "#84CC16", "#22C55E", "#10B981", "#14B8A6",
    "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
    "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  ];

  const parseHTMLTable = (htmlTable: string): string[][] => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlTable;
    const table = tempDiv.querySelector('table');
    if (!table) return [];
    
    const rows: string[][] = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cells: string[] = [];
      tr.querySelectorAll('th, td').forEach(cell => {
        cells.push(cell.textContent || '');
      });
      if (cells.length > 0) {
        rows.push(cells);
      }
    });
    
    return rows;
  };

  return (
    <div className="border rounded-lg">
      {/* Barra de herramientas principal */}
      <div className="border-b p-2 flex flex-wrap gap-1 items-center bg-muted/30">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formato de texto */}
        <Button
          variant={editor.isActive("bold") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-testid="button-bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("italic") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-testid="button-italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("strike") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          data-testid="button-strike"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("code") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleCode().run()}
          data-testid="button-code"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <Button
          variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-testid="button-h1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-testid="button-h2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          data-testid="button-h3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Listas */}
        <Button
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-testid="button-bullet-list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-testid="button-ordered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive("blockquote") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-testid="button-blockquote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alineación */}
        <Button
          variant={editor.isActive({ textAlign: 'left' }) ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          data-testid="button-align-left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'center' }) ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          data-testid="button-align-center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'right' }) ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          data-testid="button-align-right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive({ textAlign: 'justify' }) ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          data-testid="button-align-justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Color de texto */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            data-testid="button-text-color"
          >
            <div className="h-4 w-4 border-2 border-current" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }} />
          </Button>
          {colorPickerOpen && (
            <div className="absolute top-full mt-1 p-2 bg-background border rounded-lg shadow-lg z-10 grid grid-cols-5 gap-1">
              {colors.map(color => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border hover-elevate"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setColorPickerOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Resaltado */}
        <div className="relative">
          <Button
            variant={editor.isActive("highlight") ? "default" : "ghost"}
            size="icon"
            onClick={() => setHighlightColorOpen(!highlightColorOpen)}
            data-testid="button-highlight"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          {highlightColorOpen && (
            <div className="absolute top-full mt-1 p-2 bg-background border rounded-lg shadow-lg z-10 grid grid-cols-5 gap-1">
              {colors.slice(4).map(color => (
                <button
                  key={color}
                  className="h-6 w-6 rounded border hover-elevate"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color }).run();
                    setHighlightColorOpen(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Código */}
        <Button
          variant={editor.isActive("codeBlock") ? "default" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          data-testid="button-code-block"
        >
          <FileCode className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Tabla */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // Buscar tabla en el documento
            const html = editor.getHTML();
            
            // Buscar cualquier tabla, sin importar el orden de atributos
            const tableMatch = html.match(/<table[\s\S]*?<\/table>/);
            
            if (tableMatch) {
              const tableData = parseHTMLTable(tableMatch[0]);
              setEditingTableData(tableData);
              setSelectedTableHTML(tableMatch[0]);
            } else {
              setEditingTableData(undefined);
              setSelectedTableHTML(null);
            }
            
            setIsTableDialogOpen(true);
          }}
          data-testid="button-insert-table"
          title="Insertar/Editar tabla"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Imagen y Link */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsImageDialogOpen(true)}
          data-testid="button-insert-image"
          title="Insertar imagen"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsLinkDialogOpen(true)}
          data-testid="button-insert-link"
          title="Insertar enlace"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </div>


      {/* Editor con estilos personalizados */}
      <style>{`
        .ProseMirror {
          outline: none;
          padding: 1rem;
          min-height: 400px;
        }

        /* Estilos de tabla profesionales tipo Word */
        .ProseMirror .editor-table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
        }

        .ProseMirror .editor-table td,
        .ProseMirror .editor-table th {
          min-width: 1em;
          border: 2px solid #000000;
          padding: 0.5rem;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
          background-color: hsl(var(--background));
        }

        .ProseMirror .editor-table th {
          font-weight: 600;
          text-align: left;
          background-color: hsl(var(--muted));
          border: 2px solid #000000;
        }

        .ProseMirror .editor-table .selectedCell {
          background-color: hsl(var(--accent) / 0.3);
        }

        /* Handle de redimensionamiento de columna */
        .ProseMirror .editor-table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: hsl(var(--primary));
          cursor: col-resize;
          z-index: 20;
        }

        /* Estilos de imagen mejorados */
        .ProseMirror .editor-image {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem 0;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ProseMirror .editor-image:hover {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }

        .ProseMirror .editor-image.ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }

        /* Indicador de arrastre */
        .ProseMirror.dragging {
          background-color: hsl(var(--accent) / 0.1);
        }

        /* Estilos de prose mejorados */
        .ProseMirror p {
          margin: 0.5rem 0;
        }

        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
        }

        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
        }

        .ProseMirror code {
          background-color: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }

        .ProseMirror pre {
          background-color: hsl(var(--muted));
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }

        .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
        }
      `}</style>

      <EditorContent 
        editor={editor} 
        className="focus:outline-none"
      />

      {/* Dialog para imagen */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insertar Imagen</DialogTitle>
            <DialogDescription>
              Sube una imagen desde tu ordenador o arrastra y suelta directamente en el editor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-file">Seleccionar imagen</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                data-testid="input-image-file"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              💡 También puedes arrastrar imágenes directamente al editor o pegarlas con Ctrl+V
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImageUpload} data-testid="button-upload-image">
              Insertar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para link */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insertar Enlace</DialogTitle>
            <DialogDescription>
              Añade un enlace al documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                data-testid="input-link-url"
              />
            </div>
            <div>
              <Label htmlFor="link-text">Texto (opcional)</Label>
              <Input
                id="link-text"
                type="text"
                placeholder="Texto del enlace"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                data-testid="input-link-text"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInsertLink} data-testid="button-insert-link-confirm">
              Insertar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para tabla tipo Excel */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTableHTML ? 'Editar Tabla' : 'Insertar Tabla'}</DialogTitle>
            <DialogDescription>
              {selectedTableHTML ? 'Modifica la tabla existente.' : 'Crea una nueva tabla.'} La primera fila será el encabezado con fondo gris.
            </DialogDescription>
          </DialogHeader>
          <ExcelTableEditor
            initialData={editingTableData}
            onSave={(data) => {
              if (data.length === 0) return;
              
              if (selectedTableHTML) {
                // Reemplazar tabla existente con HTML
                const newTableHTML = convertTableDataToHTML(data);
                const currentHTML = editor.getHTML();
                const updatedHTML = currentHTML.replace(selectedTableHTML, newTableHTML);
                editor.commands.setContent(updatedHTML);
              } else {
                // Insertar nueva tabla usando comandos de TipTap
                const rows = data.length;
                const cols = data[0]?.length || 2;
                
                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                
                // Llenar celdas con datos
                data.forEach((row, rowIndex) => {
                  row.forEach((cellValue, colIndex) => {
                    // Navegar a la celda correcta y establecer contenido
                    editor.commands.goToNextCell();
                    if (cellValue) {
                      editor.commands.insertContent(cellValue);
                    }
                  });
                });
              }
              
              setIsTableDialogOpen(false);
              setEditingTableData(undefined);
              setSelectedTableHTML(null);
            }}
            onCancel={() => {
              setIsTableDialogOpen(false);
              setEditingTableData(undefined);
              setSelectedTableHTML(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function convertTableDataToHTML(data: string[][]): string {
  if (data.length === 0) return '';
  
  let html = '<table class="editor-table">';
  
  data.forEach((row, rowIndex) => {
    html += '<tr>';
    row.forEach((cell) => {
      if (rowIndex === 0) {
        html += `<th>${cell || ''}</th>`;
      } else {
        html += `<td>${cell || ''}</td>`;
      }
    });
    html += '</tr>';
  });
  
  html += '</table>';
  return html;
}
