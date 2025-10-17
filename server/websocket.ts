import type { Server as SocketIOServer } from "socket.io";

export interface Notification {
  type: "task" | "tax" | "manual" | "client" | "user" | "general";
  action: "created" | "updated" | "deleted" | "reminder" | "assigned";
  title: string;
  message: string;
  data?: any;
  userId?: string;
  role?: string;
}

let io: SocketIOServer | null = null;

export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

// Notificar a un usuario específico
export function notifyUser(userId: string, notification: Notification) {
  if (!io) {
    console.warn("Socket.IO no está inicializado");
    return;
  }

  io.to(`user:${userId}`).emit("notification", {
    ...notification,
    timestamp: new Date().toISOString()
  });
}

// Notificar a todos los usuarios con un rol específico
export function notifyRole(role: string, notification: Notification) {
  if (!io) {
    console.warn("Socket.IO no está inicializado");
    return;
  }

  io.to(`role:${role}`).emit("notification", {
    ...notification,
    timestamp: new Date().toISOString()
  });
}

// Notificar a todos los usuarios conectados
export function notifyAll(notification: Notification) {
  if (!io) {
    console.warn("Socket.IO no está inicializado");
    return;
  }

  io.emit("notification", {
    ...notification,
    timestamp: new Date().toISOString()
  });
}

// Emitir log de sistema (actualización/restauración/backup)
export interface SystemLog {
  type: "update" | "restore" | "backup" | "migration";
  level: "info" | "success" | "warning" | "error";
  message: string;
  details?: string;
  progress?: number; // 0-100
}

export function emitSystemLog(log: SystemLog) {
  if (!io) {
    console.warn("Socket.IO no está inicializado");
    return;
  }

  io.emit("system:log", {
    ...log,
    timestamp: new Date().toISOString()
  });
  
  console.log(`[SYSTEM ${log.type.toUpperCase()}] ${log.message}${log.details ? ` - ${log.details}` : ''}`);
}

// Notificar cambios en tareas
export function notifyTaskChange(action: "created" | "updated" | "deleted", task: any, userId?: string) {
  const notification: Notification = {
    type: "task",
    action,
    title: `Tarea ${action === "created" ? "creada" : action === "updated" ? "actualizada" : "eliminada"}`,
    message: `La tarea "${task.titulo}" ha sido ${action === "created" ? "creada" : action === "updated" ? "actualizada" : "eliminada"}`,
    data: task
  };

  if (userId) {
    notifyUser(userId, notification);
  } else if (task.asignadoA) {
    notifyUser(task.asignadoA, notification);
  } else {
    notifyAll(notification);
  }
}

// Notificar cambios en impuestos
export function notifyTaxChange(action: "created" | "updated" | "deleted", clientTax: any, userId?: string) {
  const notification: Notification = {
    type: "tax",
    action,
    title: `Impuesto ${action === "created" ? "asignado" : action === "updated" ? "actualizado" : "eliminado"}`,
    message: `Un impuesto ha sido ${action === "created" ? "asignado" : action === "updated" ? "actualizado" : "eliminado"}`,
    data: clientTax
  };

  if (userId) {
    notifyUser(userId, notification);
  } else {
    notifyRole("ADMIN", notification);
    notifyRole("GESTOR", notification);
  }
}

// Notificar cambios en manuales
export function notifyManualChange(action: "created" | "updated" | "deleted", manual: any) {
  const notification: Notification = {
    type: "manual",
    action,
    title: `Manual ${action === "created" ? "publicado" : action === "updated" ? "actualizado" : "eliminado"}`,
    message: `El manual "${manual.titulo}" ha sido ${action === "created" ? "publicado" : action === "updated" ? "actualizado" : "eliminado"}`,
    data: manual
  };

  notifyAll(notification);
}

// Notificar cambios en clientes
export function notifyClientChange(action: "created" | "updated" | "deleted", client: any) {
  const notification: Notification = {
    type: "client",
    action,
    title: `Cliente ${action === "created" ? "creado" : action === "updated" ? "actualizado" : "eliminado"}`,
    message: `El cliente "${client.razonSocial}" ha sido ${action === "created" ? "creado" : action === "updated" ? "actualizado" : "eliminado"}`,
    data: client
  };

  notifyRole("ADMIN", notification);
  notifyRole("GESTOR", notification);
}

// Notificar recordatorios
export function notifyReminder(type: "task" | "tax", item: any, userId: string) {
  const isTask = type === "task";
  const notification: Notification = {
    type,
    action: "reminder",
    title: `Recordatorio: ${isTask ? "Tarea" : "Impuesto"} próximo a vencer`,
    message: isTask 
      ? `La tarea "${item.titulo}" vence el ${new Date(item.fechaVencimiento).toLocaleDateString()}`
      : `El impuesto vence el ${new Date(item.fechaLimite).toLocaleDateString()}`,
    data: item
  };

  notifyUser(userId, notification);
}
