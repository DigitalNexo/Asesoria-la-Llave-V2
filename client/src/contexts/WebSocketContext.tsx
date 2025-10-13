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
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket desconectado");
      setConnected(false);
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

    // Escuchar usuarios conectados/desconectados
    newSocket.on("user:connected", () => {
      setOnlineUsers(prev => prev + 1);
    });

    newSocket.on("user:disconnected", () => {
      setOnlineUsers(prev => Math.max(0, prev - 1));
    });

    // Manejar errores
    newSocket.on("connect_error", (error) => {
      console.error("Error de conexión WebSocket:", error);
      setConnected(false);
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
