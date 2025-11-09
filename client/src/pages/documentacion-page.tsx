import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Settings, Palette } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import Presupuestos from '@/pages/documentacion/presupuestos';
// NUEVO: Sistema dinámico de parámetros (FASE 4 - OFICIAL/ONLINE)
import ParametrosPresupuestosNuevo from '@/pages/presupuestos/parametros';
import BudgetTemplatesManager from '@/pages/documentacion/presupuestos/BudgetTemplatesManager';

export default function DocumentacionPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isAdmin = (user as any)?.roleName === "Administrador";

  // Determinar tab activa según la URL
  const getActiveTab = () => {
    if (location.includes('/parametros')) return 'parametros';
    if (location.includes('/plantillas')) return 'plantillas';
    return 'presupuestos';
  };

  const handleTabChange = (value: string) => {
    if (value === 'presupuestos') {
      setLocation('/documentacion/presupuestos');
    } else if (value === 'parametros') {
      setLocation('/documentacion/presupuestos/parametros');
    } else if (value === 'plantillas') {
      setLocation('/documentacion/presupuestos/plantillas');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Documentación</h1>
        <p className="text-muted-foreground">Gestión de presupuestos y documentos</p>
      </div>

      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="presupuestos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Presupuestos
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="parametros" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Parámetros
              </TabsTrigger>
              <TabsTrigger value="plantillas" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Plantillas
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="presupuestos" className="mt-6">
          <Presupuestos />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="parametros" className="mt-6">
              <ParametrosPresupuestosNuevo />
            </TabsContent>

            <TabsContent value="plantillas" className="mt-6">
              <BudgetTemplatesManager />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
