import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calculator, Save, X } from 'lucide-react';

interface PymeFormData {
  asientosMes: number;
  nominasMes: number;
  facturacion: number;
  irpfAlquileres: boolean;
  ivaIntracomunitario: boolean;
  notificaciones: boolean;
  estadisticasINE: boolean;
  periodo: 'MENSUAL' | 'TRIMESTRAL';
  emprendedor: boolean;
}

interface FormPymeProps {
  onSubmit: (data: PymeFormData, clientData: any) => void;
  onCancel: () => void;
}

export default function FormPyme({ onSubmit, onCancel }: FormPymeProps) {
  // Empresa emisora
  const [companyBrand, setCompanyBrand] = useState<'LA_LLAVE' | 'GESTORIA_ONLINE'>('LA_LLAVE');
  
  // Datos del cliente
  const [clientName, setClientName] = useState('');
  const [clientNif, setClientNif] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  
  // Datos de cálculo PYME
  const [asientosMes, setAsientosMes] = useState<number>(0);
  const [nominasMes, setNominasMes] = useState<number>(0);
  const [facturacion, setFacturacion] = useState<number>(0);
  const [irpfAlquileres, setIrpfAlquileres] = useState(false);
  const [ivaIntracomunitario, setIvaIntracomunitario] = useState(false);
  const [notificaciones, setNotificaciones] = useState(false);
  const [estadisticasINE, setEstadisticasINE] = useState(false);
  const [periodo, setPeriodo] = useState<'MENSUAL' | 'TRIMESTRAL'>('TRIMESTRAL');
  const [emprendedor, setEmprendedor] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: PymeFormData = {
      asientosMes,
      nominasMes,
      facturacion,
      irpfAlquileres,
      ivaIntracomunitario,
      notificaciones,
      estadisticasINE,
      periodo,
      emprendedor,
    };
    
    const clientData = {
      clientName,
      clientNif,
      clientEmail,
      clientPhone,
      clientAddress,
      companyBrand, // Añadir la empresa seleccionada
    };
    
    onSubmit(formData, clientData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selección de Empresa */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🏢</span> Empresa Emisora del Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="companyBrand">Selecciona la empresa que emitirá este presupuesto *</Label>
            <Select value={companyBrand} onValueChange={(v: any) => setCompanyBrand(v)}>
              <SelectTrigger id="companyBrand">
                <SelectValue placeholder="Selecciona empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LA_LLAVE">
                  <div className="flex flex-col">
                    <span className="font-semibold">Asesoría La Llave</span>
                    <span className="text-xs text-muted-foreground">C/ Leganés, 17 - Getafe</span>
                  </div>
                </SelectItem>
                <SelectItem value="GESTORIA_ONLINE">
                  <div className="flex flex-col">
                    <span className="font-semibold">Gestoría Online</span>
                    <span className="text-xs text-muted-foreground">Servicios digitales</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Esta opción determina qué logo y datos aparecerán en el PDF del presupuesto.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Datos del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Datos del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="clientName">Nombre / Razón Social *</Label>
              <Input
                id="clientName"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Empresa SL"
              />
            </div>
            <div>
              <Label htmlFor="clientNif">NIF / CIF *</Label>
              <Input
                id="clientNif"
                required
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                placeholder="B12345678"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Teléfono</Label>
              <Input
                id="clientPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="600123456"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="clientAddress">Dirección Completa</Label>
              <Input
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Calle Ejemplo 123, 28001 Madrid"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos PYME */}
      <Card>
        <CardHeader>
          <CardTitle>Características de la PYME</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asientosMes">Nivel Contable (Asientos/mes) *</Label>
              <Select
                value={asientosMes.toString()}
                onValueChange={(v) => setAsientosMes(Number(v))}
                required
              >
                <SelectTrigger id="asientosMes">
                  <SelectValue placeholder="Selecciona nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 asientos (120 €/mes)</SelectItem>
                  <SelectItem value="1">1-25 asientos (150 €/mes)</SelectItem>
                  <SelectItem value="2">26-50 asientos (200 €/mes)</SelectItem>
                  <SelectItem value="3">51-100 asientos (250 €/mes)</SelectItem>
                  <SelectItem value="4">101-150 asientos (300 €/mes)</SelectItem>
                  <SelectItem value="5">151-200 asientos (350 €/mes)</SelectItem>
                  <SelectItem value="6">201-250 asientos (400 €/mes)</SelectItem>
                  <SelectItem value="7">251-350 asientos (475 €/mes)</SelectItem>
                  <SelectItem value="8">&gt;350 asientos (525 €/mes)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nominasMes">Nóminas al mes</Label>
              <Input
                id="nominasMes"
                type="number"
                min="0"
                value={nominasMes}
                onChange={(e) => setNominasMes(Number(e.target.value))}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="facturacion">Facturación anual (€)</Label>
              <Input
                id="facturacion"
                type="number"
                min="0"
                step="1000"
                value={facturacion}
                onChange={(e) => setFacturacion(Number(e.target.value))}
                placeholder="100000"
              />
            </div>

            <div>
              <Label htmlFor="periodo">Periodo de Liquidación</Label>
              <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
                <SelectTrigger id="periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                  <SelectItem value="MENSUAL">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Extras */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Servicios Adicionales</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="irpfAlquileres"
                  checked={irpfAlquileres}
                  onCheckedChange={(checked) => setIrpfAlquileres(!!checked)}
                />
                <label htmlFor="irpfAlquileres" className="text-sm cursor-pointer">
                  IRPF Alquileres (+10 €)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ivaIntracomunitario"
                  checked={ivaIntracomunitario}
                  onCheckedChange={(checked) => setIvaIntracomunitario(!!checked)}
                />
                <label htmlFor="ivaIntracomunitario" className="text-sm cursor-pointer">
                  IVA Intracomunitario (+10 €)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notificaciones"
                  checked={notificaciones}
                  onCheckedChange={(checked) => setNotificaciones(!!checked)}
                />
                <label htmlFor="notificaciones" className="text-sm cursor-pointer">
                  Notificaciones AEAT (+5 €)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="estadisticasINE"
                  checked={estadisticasINE}
                  onCheckedChange={(checked) => setEstadisticasINE(!!checked)}
                />
                <label htmlFor="estadisticasINE" className="text-sm cursor-pointer">
                  Estadísticas INE (+5 €)
                </label>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Emprendedor */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="emprendedor"
              checked={emprendedor}
              onCheckedChange={(checked) => setEmprendedor(!!checked)}
            />
            <label htmlFor="emprendedor" className="text-sm font-medium cursor-pointer">
              Emprendedor (Descuento 20%)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit">
          <Calculator className="h-4 w-4 mr-2" />
          Calcular y Crear Presupuesto
        </Button>
      </div>
    </form>
  );
}
