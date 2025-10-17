import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface SystemLog {
  type: "update" | "restore" | "backup" | "migration";
  level: "info" | "success" | "warning" | "error";
  message: string;
  details?: string;
  progress?: number;
  timestamp: string;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (!socket) return;

    const handleSystemLog = (log: SystemLog) => {
      setLogs(prev => [...prev, log]);
    };

    socket.on("system:log", handleSystemLog);

    return () => {
      socket.off("system:log", handleSystemLog);
    };
  }, [socket]);

  const getLevelIcon = (level: SystemLog["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelBadgeVariant = (level: SystemLog["level"]) => {
    switch (level) {
      case "success":
        return "default";
      case "error":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (logs.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Logs del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-md hover-elevate"
                data-testid={`log-item-${index}`}
              >
                <div className="flex-shrink-0 mt-1">{getLevelIcon(log.level)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs">
                      {log.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                  <p className="text-sm" data-testid={`log-message-${index}`}>
                    {log.message}
                  </p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`log-details-${index}`}>
                      {log.details}
                    </p>
                  )}
                  {log.progress !== undefined && (
                    <div className="mt-2 w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${log.progress}%` }}
                        data-testid={`log-progress-${index}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
