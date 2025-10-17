import { useQuery } from "@tanstack/react-query";
import { Database, DatabaseZap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database: "connected" | "disconnected";
}

export function DatabaseStatus() {
  const { data, isLoading } = useQuery<HealthResponse>({
    queryKey: ["/api/health"],
    refetchInterval: 30000, // Verificar cada 30 segundos
    retry: 2,
  });

  const isHealthy = data?.status === "healthy" && data?.database === "connected";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Database className="h-4 w-4 animate-pulse" />
        <span className="hidden sm:inline">Verificando...</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
          {isHealthy ? (
            <>
              <DatabaseZap className="h-4 w-4 text-green-500" data-testid="icon-db-connected" />
              <span className="hidden sm:inline">DB Activa</span>
            </>
          ) : (
            <>
              <Database className="h-4 w-4 text-red-500" data-testid="icon-db-disconnected" />
              <span className="hidden sm:inline">DB Desconectada</span>
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-semibold">
            Estado: {isHealthy ? "Conectada" : "Desconectada"}
          </p>
          {data?.timestamp && (
            <p className="text-xs text-muted-foreground">
              Última verificación: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
