import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, Calendar, FileStack, BarChart3 } from "lucide-react";

export function TaxesNav() {
  const [location, navigate] = useLocation();

  const current = location?.startsWith('/impuestos/calendario')
    ? 'calendar'
    : location?.startsWith('/impuestos/modelos')
    ? 'models'
    : location?.startsWith('/impuestos/reportes')
    ? 'reports'
    : 'control';

  const handleChange = (value: string) => {
    if (value === 'control') return navigate('/impuestos/control');
    if (value === 'calendar') return navigate('/impuestos/calendario');
    if (value === 'models') return navigate('/impuestos/modelos');
    if (value === 'reports') return navigate('/impuestos/reportes');
  };

  return (
    <Tabs value={current} onValueChange={handleChange} className="space-y-6">
      <TabsList className="h-auto grid grid-cols-2 md:grid-cols-4 gap-1 p-1">
        <TabsTrigger value="control">
          <ListChecks className="h-4 w-4 mr-2" />
          Control de impuestos
        </TabsTrigger>
        <TabsTrigger value="calendar">
          <Calendar className="h-4 w-4 mr-2" />
          Calendario fiscal
        </TabsTrigger>
        <TabsTrigger value="models">
          <FileStack className="h-4 w-4 mr-2" />
          Modelos
        </TabsTrigger>
        <TabsTrigger value="reports">
          <BarChart3 className="h-4 w-4 mr-2" />
          Reportes
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
