import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Briefcase, Home, Receipt } from 'lucide-react';

type BudgetType = 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS';

interface TypeSelectorProps {
  onSelectType: (type: BudgetType) => void;
}

const TYPE_CARDS = [
  {
    type: 'PYME' as BudgetType,
    icon: Briefcase,
    title: 'PYME',
    description: 'Presupuesto para empresas (Contabilidad, nóminas, facturación)',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    type: 'AUTONOMO' as BudgetType,
    icon: FileText,
    title: 'Autónomo',
    description: 'Presupuesto para trabajadores autónomos (Facturas, tributación)',
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    iconColor: 'text-green-600',
  },
  {
    type: 'RENTA' as BudgetType,
    icon: Receipt,
    title: 'Renta',
    description: 'Declaración de la Renta (IRPF, inmuebles, ganancias)',
    color: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    iconColor: 'text-amber-600',
  },
  {
    type: 'HERENCIAS' as BudgetType,
    icon: Home,
    title: 'Herencias',
    description: 'Gestión de herencias (Herederos, fincas, vehículos, plusvalías)',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    iconColor: 'text-purple-600',
  },
];

export default function BudgetTypeSelector({ onSelectType }: TypeSelectorProps) {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Nuevo Presupuesto</h1>
        <p className="text-muted-foreground">Selecciona el tipo de presupuesto que deseas crear</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TYPE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.type}
              className={`cursor-pointer transition-all ${card.color} border-2 hover:shadow-lg`}
              onClick={() => onSelectType(card.type)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-white shadow-sm`}>
                    <Icon className={`h-8 w-8 ${card.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{card.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{card.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
