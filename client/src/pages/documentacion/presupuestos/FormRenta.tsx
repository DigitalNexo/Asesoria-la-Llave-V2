import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, X } from 'lucide-react';

interface RentaFormData {
  unidadFamiliar: 'MATRIMONIO' | 'MATRIMONIO_HIJOS' | 'OTROS';
  autonomo: boolean;
  inmueblesAlquilados: number;
  ventaInmuebles: number;
  ventaFinancieros: number;
  otrasGanancias: number;
}

interface FormRentaProps {
  onSubmit: (data: RentaFormData, clientData: any) => void;
  onCancel: () => void;
}

export default function FormRenta({ onSubmit, onCancel }: FormRentaProps) {
  const [companyBrand, setCompanyBrand] = useState<'LA_LLAVE' | 'GESTORIA_ONLINE'>('LA_LLAVE');
  const [clientName, setClientName] = useState('');
  const [clientNif, setClientNif] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const [unidadFamiliar, setUnidadFamiliar] = useState<'MATRIMONIO' | 'MATRIMONIO_HIJOS' | 'OTROS'>('OTROS');
  const [autonomo, setAutonomo] = useState(false);
  const [inmueblesAlquilados, setInmueblesAlquilados] = useState(0);
  const [ventaInmuebles, setVentaInmuebles] = useState(0);
  const [ventaFinancieros, setVentaFinancieros] = useState(0);
  const [otrasGanancias, setOtrasGanancias] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData: RentaFormData = {
      unidadFamiliar,
      autonomo,
      inmueblesAlquilados,
      ventaInmuebles,
      ventaFinancieros,
      otrasGanancias,
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

      {/* Datos Renta */}
      <Card>
        <CardHeader>
          <CardTitle>Declaración de la Renta (IRPF)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="unidadFamiliar">Unidad Familiar *</Label>
            <Select value={unidadFamiliar} onValueChange={(v: any) => setUnidadFamiliar(v)} required>
              <SelectTrigger id="unidadFamiliar">
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OTROS">Individual u otros (40 €)</SelectItem>
                <SelectItem value="MATRIMONIO">Matrimonio (50 €)</SelectItem>
                <SelectItem value="MATRIMONIO_HIJOS">Matrimonio con hijos (50 €)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autonomo"
              checked={autonomo}
              onCheckedChange={(checked) => setAutonomo(!!checked)}
            />
            <label htmlFor="autonomo" className="text-sm cursor-pointer">
              Actividad Económica (Autónomo) +20 €
            </label>
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-semibold mb-3 block">Ganancias Patrimoniales (cantidad de operaciones)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inmueblesAlquilados">Inmuebles alquilados</Label>
                <Input
                  id="inmueblesAlquilados"
                  type="number"
                  min="0"
                  value={inmueblesAlquilados}
                  onChange={(e) => setInmueblesAlquilados(Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">15 € por inmueble</p>
              </div>

              <div>
                <Label htmlFor="ventaInmuebles">Venta de inmuebles</Label>
                <Input
                  id="ventaInmuebles"
                  type="number"
                  min="0"
                  value={ventaInmuebles}
                  onChange={(e) => setVentaInmuebles(Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">20 € por venta</p>
              </div>

              <div>
                <Label htmlFor="ventaFinancieros">Venta de acciones/productos financieros</Label>
                <Input
                  id="ventaFinancieros"
                  type="number"
                  min="0"
                  value={ventaFinancieros}
                  onChange={(e) => setVentaFinancieros(Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">20 € por operación</p>
              </div>

              <div>
                <Label htmlFor="otrasGanancias">Otras ganancias patrimoniales</Label>
                <Input
                  id="otrasGanancias"
                  type="number"
                  min="0"
                  value={otrasGanancias}
                  onChange={(e) => setOtrasGanancias(Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">20 € por operación</p>
              </div>
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
