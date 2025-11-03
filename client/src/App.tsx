import { Switch, Route, Redirect, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { WebSocketProvider, useWebSocket } from "@/contexts/WebSocketContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import { DatabaseStatus } from "@/components/database-status";
import { WifiIcon, WifiOffIcon } from "lucide-react";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Clientes from "@/pages/clientes";
import Tareas from "@/pages/tareas";
import Manuales from "@/pages/manuales";
import ImpuestosControl from "@/pages/impuestos-control";
import CalendarioAEATPage from "@/pages/calendario-aeat";
import TaxModelsPage from "@/pages/tax-models";
import ReportsPage from "@/features/reports/ReportsPage";
import ManualView from "@/pages/manual-view";
import ManualEditor from "@/pages/manual-editor";
import Admin from "@/pages/admin";
import Auditoria from "@/pages/auditoria";
import Notificaciones from "@/pages/notificaciones";
import Presupuestos from "@/pages/documentacion/presupuestos";
import PresupuestoFormNew from "@/pages/documentacion/presupuestos/PresupuestoFormNew";
import PresupuestoView from "@/pages/documentacion/presupuestos/PresupuestoView";
import PresupuestoEdit from "@/pages/documentacion/presupuestos/PresupuestoEdit";
import PublicBudgetAccept from "@/pages/documentacion/presupuestos/PublicBudgetAccept";
import ParametrosPresupuestos from "@/pages/documentacion/presupuestos/ParametrosPresupuestos";
import BudgetTemplatesManager from "@/pages/documentacion/presupuestos/BudgetTemplatesManager";
import DocumentacionMenu from "@/pages/documentacion-menu";
import DocumentacionPage from "@/pages/documentacion-page";
import Documentos from "@/pages/documentos";
// Presupuestos Gestoría
import PresupuestosLista from "@/pages/presupuestos/PresupuestosLista";
import PresupuestoNuevo from "@/pages/presupuestos/PresupuestoNuevo";
import PresupuestoDetalle from "@/pages/presupuestos/PresupuestoDetalle";
import ConfiguracionPrecios from "@/pages/presupuestos/ConfiguracionPrecios";

function ConnectionIndicator() {
  const { connected, onlineUsers } = useWebSocket();
  
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {connected ? (
        <>
          <WifiIcon className="h-4 w-4 text-green-500" />
          <span className="hidden sm:inline">Conectado ({onlineUsers})</span>
        </>
      ) : (
        <>
          <WifiOffIcon className="h-4 w-4 text-red-500" />
          <span className="hidden sm:inline">Desconectado</span>
        </>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Public route - accessible without authentication
  // Must be checked first before auth check
  const [isPublicRoute] = useRoute('/public/budgets/:code/accept');
  if (isPublicRoute) {
    return <PublicBudgetAccept />;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/:rest*">
          <Redirect to="/" />
        </Route>
      </Switch>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1 max-w-xl mx-4">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-4">
              <DatabaseStatus />
              <ConnectionIndicator />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/clientes" component={Clientes} />
              <Route path="/tareas" component={Tareas} />
              <Route path="/manuales" component={Manuales} />
              <Route path="/manuales/nuevo" component={ManualEditor} />
              <Route path="/manuales/:id/editar" component={ManualEditor} />
              <Route path="/manuales/:id" component={ManualView} />
              <Route path="/impuestos">
                <Redirect to="/impuestos/control" />
              </Route>
              <Route path="/impuestos/control" component={ImpuestosControl} />
              <Route path="/impuestos/calendario" component={CalendarioAEATPage} />
              <Route path="/impuestos/modelos" component={TaxModelsPage} />
              <Route path="/impuestos/reportes" component={ReportsPage} />
              <Route path="/notificaciones" component={Notificaciones} />
              {/* Documentación - Main menu para elegir entre Presupuestos y Documentos */}
              <Route path="/documentacion" component={DocumentacionMenu} />
              <Route path="/documentacion/presupuestos" component={DocumentacionPage} />
              {/* Subrutas de presupuestos */}
              <Route path="/documentacion/presupuestos/:rest*" component={DocumentacionPage} />
              {/* Documentos - Main page with tabs (todos, recibos, protección, bancaria, subir) */}
              <Route path="/documentacion/documentos" component={Documentos} />
              {/* Subrutas de documentos */}
              <Route path="/documentacion/documentos/:rest*" component={Documentos} />
              {/* Rutas específicas de presupuestos (sin tabs) */}
              <Route path="/documentacion/presupuestos/nuevo" component={PresupuestoFormNew} />
              <Route path="/documentacion/presupuestos/:id/editar" component={PresupuestoEdit} />
              <Route path="/documentacion/presupuestos/:id/ver" component={PresupuestoView} />
              <Route path="/documentacion/presupuestos/:id" component={PresupuestoView} />
              {/* Presupuestos Gestoría - Sistema completo OFICIAL/ONLINE */}
              <Route path="/presupuestos" component={PresupuestosLista} />
              <Route path="/presupuestos/nuevo" component={PresupuestoNuevo} />
              <Route path="/presupuestos/configuracion" component={ConfiguracionPrecios} />
              <Route path="/presupuestos/:id" component={PresupuestoDetalle} />
              <Route path="/presupuestos/:id/editar" component={PresupuestoNuevo} />
              {/* Admin main path plus wildcard to support nested admin routes and direct /admin navigation */}
              <Route path="/admin" component={() => ((user as any)?.roleName === "Administrador" ? <Admin /> : <Redirect to="/" />)} />
              <Route path="/admin/:rest*">
                {(user as any)?.roleName === "Administrador" ? <Admin /> : <Redirect to="/" />}
              </Route>
              <Route path="/auditoria" component={Auditoria} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  // Ensure sidebar is visible on app load
  useEffect(() => {
    // Check if sidebar cookie exists and is set to true
    const sidebarCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='));
    
    if (!sidebarCookie) {
      // If no cookie, set it to expanded state
      document.cookie = "sidebar_state=true; path=/; max-age=604800";
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light">
          <AuthProvider>
            <WebSocketProvider>
              <Router />
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
