import React, { useState, useEffect } from 'react';
import useAutonomoConfig from '../../hooks/useAutonomoConfig';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ConfigGeneralFormProps {
  onSuccess?: () => void;
}

export default function ConfigGeneralForm({ onSuccess }: ConfigGeneralFormProps) {
  const { config, loading, updateConfig, refresh } = useAutonomoConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    porcentajePeriodoMensual: 20,
    porcentajeEDN: 10,
    porcentajeModulos: -10,
    minimoMensual: 50,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        porcentajePeriodoMensual: config.porcentajePeriodoMensual,
        porcentajeEDN: config.porcentajeEDN,
        porcentajeModulos: config.porcentajeModulos,
        minimoMensual: config.minimoMensual,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateConfig(formData);
      toast({
        title: 'Configuración actualizada',
        description: 'Los cambios se han guardado correctamente',
      });
      await refresh();
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo actualizar la configuración',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="porcentajePeriodoMensual">Porcentaje Periodo Mensual (%)</Label>
          <Input
            id="porcentajePeriodoMensual"
            type="number"
            step="0.01"
            value={formData.porcentajePeriodoMensual}
            onChange={(e) =>
              setFormData({ ...formData, porcentajePeriodoMensual: parseFloat(e.target.value) })
            }
            required
          />
          <p className="text-sm text-muted-foreground">
            Recargo aplicado a presupuestos mensuales
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="porcentajeEDN">Porcentaje EDN (%)</Label>
          <Input
            id="porcentajeEDN"
            type="number"
            step="0.01"
            value={formData.porcentajeEDN}
            onChange={(e) => setFormData({ ...formData, porcentajeEDN: parseFloat(e.target.value) })}
            required
          />
          <p className="text-sm text-muted-foreground">
            Recargo para sistema de tributación EDN
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="porcentajeModulos">Porcentaje Módulos (%)</Label>
          <Input
            id="porcentajeModulos"
            type="number"
            step="0.01"
            value={formData.porcentajeModulos}
            onChange={(e) =>
              setFormData({ ...formData, porcentajeModulos: parseFloat(e.target.value) })
            }
            required
          />
          <p className="text-sm text-muted-foreground">
            Descuento para régimen de módulos (valor negativo)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimoMensual">Mínimo Mensual (€)</Label>
          <Input
            id="minimoMensual"
            type="number"
            step="0.01"
            value={formData.minimoMensual}
            onChange={(e) =>
              setFormData({ ...formData, minimoMensual: parseFloat(e.target.value) })
            }
            required
          />
          <p className="text-sm text-muted-foreground">
            Importe mínimo para presupuestos mensuales
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
