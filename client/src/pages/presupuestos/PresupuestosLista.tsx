import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGestoriaBudgets, 
  useBudgetStatistics,
  useDeleteBudget,
  useSendBudget,
  downloadBudgetPDF,
  BudgetFilters 
} from '@/lib/api/gestoria-budgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Eye, 
  Edit, 
  Trash, 
  MoreVertical,
  FileText,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PresupuestosLista() {
  const navigate = useNavigate();
  
  // Estados
  const [filters, setFilters] = useState<BudgetFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  
  // Queries
  const { data: budgets, isLoading } = useGestoriaBudgets(filters);
  const { data: stats } = useBudgetStatistics(filters.tipoGestoria);
  
  // Mutations
  const deleteMutation = useDeleteBudget();
  const sendMutation = useSendBudget();
  
  // Filtrar por búsqueda local
  const filteredBudgets = budgets?.filter(b => 
    b.nombreCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.nifCif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.numero.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Handlers
  const handleDelete = async () => {
    if (!selectedBudget) return;
    
    try {
      await deleteMutation.mutateAsync(selectedBudget);
      toast.success('Presupuesto eliminado correctamente');
      setDeleteDialogOpen(false);
      setSelectedBudget(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar presupuesto');
    }
  };
  
  const handleSend = async () => {
    if (!selectedBudget) return;
    
    try {
      await sendMutation.mutateAsync({ id: selectedBudget });
      toast.success('Presupuesto enviado por email');
      setSendDialogOpen(false);
      setSelectedBudget(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar presupuesto');
    }
  };
  
  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      BORRADOR: { variant: 'secondary', icon: FileText },
      ENVIADO: { variant: 'default', icon: Mail },
      ACEPTADO: { variant: 'default', icon: CheckCircle },
      RECHAZADO: { variant: 'destructive', icon: XCircle },
      FACTURADO: { variant: 'default', icon: DollarSign }
    };
    
    const config = variants[estado] || variants.BORRADOR;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {estado}
      </Badge>
    );
  };
  
  const getTipoBadge = (tipo: string) => {
    return (
      <Badge variant={tipo === 'OFICIAL' ? 'default' : 'outline'}>
        {tipo}
      </Badge>
    );
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Presupuestos de Gestoría</h1>
          <p className="text-muted-foreground">
            Gestión completa de presupuestos OFICIAL y ONLINE
          </p>
        </div>
        <Button onClick={() => navigate('/presupuestos/nuevo')}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Presupuesto
        </Button>
      </div>
      
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Presupuestos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPresupuestos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.presupuestosEnviados}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aceptados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.presupuestosAceptados}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasa Conversión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                <TrendingUp className="w-5 h-5 text-green-600" />
                {stats.tasaConversion.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                <DollarSign className="w-5 h-5" />
                {stats.valorTotal.toLocaleString('es-ES')}€
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, CIF/NIF o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select
              value={filters.tipoGestoria || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, tipoGestoria: value === 'all' ? undefined : value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de gestoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="OFICIAL">OFICIAL</SelectItem>
                <SelectItem value="ONLINE">ONLINE</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.estado || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, estado: value === 'all' ? undefined : value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
                <SelectItem value="ACEPTADO">Aceptado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="FACTURADO">Facturado</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setFilters({});
                setSearchTerm('');
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Presupuestos</CardTitle>
          <CardDescription>
            {filteredBudgets.length} presupuesto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando presupuestos...</p>
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay presupuestos</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer presupuesto para comenzar
              </p>
              <Button onClick={() => navigate('/presupuestos/nuevo')}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Presupuesto
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CIF/NIF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget) => (
                    <TableRow key={budget.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">
                        {budget.numero}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{budget.nombreCliente}</div>
                          {budget.email && (
                            <div className="text-sm text-muted-foreground">{budget.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {budget.nifCif}
                      </TableCell>
                      <TableCell>
                        {getTipoBadge(budget.tipoGestoria)}
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(budget.estado)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {budget.totalFinal.toLocaleString('es-ES', { 
                          style: 'currency', 
                          currency: 'EUR' 
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(budget.fechaCreacion), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/presupuestos/${budget.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/presupuestos/${budget.id}/editar`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadBudgetPDF(budget.id, budget.numero)}>
                              <Download className="w-4 h-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {budget.estado === 'BORRADOR' && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedBudget(budget.id);
                                  setSendDialogOpen(true);
                                }}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar por Email
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setSelectedBudget(budget.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog Eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar presupuesto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El presupuesto será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Enviar */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar presupuesto por email</DialogTitle>
            <DialogDescription>
              El presupuesto será enviado al email del cliente con el PDF adjunto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sendMutation.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendMutation.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
