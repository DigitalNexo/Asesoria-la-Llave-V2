import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  type: "task" | "tax" | "manual" | "client" | "user" | "general";
  action: "created" | "updated" | "deleted" | "reminder" | "assigned";
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  onlineUsers: 0,
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  // Escuchar cambios en el token
  useEffect(() => {
    const checkToken = () => {
      const newToken = localStorage.getItem("token");
      setToken(newToken);
    };

    window.addEventListener("storage", checkToken);
    const interval = setInterval(checkToken, 1000);

    return () => {
      window.removeEventListener("storage", checkToken);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      // Si no hay token, desconectar socket si existe
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
        setOnlineUsers(0); // Resetear contador
      }
      return;
    }

    // Conectar a Socket.IO
    const newSocket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      auth: {
        token
      }
    });

    newSocket.on("connect", () => {
      console.log("WebSocket conectado");
      setConnected(true);
      
      // Solicitar el número actual de usuarios conectados
      newSocket.emit("get:online-count");
    });

    newSocket.on("disconnect", (reason) => {
      console.log(`WebSocket desconectado - Razón: ${reason}`);
      setConnected(false);
      
      // Solo resetear contador si es una desconexión real
      const isTemporaryDisconnect = reason === 'io client disconnect' || 
                                   reason === 'io server disconnect' ||
                                   reason === 'ping timeout';
      
      if (!isTemporaryDisconnect) {
        setOnlineUsers(0);
      }
    });

    // Manejar heartbeat del servidor
    newSocket.on("heartbeat", (data) => {
      console.log("💓 Heartbeat recibido:", data);
      // Responder al heartbeat para mantener la sesión activa
      newSocket.emit("heartbeat-response", { timestamp: Date.now() });
    });

    // Escuchar respuesta del servidor con el conteo actual
    newSocket.on("online-count", (count: number) => {
      console.log(`Usuarios conectados: ${count}`);
      setOnlineUsers(count);
    });

    // Escuchar notificaciones
    newSocket.on("notification", (notification: Notification) => {
      console.log("Notificación recibida:", notification);
      
      // Mostrar toast con la notificación
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.action === "deleted" ? "destructive" : "default",
      });
    });

    // Escuchar usuarios conectados/desconectados (mantener para compatibilidad)
    newSocket.on("user:connected", () => {
      console.log("Usuario conectado");
      // El conteo se actualizará automáticamente con el evento online-count
    });

    newSocket.on("user:disconnected", () => {
      console.log("Usuario desconectado");
      // El conteo se actualizará automáticamente con el evento online-count
    });

    // Escuchar notificaciones de sesiones (solo para administradores)
    newSocket.on("session:new", (data) => {
      console.log("Nueva sesión detectada:", data);
      toast({
        title: "Nueva Sesión",
        description: `Usuario ${data.username} se conectó desde ${data.ip}`,
        variant: "default",
      });
    });

    newSocket.on("session:update", (data) => {
      console.log("Sesión actualizada:", data);
    });

    newSocket.on("sessions:terminated", (data) => {
      console.log("Sesiones terminadas:", data);
      toast({
        title: "Sesiones Terminadas",
        description: `Se terminaron ${data.count} sesiones del usuario`,
        variant: "default",
      });
    });

    // Manejar terminación de sesión por administrador
    newSocket.on("session:terminated", (data) => {
      console.log("Sesión terminada por administrador:", data);
      toast({
        title: "Sesión Terminada",
        description: data.message || "Tu sesión ha sido terminada por un administrador",
        variant: "destructive",
      });
      
      // Limpiar token y redirigir al login
      localStorage.removeItem("token");
      window.location.href = "/";
    });

    // Manejar errores
    newSocket.on("connect_error", (error) => {
      console.error("Error de conexión WebSocket:", error);
      setConnected(false);
      setOnlineUsers(0);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, toast]);

  return (
    <WebSocketContext.Provider value={{ socket, connected, onlineUsers }}>
      {children}
    </WebSocketContext.Provider>
  );
}
