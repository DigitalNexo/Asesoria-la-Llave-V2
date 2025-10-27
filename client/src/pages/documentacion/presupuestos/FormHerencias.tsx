import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, X, AlertCircle } from 'lucide-react';

interface HerenciasFormData {
  caudalHereditario: number;
  herederos: number;
  fincasComunidad: number;
  fincasOtras: number;
  productosFinancieros: number;
  vehiculos: number;
  sinTestamento: boolean;
  sinAcuerdo: boolean;
  escriturar: boolean;
  aplicarDescuento15: boolean;
}

interface FormHerenciasProps {
  onSubmit: (data: HerenciasFormData, clientData: any) => void;
  onCancel: () => void;
}

export default function FormHerencias({ onSubmit, onCancel }: FormHerenciasProps) {
  const [companyBrand, setCompanyBrand] = useState<'LA_LLAVE' | 'GESTORIA_ONLINE'>('LA_LLAVE');
  const [clientName, setClientName] = useState('');
  const [clientNif, setClientNif] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [caudalHereditario, setCaudalHereditario] = useState<number>(20000);
  const [herederos, setHerederos] = useState(1);
  const [fincasComunidad, setFincasComunidad] = useState(0);
  const [fincasOtras, setFincasOtras] = useState(0);
  const [productosFinancieros, setProductosFinancieros] = useState(0);
  const [vehiculos, setVehiculos] = useState(0);
  const [sinTestamento, setSinTestamento] = useState(false);
  const [sinAcuerdo, setSinAcuerdo] = useState(false);
  const [escriturar, setEscriturar] = useState(false);
  const [aplicarDescuento15, setAplicarDescuento15] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    if (caudalHereditario < 20000) {
      alert('El caudal hereditario mínimo es de 20.000€');
      return;
    }

    const tieneActivos = fincasComunidad > 0 || fincasOtras > 0 || productosFinancieros > 0 || vehiculos > 0;
    if (!tieneActivos) {
      alert('Debe haber al menos un inmueble, producto financiero o vehículo');
      return;
    }

    const formData: HerenciasFormData = {
      caudalHereditario,
      herederos,
      fincasComunidad,
      fincasOtras,
      productosFinancieros,
      vehiculos,
      sinTestamento,
      sinAcuerdo,
      escriturar,
      aplicarDescuento15,
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

      {/* Datos Herencia */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Herencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Caudal hereditario mínimo: 20.000 €. Debe haber al menos un inmueble, producto financiero o vehículo.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="caudalHereditario">Caudal Hereditario (€) *</Label>
              <Input
                id="caudalHereditario"
                type="number"
                min="20000"
                step="1000"
                required
                value={caudalHereditario}
                onChange={(e) => setCaudalHereditario(Number(e.target.value))}
                placeholder="20000"
              />
              <p className="text-xs text-muted-foreground mt-1">Recargo 0.1% del caudal</p>
            </div>

            <div>
              <Label htmlFor="herederos">Número de herederos</Label>
              <Input
                id="herederos"
                type="number"
                min="1"
                value={herederos}
                onChange={(e) => setHerederos(Number(e.target.value))}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground mt-1">25 € por heredero</p>
            </div>

            <div>
              <Label htmlFor="fincasComunidad">Fincas en la Comunidad Autónoma</Label>
              <Input
                id="fincasComunidad"
                type="number"
                min="0"
                value={fincasComunidad}
                onChange={(e) => setFincasComunidad(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">25 € + 50 € plusvalía + 50 € registro</p>
            </div>

            <div>
              <Label htmlFor="fincasOtras">Fincas en otras CCAA</Label>
              <Input
                id="fincasOtras"
                type="number"
                min="0"
                value={fincasOtras}
                onChange={(e) => setFincasOtras(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">40 € + 50 € plusvalía + 50 € registro</p>
            </div>

            <div>
              <Label htmlFor="productosFinancieros">Productos financieros</Label>
              <Input
                id="productosFinancieros"
                type="number"
                min="0"
                value={productosFinancieros}
                onChange={(e) => setProductosFinancieros(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">20 € por producto</p>
            </div>

            <div>
              <Label htmlFor="vehiculos">Vehículos</Label>
              <Input
                id="vehiculos"
                type="number"
                min="0"
                value={vehiculos}
                onChange={(e) => setVehiculos(Number(e.target.value))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">30 € por vehículo</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-semibold mb-3 block">Recargos</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sinTestamento"
                  checked={sinTestamento}
                  onCheckedChange={(checked) => setSinTestamento(!!checked)}
                />
                <label htmlFor="sinTestamento" className="text-sm cursor-pointer">
                  Sin testamento (+30% sobre base)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sinAcuerdo"
                  checked={sinAcuerdo}
                  onCheckedChange={(checked) => setSinAcuerdo(!!checked)}
                />
                <label htmlFor="sinAcuerdo" className="text-sm cursor-pointer">
                  Sin acuerdo entre herederos (+60% sobre base)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="escriturar"
                  checked={escriturar}
                  onCheckedChange={(checked) => setEscriturar(!!checked)}
                />
                <label htmlFor="escriturar" className="text-sm cursor-pointer">
                  Escrituración de herencia (+30% sobre base)
                </label>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="aplicarDescuento15"
                checked={aplicarDescuento15}
                onCheckedChange={(checked) => setAplicarDescuento15(!!checked)}
              />
              <label htmlFor="aplicarDescuento15" className="text-sm font-medium cursor-pointer">
                Aplicar descuento comercial (15%)
              </label>
            </div>
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
