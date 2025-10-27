import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calculator, X } from 'lucide-react';

interface AutonomoFormData {
  facturasMes: number;
  nominasMes: number;
  facturacion: number;
  irpfAlquileres: boolean;
  ivaIntracomunitario: boolean;
  notificaciones: boolean;
  estadisticasINE: boolean;
  periodo: 'MENSUAL' | 'TRIMESTRAL';
  sistemaTributacion: 'NORMAL' | 'ESN' | 'MODULOS';
  emprendedor: boolean;
}

interface FormAutonomoProps {
  onSubmit: (data: AutonomoFormData, clientData: any) => void;
  onCancel: () => void;
}

export default function FormAutonomo({ onSubmit, onCancel }: FormAutonomoProps) {
  const [companyBrand, setCompanyBrand] = useState<'LA_LLAVE' | 'GESTORIA_ONLINE'>('LA_LLAVE');
  const [clientName, setClientName] = useState('');
  const [clientNif, setClientNif] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [facturasMes, setFacturasMes] = useState<number>(25);
  const [nominasMes, setNominasMes] = useState<number>(0);
  const [facturacion, setFacturacion] = useState<number>(0);
  const [irpfAlquileres, setIrpfAlquileres] = useState(false);
  const [ivaIntracomunitario, setIvaIntracomunitario] = useState(false);
  const [notificaciones, setNotificaciones] = useState(false);
  const [estadisticasINE, setEstadisticasINE] = useState(false);
  const [periodo, setPeriodo] = useState<'MENSUAL' | 'TRIMESTRAL'>('TRIMESTRAL');
  const [sistemaTributacion, setSistemaTributacion] = useState<'NORMAL' | 'ESN' | 'MODULOS'>('NORMAL');
  const [emprendedor, setEmprendedor] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData: AutonomoFormData = {
      facturasMes,
      nominasMes,
      facturacion,
      irpfAlquileres,
      ivaIntracomunitario,
      notificaciones,
      estadisticasINE,
      periodo,
      sistemaTributacion,
      emprendedor,
    };

    const clientData = {
      clientName,
      clientNif,
      clientEmail,
      clientPhone,
      clientAddress,
      companyBrand,
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
              <Label htmlFor="clientName">Nombre Completo *</Label>
              <Input
                id="clientName"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="clientNif">NIF / DNI *</Label>
              <Input
                id="clientNif"
                required
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                placeholder="12345678A"
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

      {/* Datos Autónomo */}
      <Card>
        <CardHeader>
          <CardTitle>Características del Autónomo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facturasMes">Facturas al mes *</Label>
              <Select
                value={facturasMes.toString()}
                onValueChange={(v) => setFacturasMes(Number(v))}
                required
              >
                <SelectTrigger id="facturasMes">
                  <SelectValue placeholder="Selecciona rango" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">Hasta 25 facturas (45 €/mes)</SelectItem>
                  <SelectItem value="50">26-50 facturas (70 €/mes)</SelectItem>
                  <SelectItem value="100">51-100 facturas (90 €/mes)</SelectItem>
                  <SelectItem value="150">101-150 facturas (105 €/mes)</SelectItem>
                  <SelectItem value="200">&gt;150 facturas (125 €/mes)</SelectItem>
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
                placeholder="50000"
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

            <div className="md:col-span-2">
              <Label htmlFor="sistemaTributacion">Sistema de Tributación</Label>
              <Select value={sistemaTributacion} onValueChange={(v: any) => setSistemaTributacion(v)}>
                <SelectTrigger id="sistemaTributacion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="ESN">Estimación Simplificada (ESN) +10%</SelectItem>
                  <SelectItem value="MODULOS">Módulos -10%</SelectItem>
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
