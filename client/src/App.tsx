import { Switch, Route, Redirect } from "wouter";
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
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Clientes from "@/pages/clientes";
import Tareas from "@/pages/tareas";
import Manuales from "@/pages/manuales";
import ManualView from "@/pages/manual-view";
import ManualEditor from "@/pages/manual-editor";
import Admin from "@/pages/admin";
import Auditoria from "@/pages/auditoria";
import Notificaciones from "@/pages/notificaciones";

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
              <Route path="/notificaciones" component={Notificaciones} />
              <Route path="/admin">
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
