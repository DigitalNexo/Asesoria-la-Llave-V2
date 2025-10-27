import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus,
  Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
  Palette, Type, Variable, Trash2, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateEditorProps {
  initialContent?: string;
  budgetType: 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS';
  onChange?: (html: string) => void;
  onPreview?: () => void;
}

// Variables disponibles según tipo de presupuesto
const BUDGET_VARIABLES = {
  common: [
    { label: 'Nombre de contacto', variable: '{{nombre_contacto}}', description: 'Nombre del cliente' },
    { label: 'Email', variable: '{{email}}', description: 'Correo electrónico' },
    { label: 'Teléfono', variable: '{{telefono}}', description: 'Teléfono de contacto' },
    { label: 'Código presupuesto', variable: '{{codigo}}', description: 'Ej: AL-2025-0001' },
    { label: 'Fecha', variable: '{{fecha}}', description: 'Fecha de emisión' },
    { label: 'Subtotal', variable: '{{subtotal}}', description: 'Subtotal sin IVA' },
    { label: 'IVA', variable: '{{iva}}', description: 'Total de IVA' },
    { label: 'Total', variable: '{{total}}', description: 'Total con IVA' },
    { label: 'Observaciones', variable: '{{observaciones}}', description: 'Notas del presupuesto' },
  ],
  PYME: [
    { label: 'Nombre sociedad', variable: '{{nombre_sociedad}}', description: 'Razón social' },
    { label: 'Actividad', variable: '{{actividad}}', description: 'Actividad de la empresa' },
    { label: 'Periodo declaraciones', variable: '{{periodo_declaraciones}}', description: 'Trimestral/Mensual' },
    { label: 'Facturación anual', variable: '{{facturacion_anual}}', description: 'Facturación estimada' },
    { label: 'Número asientos', variable: '{{num_asientos}}', description: 'Rango de asientos' },
    { label: 'Nóminas/mes', variable: '{{nominas_mes}}', description: 'Número de nóminas' },
  ],
  AUTONOMO: [
    { label: 'Actividad', variable: '{{actividad}}', description: 'Actividad del autónomo' },
    { label: 'Sistema tributación', variable: '{{sistema_tributacion}}', description: 'Directo/Módulos' },
    { label: 'Facturación anual', variable: '{{facturacion_anual}}', description: 'Facturación estimada' },
    { label: 'Número facturas/año', variable: '{{num_facturas}}', description: 'Rango de facturas' },
    { label: 'Nóminas/mes', variable: '{{nominas_mes}}', description: 'Número de nóminas' },
  ],
  RENTA: [
    { label: 'Tipo declaración', variable: '{{tipo_declaracion}}', description: 'Tipo de renta' },
    { label: 'Ingresos', variable: '{{ingresos}}', description: 'Ingresos anuales' },
    { label: 'Retenciones', variable: '{{retenciones}}', description: 'Retenciones IRPF' },
  ],
  HERENCIAS: [
    { label: 'Título sucesorio', variable: '{{titulo_sucesorio}}', description: 'Con/sin testamento' },
    { label: 'Número herederos', variable: '{{num_herederos}}', description: 'Cantidad de herederos' },
    { label: 'Herederos menores', variable: '{{herederos_menores}}', description: 'Sí/No' },
    { label: 'Fincas Madrid', variable: '{{fincas_madrid}}', description: 'Número de fincas' },
    { label: 'Fincas otras', variable: '{{fincas_otras}}', description: 'Fincas fuera de Madrid' },
    { label: 'Caudal hereditario', variable: '{{caudal}}', description: 'Valor del caudal' },
    { label: 'Tipo proceso', variable: '{{tipo_proceso}}', description: 'Amistoso/Judicial' },
  ],
};

const MenuBar = ({ editor, onInsertVariable, budgetType }: { 
  editor: Editor | null; 
  onInsertVariable: (variable: string) => void;
  budgetType: TemplateEditorProps['budgetType'];
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [textColor, setTextColor] = useState('#000000');

  if (!editor) return null;

  const insertLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
    }
  };

  const insertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const availableVariables = [
    ...BUDGET_VARIABLES.common,
    ...(BUDGET_VARIABLES[budgetType] || [])
  ];

  return (
    <div className="border-b bg-slate-50 p-2 sticky top-0 z-10">
      <div className="flex flex-wrap gap-1">
        {/* Texto */}
        <div className="flex gap-1 border-r pr-2">
          <Button
            size="sm"
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Negrita"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('italic') ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Cursiva"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('underline') ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Subrayado"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('strike') ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Tachado"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        {/* Encabezados */}
        <div className="flex gap-1 border-r pr-2">
          <Button
            size="sm"
            variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Título 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Título 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Título 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Listas */}
        <div className="flex gap-1 border-r pr-2">
          <Button
            size="sm"
            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Lista"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Cita"
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        {/* Alineación */}
        <div className="flex gap-1 border-r pr-2">
          <Button
            size="sm"
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Alinear izquierda"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Centrar"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Alinear derecha"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            title="Justificar"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
        </div>

        {/* Color */}
        <div className="flex gap-1 border-r pr-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" title="Color de texto">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <Label>Color de texto</Label>
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    editor.chain().focus().setColor(e.target.value).run();
                  }}
                />
                <div className="grid grid-cols-6 gap-1">
                  {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', 
                    '#00FFFF', '#FFA500', '#800080', '#008000', '#000080', '#808080'].map(color => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setTextColor(color);
                        editor.chain().focus().setColor(color).run();
                      }}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Insertar */}
        <div className="flex gap-1 border-r pr-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" title="Insertar enlace">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <Label>URL del enlace</Label>
                <Input
                  placeholder="https://ejemplo.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && insertLink()}
                />
                <Button onClick={insertLink} className="w-full">Insertar</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" title="Insertar imagen">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <Label>URL de la imagen</Label>
                <Input
                  placeholder="https://ejemplo.com/logo.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && insertImage()}
                />
                <Button onClick={insertImage} className="w-full">Insertar</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="ghost"
            onClick={insertTable}
            title="Insertar tabla"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Variables */}
        <div className="flex gap-1 border-r pr-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" title="Insertar variable">
                <Variable className="h-4 w-4" />
                <span className="ml-1 text-xs">Variables</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  <p className="text-sm font-medium mb-2">Variables disponibles</p>
                  {availableVariables.map((v) => (
                    <button
                      key={v.variable}
                      className="w-full text-left p-2 hover:bg-slate-100 rounded text-sm"
                      onClick={() => onInsertVariable(v.variable)}
                    >
                      <div className="font-mono text-xs text-blue-600">{v.variable}</div>
                      <div className="text-xs text-slate-600">{v.description}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Historial */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Deshacer"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rehacer"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function TemplateEditor({ 
  initialContent = '', 
  budgetType,
  onChange,
  onPreview 
}: TemplateEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: 'Escribe aquí tu plantilla... Usa el menú superior para dar formato y el botón "Variables" para insertar campos dinámicos.',
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[600px] p-4',
      },
    },
  });

  const insertVariable = (variable: string) => {
    editor?.chain().focus().insertContent(variable).run();
  };

  return (
    <div className="border rounded-lg bg-white">
      <MenuBar editor={editor} onInsertVariable={insertVariable} budgetType={budgetType} />
      
      <EditorContent editor={editor} className="min-h-[600px]" />

      {onPreview && (
        <div className="border-t p-2 bg-slate-50 flex justify-end">
          <Button onClick={onPreview} variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Vista previa PDF
          </Button>
        </div>
      )}
    </div>
  );
}
