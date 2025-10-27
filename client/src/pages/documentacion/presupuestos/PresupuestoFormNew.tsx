import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import BudgetTypeSelector from './BudgetTypeSelector';
import FormPyme from './FormPyme';
import FormAutonomo from './FormAutonomo';
import FormRenta from './FormRenta';
import FormHerencias from './FormHerencias';

type BudgetType = 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS';

export default function PresupuestoFormNew() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'type-selector' | 'form'>('type-selector');
  const [selectedType, setSelectedType] = useState<BudgetType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectType = (type: BudgetType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleCancel = () => {
    if (step === 'form') {
      setStep('type-selector');
      setSelectedType(null);
    } else {
      setLocation('/documentacion/presupuestos');
    }
  };

  const handleSubmit = async (formData: any, clientData: any) => {
    if (!selectedType) return;

    setIsSubmitting(true);
    try {
      const payload = {
        type: selectedType,
        inputs: formData,
        ...clientData,
      };

      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear presupuesto');
      }

      const created = await res.json();
      toast({
        title: 'Presupuesto creado',
        description: `Código: ${created.code}`,
      });

      setLocation('/documentacion/presupuestos');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'type-selector') {
    return <BudgetTypeSelector onSelectType={handleSelectType} />;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a selección de tipo
        </button>
      </div>

      {selectedType === 'PYME' && (
        <FormPyme onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
      {selectedType === 'AUTONOMO' && (
        <FormAutonomo onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
      {selectedType === 'RENTA' && (
        <FormRenta onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
      {selectedType === 'HERENCIAS' && (
        <FormHerencias onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
    </div>
  );
}
