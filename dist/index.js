var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/websocket.ts
function setSocketIO(socketIO) {
  io = socketIO;
}
function getSocketIO() {
  return io;
}
function getSocketServer() {
  return getSocketIO();
}
function notifyUser(userId, notification) {
  if (!io) {
    console.warn("Socket.IO no est\xE1 inicializado");
    return;
  }
  io.to(`user:${userId}`).emit("notification", {
    ...notification,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function notifyRole(role, notification) {
  if (!io) {
    console.warn("Socket.IO no est\xE1 inicializado");
    return;
  }
  io.to(`role:${role}`).emit("notification", {
    ...notification,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function notifyAll(notification) {
  if (!io) {
    console.warn("Socket.IO no est\xE1 inicializado");
    return;
  }
  io.emit("notification", {
    ...notification,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function emitSystemLog(log2) {
  if (!io) {
    console.warn("Socket.IO no est\xE1 inicializado");
    return;
  }
  io.emit("system:log", {
    ...log2,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  console.log(`[SYSTEM ${log2.type.toUpperCase()}] ${log2.message}${log2.details ? ` - ${log2.details}` : ""}`);
}
function notifyTaskChange(action, task, userId) {
  const notification = {
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
function notifyTaxChange(action, clientTax, userId) {
  const notification = {
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
function notifyClientChange(action, client) {
  const notification = {
    type: "client",
    action,
    title: `Cliente ${action === "created" ? "creado" : action === "updated" ? "actualizado" : "eliminado"}`,
    message: `El cliente "${client.razonSocial}" ha sido ${action === "created" ? "creado" : action === "updated" ? "actualizado" : "eliminado"}`,
    data: client
  };
  notifyRole("ADMIN", notification);
  notifyRole("GESTOR", notification);
}
var io;
var init_websocket = __esm({
  "server/websocket.ts"() {
    io = null;
  }
});

// server/services/storage-provider.ts
import fs6 from "fs/promises";
import path5 from "path";
var LocalStorageProvider;
var init_storage_provider = __esm({
  "server/services/storage-provider.ts"() {
    LocalStorageProvider = class {
      constructor(basePath = path5.join(process.cwd(), "uploads")) {
        this.basePath = basePath;
      }
      async upload(file, relativePath) {
        const fullPath = path5.join(this.basePath, relativePath);
        const dir = path5.dirname(fullPath);
        await fs6.mkdir(dir, { recursive: true });
        if (Buffer.isBuffer(file)) {
          await fs6.writeFile(fullPath, file);
        } else {
          const writeStream = (await import("fs")).createWriteStream(fullPath);
          await new Promise((resolve, reject) => {
            file.pipe(writeStream);
            file.on("end", resolve);
            file.on("error", reject);
            writeStream.on("error", reject);
          });
        }
        return relativePath;
      }
      async download(relativePath) {
        const fullPath = path5.join(this.basePath, relativePath);
        return await fs6.readFile(fullPath);
      }
      async delete(relativePath) {
        const fullPath = path5.join(this.basePath, relativePath);
        await fs6.unlink(fullPath);
      }
      async list(relativePath = "", recursive = false) {
        const fullPath = path5.join(this.basePath, relativePath);
        const files = [];
        try {
          const entries = await fs6.readdir(fullPath, { withFileTypes: true });
          for (const entry of entries) {
            const entryPath = path5.join(relativePath, entry.name);
            if (entry.isFile()) {
              files.push(entryPath);
            } else if (entry.isDirectory() && recursive) {
              const subFiles = await this.list(entryPath, true);
              files.push(...subFiles);
            }
          }
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
        return files;
      }
      async exists(relativePath) {
        const fullPath = path5.join(this.basePath, relativePath);
        try {
          await fs6.access(fullPath);
          return true;
        } catch {
          return false;
        }
      }
      getPublicUrl(relativePath) {
        return `/uploads/${relativePath}`;
      }
    };
  }
});

// server/services/ftp-storage-provider.ts
import { Client as FTPClient } from "basic-ftp";
import { Readable } from "stream";
import path6 from "path";
var FTPStorageProvider;
var init_ftp_storage_provider = __esm({
  "server/services/ftp-storage-provider.ts"() {
    FTPStorageProvider = class {
      constructor(config) {
        this.client = null;
        this.isConnected = false;
        this.connectionPromise = null;
        this.config = {
          ...config,
          basePath: config.basePath || "/uploads",
          secure: config.secure || false
        };
      }
      async ensureConnection() {
        if (this.isConnected && this.client) {
          return;
        }
        if (this.connectionPromise) {
          return this.connectionPromise;
        }
        this.connectionPromise = (async () => {
          try {
            this.client = new FTPClient();
            this.client.ftp.verbose = false;
            await this.client.access({
              host: this.config.host,
              port: this.config.port,
              user: this.config.user,
              password: this.config.password,
              secure: this.config.secure
            });
            this.isConnected = true;
          } catch (error) {
            this.client = null;
            this.isConnected = false;
            throw new Error(`Error al conectar con FTP: ${error instanceof Error ? error.message : "Error desconocido"}`);
          } finally {
            this.connectionPromise = null;
          }
        })();
        return this.connectionPromise;
      }
      async upload(file, relativePath) {
        await this.ensureConnection();
        if (!this.client) throw new Error("Cliente FTP no conectado");
        const fullPath = path6.posix.join(this.config.basePath, relativePath);
        const dir = path6.posix.dirname(fullPath);
        await this.client.ensureDir(dir);
        if (Buffer.isBuffer(file)) {
          try {
            const stream = Readable.from(file);
            await this.client.uploadFrom(stream, fullPath);
          } catch (error) {
            this.isConnected = false;
            await this.ensureConnection();
            const stream = Readable.from(file);
            await this.client.uploadFrom(stream, fullPath);
          }
        } else {
          await this.client.uploadFrom(file, fullPath);
        }
        return relativePath;
      }
      async download(relativePath) {
        await this.ensureConnection();
        if (!this.client) throw new Error("Cliente FTP no conectado");
        const fullPath = path6.posix.join(this.config.basePath, relativePath);
        const chunks = [];
        try {
          const writableStream = new (__require("stream")).Writable({
            write(chunk, encoding, callback) {
              chunks.push(chunk);
              callback();
            }
          });
          await this.client.downloadTo(writableStream, fullPath);
          return Buffer.concat(chunks);
        } catch (error) {
          this.isConnected = false;
          await this.ensureConnection();
          const writableStream = new (__require("stream")).Writable({
            write(chunk, encoding, callback) {
              chunks.push(chunk);
              callback();
            }
          });
          await this.client.downloadTo(writableStream, fullPath);
          return Buffer.concat(chunks);
        }
      }
      async delete(relativePath) {
        await this.ensureConnection();
        if (!this.client) throw new Error("Cliente FTP no conectado");
        const fullPath = path6.posix.join(this.config.basePath, relativePath);
        try {
          await this.client.remove(fullPath);
        } catch (error) {
          this.isConnected = false;
          await this.ensureConnection();
          await this.client.remove(fullPath);
        }
      }
      async list(relativePath = "", recursive = false) {
        await this.ensureConnection();
        if (!this.client) throw new Error("Cliente FTP no conectado");
        const fullPath = path6.posix.join(this.config.basePath, relativePath);
        const files = [];
        try {
          if (recursive) {
            await this.listRecursive(fullPath, relativePath, files);
          } else {
            const items = await this.client.list(fullPath);
            for (const item of items) {
              if (item.type === 1) {
                const filePath = path6.posix.join(relativePath, item.name);
                files.push(filePath);
              }
            }
          }
          return files;
        } catch (error) {
          if (error.code === 550) {
            return [];
          }
          this.isConnected = false;
          await this.ensureConnection();
          return this.list(relativePath, recursive);
        }
      }
      async listRecursive(fullPath, relativePath, files) {
        if (!this.client) return;
        const items = await this.client.list(fullPath);
        for (const item of items) {
          const itemRelativePath = path6.posix.join(relativePath, item.name);
          const itemFullPath = path6.posix.join(fullPath, item.name);
          if (item.type === 1) {
            files.push(itemRelativePath);
          } else if (item.type === 2) {
            await this.listRecursive(itemFullPath, itemRelativePath, files);
          }
        }
      }
      async exists(relativePath) {
        await this.ensureConnection();
        if (!this.client) throw new Error("Cliente FTP no conectado");
        const fullPath = path6.posix.join(this.config.basePath, relativePath);
        const dir = path6.posix.dirname(fullPath);
        const filename = path6.posix.basename(fullPath);
        try {
          const items = await this.client.list(dir);
          return items.some((item) => item.name === filename);
        } catch (error) {
          if (error.code === 550) {
            return false;
          }
          this.isConnected = false;
          await this.ensureConnection();
          return this.exists(relativePath);
        }
      }
      getPublicUrl(relativePath) {
        return `/uploads/${relativePath}`;
      }
      async disconnect() {
        if (this.client) {
          this.client.close();
          this.client = null;
          this.isConnected = false;
        }
      }
      // Método de prueba de conexión
      async testConnection() {
        try {
          await this.ensureConnection();
          return this.isConnected;
        } catch (error) {
          return false;
        }
      }
    };
  }
});

// server/services/smb-storage-provider.ts
import SMB2 from "@marsaud/smb2";
import path7 from "path";
var SMBStorageProvider;
var init_smb_storage_provider = __esm({
  "server/services/smb-storage-provider.ts"() {
    SMBStorageProvider = class {
      constructor(config) {
        this.client = null;
        this.config = {
          ...config,
          port: config.port || 445,
          basePath: config.basePath || "/uploads",
          domain: config.domain || ""
        };
        this.initializeClient();
      }
      initializeClient() {
        this.client = new SMB2({
          share: `\\\\${this.config.host}\\${this.config.share}`,
          domain: this.config.domain || "",
          username: this.config.username,
          password: this.config.password,
          port: this.config.port
        });
      }
      getSMBPath(relativePath) {
        const combined = path7.posix.join(this.config.basePath, relativePath);
        return combined.replace(/\//g, "\\");
      }
      async upload(file, relativePath) {
        const smbPath = this.getSMBPath(relativePath);
        const dir = path7.dirname(smbPath);
        return new Promise((resolve, reject) => {
          this.client.mkdir(dir, (err) => {
            if (err && err.code !== "STATUS_OBJECT_NAME_COLLISION") {
            }
            if (Buffer.isBuffer(file)) {
              this.client.writeFile(smbPath, file, (writeErr) => {
                if (writeErr) {
                  reject(new Error(`Error al escribir archivo SMB: ${writeErr.message}`));
                } else {
                  resolve(relativePath);
                }
              });
            } else {
              const writeStream = this.client.createWriteStream(smbPath);
              writeStream.on("error", (streamErr) => {
                reject(new Error(`Error al escribir stream SMB: ${streamErr.message}`));
              });
              writeStream.on("finish", () => {
                resolve(relativePath);
              });
              file.pipe(writeStream);
            }
          });
        });
      }
      async download(relativePath) {
        const smbPath = this.getSMBPath(relativePath);
        return new Promise((resolve, reject) => {
          this.client.readFile(smbPath, (err, data) => {
            if (err) {
              reject(new Error(`Error al leer archivo SMB: ${err.message}`));
            } else {
              resolve(data);
            }
          });
        });
      }
      async delete(relativePath) {
        const smbPath = this.getSMBPath(relativePath);
        return new Promise((resolve, reject) => {
          this.client.unlink(smbPath, (err) => {
            if (err) {
              reject(new Error(`Error al eliminar archivo SMB: ${err.message}`));
            } else {
              resolve();
            }
          });
        });
      }
      async list(relativePath = "", recursive = false) {
        const smbPath = this.getSMBPath(relativePath);
        const files = [];
        try {
          if (recursive) {
            await this.listRecursive(smbPath, relativePath, files);
          } else {
            const items = await this.readdir(smbPath);
            for (const item of items) {
              if (item.type === "file") {
                const filePath = path7.posix.join(relativePath, item.name);
                files.push(filePath);
              }
            }
          }
          return files;
        } catch (error) {
          return [];
        }
      }
      async readdir(smbPath) {
        return new Promise((resolve, reject) => {
          this.client.readdir(smbPath, (err, files) => {
            if (err) {
              reject(err);
            } else {
              const items = files.map((file) => ({
                name: file.name,
                type: file.type === "directory" ? "directory" : "file"
              }));
              resolve(items);
            }
          });
        });
      }
      async listRecursive(smbPath, relativePath, files) {
        const items = await this.readdir(smbPath);
        for (const item of items) {
          const itemRelativePath = path7.posix.join(relativePath, item.name);
          const itemSMBPath = path7.join(smbPath, item.name);
          if (item.type === "file") {
            files.push(itemRelativePath);
          } else if (item.type === "directory") {
            await this.listRecursive(itemSMBPath, itemRelativePath, files);
          }
        }
      }
      async exists(relativePath) {
        const smbPath = this.getSMBPath(relativePath);
        return new Promise((resolve) => {
          this.client.exists(smbPath, (err, exists) => {
            if (err) {
              resolve(false);
            } else {
              resolve(exists);
            }
          });
        });
      }
      getPublicUrl(relativePath) {
        return `/uploads/${relativePath}`;
      }
      async disconnect() {
        return new Promise((resolve) => {
          if (this.client) {
            this.client.disconnect();
            this.client = null;
          }
          resolve();
        });
      }
      // Método de prueba de conexión
      async testConnection() {
        try {
          const basePath = this.config.basePath.replace(/\//g, "\\");
          await this.readdir(basePath);
          return true;
        } catch (error) {
          return false;
        }
      }
    };
  }
});

// server/services/storage-factory.ts
import { PrismaClient as PrismaClient15 } from "@prisma/client";
import crypto3 from "crypto";
import path8 from "path";
function getEncryptionKey2() {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY;
  if (!envKey || envKey.length < 32) {
    throw new Error("STORAGE_ENCRYPTION_KEY no configurada o muy corta. Debe tener al menos 32 caracteres.");
  }
  return envKey;
}
function encryptPassword2(password) {
  const ENCRYPTION_KEY = getEncryptionKey2();
  const iv = crypto3.randomBytes(16);
  const cipher = crypto3.createCipheriv(ALGORITHM2, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
function decryptPassword2(encryptedData) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey2();
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error("Formato de datos cifrados inv\xE1lido");
    }
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    const decipher = crypto3.createDecipheriv(ALGORITHM2, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    throw new Error("Error al descifrar contrase\xF1a");
  }
}
var prisma15, ALGORITHM2, StorageFactory;
var init_storage_factory = __esm({
  "server/services/storage-factory.ts"() {
    init_storage_provider();
    init_ftp_storage_provider();
    init_smb_storage_provider();
    prisma15 = new PrismaClient15();
    ALGORITHM2 = "aes-256-gcm";
    StorageFactory = class {
      static {
        this.instance = null;
      }
      static {
        this.currentConfigId = null;
      }
      // Obtener el provider de almacenamiento activo
      static async getActiveProvider() {
        const activeConfig = await prisma15.storageConfig.findFirst({
          where: { isActive: true }
        });
        if (!activeConfig || this.currentConfigId !== activeConfig.id || !this.instance) {
          this.instance = await this.createProvider(activeConfig);
          this.currentConfigId = activeConfig?.id || null;
        }
        return this.instance;
      }
      // Obtener provider para una configuración específica por ID
      static async getProviderById(configId) {
        const config = await prisma15.storageConfig.findUnique({
          where: { id: configId }
        });
        if (!config) {
          throw new Error(`Configuraci\xF3n de storage no encontrada: ${configId}`);
        }
        return this.createProvider(config);
      }
      // Crear provider según configuración
      static async createProvider(config) {
        if (!config || config.type === "LOCAL") {
          const basePath = config?.basePath ? path8.join(process.cwd(), config.basePath) : void 0;
          return new LocalStorageProvider(basePath);
        }
        if (config.type === "FTP") {
          if (!config.host || !config.port || !config.username || !config.encryptedPassword) {
            throw new Error("Configuraci\xF3n FTP incompleta");
          }
          const ftpConfig = {
            host: config.host,
            port: config.port,
            user: config.username,
            password: decryptPassword2(config.encryptedPassword),
            basePath: config.basePath || "/uploads",
            secure: false
            // Puede ser configurable
          };
          return new FTPStorageProvider(ftpConfig);
        }
        if (config.type === "SMB") {
          if (!config.host || !config.username || !config.encryptedPassword) {
            throw new Error("Configuraci\xF3n SMB incompleta");
          }
          const pathParts = config.basePath.split("/").filter((p) => p);
          const share = pathParts[0] || "uploads";
          const basePath = "/" + pathParts.slice(1).join("/");
          const smbConfig = {
            host: config.host,
            port: config.port || 445,
            domain: "",
            // Puede ser configurable
            username: config.username,
            password: decryptPassword2(config.encryptedPassword),
            basePath: basePath || "/",
            share
          };
          return new SMBStorageProvider(smbConfig);
        }
        return new LocalStorageProvider("/uploads");
      }
      // Probar conexión con una configuración específica guardada
      static async testConfiguration(configId) {
        const config = await prisma15.storageConfig.findUnique({
          where: { id: configId }
        });
        if (!config) {
          throw new Error("Configuraci\xF3n no encontrada");
        }
        const provider = await this.createProvider(config);
        if ("testConnection" in provider && typeof provider.testConnection === "function") {
          return await provider.testConnection();
        }
        return true;
      }
      // Probar conexión con una configuración temporal (sin guardar)
      static async testConfigurationData(config) {
        try {
          const provider = await this.createProvider(config);
          if ("testConnection" in provider && typeof provider.testConnection === "function") {
            const success = await provider.testConnection();
            if (success) {
              return { success: true, message: "Conexi\xF3n exitosa" };
            } else {
              return { success: false, message: "Conexi\xF3n fallida" };
            }
          }
          return { success: true, message: "Provider creado correctamente" };
        } catch (error) {
          return { success: false, message: error.message || "Error al probar configuraci\xF3n" };
        }
      }
      // Limpiar instancia (útil para pruebas o cambio de configuración)
      static async clearInstance() {
        if (this.instance && "disconnect" in this.instance) {
          await this.instance.disconnect?.();
        }
        this.instance = null;
        this.currentConfigId = null;
      }
      // Crear provider para una configuración específica (sin activarla)
      static async createProviderForConfig(configId) {
        const config = await prisma15.storageConfig.findUnique({
          where: { id: configId }
        });
        if (!config) {
          throw new Error("Configuraci\xF3n no encontrada");
        }
        return await this.createProvider(config);
      }
    };
  }
});

// server/services/migration-service.ts
var migration_service_exports = {};
__export(migration_service_exports, {
  MigrationService: () => MigrationService,
  migrateStorage: () => migrateStorage
});
import { PrismaClient as PrismaClient17 } from "@prisma/client";
import path11 from "path";
async function migrateStorage(targetConfigId) {
  try {
    const currentConfig = await prisma17.storageConfig.findFirst({
      where: { isActive: true }
    });
    if (!currentConfig) {
      throw new Error("No hay configuraci\xF3n de almacenamiento activa");
    }
    const targetConfig = await prisma17.storageConfig.findUnique({
      where: { id: targetConfigId }
    });
    if (!targetConfig) {
      throw new Error("Configuraci\xF3n de destino no encontrada");
    }
    if (currentConfig.id === targetConfig.id) {
      throw new Error("La configuraci\xF3n origen y destino son la misma");
    }
    emitSystemLog({
      type: "migration",
      level: "info",
      message: `Migrando de ${currentConfig.type} a ${targetConfig.type}`
    });
    const sourceProvider = await StorageFactory.getActiveProvider();
    const targetProvider = await StorageFactory.getProviderById(targetConfigId);
    const migrationService = new MigrationService(sourceProvider, targetProvider);
    const result = await migrationService.migrate();
    if (result.success) {
      await prisma17.storageConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      await prisma17.storageConfig.update({
        where: { id: targetConfigId },
        data: { isActive: true }
      });
      emitSystemLog({
        type: "migration",
        level: "success",
        message: `Configuraci\xF3n activa cambiada a ${targetConfig.type}`
      });
    } else {
      emitSystemLog({
        type: "migration",
        level: "warning",
        message: "Migraci\xF3n fall\xF3, configuraci\xF3n activa sin cambios"
      });
    }
    return result;
  } catch (error) {
    emitSystemLog({
      type: "migration",
      level: "warning",
      message: "Migraci\xF3n cancelada - archivos parciales eliminados, configuraci\xF3n activa sin cambios"
    });
    emitSystemLog({
      type: "migration",
      level: "error",
      message: `Error en migraci\xF3n: ${error.message}`
    });
    throw error;
  }
}
var prisma17, MigrationService;
var init_migration_service = __esm({
  "server/services/migration-service.ts"() {
    init_storage_factory();
    init_websocket();
    prisma17 = new PrismaClient17();
    MigrationService = class {
      constructor(sourceProvider, targetProvider) {
        this.migratedFiles = [];
        this.sourceProvider = sourceProvider;
        this.targetProvider = targetProvider;
        this.progress = {
          totalFiles: 0,
          processedFiles: 0,
          currentFile: "",
          errors: []
        };
      }
      /**
       * Lista todos los archivos recursivamente de un directorio
       */
      async listAllFiles(provider, basePath = "") {
        const files = [];
        try {
          const items = await provider.list(basePath);
          for (const item of items) {
            const fullPath = basePath ? path11.join(basePath, item) : item;
            try {
              const subItems = await provider.list(fullPath);
              if (subItems.length > 0) {
                const subFiles = await this.listAllFiles(provider, fullPath);
                files.push(...subFiles);
              } else {
                files.push(fullPath);
              }
            } catch {
              files.push(fullPath);
            }
          }
        } catch (error) {
          emitSystemLog({
            type: "migration",
            level: "warning",
            message: `No se pudo listar ${basePath}: ${error.message}`
          });
        }
        return files;
      }
      /**
       * Copia un archivo del origen al destino
       */
      async copyFile(filePath) {
        try {
          const fileBuffer = await this.sourceProvider.download(filePath);
          await this.targetProvider.upload(fileBuffer, filePath);
          this.migratedFiles.push(filePath);
          emitSystemLog({
            type: "migration",
            level: "success",
            message: `\u2713 Migrado: ${filePath}`
          });
        } catch (error) {
          const errorMsg = `Error migrando ${filePath}: ${error.message}`;
          this.progress.errors.push(errorMsg);
          emitSystemLog({
            type: "migration",
            level: "error",
            message: errorMsg
          });
          throw error;
        }
      }
      /**
       * Revierte la migración eliminando archivos copiados
       */
      async rollback() {
        emitSystemLog({
          type: "migration",
          level: "warning",
          message: "Iniciando rollback de migraci\xF3n..."
        });
        for (const filePath of this.migratedFiles) {
          try {
            await this.targetProvider.delete(filePath);
            emitSystemLog({
              type: "migration",
              level: "info",
              message: `Eliminado: ${filePath}`
            });
          } catch (error) {
            emitSystemLog({
              type: "migration",
              level: "error",
              message: `Error eliminando ${filePath}: ${error.message}`
            });
          }
        }
        emitSystemLog({
          type: "migration",
          level: "info",
          message: `Rollback completado. ${this.migratedFiles.length} archivos eliminados.`
        });
      }
      /**
       * Ejecuta la migración completa
       */
      async migrate() {
        try {
          emitSystemLog({
            type: "migration",
            level: "info",
            message: "\u{1F680} Iniciando migraci\xF3n de archivos..."
          });
          emitSystemLog({
            type: "migration",
            level: "info",
            message: "Listando archivos del origen..."
          });
          const allFiles = await this.listAllFiles(this.sourceProvider);
          this.progress.totalFiles = allFiles.length;
          emitSystemLog({
            type: "migration",
            level: "info",
            message: `Encontrados ${allFiles.length} archivos para migrar`
          });
          if (allFiles.length === 0) {
            emitSystemLog({
              type: "migration",
              level: "warning",
              message: "No hay archivos para migrar"
            });
            return {
              success: true,
              totalFiles: 0,
              migratedFiles: 0,
              errors: []
            };
          }
          for (const filePath of allFiles) {
            this.progress.currentFile = filePath;
            const progressPercent = Math.round((this.progress.processedFiles + 1) / this.progress.totalFiles * 100);
            emitSystemLog({
              type: "migration",
              level: "info",
              message: `Migrando [${this.progress.processedFiles + 1}/${this.progress.totalFiles}]: ${filePath}`,
              progress: progressPercent
            });
            await this.copyFile(filePath);
            this.progress.processedFiles++;
          }
          emitSystemLog({
            type: "migration",
            level: "success",
            message: `\u2705 Migraci\xF3n completada exitosamente: ${this.migratedFiles.length} archivos`
          });
          return {
            success: true,
            totalFiles: this.progress.totalFiles,
            migratedFiles: this.migratedFiles.length,
            errors: []
          };
        } catch (error) {
          emitSystemLog({
            type: "migration",
            level: "error",
            message: `\u274C Error en migraci\xF3n: ${error.message}`
          });
          if (this.migratedFiles.length > 0) {
            try {
              await this.rollback();
            } catch (rollbackError) {
              emitSystemLog({
                type: "migration",
                level: "error",
                message: `Error durante rollback: ${rollbackError.message}`
              });
            }
          }
          throw error;
        }
      }
    };
  }
});

// server/index.ts
import express7 from "express";

// server/routes.ts
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// server/prisma-storage.ts
import {
  PrismaClient
} from "@prisma/client";
import { randomUUID } from "crypto";

// server/crypto-utils.ts
import crypto from "crypto";
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var TAG_LENGTH = 16;
var KEY_LENGTH = 32;
var cachedEncryptionKey = null;
var getEncryptionKey = () => {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn("\u26A0\uFE0F  ENCRYPTION_KEY no configurada, usando clave determin\xEDstica temporal (NO seguro para producci\xF3n)");
    cachedEncryptionKey = crypto.pbkdf2Sync("dev-fallback-key-not-secure", "smtp-salt-fixed", 1e5, KEY_LENGTH, "sha256");
  } else {
    cachedEncryptionKey = crypto.pbkdf2Sync(key, "smtp-salt", 1e5, KEY_LENGTH, "sha256");
  }
  return cachedEncryptionKey;
};
function encryptPassword(password) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}
function decryptPassword(encryptedPassword) {
  try {
    const iv = Buffer.from(encryptedPassword.slice(0, IV_LENGTH * 2), "hex");
    const authTag = Buffer.from(encryptedPassword.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), "hex");
    const encrypted = encryptedPassword.slice((IV_LENGTH + TAG_LENGTH) * 2);
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Error al desencriptar password SMTP:", error);
    throw new Error("Error al desencriptar credencial SMTP");
  }
}

// shared/tax-rules.ts
var CLIENT_TYPES = ["AUTONOMO", "EMPRESA", "PARTICULAR"];
var TAX_PERIODICITIES = ["MENSUAL", "TRIMESTRAL", "ANUAL", "ESPECIAL_FRACCIONADO"];
var TAX_RULES = {
  "100": { allowedTypes: ["AUTONOMO", "PARTICULAR"], allowedPeriods: ["ANUAL"] },
  "200": { allowedTypes: ["EMPRESA"], allowedPeriods: ["ANUAL"] },
  "202": {
    allowedTypes: ["EMPRESA"],
    allowedPeriods: ["ESPECIAL_FRACCIONADO"],
    labels: ["Abril", "Octubre", "Diciembre"]
  },
  "130": { allowedTypes: ["AUTONOMO"], allowedPeriods: ["TRIMESTRAL"] },
  "131": { allowedTypes: ["AUTONOMO"], allowedPeriods: ["TRIMESTRAL"] },
  "303": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] },
  "390": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "347": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "349": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] },
  "720": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "190": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "180": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "111": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] }
};
var TAX_MODEL_METADATA = {
  "100": { name: "IRPF - Declaraci\xF3n de la Renta" },
  "111": { name: "Retenciones - Modelo 111" },
  "130": { name: "IRPF - Pago fraccionado (actividades econ\xF3micas)" },
  "131": { name: "IRPF - Pago fraccionado (estimaci\xF3n directa)" },
  "180": { name: "Retenciones - Alquileres" },
  "190": { name: "Retenciones - Resumen anual" },
  "200": { name: "Impuesto sobre Sociedades" },
  "202": { name: "Pagos fraccionados IS" },
  "303": { name: "IVA - Autoliquidaci\xF3n" },
  "347": { name: "Operaciones con terceras personas" },
  "349": { name: "Operaciones intracomunitarias" },
  "390": { name: "IVA - Resumen anual" },
  "720": { name: "Bienes en el extranjero" }
};
var TAX_CONTROL_MODEL_ORDER = [
  "100",
  "111",
  "130",
  "131",
  "200",
  "202",
  "303",
  "347",
  "349",
  "390",
  "190",
  "180",
  "720"
];
var NORMALIZED_TAX_STATUSES = ["PENDIENTE", "CALCULADO", "PRESENTADO"];
function validateTaxAssignmentInput(options) {
  const { clientType, taxModelCode, periodicity } = options;
  const rule = TAX_RULES[taxModelCode];
  if (!rule) {
    throw new Error(`Modelo fiscal desconocido: ${taxModelCode}`);
  }
  if (!rule.allowedTypes.includes(clientType)) {
    throw new Error(
      `El modelo ${taxModelCode} no es compatible con clientes de tipo ${clientType}`
    );
  }
  if (!rule.allowedPeriods.includes(periodicity)) {
    throw new Error(
      `La periodicidad ${periodicity} no est\xE1 permitida para el modelo ${taxModelCode}`
    );
  }
}

// server/services/tax-calendar-service.ts
var STATUS_PENDING = "PENDIENTE";
var STATUS_OPEN = "ABIERTO";
var STATUS_CLOSED = "CERRADO";
var DAY_MS = 1e3 * 60 * 60 * 24;
function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
function diffInDays(target, reference) {
  const ms = target.getTime() - reference.getTime();
  return Math.ceil(ms / DAY_MS);
}
function calculateTaxPeriodStatus(startDate, endDate) {
  const today2 = normalizeDate(/* @__PURE__ */ new Date());
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (today2 < start) {
    return STATUS_PENDING;
  }
  if (today2 > end) {
    return STATUS_CLOSED;
  }
  return STATUS_OPEN;
}
function calculateDerivedFields(startDate, endDate) {
  const today2 = /* @__PURE__ */ new Date();
  const status = calculateTaxPeriodStatus(startDate, endDate);
  const isPending = status === STATUS_PENDING;
  const isOpen = status === STATUS_OPEN;
  const daysToStart = isPending ? diffInDays(startDate, today2) : null;
  const daysToEnd = isOpen ? diffInDays(endDate, today2) : null;
  return {
    status,
    daysToStart,
    daysToEnd
  };
}

// server/prisma-storage.ts
var FilingStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  PRESENTED: "PRESENTED"
};
var TaxPeriodType = {
  QUARTERLY: "QUARTERLY",
  ANNUAL: "ANNUAL",
  SPECIAL: "SPECIAL"
};
var PeriodStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED"
};
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured. Please set it in your environment variables.");
}
var prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
function mapPrismaUser(users) {
  return {
    id: users.id,
    username: users.username,
    email: users.email,
    password: users.password,
    role: users.role || null,
    roleId: users.roleId || null,
    isActive: users.isActive ?? true,
    createdAt: users.createdAt
  };
}
function mapJsonArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`);
  }
  return [];
}
function mapPrismaTaxModelsConfig(config) {
  return {
    code: config.code,
    name: config.name,
    allowedTypes: mapJsonArray(config.allowedTypes),
    allowedPeriods: mapJsonArray(config.allowedPeriods),
    labels: config.labels ? mapJsonArray(config.labels) : null,
    isActive: config.isActive ?? true,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
}
function mapPrismaClientTaxAssignment(assignment) {
  return {
    id: assignment.id,
    clientId: assignment.clientId,
    taxModelCode: assignment.taxModelCode,
    periodicity: assignment.periodicidad,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    activeFlag: assignment.activeFlag,
    notes: assignment.notes,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    effectiveActive: !assignment.endDate && Boolean(assignment.activeFlag),
    tax_models: assignment.taxModel ? mapPrismaTaxModelsConfig(assignment.taxModel) : null
  };
}
function getTaxModelName(code) {
  return TAX_MODEL_METADATA[code]?.name ?? `Modelo ${code}`;
}
var TAX_CONTROL_MODELS = [...TAX_CONTROL_MODEL_ORDER];
var STATUS_PRIORITY = {
  PRESENTADO: 6,
  PRESENTED: 6,
  CALCULADO: 5,
  CALCULATED: 5,
  IN_PROGRESS: 4,
  COMPLETED: 4,
  PENDIENTE: 2,
  PENDING: 2,
  NOT_STARTED: 1
};
function normalizeStatus(rawStatus, isActive) {
  if (!rawStatus) {
    return isActive ? "PENDIENTE" : null;
  }
  const upper = rawStatus.toUpperCase();
  if (upper === "NOT_STARTED") return "PENDIENTE";
  if (upper === "IN_PROGRESS") return "CALCULADO";
  if (upper === "PRESENTED") return "PRESENTADO";
  if (upper === "CALCULATED") return "CALCULADO";
  if (upper === "PENDING" || upper === "NOT_STARTED") return "PENDIENTE";
  if (NORMALIZED_TAX_STATUSES.includes(upper)) return upper;
  return upper;
}
function formatPeriodLabel(tax_periods) {
  if (!tax_periods) return null;
  if (tax_periods.quarter != null) {
    return `${tax_periods.quarter}T/${tax_periods.year}`;
  }
  if (tax_periods.label) {
    return `${tax_periods.label} ${tax_periods.year}`;
  }
  return `${tax_periods.year}`;
}
function mapPrismaClient(client) {
  return {
    id: client.id,
    razonSocial: client.razonSocial,
    nifCif: client.nifCif,
    tipo: (client.tipo || "").toUpperCase(),
    email: client.email,
    telefono: client.telefono,
    direccion: client.direccion,
    fechaAlta: client.fechaAlta,
    fechaBaja: client.fechaBaja,
    responsableAsignado: client.responsableAsignado,
    tax_models: client.taxModels || null,
    isActive: client.isActive ?? true,
    notes: client.notes ?? null,
    client_tax_assignments: client.client_tax_assignments ? client.client_tax_assignments.map(mapPrismaClientTaxAssignment) : []
  };
}
function mapPrismaTask(task) {
  return {
    id: task.id,
    titulo: task.titulo,
    descripcion: task.descripcion,
    clienteId: task.cliente_id,
    asignadoA: task.asignadoA,
    prioridad: task.prioridad,
    estado: task.estado,
    visibilidad: task.visibilidad,
    fechaVencimiento: task.fechaVencimiento,
    fechaCreacion: task.fechaCreacion,
    fechaActualizacion: task.fechaActualizacion
  };
}
function mapPrismaManual(manual) {
  return {
    id: manual.id,
    titulo: manual.titulo,
    contenidoHtml: manual.contenidoHtml,
    autorId: manual.autorId,
    etiquetas: manual.etiquetas ? JSON.parse(manual.etiquetas) : null,
    categoria: manual.categoria,
    publicado: manual.status === "PUBLISHED",
    // Convertir status a publicado
    fechaCreacion: manual.fechaCreacion,
    fechaActualizacion: manual.fechaActualizacion
  };
}
function mapPrismaManualAttachment(attachment) {
  return {
    id: attachment.id,
    manualId: attachment.manualId,
    fileName: attachment.fileName,
    originalName: attachment.originalName,
    filePath: attachment.filePath,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
    uploadedBy: attachment.uploadedBy,
    uploadedAt: attachment.uploadedAt
  };
}
function mapPrismaManualVersion(version) {
  return {
    id: version.id,
    manualId: version.manualId,
    versionNumber: version.versionNumber,
    titulo: version.titulo,
    contenidoHtml: version.contenido_html,
    etiquetas: version.etiquetas ? JSON.parse(version.etiquetas) : null,
    categoria: version.categoria,
    createdBy: version.createdBy,
    createdAt: version.createdAt
  };
}
function mapPrismaActivityLog(log2) {
  return {
    id: log2.id,
    usuarioId: log2.usuarioId,
    accion: log2.accion,
    modulo: log2.modulo,
    detalles: log2.detalles,
    fecha: log2.fecha
  };
}
function mapPrismaAuditTrail(audit) {
  return {
    id: audit.id,
    usuarioId: audit.usuarioId,
    accion: audit.accion,
    tabla: audit.tabla,
    registroId: audit.registroId,
    valorAnterior: audit.valorAnterior,
    valorNuevo: audit.valorNuevo,
    cambios: audit.cambios,
    fecha: audit.fecha
  };
}
var PrismaStorage = class {
  // ==================== USER METHODS ====================
  async getAllUsers() {
    const users = await prisma.users.findMany({
      include: { roles: true }
    });
    return users.map(mapPrismaUser);
  }
  async getUser(id) {
    const user = await prisma.users.findUnique({ where: { id } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserByUsername(username) {
    const user = await prisma.users.findUnique({ where: { username } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserByEmail(email) {
    const user = await prisma.users.findUnique({ where: { email } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserWithPermissions(id) {
    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    return user;
  }
  async createUser(insertUser) {
    const user = await prisma.users.create({
      data: {
        id: randomUUID(),
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        roleId: insertUser.roleId
      }
    });
    return mapPrismaUser(user);
  }
  async updateUser(id, updateData) {
    try {
      const user = await prisma.users.update({
        where: { id },
        data: updateData,
        include: { roles: true }
      });
      return mapPrismaUser(user);
    } catch {
      return void 0;
    }
  }
  async deleteUser(id) {
    try {
      await prisma.users.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  // ==================== CLIENT METHODS ====================
  async getAllClients() {
    const clients = await prisma.clients.findMany({
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_assignments: {
          include: {}
        }
      }
    });
    return clients.map((client) => ({
      ...mapPrismaClient(client),
      client_employees: client.employees || []
    }));
  }
  async getAllClientsSummary() {
    const clients = await prisma.clients.findMany({
      select: {
        id: true,
        razonSocial: true,
        nifCif: true,
        tipo: true,
        email: true,
        telefono: true,
        direccion: true,
        fechaAlta: true,
        fechaBaja: true,
        responsableAsignado: true,
        isActive: true
      },
      orderBy: { razonSocial: "asc" }
    });
    return clients.map((c) => ({
      id: c.id,
      razonSocial: c.razonSocial,
      nifCif: c.nifCif,
      tipo: (c.tipo || "").toUpperCase(),
      email: c.email ?? null,
      telefono: c.telefono ?? null,
      direccion: c.direccion ?? null,
      fechaAlta: c.fechaAlta,
      fechaBaja: c.fechaBaja ?? null,
      responsableAsignado: c.responsableAsignado ?? null,
      isActive: c.isActive ?? true
    }));
  }
  async getClient(id) {
    const client = await prisma.clients.findUnique({
      where: { id },
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_assignments: {
          include: {}
        }
      }
    });
    return client ? {
      ...mapPrismaClient(client),
      client_employees: client.employees || []
    } : void 0;
  }
  async getClientByNif(nifCif) {
    const client = await prisma.clients.findUnique({ where: { nifCif } });
    return client ? mapPrismaClient(client) : void 0;
  }
  async createClient(insertClient) {
    const data = {
      razonSocial: insertClient.razonSocial,
      nifCif: insertClient.nifCif,
      tipo: (insertClient.tipo || "").toUpperCase(),
      email: insertClient.email ?? null,
      telefono: insertClient.telefono ?? null,
      direccion: insertClient.direccion ?? null,
      responsableAsignado: insertClient.responsableAsignado || null,
      tax_models: insertClient.taxModels || null,
      isActive: insertClient.isActive ?? true,
      notes: insertClient.notes ?? null
    };
    if (insertClient.fechaAlta) {
      data.fechaAlta = new Date(insertClient.fechaAlta);
    }
    if (insertClient.fechaBaja !== void 0) {
      data.fechaBaja = insertClient.fechaBaja ? new Date(insertClient.fechaBaja) : null;
    }
    const client = await prisma.clients.create({
      data,
      include: {
        client_tax_assignments: {
          include: {}
        }
      }
    });
    return mapPrismaClient(client);
  }
  async updateClient(id, updateData) {
    try {
      const data = { ...updateData };
      if (data.tipo) data.tipo = data.tipo.toUpperCase();
      if (data.taxModels !== void 0) data.taxModels = data.taxModels;
      if (data.isActive !== void 0) data.isActive = data.isActive;
      if (data.responsableAsignado === "") data.responsableAsignado = null;
      if (data.fechaAlta) data.fechaAlta = new Date(data.fechaAlta);
      if (data.fechaBaja !== void 0) {
        data.fechaBaja = data.fechaBaja ? new Date(data.fechaBaja) : null;
      }
      if (data.notes === "") data.notes = null;
      const client = await prisma.clients.update({
        where: { id },
        data,
        include: {
          client_tax_assignments: {
            include: {}
          }
        }
      });
      return mapPrismaClient(client);
    } catch {
      return void 0;
    }
  }
  async deleteClient(id) {
    try {
      await prisma.clients.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  async ensureTaxModelsConfigSeeded() {
    const codes = Object.keys(TAX_RULES);
    try {
      await Promise.all(
        codes.map(async (code) => {
          const rule = TAX_RULES[code];
          await prisma.tax_models_config.upsert({
            where: { code },
            create: {
              code,
              name: getTaxModelName(code),
              allowedTypes: JSON.stringify(rule.allowedTypes),
              allowedPeriods: JSON.stringify(rule.allowedPeriods),
              labels: rule.labels ? JSON.stringify(rule.labels) : void 0,
              isActive: true,
              updatedAt: /* @__PURE__ */ new Date()
            },
            update: {
              name: getTaxModelName(code),
              allowedTypes: JSON.stringify(rule.allowedTypes),
              allowedPeriods: JSON.stringify(rule.allowedPeriods),
              labels: rule.labels ? JSON.stringify(rule.labels) : void 0,
              isActive: true,
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        })
      );
    } catch (error) {
      if (error?.code === "P2021") {
        throw new Error(
          "La tabla tax_models_config no existe. Ejecuta `npx prisma db push` o `npm run prisma:push` para aplicar el esquema antes de iniciar el servidor."
        );
      }
      throw error;
    }
  }
  async getActiveTaxModelsConfig() {
    const configs = await prisma.tax_models_config.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" }
    });
    return configs.map(mapPrismaTaxModelsConfig);
  }
  async getTaxModelConfig(code) {
    const config = await prisma.tax_models_config.findUnique({
      where: { code }
    });
    return config ? mapPrismaTaxModelsConfig(config) : null;
  }
  async findClientTaxAssignmentByCode(clientId, taxModelCode) {
    const assignment = await prisma.client_tax_assignments.findFirst({
      where: {
        clientId,
        taxModelCode
      },
      include: {}
    });
    return assignment ? mapPrismaClientTaxAssignment(assignment) : null;
  }
  async getClientTaxAssignments(clientId) {
    const assignments = await prisma.client_tax_assignments.findMany({
      where: { clientId },
      orderBy: [{ startDate: "desc" }, { taxModelCode: "asc" }],
      include: {}
    });
    return assignments.map(mapPrismaClientTaxAssignment);
  }
  async getClientTaxAssignment(id) {
    const assignment = await prisma.client_tax_assignments.findUnique({
      where: { id },
      include: {}
    });
    return assignment ? mapPrismaClientTaxAssignment(assignment) : null;
  }
  buildTaxAssignmentUpdateData(data) {
    const payload = {};
    if (data.taxModelCode !== void 0) payload.taxModelCode = data.taxModelCode;
    if (data.periodicity !== void 0) payload.periodicidad = data.periodicity;
    if (data.startDate !== void 0) payload.startDate = data.startDate;
    if (data.endDate !== void 0) payload.endDate = data.endDate;
    if (data.activeFlag !== void 0) payload.activeFlag = data.activeFlag;
    if (data.notes !== void 0) payload.notes = data.notes;
    return payload;
  }
  async createClientTaxAssignment(clientId, data) {
    const assignment = await prisma.client_tax_assignments.create({
      data: {
        id: randomUUID(),
        clientId,
        taxModelCode: data.taxModelCode,
        periodicidad: data.periodicity,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        activeFlag: data.activeFlag ?? true,
        notes: data.notes ?? null,
        updatedAt: /* @__PURE__ */ new Date()
      },
      include: {}
    });
    return mapPrismaClientTaxAssignment(assignment);
  }
  async updateClientTaxAssignment(id, data) {
    const assignment = await prisma.client_tax_assignments.update({
      where: { id },
      data: this.buildTaxAssignmentUpdateData(data),
      include: {}
    });
    return mapPrismaClientTaxAssignment(assignment);
  }
  async deleteClientTaxAssignment(id) {
    const assignment = await prisma.client_tax_assignments.delete({
      where: { id },
      include: {}
    });
    return mapPrismaClientTaxAssignment(assignment);
  }
  async softDeactivateClientTaxAssignment(id, endDate) {
    const assignment = await prisma.client_tax_assignments.update({
      where: { id },
      data: {
        endDate,
        activeFlag: false
      },
      include: {}
    });
    return mapPrismaClientTaxAssignment(assignment);
  }
  async hasAssignmentHistoricFilings(clientId, taxModelCode) {
    const count = await prisma.client_tax_filings.count({
      where: {
        clientId,
        taxModelCode
      }
    });
    return count > 0;
  }
  async bulkRemoveClientTaxAssignments(clientId, options) {
    const codesFilter = (options?.codes || []).map((c) => c.toUpperCase());
    const whereAssignments = {
      clientId,
      ...codesFilter.length > 0 ? { taxModelCode: { in: codesFilter } } : {}
    };
    const assignments = await prisma.client_tax_assignments.findMany({
      where: whereAssignments,
      select: { id: true, taxModelCode: true }
    });
    if (assignments.length === 0) return { deleted: 0, deactivated: 0 };
    const codes = Array.from(new Set(assignments.map((a) => a.taxModelCode)));
    const filings = await prisma.client_tax_filings.findMany({
      where: { clientId, taxModelCode: { in: codes } },
      select: { taxModelCode: true }
    });
    const codesWithHistory = new Set(filings.map((f) => f.taxModelCode));
    const toDeactivate = options?.hard ? [] : codes.filter((c) => codesWithHistory.has(c));
    const toDelete = options?.hard ? codes : codes.filter((c) => !codesWithHistory.has(c));
    let deactivated = 0;
    let deleted = 0;
    await prisma.$transaction(async (tx) => {
      if (toDeactivate.length > 0) {
        const res = await tx.client_tax_assignments.updateMany({
          where: { clientId, taxModelCode: { in: toDeactivate } },
          data: { endDate: /* @__PURE__ */ new Date(), activeFlag: false }
        });
        deactivated += res.count;
      }
      if (toDelete.length > 0) {
        if (options?.hard) {
          await tx.client_tax_filings.deleteMany({ where: { clientId, taxModelCode: { in: toDelete } } });
        }
        const res = await tx.client_tax_assignments.deleteMany({
          where: { clientId, taxModelCode: { in: toDelete } }
        });
        deleted += res.count;
      }
    });
    return { deleted, deactivated };
  }
  async bulkRemoveAssignmentsByIds(clientId, assignmentIds, options) {
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return { deleted: 0, deactivated: 0 };
    }
    const assignments = await prisma.client_tax_assignments.findMany({
      where: { id: { in: assignmentIds }, clientId },
      select: { id: true, taxModelCode: true }
    });
    if (assignments.length === 0) return { deleted: 0, deactivated: 0 };
    let deleted = 0;
    let deactivated = 0;
    await prisma.$transaction(async (tx) => {
      if (options?.hard) {
        const codeSet = new Set(assignments.map((a) => a.taxModelCode));
        await tx.client_tax_filings.deleteMany({ where: { clientId, taxModelCode: { in: Array.from(codeSet) } } });
      }
      for (const a of assignments) {
        const hasHistory = options?.hard ? 0 : await tx.client_tax_filings.count({
          where: { clientId, taxModelCode: a.taxModelCode }
        });
        if (hasHistory > 0) {
          const res = await tx.client_tax_assignments.update({
            where: { id: a.id },
            data: { endDate: /* @__PURE__ */ new Date(), activeFlag: false }
          });
          if (res) deactivated += 1;
        } else {
          const res = await tx.client_tax_assignments.delete({ where: { id: a.id } });
          if (res) deleted += 1;
        }
      }
    });
    return { deleted, deactivated };
  }
  async getTaxAssignmentHistory(assignmentId) {
    const assignment = await prisma.client_tax_assignments.findUnique({
      where: { id: assignmentId }
    });
    if (!assignment) {
      return [];
    }
    const filings = await prisma.client_tax_filings.findMany({
      where: {
        clientId: assignment.clientId,
        taxModelCode: assignment.taxModelCode
      },
      include: {
        fiscal_periods: true
      },
      orderBy: [
        { presentedAt: "desc" }
      ]
    });
    return filings.map((filing) => ({
      id: filing.id,
      status: normalizeStatus(filing.status, true),
      rawStatus: filing.status,
      presentedAt: filing.presentedAt,
      notes: filing.notes,
      tax_periods: filing.fiscal_periods ? {
        id: filing.fiscal_periods.id,
        year: filing.fiscal_periods.year,
        quarter: filing.fiscal_periods.quarter,
        label: filing.fiscal_periods.label,
        startsAt: filing.fiscal_periods.starts_at,
        endsAt: filing.fiscal_periods.ends_at
      } : null
    }));
  }
  async getTaxModelConfigMap(client) {
    const configs = await client.tax_models_config.findMany({ where: { isActive: true } });
    const map = /* @__PURE__ */ new Map();
    configs.forEach((config) => {
      map.set(config.code, mapPrismaTaxModelsConfig(config));
    });
    return map;
  }
  periodDescriptorsForYear(year) {
    const descriptors = [];
    const quarterLastDay = (quarter) => {
      const endMonth = quarter * 3;
      return new Date(Date.UTC(year, endMonth, 0));
    };
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3;
      const startsAt = new Date(Date.UTC(year, startMonth, 1));
      const endsAt = quarterLastDay(q);
      descriptors.push({
        label: `${q}T`,
        quarter: q,
        kind: TaxPeriodType.QUARTERLY,
        startsAt,
        endsAt
      });
    }
    descriptors.push({
      label: "ANUAL",
      kind: TaxPeriodType.ANNUAL,
      startsAt: new Date(Date.UTC(year, 0, 1)),
      endsAt: new Date(Date.UTC(year, 11, 31))
    });
    const specialMonths = [
      { label: "Abril", month: 3 },
      { label: "Octubre", month: 9 },
      { label: "Diciembre", month: 11 }
    ];
    specialMonths.forEach(({ label, month }) => {
      const startsAt = new Date(Date.UTC(year, month, 1));
      const endsAt = new Date(Date.UTC(year, month + 1, 0));
      descriptors.push({
        label,
        kind: TaxPeriodType.SPECIAL,
        startsAt,
        endsAt
      });
    });
    return descriptors;
  }
  async generateFilingsForPeriods(client, periods) {
    if (periods.length === 0) return;
    const assignments = await client.client_tax_assignments.findMany({
      where: {
        activeFlag: true,
        endDate: null,
        clients: { isActive: true }
      },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            isActive: true
          }
        }
      }
    });
    if (assignments.length === 0) return;
    const configMap = await this.getTaxModelConfigMap(client);
    for (const period of periods) {
      for (const assignment of assignments) {
        if (!this.periodMatchesAssignment(period, assignment, configMap)) continue;
        await client.client_tax_filings.upsert({
          where: {
            clientId_taxModelCode_periodId: {
              clientId: assignment.clientId,
              taxModelCode: assignment.taxModelCode,
              periodId: period.id
            }
          },
          create: {
            id: randomUUID(),
            clientId: assignment.clientId,
            taxModelCode: assignment.taxModelCode,
            periodId: period.id,
            status: FilingStatus.NOT_STARTED
          },
          update: {}
        });
      }
    }
  }
  periodMatchesAssignment(tax_periods, assignment, configMap) {
    if (!assignment.activeFlag || assignment.endDate) return false;
    const code = assignment.taxModelCode;
    const periodicity = (assignment.periodicidad || "").toUpperCase();
    const config = configMap.get(code);
    switch (tax_periods.kind) {
      case TaxPeriodType.QUARTERLY:
        return periodicity === "TRIMESTRAL";
      case TaxPeriodType.ANNUAL:
        return periodicity === "ANUAL";
      case TaxPeriodType.SPECIAL:
        if (code !== "202") return false;
        if (!config?.labels || config.labels.length === 0) return true;
        return config.labels.some((label) => label.toLowerCase() === tax_periods.label.toLowerCase());
      default:
        return false;
    }
  }
  async getFiscalPeriodsSummary(year) {
    const where = {};
    if (year) where.year = year;
    const periods = await prisma.fiscal_periods.findMany({
      where,
      orderBy: [{ year: "desc" }, { starts_at: "desc" }]
      // Note: fiscal_periods doesn't have a direct 'filings' relation
      // client_tax_filings has periodId pointing to fiscal_periods
    });
    return periods.map((period) => {
      const totals = { total: 0, notStarted: 0, inProgress: 0, presented: 0 };
      return {
        id: period.id,
        year: period.year,
        quarter: period.quarter ?? null,
        label: period.label,
        kind: period.kind,
        status: period.status,
        startsAt: period.starts_at,
        endsAt: period.ends_at,
        lockedAt: period.locked_at,
        totals
      };
    });
  }
  async createFiscalYear(year) {
    const descriptors = this.periodDescriptorsForYear(year);
    const created = [];
    await prisma.$transaction(async (tx) => {
      for (const descriptor of descriptors) {
        const period = await tx.fiscal_periods.upsert({
          where: {
            year_label: {
              year,
              label: descriptor.label
            }
          },
          update: {
            starts_at: descriptor.startsAt,
            ends_at: descriptor.endsAt,
            kind: descriptor.kind,
            quarter: descriptor.quarter ?? null
          },
          create: {
            id: randomUUID(),
            year,
            quarter: descriptor.quarter ?? null,
            label: descriptor.label,
            kind: descriptor.kind,
            starts_at: descriptor.startsAt,
            ends_at: descriptor.endsAt
          }
        });
        created.push(period);
      }
      await this.generateFilingsForPeriods(
        tx,
        created.map((period) => ({
          id: period.id,
          kind: period.kind,
          label: period.label,
          year: period.year
        }))
      );
    });
    return this.getFiscalPeriodsSummary(year);
  }
  async createFiscalPeriod(data) {
    const period = await prisma.fiscal_periods.upsert({
      where: {
        year_label: {
          year: data.year,
          label: data.label
        }
      },
      update: {
        quarter: data.quarter ?? null,
        kind: data.kind,
        starts_at: data.startsAt,
        ends_at: data.endsAt
      },
      create: {
        id: randomUUID(),
        year: data.year,
        quarter: data.quarter ?? null,
        label: data.label,
        kind: data.kind,
        starts_at: data.startsAt,
        ends_at: data.endsAt
      }
    });
    await this.generateFilingsForPeriods(prisma, [
      { id: period.id, kind: period.kind, label: period.label, year: period.year }
    ]);
    const summaries = await this.getFiscalPeriodsSummary(data.year);
    return summaries.find((item) => item.id === period.id) ?? summaries[0];
  }
  /**
   * Asegura que existan clientTaxFiling para todas las asignaciones activas
   * del año indicado, recorriendo los fiscal_periods de ese año.
   */
  async ensureClientTaxFilingsForYear(year) {
    const periods = await prisma.fiscal_periods.findMany({
      where: { year },
      select: { id: true, kind: true, label: true, year: true }
    });
    if (periods.length === 0) return { year, generated: 0 };
    await this.generateFilingsForPeriods(
      prisma,
      periods.map((p) => ({ id: p.id, kind: p.kind, label: p.label, year: p.year }))
    );
    return { year, generated: periods.length };
  }
  /**
   * Migra obligaciones activas (obligaciones_fiscales) a asignaciones (client_tax_assignments)
   * en caso de que no exista aún la tupla (cliente + modelo).
   */
  async migrateObligationsToAssignments() {
    const obligaciones = await prisma.obligaciones_fiscales.findMany({
      where: { activo: true },
      include: { clients: true }
    });
    for (const ob of obligaciones) {
      const code = null;
      if (!code) continue;
      const existing = await prisma.client_tax_assignments.findFirst({
        where: { clientId: ob.cliente_id, taxModelCode: code }
      });
      if (existing) continue;
      try {
        await prisma.client_tax_assignments.create({
          data: {
            id: randomUUID(),
            clientId: ob.cliente_id,
            taxModelCode: code,
            periodicidad: ob.periodicidad ?? (code === "303" ? "TRIMESTRAL" : "ANUAL"),
            startDate: ob.fecha_inicio ?? ob.fecha_asignacion ?? /* @__PURE__ */ new Date(),
            endDate: ob.fecha_fin ?? null,
            activeFlag: ob.activo ?? true,
            notes: ob.observaciones ?? null,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      } catch (e) {
      }
    }
  }
  async ensureAssignmentsFromClientTaxModels() {
    const clients = await prisma.clients.findMany({
      where: { isActive: true },
      select: { id: true, tipo: true, fechaAlta: true, tax_models: true }
    });
    for (const c of clients) {
      let codes = [];
      const raw = c.tax_models;
      if (Array.isArray(raw)) codes = raw.map((x) => `${x}`.toUpperCase());
      else if (typeof raw === "string") {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) codes = arr.map((x) => `${x}`.toUpperCase());
        } catch {
        }
      }
      for (const code of codes) {
        const exists = await prisma.client_tax_assignments.findFirst({ where: { clientId: c.id, taxModelCode: code } });
        if (exists) continue;
        try {
          await prisma.client_tax_assignments.create({
            data: {
              id: randomUUID(),
              clientId: c.id,
              taxModelCode: code,
              periodicidad: code === "303" ? "TRIMESTRAL" : "ANUAL",
              startDate: c.fechaAlta ?? /* @__PURE__ */ new Date(),
              endDate: null,
              activeFlag: true,
              notes: null,
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        } catch {
        }
      }
    }
  }
  async ensureDefault303Assignments() {
    const clients = await prisma.clients.findMany({ where: { isActive: true }, select: { id: true, fechaAlta: true } });
    for (const c of clients) {
      const count = await prisma.client_tax_assignments.count({ where: { clientId: c.id } });
      if (count > 0) continue;
      const exists303 = await prisma.client_tax_assignments.findFirst({ where: { clientId: c.id, taxModelCode: "303" } });
      if (exists303) continue;
      try {
        await prisma.client_tax_assignments.create({
          data: {
            id: randomUUID(),
            clientId: c.id,
            taxModelCode: "303",
            periodicidad: "TRIMESTRAL",
            startDate: c.fechaAlta ?? /* @__PURE__ */ new Date(),
            endDate: null,
            activeFlag: true,
            notes: "Asignaci\xF3n por defecto generada autom\xE1ticamente",
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      } catch {
      }
    }
  }
  async getTaxFilings(filters) {
    const where = {};
    if (filters.periodId) where.periodId = filters.periodId;
    if (filters.status) {
      const s = String(filters.status).toUpperCase();
      const map = {
        "PENDIENTE": FilingStatus.NOT_STARTED,
        "NOT_STARTED": FilingStatus.NOT_STARTED,
        "CALCULADO": FilingStatus.IN_PROGRESS,
        "IN_PROGRESS": FilingStatus.IN_PROGRESS,
        "PRESENTADO": FilingStatus.PRESENTED,
        "PRESENTED": FilingStatus.PRESENTED
      };
      if (map[s]) where.status = map[s];
    }
    if (filters.model) where.taxModelCode = filters.model;
    if (filters.clientId) where.clientId = filters.clientId;
    const clientWhere = {};
    if (filters.clientId) clientWhere.id = filters.clientId;
    if (filters.gestorId) clientWhere.responsableAsignado = filters.gestorId;
    if (filters.search) clientWhere.razonSocial = { contains: filters.search, mode: "insensitive" };
    if (Object.keys(clientWhere).length > 0) where.clients = clientWhere;
    if (filters.year) {
      const y = typeof filters.year === "string" ? Number(filters.year) : filters.year;
      if (Number.isFinite(y)) {
        where.period = { ...where.period, year: y };
      }
    }
    const filings = await prisma.client_tax_filings.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            users: {
              select: {
                username: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            username: true
          }
        },
        fiscal_periods: true
      },
      orderBy: [{ clients: { razonSocial: "asc" } }]
    });
    const clientIds = Array.from(new Set(filings.map((f) => f.clientId)));
    const codes = Array.from(new Set(filings.map((f) => f.taxModelCode)));
    let byKey = /* @__PURE__ */ new Map();
    if (clientIds.length && codes.length) {
      const assignments = await prisma.client_tax_assignments.findMany({
        where: {
          clientId: { in: clientIds },
          taxModelCode: { in: codes }
        },
        select: { clientId: true, taxModelCode: true, startDate: true, endDate: true, activeFlag: true }
      });
      for (const a of assignments) {
        const key = `${a.clientId}:${a.taxModelCode}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(a);
      }
    }
    const visible = filings.filter((f) => {
      if (!f.fiscal_periods) return false;
      const key = `${f.clientId}:${f.taxModelCode}`;
      const arr = byKey.get(key);
      if (!arr || arr.length === 0) return false;
      const ps = f.fiscal_periods.starts_at;
      const pe = f.fiscal_periods.ends_at;
      return arr.some((a) => {
        if (!a.activeFlag) return false;
        const startOk = a.startDate <= pe;
        const endOk = !a.endDate || a.endDate >= ps;
        return startOk && endOk;
      });
    });
    return visible.map((filing) => ({
      id: filing.id,
      clientId: filing.clientId,
      clientName: filing.clients?.razonSocial ?? "",
      nifCif: filing.clients?.nifCif ?? "",
      gestorId: filing.clients?.responsableAsignado ?? null,
      gestorName: filing.clients?.users?.username ?? null,
      taxModelCode: filing.taxModelCode,
      periodId: filing.periodId,
      periodLabel: formatPeriodLabel(filing.fiscal_periods),
      status: normalizeStatus(filing.status, true),
      notes: filing.notes ?? null,
      presentedAt: filing.presentedAt ?? null,
      assigneeId: filing.users?.id ?? null,
      assigneeName: filing.users?.username ?? null
    }));
  }
  async updateTaxFiling(id, data, options = {}) {
    const filing = await prisma.client_tax_filings.findUnique({
      where: { id },
      include: {
        fiscal_periods: true
      }
    });
    if (!filing) {
      throw new Error("Declaraci\xF3n no encontrada");
    }
    if (filing.fiscal_periods?.status === PeriodStatus.CLOSED && !options.allowClosed) {
      throw new Error("El periodo est\xE1 cerrado. Solo un administrador puede modificarlo.");
    }
    let nextStatus = void 0;
    if (data.status !== void 0) {
      const raw = String(data.status).toUpperCase();
      const map = {
        "PENDIENTE": FilingStatus.NOT_STARTED,
        "NOT_STARTED": FilingStatus.NOT_STARTED,
        "CALCULADO": FilingStatus.IN_PROGRESS,
        "IN_PROGRESS": FilingStatus.IN_PROGRESS,
        "PRESENTADO": FilingStatus.PRESENTED,
        "PRESENTED": FilingStatus.PRESENTED
      };
      nextStatus = map[raw] ?? data.status;
    }
    const updated = await prisma.client_tax_filings.update({
      where: { id },
      data: {
        status: nextStatus ?? filing.status,
        notes: data.notes !== void 0 ? data.notes : filing.notes,
        presentedAt: data.presentedAt !== void 0 ? data.presentedAt : filing.presentedAt,
        assigneeId: data.assigneeId !== void 0 ? data.assigneeId : filing.assigneeId
      },
      include: {
        fiscal_periods: true,
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            users: { select: { username: true } }
          }
        },
        users: { select: { id: true, username: true } }
      }
    });
    return {
      id: updated.id,
      clientId: updated.clientId,
      clientName: updated.clients?.razonSocial ?? "",
      nifCif: updated.clients?.nifCif ?? "",
      gestorId: updated.clients?.responsableAsignado ?? null,
      gestorName: updated.clients?.users?.username ?? null,
      taxModelCode: updated.taxModelCode,
      periodId: updated.periodId,
      periodLabel: formatPeriodLabel(updated.fiscal_periods),
      status: normalizeStatus(updated.status, true),
      notes: updated.notes ?? null,
      presentedAt: updated.presentedAt ?? null,
      assigneeId: updated.users?.id ?? null,
      assigneeName: updated.users?.username ?? null
    };
  }
  async toggleFiscalPeriodStatus(id, status, userId) {
    const updates = {
      status
    };
    if (status === PeriodStatus.CLOSED) {
      updates.locked_at = /* @__PURE__ */ new Date();
      updates.closed_by = userId ?? null;
    } else {
      updates.locked_at = null;
      updates.closed_by = null;
    }
    return prisma.fiscal_periods.update({
      where: { id },
      data: updates
    });
  }
  async getFiscalPeriod(id) {
    const periods = await this.getFiscalPeriodsSummary();
    return periods.find((period) => period.id === id) ?? null;
  }
  async getTaxControlMatrix(params = {}) {
    const { type, gestorId, model, periodicity } = params;
    const clientWhere = {};
    if (type) {
      clientWhere.tipo = type.toString().toUpperCase();
    }
    if (gestorId) {
      clientWhere.responsableAsignado = gestorId;
    }
    const clients = await prisma.clients.findMany({
      where: clientWhere,
      orderBy: { razonSocial: "asc" },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        client_tax_assignments: {
          include: {}
        }
      }
    });
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const requestedYear = params.year === void 0 || params.year === null || params.year === "" ? null : Number(params.year);
    const selectedYear = Number.isFinite(requestedYear) ? Number(requestedYear) : currentYear;
    const parsedQuarter = (() => {
      if (params.quarter === void 0 || params.quarter === null || params.quarter === "") {
        return null;
      }
      const raw = typeof params.quarter === "number" ? params.quarter : Number(String(params.quarter).replace(/[^0-9]/g, ""));
      return Number.isFinite(raw) ? Number(raw) : null;
    })();
    const periodWhere = {};
    if (selectedYear) {
      periodWhere.year = selectedYear;
    }
    if (parsedQuarter !== null) {
      periodWhere.quarter = parsedQuarter;
    }
    const fiscal_periodss = await prisma.fiscal_periods.findMany({
      where: periodWhere,
      select: {
        id: true,
        year: true,
        quarter: true,
        ends_at: true,
        label: true
      }
    });
    const periodIds = fiscal_periodss.map((period) => period.id);
    const filingWhere = {};
    if (periodIds.length > 0) {
      filingWhere.periodId = { in: periodIds };
    } else if (selectedYear) {
      filingWhere.fiscal_periods = { year: selectedYear };
    }
    const filings = await prisma.client_tax_filings.findMany({
      where: filingWhere,
      include: {
        fiscal_periods: true
      }
    });
    const filingsMap = /* @__PURE__ */ new Map();
    for (const filing of filings) {
      const key = `${filing.clientId}_${filing.taxModelCode}`;
      const statusKey = (filing.status || "").toUpperCase();
      const rank = STATUS_PRIORITY[statusKey] ?? 0;
      const existing = filingsMap.get(key);
      if (!existing) {
        filingsMap.set(key, { filing, rank });
        continue;
      }
      const existingDate = existing.filing.fiscal_periods?.ends_at ? new Date(existing.filing.fiscal_periods.ends_at).getTime() : 0;
      const candidateDate = filing.fiscal_periods?.ends_at ? new Date(filing.fiscal_periods.ends_at).getTime() : 0;
      if (rank > existing.rank || rank === existing.rank && candidateDate > existingDate) {
        filingsMap.set(key, { filing, rank });
      }
    }
    const searchValue = typeof params.search === "string" ? params.search.trim() : "";
    const searchLower = searchValue.toLowerCase();
    const searchUpper = searchValue.toUpperCase();
    const hasSearch = searchValue.length > 0;
    const rows = [];
    const startOfYear = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59));
    for (const client of clients) {
      const cells = {};
      for (const code of TAX_CONTROL_MODELS) {
        cells[code] = { active: false };
      }
      for (const assignment of client.client_tax_assignments) {
        const code = assignment.taxModelCode;
        if (!TAX_CONTROL_MODELS.includes(code)) continue;
        if (model && code !== String(model).toUpperCase()) continue;
        if (periodicity && String(assignment.periodicidad).toUpperCase() !== String(periodicity).toUpperCase()) continue;
        const startDate = assignment.startDate ? new Date(assignment.startDate) : null;
        const endDate = assignment.endDate ? new Date(assignment.endDate) : null;
        const effectiveActive = Boolean(assignment.activeFlag) && (!startDate || startDate <= endOfYear) && (!endDate || endDate >= startOfYear);
        const filingEntry = filingsMap.get(`${client.id}_${code}`);
        const filing = filingEntry?.filing;
        const normalizedStatus = normalizeStatus(filing?.status, effectiveActive);
        cells[code] = {
          assignmentId: assignment.id,
          active: effectiveActive,
          periodicity: assignment.periodicidad,
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          activeFlag: assignment.activeFlag,
          status: normalizedStatus,
          statusUpdatedAt: filing?.presentedAt ?? filing?.fiscal_periods?.ends_at ?? null,
          filingId: filing?.id ?? null,
          periodId: filing?.periodId ?? null,
          periodLabel: formatPeriodLabel(filing?.fiscal_periods)
        };
      }
      let matchesSearch = true;
      if (hasSearch) {
        const matchesClient = client.razonSocial?.toLowerCase().includes(searchLower) || client.nifCif?.toLowerCase().includes(searchLower);
        const matchesModel = TAX_CONTROL_MODELS.some(
          (code) => code.includes(searchUpper) && (cells[code].assignmentId || cells[code].active || cells[code].status)
        );
        matchesSearch = matchesClient || matchesModel;
      }
      if (!matchesSearch) {
        continue;
      }
      const hasAnyActive = Object.values(cells).some((c) => c.active === true);
      if (!hasAnyActive) {
        continue;
      }
      rows.push({
        clientId: client.id,
        clientName: client.razonSocial,
        nifCif: client.nifCif,
        clientType: client.tipo,
        gestorId: client.responsableAsignado ?? null,
        gestorName: client.users?.username ?? null,
        gestorEmail: client.users?.email ?? null,
        cells
      });
    }
    return {
      rows,
      models: TAX_CONTROL_MODELS,
      metadata: {
        year: selectedYear ?? null,
        quarter: parsedQuarter,
        totalClients: rows.length,
        filters: {
          type: type ?? null,
          gestorId: gestorId ?? null,
          search: hasSearch ? searchValue : null
        }
      }
    };
  }
  /**
   * Genera declaraciones faltantes para un año dado a partir de obligaciones activas
   */
  async ensureDeclarationsForYear(year) {
    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    const obligaciones = await prisma.obligaciones_fiscales.findMany({
      where: {
        activo: true,
        OR: [
          { fecha_fin: null },
          { fecha_fin: { gte: startOfYear } }
        ],
        fecha_inicio: { lte: endOfYear }
      },
      include: { clients: true }
    });
    let created = 0;
    let skipped = 0;
    for (const ob of obligaciones) {
      const modelCode = null;
      if (!modelCode) {
        skipped++;
        continue;
      }
      const where = { modelCode, year };
      if (ob.periodicidad === "MENSUAL") {
        where.period = { in: ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12"] };
      } else if (ob.periodicidad === "TRIMESTRAL") {
        where.period = { in: ["1T", "2T", "3T", "4T"] };
      } else {
        where.period = "ANUAL";
      }
      const periods = await prisma.tax_calendar.findMany({ where, select: { id: true } });
      for (const p of periods) {
        const exists = await prisma.declaraciones.findFirst({
          where: { obligacion_id: ob.id, calendario_id: p.id },
          select: { id: true }
        });
        if (exists) {
          skipped++;
          continue;
        }
        created++;
      }
    }
    return { year, obligaciones: obligaciones.length, created, skipped };
  }
  // ==================== IMPUESTO METHODS ====================
  async getAllImpuestos() {
    return await prisma.impuestos.findMany({
      orderBy: { modelo: "asc" }
    });
  }
  async getImpuesto(id) {
    return await prisma.impuestos.findUnique({
      where: { id }
    });
  }
  async getImpuestoByModelo(modelo) {
    return await prisma.impuestos.findUnique({
      where: { modelo }
    });
  }
  async createImpuesto(data) {
    return await prisma.impuestos.create({
      data: {
        id: randomUUID(),
        modelo: data.modelo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  async updateImpuesto(id, data) {
    return await prisma.impuestos.update({
      where: { id },
      data
    });
  }
  async deleteImpuesto(id) {
    await prisma.impuestos.delete({
      where: { id }
    });
    return true;
  }
  // ==================== OBLIGACION FISCAL METHODS ====================
  async getAllObligacionesFiscales() {
    return await prisma.obligaciones_fiscales.findMany({
      include: {
        clients: true,
        impuestos: true
      },
      orderBy: { fecha_asignacion: "desc" }
    });
  }
  async getObligacionFiscal(id) {
    return await prisma.obligaciones_fiscales.findUnique({
      where: { id },
      include: {
        clients: true,
        impuestos: true
      }
    });
  }
  async getObligacionesByCliente(cliente_id) {
    return await prisma.obligaciones_fiscales.findMany({
      where: { cliente_id },
      include: {
        clients: true,
        impuestos: true
      },
      orderBy: { fecha_asignacion: "desc" }
    });
  }
  async createObligacionFiscal(data) {
    return await prisma.obligaciones_fiscales.create({
      data,
      include: {
        clients: true,
        impuestos: true
      }
    });
  }
  async updateObligacionFiscal(id, data) {
    return await prisma.obligaciones_fiscales.update({
      where: { id },
      data,
      include: {
        clients: true,
        impuestos: true
      }
    });
  }
  async deleteObligacionFiscal(id) {
    await prisma.obligaciones_fiscales.delete({
      where: { id }
    });
    return true;
  }
  // ==================== TAX CALENDAR METHODS ====================
  async listTaxCalendar(params) {
    const where = {};
    if (typeof params?.year === "number") {
      where.year = params.year;
    }
    if (params?.modelCode) {
      where.modelCode = params.modelCode;
    }
    if (typeof params?.active === "boolean") {
      where.active = params.active;
    }
    return await prisma.tax_calendar.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { modelCode: "asc" }
      ]
    });
  }
  async getTaxCalendar(id) {
    return await prisma.tax_calendar.findUnique({
      where: { id }
    });
  }
  async createTaxCalendar(data) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const derived = calculateDerivedFields(startDate, endDate);
    return await prisma.tax_calendar.create({
      data: {
        ...data,
        startDate,
        endDate,
        ...derived
      }
    });
  }
  async updateTaxCalendar(id, data) {
    const existing = await prisma.tax_calendar.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new Error("Tax calendar entry not found");
    }
    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    const derived = calculateDerivedFields(startDate, endDate);
    return await prisma.tax_calendar.update({
      where: { id },
      data: {
        ...data,
        startDate,
        endDate,
        ...derived
      }
    });
  }
  async deleteTaxCalendar(id) {
    await prisma.tax_calendar.delete({
      where: { id }
    });
    return true;
  }
  async cloneTaxCalendarYear(year) {
    const items = await prisma.tax_calendar.findMany({
      where: { year }
    });
    if (!items.length) return [];
    const targetYear = year + 1;
    const now = /* @__PURE__ */ new Date();
    const clonesData = items.map((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      start.setFullYear(start.getFullYear() + 1);
      end.setFullYear(end.getFullYear() + 1);
      const derived = calculateDerivedFields(start, end);
      return {
        modelCode: item.modelCode,
        tax_periods: item.period,
        year: targetYear,
        startDate: start,
        endDate: end,
        status: derived.status,
        daysToStart: derived.daysToStart,
        daysToEnd: derived.daysToEnd,
        active: item.active,
        createdAt: now,
        updatedAt: now
      };
    });
    const created = await prisma.$transaction(
      clonesData.map(
        (data) => prisma.tax_calendar.create({
          data: {
            id: randomUUID(),
            period: data.tax_periods,
            modelCode: data.modelCode,
            year: data.year,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status,
            days_to_start: data.daysToStart,
            days_to_end: data.daysToEnd,
            active: data.active,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          }
        })
      )
    );
    return created;
  }
  async seedTaxCalendarYear(year, opts) {
    const modelCodes = [];
    if (opts?.modelCode) {
      modelCodes.push(opts.modelCode.toUpperCase());
    } else {
      const configs = await prisma.tax_models_config.findMany({ where: { isActive: true }, select: { code: true } });
      configs.forEach((c) => modelCodes.push(c.code));
    }
    const makeDate = (y, m, d) => new Date(Date.UTC(y, m, d));
    const records = [];
    const includeMonthly = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "monthly";
    const includeQuarterly = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "quarterly";
    const includeAnnual = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "annual";
    const includeSpecial = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "special";
    for (const code of modelCodes) {
      if (includeMonthly) {
        for (let m = 1; m <= 12; m++) {
          const period = `M${String(m).padStart(2, "0")}`;
          const nextMonth = m === 12 ? 0 : m;
          const nextYear = m === 12 ? year + 1 : year;
          const start = makeDate(nextYear, nextMonth, 1);
          const end = makeDate(nextYear, nextMonth, 20);
          const derived = calculateDerivedFields(start, end);
          records.push({
            modelCode: code,
            period,
            year,
            startDate: start,
            endDate: end,
            status: derived.status,
            daysToStart: derived.daysToStart,
            daysToEnd: derived.daysToEnd,
            active: true,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      }
      if (includeQuarterly) {
        const quarters = [
          { label: "1T", start: makeDate(year, 3, 1), end: makeDate(year, 3, 20) },
          { label: "2T", start: makeDate(year, 6, 1), end: makeDate(year, 6, 20) },
          { label: "3T", start: makeDate(year, 9, 1), end: makeDate(year, 9, 20) },
          { label: "4T", start: makeDate(year + 1, 0, 1), end: makeDate(year + 1, 0, 30) }
        ];
        for (const q of quarters) {
          const derived = calculateDerivedFields(q.start, q.end);
          records.push({
            modelCode: code,
            tax_periods: q.label,
            year,
            startDate: q.start,
            endDate: q.end,
            status: derived.status,
            daysToStart: derived.daysToStart,
            daysToEnd: derived.daysToEnd,
            active: true,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      }
      if (includeAnnual) {
        const start = makeDate(year + 1, 0, 1);
        const end = makeDate(year + 1, 0, 30);
        const derived = calculateDerivedFields(start, end);
        records.push({
          modelCode: code,
          tax_periods: "ANUAL",
          year,
          startDate: start,
          endDate: end,
          status: derived.status,
          daysToStart: derived.daysToStart,
          daysToEnd: derived.daysToEnd,
          active: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
      if (includeSpecial && code === "202") {
        const months = [4, 10, 12];
        for (const m of months) {
          const nextMonth = m === 12 ? 0 : m;
          const nextYear = m === 12 ? year + 1 : year;
          const start = makeDate(nextYear, nextMonth, 1);
          const end = makeDate(nextYear, nextMonth, 20);
          const derived = calculateDerivedFields(start, end);
          records.push({
            modelCode: code,
            tax_periods: `M${String(m).padStart(2, "0")}`,
            year,
            startDate: start,
            endDate: end,
            status: derived.status,
            daysToStart: derived.daysToStart,
            daysToEnd: derived.daysToEnd,
            active: true,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    if (records.length === 0) return { created: 0 };
    await prisma.tax_calendar.createMany({ data: records, skipDuplicates: true });
    return { created: records.length };
  }
  // ==================== DECLARACION METHODS ====================
  async getAllDeclaraciones() {
    return await prisma.declaraciones.findMany({
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: "desc" }
    });
  }
  async getDeclaracion(id) {
    return await prisma.declaraciones.findUnique({
      where: { id },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }
  async getDeclaracionesByObligacion(obligacion_id) {
    return await prisma.declaraciones.findMany({
      where: { obligacion_id },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: "desc" }
    });
  }
  async getDeclaracionesByCliente(cliente_id) {
    return await prisma.declaraciones.findMany({
      where: {
        obligaciones_fiscales: {
          cliente_id
        }
      },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: "desc" }
    });
  }
  async createDeclaracion(data) {
    return await prisma.declaraciones.create({
      data,
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }
  async updateDeclaracion(id, data) {
    return await prisma.declaraciones.update({
      where: { id },
      data,
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }
  async deleteDeclaracion(id) {
    await prisma.declaraciones.delete({
      where: { id }
    });
    return true;
  }
  // ==================== TASK METHODS ====================
  async getAllTasks() {
    const tasks = await prisma.tasks.findMany();
    return tasks.map(mapPrismaTask);
  }
  async getTask(id) {
    const task = await prisma.tasks.findUnique({ where: { id } });
    return task ? mapPrismaTask(task) : void 0;
  }
  async createTask(insertTask) {
    const task = await prisma.tasks.create({
      data: {
        id: randomUUID(),
        titulo: insertTask.titulo,
        descripcion: insertTask.descripcion,
        clients: insertTask.clienteId ? { connect: { id: insertTask.clienteId } } : void 0,
        users: insertTask.asignadoA ? { connect: { id: insertTask.asignadoA } } : void 0,
        prioridad: insertTask.prioridad,
        estado: insertTask.estado,
        visibilidad: insertTask.visibilidad,
        fecha_vencimiento: insertTask.fechaVencimiento,
        fecha_actualizacion: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaTask(task);
  }
  async updateTask(id, updateData) {
    try {
      const task = await prisma.tasks.update({
        where: { id },
        data: updateData
      });
      return mapPrismaTask(task);
    } catch {
      return void 0;
    }
  }
  async deleteTask(id) {
    try {
      await prisma.tasks.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  // ==================== MANUAL METHODS ====================
  async getAllManuals() {
    const manuals = await prisma.manuals.findMany();
    return manuals.map(mapPrismaManual);
  }
  async getManual(id) {
    const manual = await prisma.manuals.findUnique({ where: { id } });
    return manual ? mapPrismaManual(manual) : void 0;
  }
  async createManual(insertManual) {
    const manual = await prisma.manuals.create({
      data: {
        id: randomUUID(),
        titulo: insertManual.titulo,
        contenido_html: insertManual.contenidoHtml,
        users: { connect: { id: insertManual.autorId } },
        etiquetas: insertManual.etiquetas ? JSON.stringify(insertManual.etiquetas) : null,
        categoria: insertManual.categoria,
        status: insertManual.publicado ? "PUBLISHED" : "DRAFT",
        // Convertir publicado a status
        fecha_publicacion: insertManual.publicado ? /* @__PURE__ */ new Date() : null,
        fecha_actualizacion: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaManual(manual);
  }
  async updateManual(id, updateData) {
    try {
      const data = {};
      if (updateData.titulo !== void 0) data.titulo = updateData.titulo;
      if (updateData.contenidoHtml !== void 0) data.contenidoHtml = updateData.contenidoHtml;
      if (updateData.categoria !== void 0) data.categoria = updateData.categoria;
      if (updateData.etiquetas !== void 0) {
        data.etiquetas = updateData.etiquetas ? JSON.stringify(updateData.etiquetas) : null;
      }
      if (updateData.publicado !== void 0) {
        data.status = updateData.publicado ? "PUBLISHED" : "DRAFT";
        if (updateData.publicado) {
          data.fechaPublicacion = /* @__PURE__ */ new Date();
        }
      }
      const manual = await prisma.manuals.update({
        where: { id },
        data
      });
      return mapPrismaManual(manual);
    } catch {
      return void 0;
    }
  }
  async deleteManual(id) {
    try {
      const result = await prisma.manuals.deleteMany({ where: { id } });
      return result.count > 0;
    } catch {
      return false;
    }
  }
  // ==================== MANUAL ATTACHMENT METHODS ====================
  async getManualAttachment(id) {
    const attachment = await prisma.manual_attachments.findUnique({ where: { id } });
    return attachment ? mapPrismaManualAttachment(attachment) : void 0;
  }
  async createManualAttachment(insertAttachment) {
    const attachment = await prisma.manual_attachments.create({
      data: {
        id: randomUUID(),
        manuals: { connect: { id: insertAttachment.manualId } },
        fileName: insertAttachment.fileName,
        original_name: insertAttachment.originalName,
        filePath: insertAttachment.filePath,
        file_type: insertAttachment.fileType,
        fileSize: insertAttachment.fileSize,
        uploaded_by: insertAttachment.uploadedBy
      }
    });
    return mapPrismaManualAttachment(attachment);
  }
  async deleteManualAttachment(id) {
    try {
      await prisma.manual_attachments.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  async getManualAttachments(manualId) {
    const attachments = await prisma.manual_attachments.findMany({
      where: { manualId },
      orderBy: { uploaded_at: "desc" }
    });
    return attachments.map(mapPrismaManualAttachment);
  }
  // ==================== MANUAL VERSION METHODS ====================
  async getManualVersion(id) {
    const version = await prisma.manual_versions.findUnique({ where: { id } });
    return version ? mapPrismaManualVersion(version) : void 0;
  }
  async createManualVersion(insertVersion) {
    const version = await prisma.manual_versions.create({
      data: {
        id: randomUUID(),
        manuals: { connect: { id: insertVersion.manualId } },
        versionNumber: insertVersion.versionNumber,
        titulo: insertVersion.titulo,
        contenido_html: insertVersion.contenidoHtml,
        etiquetas: insertVersion.etiquetas ? JSON.stringify(insertVersion.etiquetas) : null,
        categoria: insertVersion.categoria,
        createdBy: insertVersion.createdBy
      }
    });
    return mapPrismaManualVersion(version);
  }
  async getManualVersions(manualId) {
    const versions = await prisma.manual_versions.findMany({
      where: { manualId },
      orderBy: { versionNumber: "desc" }
    });
    return versions.map(mapPrismaManualVersion);
  }
  async getNextVersionNumber(manualId) {
    const lastVersion = await prisma.manual_versions.findFirst({
      where: { manualId },
      orderBy: { versionNumber: "desc" }
    });
    return lastVersion ? lastVersion.versionNumber + 1 : 1;
  }
  async restoreManualVersion(manualId, versionId) {
    const version = await prisma.manual_versions.findUnique({ where: { id: versionId } });
    if (!version) return void 0;
    const manual = await prisma.manuals.update({
      where: { id: manualId },
      data: {
        titulo: version.titulo,
        contenido_html: version.contenido_html,
        etiquetas: version.etiquetas,
        categoria: version.categoria
      }
    });
    return mapPrismaManual(manual);
  }
  // ==================== ACTIVITY LOG METHODS ====================
  async createActivityLog(insertLog) {
    const log2 = await prisma.activity_logs.create({
      data: {
        id: randomUUID(),
        users: { connect: { id: insertLog.usuarioId } },
        accion: insertLog.accion,
        modulo: insertLog.modulo,
        detalles: insertLog.detalles,
        fecha: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaActivityLog(log2);
  }
  async getAllActivityLogs() {
    const logs = await prisma.activity_logs.findMany({
      orderBy: { fecha: "desc" }
    });
    return logs.map(mapPrismaActivityLog);
  }
  // ==================== AUDIT TRAIL METHODS ====================
  async createAuditEntry(insertAudit) {
    const audit = await prisma.audit_trail.create({
      data: {
        id: randomUUID(),
        users: { connect: { id: insertAudit.usuarioId } },
        accion: insertAudit.accion,
        tabla: insertAudit.tabla,
        registroId: insertAudit.registroId,
        valorAnterior: insertAudit.valorAnterior,
        valorNuevo: insertAudit.valorNuevo,
        cambios: insertAudit.cambios,
        fecha: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaAuditTrail(audit);
  }
  async getAllAuditEntries() {
    const audits = await prisma.audit_trail.findMany({
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByTable(tabla) {
    const audits = await prisma.audit_trail.findMany({
      where: { tabla },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByRecord(tabla, registroId) {
    const audits = await prisma.audit_trail.findMany({
      where: { tabla, registroId },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByUser(usuarioId) {
    const audits = await prisma.audit_trail.findMany({
      where: { usuarioId },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  // ==================== GLOBAL SEARCH ====================
  async globalSearch(query) {
    const searchTerm = query.toLowerCase();
    const allClients = await this.getAllClients();
    const clientes = allClients.filter(
      (c) => c.razonSocial.toLowerCase().includes(searchTerm) || c.nifCif.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    const allTasks = await this.getAllTasks();
    const tareas = allTasks.filter(
      (t) => t.titulo.toLowerCase().includes(searchTerm) || t.descripcion && t.descripcion.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    const allManuals = await this.getAllManuals();
    const manuales = allManuals.filter(
      (m) => m.titulo.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    const impuestos = [];
    const total = clientes.length + tareas.length + impuestos.length + manuales.length;
    return { clientes, tareas, impuestos, manuales, total };
  }
  // ==================== ROLES & PERMISSIONS ====================
  async getAllRoles() {
    return await prisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: true
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: "asc" }
    });
  }
  async getRoleById(id) {
    return await prisma.roles.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: {
            permissions: true
          }
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }
  async createRole(data) {
    return await prisma.roles.create({
      data: {
        id: randomUUID(),
        name: data.name,
        description: data.description,
        is_system: false,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  async updateRole(id, data) {
    return await prisma.roles.update({
      where: { id },
      data
    });
  }
  async deleteRole(id) {
    const role = await prisma.roles.findUnique({ where: { id } });
    if (role?.is_system) {
      throw new Error("No se pueden eliminar roles del sistema");
    }
    return await prisma.roles.delete({ where: { id } });
  }
  async getAllPermissions() {
    return await prisma.permissions.findMany({
      orderBy: [
        { resource: "asc" },
        { action: "asc" }
      ]
    });
  }
  async assignPermissionsToRole(roleId, permissionIds) {
    await prisma.role_permissions.deleteMany({
      where: { roleId }
    });
    if (permissionIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: permissionIds.map((permissionId) => ({
          id: randomUUID(),
          roleId,
          permissionId
        })),
        skipDuplicates: true
      });
    }
    return await this.getRoleById(roleId);
  }
  async getUserPermissions(userId) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    if (!user?.roles) {
      return [];
    }
    return user.roles.role_permissions.map((rp) => rp.permissions);
  }
  async hasPermission(userId, resource, action) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some((p) => p.resource === resource && p.action === action);
  }
  // ==================== SYSTEM SETTINGS ====================
  async getSystemSettings() {
    const settings = await prisma.system_settings.findFirst();
    if (!settings) return void 0;
    return {
      id: settings.id,
      registrationEnabled: settings.registration_enabled,
      updatedAt: settings.updatedAt
    };
  }
  async updateSystemSettings(data) {
    let settings = await prisma.system_settings.findFirst();
    if (!settings) {
      settings = await prisma.system_settings.create({
        data: {
          registrationEnabled: data?.registration_enabled ?? true
        }
      });
    } else {
      settings = await prisma.system_settings.update({
        where: { id: settings.id },
        data
      });
    }
    return {
      id: settings.id,
      registrationEnabled: settings.registration_enabled,
      updatedAt: settings.updatedAt
    };
  }
  // ==================== SMTP ACCOUNTS ====================
  async getSMTPAccount(id) {
    const account = await prisma.smtp_accounts.findUnique({ where: { id } });
    if (!account) return null;
    return {
      ...account,
      password: decryptPassword(account.password)
    };
  }
  async getAllSMTPAccounts() {
    const accounts = await prisma.smtp_accounts.findMany({
      orderBy: { fecha_creacion: "desc" }
    });
    return accounts.map((account) => ({
      ...account,
      password: decryptPassword(account.password)
    }));
  }
  async getDefaultSMTPAccount() {
    const account = await prisma.smtp_accounts.findFirst({
      where: { is_predeterminada: true, activa: true }
    });
    if (!account) return null;
    return {
      ...account,
      password: decryptPassword(account.password)
    };
  }
  async createSMTPAccount(account) {
    const encryptedAccount = {
      ...account,
      password: encryptPassword(account.password)
    };
    const createdAccount = await prisma.$transaction(async (tx) => {
      if (encryptedAccount.isPredeterminada) {
        await tx.smtp_accounts.updateMany({
          where: { is_predeterminada: true },
          data: { is_predeterminada: false }
        });
      }
      return await tx.smtp_accounts.create({ data: encryptedAccount });
    });
    return {
      ...createdAccount,
      password: decryptPassword(createdAccount.password)
    };
  }
  async updateSMTPAccount(id, account) {
    const updateData = { ...account };
    if (updateData.password) {
      updateData.password = encryptPassword(updateData.password);
    }
    const updatedAccount = await prisma.$transaction(async (tx) => {
      if (updateData.isPredeterminada) {
        await tx.smtp_accounts.updateMany({
          where: { is_predeterminada: true, id: { not: id } },
          data: { is_predeterminada: false }
        });
      }
      return await tx.smtp_accounts.update({
        where: { id },
        data: updateData
      });
    });
    return {
      ...updatedAccount,
      password: decryptPassword(updatedAccount.password)
    };
  }
  async deleteSMTPAccount(id) {
    await prisma.smtp_accounts.delete({ where: { id } });
    return true;
  }
  // ==================== NOTIFICATION TEMPLATES ====================
  async getNotificationTemplate(id) {
    return await prisma.notification_templates.findUnique({ where: { id } });
  }
  async getAllNotificationTemplates() {
    return await prisma.notification_templates.findMany({
      orderBy: { fecha_creacion: "desc" },
      include: { users: { select: { username: true } } }
    });
  }
  async createNotificationTemplate(template) {
    return await prisma.notification_templates.create({ data: template });
  }
  async updateNotificationTemplate(id, template) {
    return await prisma.notification_templates.update({
      where: { id },
      data: template
    });
  }
  async deleteNotificationTemplate(id) {
    await prisma.notification_templates.delete({ where: { id } });
    return true;
  }
  // ==================== NOTIFICATION LOGS ====================
  async getNotificationLog(id) {
    return await prisma.notification_logs.findUnique({
      where: { id },
      include: {
        notification_templates: true,
        smtp_accounts: true,
        users: { select: { username: true } }
      }
    });
  }
  async getAllNotificationLogs() {
    return await prisma.notification_logs.findMany({
      orderBy: { fecha_envio: "desc" },
      include: {
        notification_templates: { select: { nombre: true } },
        smtp_accounts: { select: { nombre: true } },
        users: { select: { username: true } }
      }
    });
  }
  async createNotificationLog(log2) {
    return await prisma.notification_logs.create({ data: log2 });
  }
  // ==================== SCHEDULED NOTIFICATIONS ====================
  async getScheduledNotification(id) {
    return await prisma.scheduled_notifications.findUnique({
      where: { id },
      include: {
        notification_templates: true,
        smtp_accounts: true,
        users: { select: { username: true } }
      }
    });
  }
  async getAllScheduledNotifications() {
    return await prisma.scheduled_notifications.findMany({
      orderBy: { fecha_programada: "asc" },
      include: {
        notification_templates: { select: { nombre: true } },
        smtp_accounts: { select: { nombre: true } },
        users: { select: { username: true } }
      }
    });
  }
  async getPendingScheduledNotifications() {
    return await prisma.scheduled_notifications.findMany({
      where: {
        estado: "PENDIENTE",
        fecha_programada: { lte: /* @__PURE__ */ new Date() }
      },
      include: {
        notification_templates: true,
        smtp_accounts: true
      }
    });
  }
  async createScheduledNotification(notification) {
    return await prisma.scheduled_notifications.create({ data: notification });
  }
  async updateScheduledNotification(id, notification) {
    return await prisma.scheduled_notifications.update({
      where: { id },
      data: notification
    });
  }
  async deleteScheduledNotification(id) {
    await prisma.scheduled_notifications.delete({ where: { id } });
    return true;
  }
};
var prismaStorage = new PrismaStorage();

// server/routes.ts
import { PrismaClient as PrismaClient18 } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt3 from "jsonwebtoken";
import { randomUUID as randomUUID4 } from "crypto";

// server/utils/validators.ts
import { z } from "zod";
var CLIENT_TYPE_VALUES = [...CLIENT_TYPES];
var PERIODICITY_VALUES = [...TAX_PERIODICITIES];
var normalizeOptionalString = (maxLength) => z.preprocess(
  (value) => {
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? void 0 : trimmed;
  },
  (maxLength ? z.string().max(maxLength) : z.string()).or(z.null()).optional()
);
var clientTypeSchema = z.string().min(1).transform((value) => value.trim().toUpperCase()).refine((value) => CLIENT_TYPES.includes(value), {
  message: `Tipo de cliente inv\xE1lido. Valores permitidos: ${CLIENT_TYPES.join(", ")}`
});
var periodicitySchema = z.string().min(1).transform((value) => value.trim().toUpperCase()).refine((value) => TAX_PERIODICITIES.includes(value), {
  message: `Periodicidad inv\xE1lida. Valores permitidos: ${TAX_PERIODICITIES.join(", ")}`
});
var dateStringSchema = z.string().min(1, { message: "La fecha es obligatoria" }).refine((value) => !Number.isNaN(Date.parse(value)), { message: "Fecha inv\xE1lida" });
var registerSchema = z.object({
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres").trim(),
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(6, "La contrase\xF1a debe tener al menos 6 caracteres"),
  roleId: z.string().optional()
});
var userCreateSchema = z.object({
  username: z.string().min(3).trim(),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().optional()
});
var smtpConfigSchema = z.object({
  host: z.string().min(1).max(200),
  port: z.union([z.string(), z.number()]).transform((val) => typeof val === "string" ? parseInt(val, 10) : val).refine((n) => Number.isFinite(n) && n > 0 && n <= 65535, { message: "Puerto SMTP inv\xE1lido" }),
  user: z.string().min(1),
  pass: z.string().min(1)
});
var smtpAccountSchema = z.object({
  nombre: z.string().min(1),
  host: z.string().min(1).max(200),
  port: z.union([z.string(), z.number()]).transform((val) => typeof val === "string" ? parseInt(val, 10) : val).refine((n) => Number.isFinite(n) && n > 0 && n <= 65535),
  user: z.string().min(1),
  password: z.string().min(1),
  isPredeterminada: z.boolean().optional(),
  activa: z.boolean().optional()
});
var githubConfigSchema = z.object({
  repoUrl: z.string().min(1).max(500)
});
var clientBaseSchema = z.object({
  razonSocial: z.string().trim().min(1, "La raz\xF3n social es obligatoria"),
  nifCif: z.string().trim().min(1, "El NIF/CIF es obligatorio"),
  tipo: clientTypeSchema,
  email: normalizeOptionalString().refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Email inv\xE1lido"
  ),
  telefono: normalizeOptionalString(50),
  direccion: normalizeOptionalString(255),
  responsableAsignado: normalizeOptionalString(),
  isActive: z.boolean().optional(),
  fechaAlta: normalizeOptionalString(),
  fechaBaja: normalizeOptionalString(),
  notes: normalizeOptionalString()
});
var clientCreateSchema = clientBaseSchema.extend({
  responsableAsignado: normalizeOptionalString()
});
var clientUpdateSchema = clientBaseSchema.partial();
var taxAssignmentShape = z.object({
  taxModelCode: z.string().trim().min(1, "El c\xF3digo de modelo es obligatorio"),
  periodicity: periodicitySchema,
  startDate: dateStringSchema,
  endDate: normalizeOptionalString(),
  activeFlag: z.boolean().optional(),
  notes: normalizeOptionalString()
});
var validateTaxAssignmentDates = (data, ctx) => {
  if (data.endDate) {
    const start = data.startDate ? Date.parse(data.startDate) : NaN;
    const end = Date.parse(data.endDate);
    if (Number.isNaN(end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Fecha de baja inv\xE1lida"
      });
    } else if (!Number.isNaN(start) && end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "La fecha de baja debe ser posterior a la fecha de alta"
      });
    }
  }
};
var taxAssignmentCreateSchema = taxAssignmentShape.superRefine(
  (data, ctx) => validateTaxAssignmentDates({ startDate: data.startDate, endDate: data.endDate ?? void 0 }, ctx)
);
var taxAssignmentUpdateSchema = taxAssignmentShape.partial().superRefine(
  (data, ctx) => validateTaxAssignmentDates(
    { startDate: data.startDate, endDate: data.endDate ?? void 0 },
    ctx
  )
);
var taskCreateSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  asignadoA: z.string().optional(),
  clienteId: z.string().optional(),
  visibilidad: z.string().optional()
});
function validateTaxAssignmentAgainstRules(clientType, payload) {
  validateTaxAssignmentInput({
    clientType,
    taxModelCode: payload.taxModelCode,
    periodicity: payload.periodicity
  });
  const enforce303Monthly = String(process.env.ENFORCE_303_MONTHLY || "").toLowerCase() === "true";
  if (enforce303Monthly && payload.taxModelCode === "303" && payload.periodicity !== "MENSUAL") {
    throw new Error("El modelo 303 debe configurarse como MENSUAL (pol\xEDtica vigente)");
  }
}
function validateZod(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message
      }));
      return res.status(400).json({ errors });
    }
    req.body = result.data;
    return next();
  };
}

// server/routes.ts
import multer2 from "multer";
import path12 from "path";
import fs9 from "fs";

// server/email.ts
import nodemailer from "nodemailer";
var smtpConfig = null;
function configureSMTP(config) {
  smtpConfig = config;
}
function getSMTPConfig() {
  return smtpConfig;
}
function createTransporter() {
  if (!smtpConfig) {
    console.warn("SMTP not configured, skipping email");
    return null;
  }
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });
}
async function sendTaskReminderEmail(task, daysUntilDue) {
  const transporter2 = createTransporter();
  if (!transporter2 || !task.assignedUser?.email || !smtpConfig) return;
  const subject = `Recordatorio: Tarea "${task.titulo}" vence en ${daysUntilDue} d\xEDas`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1E3A8A;">Recordatorio de Tarea</h2>
      <p>Hola ${task.assignedUser.username},</p>
      <p>Te recordamos que tienes una tarea pendiente que vence pronto:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${task.titulo}</h3>
        ${task.descripcion ? `<p>${task.descripcion}</p>` : ""}
        <p><strong>Prioridad:</strong> ${task.prioridad}</p>
        <p><strong>Vencimiento:</strong> ${task.fechaVencimiento ? new Date(task.fechaVencimiento).toLocaleDateString("es-ES") : "No definido"}</p>
        <p><strong>D\xEDas restantes:</strong> ${daysUntilDue}</p>
      </div>
      
      <p>Por favor, aseg\xFArate de completar esta tarea a tiempo.</p>
      <p>Saludos,<br>Asesor\xEDa La Llave</p>
    </div>
  `;
  try {
    await transporter2.sendMail({
      from: smtpConfig.user,
      to: task.assignedUser.email,
      subject,
      html
    });
    console.log(`Email sent to ${task.assignedUser.email} for task ${task.id}`);
  } catch (error) {
    console.error("Error sending task reminder email:", error);
  }
}
async function sendTaxReminderEmail(clientTax, daysUntilDue) {
  const transporter2 = createTransporter();
  if (!transporter2 || !clientTax.client?.email || !smtpConfig) return;
  const modelName = clientTax.taxPeriod?.taxModel?.nombre || "Modelo fiscal";
  const period = clientTax.taxPeriod ? `${clientTax.taxPeriod.trimestre ? `T${clientTax.taxPeriod.trimestre}` : clientTax.taxPeriod.mes ? `Mes ${clientTax.taxPeriod.mes}` : ""} ${clientTax.taxPeriod.anio}` : "Periodo no especificado";
  const subject = `Recordatorio: ${modelName} vence en ${daysUntilDue} d\xEDas`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1E3A8A;">Recordatorio de Impuesto</h2>
      <p>Estimado cliente ${clientTax.client.razonSocial},</p>
      <p>Le recordamos que tiene un modelo fiscal pendiente que vence pronto:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${modelName}</h3>
        <p><strong>Periodo:</strong> ${period}</p>
        <p><strong>Estado:</strong> ${clientTax.estado}</p>
        <p><strong>Fecha l\xEDmite:</strong> ${clientTax.taxPeriod?.finPresentacion ? new Date(clientTax.taxPeriod.finPresentacion).toLocaleDateString("es-ES") : "No definida"}</p>
        <p><strong>D\xEDas restantes:</strong> ${daysUntilDue}</p>
        ${clientTax.notas ? `<p><strong>Notas:</strong> ${clientTax.notas}</p>` : ""}
      </div>
      
      <p>Por favor, aseg\xFArese de presentar este modelo antes de la fecha l\xEDmite para evitar sanciones.</p>
      <p>Atentamente,<br>Asesor\xEDa La Llave</p>
    </div>
  `;
  try {
    await transporter2.sendMail({
      from: smtpConfig.user,
      to: clientTax.client.email,
      subject,
      html
    });
    console.log(`Email sent to ${clientTax.client.email} for tax ${clientTax.id}`);
  } catch (error) {
    console.error("Error sending tax reminder email:", error);
  }
}
async function checkAndSendReminders(storage) {
  const now = /* @__PURE__ */ new Date();
  const tasks = await storage.getAllTasks();
  for (const task of tasks) {
    if (task.fechaVencimiento && task.estado !== "COMPLETADA" && task.asignadoA) {
      const dueDate = new Date(task.fechaVencimiento);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysUntilDue === 3) {
        const assignedUser = await storage.getUser(task.asignadoA);
        if (assignedUser) {
          await sendTaskReminderEmail({ ...task, assignedUser }, daysUntilDue);
        }
      }
    }
  }
  const clientTaxes = await storage.getAllClientTax();
  for (const clientTax of clientTaxes) {
    if (clientTax.estado !== "REALIZADO") {
      const taxPeriod = await storage.getTaxPeriod(clientTax.taxPeriodId);
      if (taxPeriod?.finPresentacion) {
        const dueDate = new Date(taxPeriod.finPresentacion);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        if (daysUntilDue === 7) {
          const client = await storage.getClient(clientTax.clientId);
          const taxModel = await storage.getTaxModel(taxPeriod.modeloId);
          if (client) {
            await sendTaxReminderEmail({
              ...clientTax,
              client,
              taxPeriod: { ...taxPeriod, taxModel }
            }, daysUntilDue);
          }
        }
      }
    }
  }
}

// server/routes.ts
init_websocket();

// server/admin-sessions.ts
import express from "express";
import { PrismaClient as PrismaClient2 } from "@prisma/client";

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET no est\xE1 configurado. Este valor es OBLIGATORIO para la seguridad del sistema.");
}
var JWT_SECRET = process.env.JWT_SECRET;
var authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && String(authHeader).split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token no proporcionado" });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(403).json({ error: "Token inv\xE1lido" });
    const user = await prismaStorage.getUserWithPermissions(decoded.id);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    const permissions = (user.roles?.role_permissions || []).map((rp) => `${rp.permissions.resource}:${rp.permissions.action}`);
    req.user = {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roles?.name || null,
      permissions
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inv\xE1lido" });
  }
};
var checkIsAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Usuario no autenticado" });
  if (req.user.roleName === "Administrador" || req.user.permissions.includes("admin:read") || req.user.permissions.includes("admin:settings")) {
    return next();
  }
  return res.status(403).json({ error: "No tienes permisos de administrador" });
};

// server/admin-sessions.ts
init_websocket();
var prisma2 = new PrismaClient2();
var router = express.Router();
router.get("/", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { page = 1, size = 50, activeOnly, query, country, device, vpnOnly, suspicious } = req.query;
    const where = {};
    if (activeOnly === "true" || activeOnly === void 0) {
      where.ended_at = null;
    }
    if (query) {
      where.OR = [
        { ip: { contains: query } },
        { users: { username: { contains: query } } },
        { users: { email: { contains: query } } },
        { user_agent: { contains: query } }
      ];
    }
    if (country) where.country = country;
    if (device) where.device_type = device;
    if (vpnOnly === "true") where.isVpn = true;
    if (suspicious === "true") where.suspicious = true;
    const take = Number(size) || 50;
    const skip = (Number(page) - 1) * take;
    console.log("\u{1F50D} Buscando sesiones con filtros:", { where, activeOnly, page, size });
    const p = prisma2;
    const [items, total] = await Promise.all([
      p.sessions.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true,
              roles: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { last_seen_at: "desc" },
        take,
        skip
      }),
      p.sessions.count({ where })
    ]);
    console.log(`\u{1F4CA} Encontradas ${items.length} sesiones de ${total} total`);
    const enrichedItems = items.map((session) => {
      const now = /* @__PURE__ */ new Date();
      const lastSeen = new Date(session.last_seen_at);
      const minutesSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1e3 * 60));
      return {
        ...session,
        isActive: !session.ended_at && minutesSinceLastSeen < 5,
        // Activo si se vio en los últimos 5 minutos
        minutesSinceLastSeen,
        status: session.ended_at ? "closed" : minutesSinceLastSeen < 5 ? "active" : "idle",
        deviceInfo: {
          type: session.device_type || "Unknown",
          platform: session.platform || "Unknown",
          userAgent: session.user_agent?.substring(0, 100) + (session.user_agent?.length > 100 ? "..." : "")
        },
        location: {
          country: session.country || "Unknown",
          region: session.region || "Unknown",
          city: session.city || "Unknown",
          isVpn: session.isVpn || false
        }
      };
    });
    res.json({ items: enrichedItems, total, page: Number(page), size: take });
  } catch (err) {
    console.error("GET /api/admin/sessions error", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/:id", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const session = await p.sessions.findUnique({ where: { id: req.params.id }, include: { users: true } });
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/:id/terminate", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    console.log(`\u{1F50C} Intentando terminar sesi\xF3n ${req.params.id} por administrador ${req.user?.username}`);
    const p = prisma2;
    const session = await p.sessions.findUnique({
      where: { id: req.params.id },
      include: { users: { select: { username: true } } }
    });
    if (!session) {
      console.log(`\u274C Sesi\xF3n ${req.params.id} no encontrada`);
      return res.status(404).json({ error: "Sesi\xF3n no encontrada" });
    }
    console.log(`\u{1F4CB} Sesi\xF3n encontrada: ${session.users?.username} (${session.socketId})`);
    await p.sessions.update({ where: { id: req.params.id }, data: { ended_at: /* @__PURE__ */ new Date() } });
    console.log(`\u2705 Sesi\xF3n ${req.params.id} marcada como terminada en BD`);
    const io2 = getSocketServer();
    if (io2 && session.socketId) {
      const sock = io2.sockets.sockets.get(session.socketId);
      if (sock) {
        console.log(`\u{1F50C} Socket encontrado, enviando notificaci\xF3n y desconectando...`);
        sock.emit("session:terminated", {
          reason: "admin_terminated",
          message: "Tu sesi\xF3n ha sido terminada por un administrador"
        });
        sock.disconnect(true);
        console.log(`\u2705 Socket ${session.socketId} desconectado exitosamente`);
      } else {
        console.log(`\u26A0\uFE0F Socket ${session.socketId} no encontrado en servidor`);
      }
    } else {
      console.log(`\u26A0\uFE0F No hay socket ID o servidor IO no disponible`);
    }
    if (io2) {
      io2.to("role:Administrador").emit("session:disconnected", {
        id: req.params.id,
        userId: session.userId,
        terminatedBy: req.user?.username
      });
      console.log(`\u{1F4E2} Notificaci\xF3n enviada a administradores`);
    }
    console.log(`\u2705 Sesi\xF3n ${req.params.id} terminada completamente por administrador ${req.user?.username}`);
    res.json({ ok: true, message: "Sesi\xF3n terminada exitosamente" });
  } catch (err) {
    console.error("\u274C Error terminando sesi\xF3n:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
router.post("/:id/flag", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const session = await p.sessions.update({ where: { id: req.params.id }, data: { suspicious: true } });
    const io2 = getSocketServer();
    if (io2) io2.to("admins").emit("session:update", session);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/:id/unflag", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const session = await p.sessions.update({ where: { id: req.params.id }, data: { suspicious: false } });
    const io2 = getSocketServer();
    if (io2) io2.to("admins").emit("session:update", session);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/terminate-all-for-user/:userId", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const userId = req.params.userId;
    const activeSessions = await p.sessions.findMany({
      where: { userId, ended_at: null }
    });
    await p.sessions.updateMany({
      where: { userId, ended_at: null },
      data: { ended_at: /* @__PURE__ */ new Date() }
    });
    const io2 = getSocketServer();
    if (io2) {
      activeSessions.forEach((session) => {
        if (session.socketId) {
          const sock = io2.sockets.sockets.get(session.socketId);
          if (sock) {
            sock.disconnect(true);
          }
        }
      });
      io2.to("admins").emit("sessions:terminated", {
        userId,
        count: activeSessions.length
      });
    }
    res.json({ ok: true, terminatedCount: activeSessions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/stats", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const [
      totalSessions,
      activeSessions,
      suspiciousSessions,
      vpnSessions,
      sessionsByCountry,
      sessionsByDevice
    ] = await Promise.all([
      p.sessions.count(),
      p.sessions.count({ where: { ended_at: null } }),
      p.sessions.count({ where: { suspicious: true } }),
      p.sessions.count({ where: { isVpn: true } }),
      p.sessions.groupBy({
        by: ["country"],
        _count: { country: true },
        where: { ended_at: null },
        orderBy: { _count: { country: "desc" } },
        take: 10
      }),
      p.sessions.groupBy({
        by: ["device_type"],
        _count: { device_type: true },
        where: { ended_at: null },
        orderBy: { _count: { device_type: "desc" } },
        take: 10
      })
    ]);
    res.json({
      totalSessions,
      activeSessions,
      suspiciousSessions,
      vpnSessions,
      sessionsByCountry,
      sessionsByDevice
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/cleanup", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const closedSessionsResult = await p.sessions.deleteMany({
      where: {
        ended_at: { not: null }
      }
    });
    const thirtyMinutesAgo = /* @__PURE__ */ new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    const inactiveSessionsResult = await p.sessions.updateMany({
      where: {
        ended_at: null,
        last_seen_at: { lt: thirtyMinutesAgo }
      },
      data: {
        ended_at: /* @__PURE__ */ new Date()
      }
    });
    console.log(`\u{1F9F9} Limpieza manual: ${closedSessionsResult.count} sesiones cerradas eliminadas, ${inactiveSessionsResult.count} sesiones inactivas marcadas como cerradas`);
    res.json({
      ok: true,
      deletedCount: closedSessionsResult.count,
      markedInactiveCount: inactiveSessionsResult.count,
      totalCleaned: closedSessionsResult.count + inactiveSessionsResult.count
    });
  } catch (err) {
    console.error("Error en limpieza de sesiones:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/all", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { page = 1, size = 50, query, country, device, vpnOnly, suspicious } = req.query;
    const where = {};
    if (query) {
      where.OR = [
        { ip: { contains: query } },
        { users: { username: { contains: query } } },
        { users: { email: { contains: query } } },
        { user_agent: { contains: query } }
      ];
    }
    if (country) where.country = country;
    if (device) where.device_type = device;
    if (vpnOnly === "true") where.isVpn = true;
    if (suspicious === "true") where.suspicious = true;
    const take = Number(size) || 50;
    const skip = (Number(page) - 1) * take;
    console.log("\u{1F50D} Buscando TODAS las sesiones con filtros:", { where, page, size });
    const p = prisma2;
    const [items, total] = await Promise.all([
      p.sessions.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true,
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { last_seen_at: "desc" },
        take,
        skip
      }),
      p.sessions.count({ where })
    ]);
    console.log(`\u{1F4CA} Encontradas ${items.length} sesiones de ${total} total (todas)`);
    const enrichedItems = items.map((session) => {
      const now = /* @__PURE__ */ new Date();
      const lastSeen = new Date(session.last_seen_at);
      const minutesSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1e3 * 60));
      return {
        ...session,
        isActive: !session.ended_at && minutesSinceLastSeen < 5,
        minutesSinceLastSeen,
        status: session.ended_at ? "closed" : minutesSinceLastSeen < 5 ? "active" : "idle",
        deviceInfo: {
          type: session.device_type || "Unknown",
          platform: session.platform || "Unknown",
          userAgent: session.user_agent?.substring(0, 100) + (session.user_agent?.length > 100 ? "..." : "")
        },
        location: {
          country: session.country || "Unknown",
          region: session.region || "Unknown",
          city: session.city || "Unknown",
          isVpn: session.isVpn || false
        }
      };
    });
    res.json({ items: enrichedItems, total, page: Number(page), size: take });
  } catch (err) {
    console.error("GET /api/admin/sessions/all error", err);
    res.status(500).json({ error: "Internal error" });
  }
});
var admin_sessions_default = router;

// server/price-catalog.ts
import express2 from "express";
import { PrismaClient as PrismaClient3 } from "@prisma/client";
var prisma3 = new PrismaClient3();
var router2 = express2.Router();
router2.get("/", authenticateToken, async (req, res) => {
  try {
    const p = prisma3;
    const items = await p.priceCatalog.findMany({ where: { active: true }, orderBy: { title: "asc" } });
    res.json(items);
  } catch (err) {
    console.error("GET /api/price-catalog", err);
    res.status(500).json({ error: err.message });
  }
});
router2.post("/", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { key, title, unit, basePrice, vatPct, active } = req.body;
    const p = prisma3;
    const item = await p.priceCatalog.create({ data: { key, title, unit, basePrice: Number(basePrice), vatPct: Number(vatPct || 21), active: active ?? true } });
    res.status(201).json(item);
  } catch (err) {
    console.error("POST /api/price-catalog", err);
    res.status(500).json({ error: err.message });
  }
});
router2.patch("/:id", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.basePrice !== void 0) updates.basePrice = Number(updates.basePrice);
    if (updates.vatPct !== void 0) updates.vatPct = Number(updates.vatPct);
    const p = prisma3;
    const updated = await p.priceCatalog.update({ where: { id }, data: updates });
    res.json(updated);
  } catch (err) {
    console.error("PATCH /api/price-catalog/:id", err);
    res.status(500).json({ error: err.message });
  }
});
var price_catalog_default = router2;

// server/budgets.ts
import express3 from "express";
import { PrismaClient as PrismaClient9 } from "@prisma/client";

// server/utils/budgets-pdf.ts
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PrismaClient as PrismaClient4 } from "@prisma/client";

// server/utils/template-variables.ts
function replaceTemplateVariables(htmlContent, data) {
  let result = htmlContent;
  Object.entries(data).forEach(([key, value]) => {
    if (value !== void 0 && value !== null) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      result = result.replace(regex, String(value));
    }
  });
  result = result.replace(/{{([^}]+)}}/g, '<span style="color: red; font-style: italic;">[$1 no disponible]</span>');
  return result;
}
function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}
function formatDate(date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
function prepareBudgetData(budget) {
  const data = {
    codigo: budget.code || "",
    fecha: formatDate(new Date(budget.createdAt)),
    nombre_contacto: budget.contactName || "",
    email: budget.contactEmail || "",
    telefono: budget.contactPhone || "",
    subtotal: formatCurrency(budget.subtotal || 0),
    iva: formatCurrency(budget.iva || 0),
    total: formatCurrency(budget.total || 0),
    empresa: budget.companyBrand === "LA_LLAVE" ? "Asesor\xEDa La Llave" : "Gestor\xEDa Online",
    descripcion: budget.description || ""
  };
  if (budget.type === "PYME" && budget.details) {
    data.nombre_sociedad = budget.details.companyName || "";
    data.actividad = budget.details.activity || "";
    data.periodo_declaraciones = budget.details.declarationPeriod || "";
    data.num_asientos = String(budget.details.numEntries || 0);
    data.nominas_mes = String(budget.details.payrollsPerMonth || 0);
  }
  if (budget.type === "AUTONOMO" && budget.details) {
    data.sistema_tributacion = budget.details.taxationSystem || "";
    data.facturacion_anual = formatCurrency(budget.details.annualRevenue || 0);
    data.num_facturas = String(budget.details.numInvoices || 0);
  }
  if (budget.type === "RENTA" && budget.details) {
    data.tipo_declaracion = budget.details.declarationType || "";
    data.ingresos = formatCurrency(budget.details.income || 0);
    data.retenciones = formatCurrency(budget.details.withholdings || 0);
  }
  if (budget.type === "HERENCIAS" && budget.details) {
    data.titulo_sucesorio = budget.details.successionTitle || "";
    data.num_herederos = String(budget.details.numHeirs || 0);
    data.fincas_madrid = budget.details.propertiesMadrid || "";
    data.caudal = formatCurrency(budget.details.estate || 0);
    data.tipo_proceso = budget.details.processType || "";
  }
  return data;
}

// server/utils/budgets-pdf.ts
var prisma4 = new PrismaClient4();
async function createBudgetPdf(budget) {
  const uploadsDir2 = path.join(process.cwd(), "uploads", "budgets");
  if (!fs.existsSync(uploadsDir2)) fs.mkdirSync(uploadsDir2, { recursive: true });
  const filename = `${(budget.code || "budget").replace(/[^a-zA-Z0-9-_\.]/g, "_")}-${Date.now()}.pdf`;
  const filepath = path.join(uploadsDir2, filename);
  const html = await renderBudgetHtml(budget);
  let browser = null;
  try {
    browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: filepath, format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "12mm", right: "12mm" } });
    const url = `/uploads/budgets/${filename}`;
    return { filename, url };
  } catch (err) {
    console.warn("createBudgetPdf failed, falling back to placeholder", err);
    try {
      fs.writeFileSync(filepath, Buffer.from("%PDF-1.4\n%placeholder PDF"), { encoding: "utf-8" });
      return { filename, url: `/uploads/budgets/${filename}` };
    } catch (err2) {
      throw err;
    }
  } finally {
    if (browser) await browser.close();
  }
}
async function renderBudgetHtml(budget) {
  const template = await prisma4.budget_templates.findFirst({
    where: {
      type: budget.type,
      companyBrand: budget.companyBrand || "LA_LLAVE",
      isDefault: true,
      isActive: true
    }
  });
  if (template) {
    const budgetData = prepareBudgetData(budget);
    let html = replaceTemplateVariables(template.htmlContent, budgetData);
    if (template.customCss) {
      html = `<style>${template.customCss}</style>${html}`;
    }
    if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
    }
    return html;
  }
  return renderLegacyBudgetHtml(budget);
}
function renderLegacyBudgetHtml(budget) {
  const isGestoriaOnline = budget.companyBrand === "GESTORIA_ONLINE";
  const companyName = isGestoriaOnline ? "GESTOR\xCDA ONLINE" : "ASESOR\xCDA LA LLAVE";
  const companyAddress = isGestoriaOnline ? "C/ Ejemplo, 123 - 28000 Madrid" : "C/ Legan\xE9s, 17 - 28901 Getafe (Madrid)";
  const companyPhone = isGestoriaOnline ? "91 XXX XX XX" : "91 238 99 60";
  const companyEmail = isGestoriaOnline ? "info@gestoriaonline.com" : "info@asesorialallave.com";
  const companyWeb = isGestoriaOnline ? "www.gestoriaonline.com" : "www.asesorialallave.com";
  const companyColor = isGestoriaOnline ? "#1a7f64" : "#2E5C8A";
  const items = Array.isArray(budget.items) ? budget.items : [];
  const categories = /* @__PURE__ */ new Map();
  items.forEach((item) => {
    const cat = item.category || "OTROS";
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat).push(item);
  });
  const categoryNames = {
    BASE_CONTABILIDAD: "Contabilidad Base",
    BASE_HEREDEROS: "Herederos",
    BASE_FINCAS_COMUNIDAD: "Fincas Comunidad Aut\xF3noma",
    BASE_FINCAS_OTRAS: "Fincas Otras CCAA",
    BASE_PRODUCTOS: "Productos Financieros",
    BASE_VEHICULOS: "Veh\xEDculos",
    BASE_RENTA: "Declaraci\xF3n de Renta",
    SERVICIO_PLUSVALIAS: "Plusval\xEDas",
    SERVICIO_REGISTROS: "Registros",
    EXTRA_AUTONOMO: "Actividad Econ\xF3mica",
    EXTRA_INMUEBLES_ALQ: "Inmuebles Alquilados",
    EXTRA_VENTA_INMUEBLES: "Venta de Inmuebles",
    EXTRA_VENTA_FINANCIEROS: "Venta de Productos Financieros",
    EXTRA_OTRAS_GANANCIAS: "Otras Ganancias",
    EXTRA_IRPF: "IRPF Alquileres",
    EXTRA_IVA_INTRA: "IVA Intracomunitario",
    EXTRA_NOTIFICACIONES: "Notificaciones",
    EXTRA_INE: "Estad\xEDsticas INE",
    NOMINAS: "N\xF3minas",
    RECARGO_FACTURACION: "Recargo por Facturaci\xF3n",
    RECARGO_MENSUALIDAD: "Liquidaciones Mensuales",
    RECARGO_ESN: "Estimaci\xF3n Simplificada Neta",
    RECARGO_CAUDAL: "Recargo Caudal Hereditario",
    RECARGO_SIN_TESTAMENTO: "Sin Testamento",
    RECARGO_SIN_ACUERDO: "Sin Acuerdo Herederos",
    RECARGO_ESCRITURAR: "Escrituraci\xF3n",
    DESCUENTO_MODULOS: "Descuento M\xF3dulos",
    DESCUENTO_EMPRENDEDOR: "Descuento Emprendedor",
    DESCUENTO_COMERCIAL: "Descuento Comercial",
    OTROS: "Otros Conceptos"
  };
  let tableRows = "";
  categories.forEach((categoryItems, categoryKey) => {
    const categoryName = categoryNames[categoryKey] || categoryKey;
    tableRows += `
      <tr style="background-color:#E8F4FD">
        <td colspan="4" style="padding:8px 12px;border:1px solid ${companyColor};font-weight:700;color:#1a365d;font-size:11px">
          ${escapeHtml(categoryName)}
        </td>
      </tr>
    `;
    categoryItems.forEach((it) => {
      tableRows += `
        <tr>
          <td style="padding:6px 12px 6px 24px;border:1px solid ${companyColor};font-size:10px">${escapeHtml(it.concept || "")}</td>
          <td style="padding:6px 8px;border:1px solid ${companyColor};text-align:right;font-size:10px">${Number(it.quantity || 1).toFixed(0)}</td>
          <td style="padding:6px 8px;border:1px solid ${companyColor};text-align:right;font-size:10px">${Number(it.unitPrice || 0).toFixed(2)} \u20AC</td>
          <td style="padding:6px 8px;border:1px solid ${companyColor};text-align:right;font-weight:600;font-size:10px">${Number(it.total || 0).toFixed(2)} \u20AC</td>
        </tr>
      `;
    });
  });
  const typeNames = {
    PYME: "PYMES / EMPRESAS",
    AUTONOMO: "AUT\xD3NOMOS",
    RENTA: "DECLARACI\xD3N DE RENTA",
    HERENCIAS: "HERENCIAS Y DONACIONES",
    GENERAL: "GENERAL"
  };
  const typeName = typeNames[budget.type] || budget.type || "GENERAL";
  const formatDate2 = (date) => {
    const d = new Date(date || Date.now());
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        @page { 
          margin: 0; 
          size: A4;
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #000000; 
          line-height: 1.3;
          margin: 0;
          padding: 0;
          font-size: 10px;
        }
        .page {
          padding: 15mm 12mm 15mm 12mm;
          background: white;
        }
        .header-blue { 
          background: linear-gradient(135deg, ${companyColor} 0%, ${companyColor}dd 100%);
          color: white;
          padding: 20px 25px;
          margin: -15mm -12mm 15px -12mm;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .company-name { 
          font-weight: 700; 
          font-size: 24px;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .company-info {
          font-size: 9px;
          opacity: 0.95;
          line-height: 1.4;
        }
        .budget-type {
          text-align: right;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .budget-number {
          font-size: 11px;
          opacity: 0.9;
          margin-top: 4px;
        }
        .section-title {
          background: ${companyColor};
          color: white;
          padding: 8px 12px;
          font-weight: 700;
          font-size: 11px;
          margin: 15px 0 8px 0;
          letter-spacing: 0.3px;
        }
        .info-box {
          border: 1px solid ${companyColor};
          padding: 10px 12px;
          margin-bottom: 12px;
          background: #F8FBFE;
        }
        .info-row {
          display: flex;
          margin-bottom: 4px;
          font-size: 10px;
        }
        .info-label {
          font-weight: 600;
          width: 120px;
          color: ${companyColor};
        }
        .info-value {
          flex: 1;
          color: #000;
        }
        table { 
          border-collapse: collapse; 
          width: 100%;
          margin-bottom: 15px;
          font-size: 10px;
        }
        th {
          background: ${companyColor};
          color: white;
          padding: 8px 12px;
          text-align: left;
          font-weight: 700;
          font-size: 10px;
          border: 1px solid #1a4d7a;
        }
        td {
          border: 1px solid ${companyColor};
          padding: 6px 12px;
        }
        .totals-table {
          width: 300px;
          margin-left: auto;
          margin-top: 15px;
          border: 2px solid ${companyColor};
        }
        .totals-table td {
          padding: 8px 12px;
          font-size: 11px;
        }
        .totals-table .label {
          background: #E8F4FD;
          font-weight: 600;
          color: ${companyColor};
          width: 150px;
        }
        .totals-table .amount {
          text-align: right;
          font-weight: 700;
          background: white;
        }
        .total-final {
          background: ${companyColor} !important;
          color: white !important;
          font-size: 13px !important;
          font-weight: 700 !important;
        }
        .terms {
          margin-top: 20px;
          padding: 12px;
          border: 1px solid #CBD5E0;
          background: #F7FAFC;
          font-size: 8px;
          line-height: 1.5;
        }
        .terms-title {
          font-weight: 700;
          font-size: 9px;
          margin-bottom: 6px;
          color: ${companyColor};
          text-transform: uppercase;
        }
        .terms ul {
          margin: 6px 0;
          padding-left: 18px;
        }
        .terms li {
          margin-bottom: 3px;
        }
        .footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 2px solid ${companyColor};
          text-align: center;
          font-size: 9px;
          color: #4A5568;
        }
        .acceptance-box {
          margin-top: 15px;
          padding: 12px;
          border: 2px solid ${companyColor};
          background: #F0F7FF;
        }
        .acceptance-title {
          font-weight: 700;
          color: ${companyColor};
          margin-bottom: 8px;
          font-size: 10px;
        }
        .signature-line {
          margin-top: 30px;
          padding-top: 8px;
          border-top: 1px solid #000;
          width: 250px;
          text-align: center;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- CABECERA AZUL -->
        <div class="header-blue">
          <div class="header-content">
            <div>
              <div class="company-name">${escapeHtml(companyName)}</div>
              <div class="company-info">
                ${escapeHtml(companyAddress)}<br>
                Tel: ${escapeHtml(companyPhone)} | Email: ${escapeHtml(companyEmail)}<br>
                ${escapeHtml(companyWeb)}
              </div>
            </div>
            <div class="budget-type">
              PRESUPUESTO<br>${typeName}
              <div class="budget-number">N\xBA ${escapeHtml(budget.code || "")}</div>
            </div>
          </div>
        </div>

        <!-- INFORMACI\xD3N DEL PRESUPUESTO -->
        <div class="info-box">
          <div class="info-row">
            <div class="info-label">Fecha Emisi\xF3n:</div>
            <div class="info-value">${formatDate2(budget.date)}</div>
          </div>
          ${budget.expiresAt ? `
          <div class="info-row">
            <div class="info-label">V\xE1lido Hasta:</div>
            <div class="info-value">${formatDate2(budget.expiresAt)}</div>
          </div>
          ` : ""}
        </div>

        <!-- DATOS DEL CLIENTE -->
        <div class="section-title">DATOS DEL CLIENTE</div>
        <div class="info-box">
          <div class="info-row">
            <div class="info-label">Cliente:</div>
            <div class="info-value"><strong>${escapeHtml(budget.clientName || "")}</strong></div>
          </div>
          ${budget.clientEmail ? `
          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${escapeHtml(budget.clientEmail)}</div>
          </div>
          ` : ""}
          ${budget.clientPhone ? `
          <div class="info-row">
            <div class="info-label">Tel\xE9fono:</div>
            <div class="info-value">${escapeHtml(budget.clientPhone)}</div>
          </div>
          ` : ""}
          ${budget.clientAddress ? `
          <div class="info-row">
            <div class="info-label">Direcci\xF3n:</div>
            <div class="info-value">${escapeHtml(budget.clientAddress)}</div>
          </div>
          ` : ""}
        </div>

        <!-- DETALLE DE SERVICIOS -->
        <div class="section-title">DETALLE DE SERVICIOS</div>
        <table>
          <thead>
            <tr>
              <th style="width:auto">CONCEPTO</th>
              <th style="width:70px;text-align:right">CANT.</th>
              <th style="width:90px;text-align:right">PRECIO UNIT.</th>
              <th style="width:90px;text-align:right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#718096">No hay items en este presupuesto</td></tr>'}
          </tbody>
        </table>

        <!-- TOTALES -->
        <table class="totals-table">
          <tr>
            <td class="label">SUBTOTAL (Base Imponible):</td>
            <td class="amount">${Number(budget.subtotal || 0).toFixed(2)} \u20AC</td>
          </tr>
          <tr>
            <td class="label">I.V.A. (21%):</td>
            <td class="amount">${Number(budget.vatTotal || 0).toFixed(2)} \u20AC</td>
          </tr>
          <tr>
            <td class="label total-final">TOTAL PRESUPUESTO:</td>
            <td class="amount total-final">${Number(budget.total || 0).toFixed(2)} \u20AC</td>
          </tr>
        </table>

        ${budget.notes ? `
        <div class="info-box" style="background:#FFFBEB;border-color:#F59E0B">
          <div style="font-weight:600;color:#92400E;margin-bottom:6px;font-size:10px">OBSERVACIONES:</div>
          <div style="color:#78350F;font-size:9px;line-height:1.5">${escapeHtml(budget.notes)}</div>
        </div>
        ` : ""}

        <!-- T\xC9RMINOS Y CONDICIONES -->
        <div class="terms">
          <div class="terms-title">Condiciones del Presupuesto</div>
          <ul>
            <li><strong>Validez:</strong> Este presupuesto tiene una validez de ${budget.expiresAt ? "30 d\xEDas desde su emisi\xF3n" : "un mes desde la fecha de emisi\xF3n"}.</li>
            <li><strong>Forma de Pago:</strong> Domiciliaci\xF3n bancaria mensual. Los servicios se facturar\xE1n mensualmente por anticipado.</li>
            <li><strong>Servicios Incluidos:</strong> Los servicios detallados en este presupuesto incluyen la gesti\xF3n, tramitaci\xF3n y asesoramiento necesarios.</li>
            <li><strong>Precios:</strong> Todos los precios incluyen IVA. Los precios podr\xE1n ser revisados anualmente seg\xFAn IPC.</li>
            <li><strong>Documentaci\xF3n:</strong> El cliente se compromete a facilitar toda la documentaci\xF3n necesaria en tiempo y forma.</li>
            <li><strong>Inicio de Servicios:</strong> Los servicios comenzar\xE1n una vez firmado el presente presupuesto y recibida la documentaci\xF3n inicial.</li>
          </ul>
        </div>

        <!-- ACEPTACI\xD3N -->
        <div class="acceptance-box">
          <div class="acceptance-title">ACEPTACI\xD3N DEL PRESUPUESTO</div>
          <p style="margin:0 0 8px 0;font-size:9px">
            Para aceptar este presupuesto, por favor firme y devuelva este documento, o bien confirme su aceptaci\xF3n 
            mediante correo electr\xF3nico a info@asesorialallave.com
          </p>
          <div style="margin-top:15px;display:flex;justify-content:space-between">
            <div style="width:45%">
              <div class="signature-line">Firma del Cliente</div>
            </div>
            <div style="width:45%">
              <div class="signature-line">Fecha de Aceptaci\xF3n</div>
            </div>
          </div>
        </div>

        <!-- PIE DE P\xC1GINA -->
        <div class="footer">
          <strong>${escapeHtml(companyName)}</strong> | ${escapeHtml(companyAddress)} | Tel: ${escapeHtml(companyPhone)}<br>
          Email: ${escapeHtml(companyEmail)} | ${escapeHtml(companyWeb)}<br>
          <span style="font-size:8px">Documento generado electr\xF3nicamente - ${formatDate2(/* @__PURE__ */ new Date())}</span>
        </div>
      </div>
    </body>
  </html>
  `;
}
function escapeHtml(input) {
  return String(input || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

// server/utils/budgets.ts
import crypto2 from "crypto";
var SECRET = process.env.BUDGETS_SECRET || process.env.JWT_SECRET || "change-me-budget-secret";
function generateAcceptanceHash(code, createdAt) {
  const hmac = crypto2.createHmac("sha256", SECRET);
  hmac.update(code + "|" + createdAt.toISOString());
  return hmac.digest("hex");
}
function verifyAcceptanceHash(code, createdAt, hash) {
  const expected = generateAcceptanceHash(code, createdAt);
  return crypto2.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

// server/budgets.ts
import nodemailer2 from "nodemailer";
import path2 from "path";
import fs2 from "fs";
import jwt2 from "jsonwebtoken";
import ExcelJS from "exceljs";

// server/services/budgets/calculatePyme.ts
import { PrismaClient as PrismaClient5 } from "@prisma/client";
var prisma5 = new PrismaClient5();
var parametersCache = null;
var cacheTimestamp = 0;
var CACHE_DURATION = 5 * 60 * 1e3;
async function getParameters() {
  const now = Date.now();
  if (parametersCache && now - cacheTimestamp < CACHE_DURATION) {
    return parametersCache;
  }
  const params = await prisma5.budget_parameters.findMany({
    where: {
      budgetType: "PYME",
      isActive: true
    }
  });
  const paramsMap = /* @__PURE__ */ new Map();
  params.forEach((param) => {
    const key = param.paramKey;
    if (!paramsMap.has(key)) {
      paramsMap.set(key, []);
    }
    paramsMap.get(key).push(param);
  });
  parametersCache = paramsMap;
  cacheTimestamp = now;
  return paramsMap;
}
function getPrecioBaseContabilidad(nivel) {
  const PRECIOS_BASE2 = {
    0: 120,
    1: 150,
    2: 175,
    3: 215,
    4: 250,
    5: 280,
    6: 325,
    7: 425,
    8: 525
  };
  return PRECIOS_BASE2[nivel] || 250;
}
function getPrecioNomina(cantidad, params) {
  const tramos = params.get("TRAMO_NOMINAS") || [];
  for (const tramo of tramos) {
    if (tramo.minRange !== null && tramo.maxRange !== null) {
      if (cantidad >= tramo.minRange && cantidad <= tramo.maxRange) {
        return Number(tramo.paramValue);
      }
    }
  }
  const defaultTramo = tramos.find((t) => t.minRange === 61);
  return defaultTramo ? Number(defaultTramo.paramValue) : 10;
}
function getMultiplicadorFacturacion(facturacion) {
  const MULTIPLICADORES = [
    { max: 1e5, multiplicador: 1.05 },
    { max: 2e5, multiplicador: 1.08 },
    { max: 3e5, multiplicador: 1.1 },
    { max: 4e5, multiplicador: 1.13 },
    { max: 5e5, multiplicador: 1.16 },
    { max: 6e5, multiplicador: 1.2 },
    { max: Infinity, multiplicador: 1.25 }
  ];
  const tramo = MULTIPLICADORES.find((t) => facturacion <= t.max);
  return tramo ? tramo.multiplicador : 1.25;
}
async function calculatePyme(input) {
  const items = [];
  let position = 1;
  const params = await getParameters();
  const baseContaParam = params.get("BASE_CONTABILIDAD")?.[0];
  const precioBase = baseContaParam ? Number(baseContaParam.paramValue) : getPrecioBaseContabilidad(input.asientosMes);
  items.push({
    concept: `Contabilidad base mensual`,
    category: "BASE_CONTABILIDAD",
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21
  });
  let totalContabilidad = precioBase;
  const extras = [
    { key: "IMPUESTO_111", label: "Modelo 111 (Retenciones IRPF)", enabled: input.irpfAlquileres },
    { key: "IMPUESTO_115", label: "Modelo 115 (Retenciones alquileres)", enabled: input.irpfAlquileres },
    { key: "IMPUESTO_303", label: "Modelo 303 (IVA Trimestral)", enabled: input.ivaIntracomunitario }
  ];
  extras.forEach((extra) => {
    if (extra.enabled) {
      const extraParam = params.get(extra.key)?.[0];
      const precio = extraParam ? Number(extraParam.paramValue) : 25;
      items.push({
        concept: extra.label,
        category: extra.key,
        position: position++,
        quantity: 1,
        unitPrice: precio,
        vatPct: 21,
        subtotal: precio,
        total: precio * 1.21
      });
      totalContabilidad += precio;
    }
  });
  if (input.notificaciones) {
    items.push({
      concept: "Notificaciones",
      category: "EXTRA_NOTIFICACIONES",
      position: position++,
      quantity: 1,
      unitPrice: 5,
      vatPct: 21,
      subtotal: 5,
      total: 5 * 1.21
    });
    totalContabilidad += 5;
  }
  if (input.estadisticasINE) {
    items.push({
      concept: "Estad\xEDsticas INE",
      category: "EXTRA_INE",
      position: position++,
      quantity: 1,
      unitPrice: 5,
      vatPct: 21,
      subtotal: 5,
      total: 5 * 1.21
    });
    totalContabilidad += 5;
  }
  const multiplicador = getMultiplicadorFacturacion(input.facturacion);
  if (multiplicador > 1) {
    const incremento = totalContabilidad * (multiplicador - 1);
    items.push({
      concept: `Recargo por facturaci\xF3n (${input.facturacion.toLocaleString()}\u20AC) - ${((multiplicador - 1) * 100).toFixed(0)}%`,
      category: "RECARGO_FACTURACION",
      position: position++,
      quantity: 1,
      unitPrice: incremento,
      vatPct: 21,
      subtotal: incremento,
      total: incremento * 1.21
    });
    totalContabilidad += incremento;
  }
  let totalLaboral = 0;
  if (input.nominasMes > 0) {
    const precioNomina = getPrecioNomina(input.nominasMes, params);
    const totalNominas = input.nominasMes * precioNomina;
    items.push({
      concept: `N\xF3minas (${input.nominasMes} x ${precioNomina}\u20AC)`,
      category: "NOMINAS",
      position: position++,
      quantity: input.nominasMes,
      unitPrice: precioNomina,
      vatPct: 21,
      subtotal: totalNominas,
      total: totalNominas * 1.21
    });
    totalLaboral = totalNominas;
  }
  let totalBase = totalContabilidad + totalLaboral;
  if (input.periodo === "MENSUAL") {
    const mensualidad = Math.max(totalBase * 0.2, 10);
    items.push({
      concept: "Recargo por liquidaciones mensuales",
      category: "RECARGO_MENSUALIDAD",
      position: position++,
      quantity: 1,
      unitPrice: mensualidad,
      vatPct: 21,
      subtotal: mensualidad,
      total: mensualidad * 1.21
    });
    totalBase += mensualidad;
    totalContabilidad += mensualidad;
  }
  if (input.emprendedor) {
    const descuento = totalBase * 0.2;
    items.push({
      concept: "Descuento Emprendedor (-20%)",
      category: "DESCUENTO_EMPRENDEDOR",
      position: position++,
      quantity: 1,
      unitPrice: -descuento,
      vatPct: 21,
      subtotal: -descuento,
      total: -descuento * 1.21
    });
    totalBase -= descuento;
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearParametersCache() {
  parametersCache = null;
  cacheTimestamp = 0;
}

// server/services/budgets/calculateAutonomo.ts
import { PrismaClient as PrismaClient6 } from "@prisma/client";
var prisma6 = new PrismaClient6();
var parametersCache2 = null;
var cacheTimestamp2 = 0;
var CACHE_DURATION2 = 5 * 60 * 1e3;
async function getParameters2() {
  const now = Date.now();
  if (parametersCache2 && now - cacheTimestamp2 < CACHE_DURATION2) {
    return parametersCache2;
  }
  const params = await prisma6.budget_parameters.findMany({
    where: {
      budgetType: "AUTONOMO",
      isActive: true
    }
  });
  const paramsMap = /* @__PURE__ */ new Map();
  params.forEach((param) => {
    const key = param.paramKey;
    if (!paramsMap.has(key)) {
      paramsMap.set(key, []);
    }
    paramsMap.get(key).push(param);
  });
  parametersCache2 = paramsMap;
  cacheTimestamp2 = now;
  return paramsMap;
}
var PRECIOS_BASE_FACTURAS = {
  25: 45,
  50: 55,
  100: 80,
  150: 100,
  200: 125
};
var MULTIPLICADORES_FACTURACION = [
  { max: 5e4, multiplicador: 1 },
  { max: 1e5, multiplicador: 1.1 },
  { max: 15e4, multiplicador: 1.15 },
  { max: 2e5, multiplicador: 1.2 },
  { max: 25e4, multiplicador: 1.25 },
  { max: 3e5, multiplicador: 1.3 },
  { max: Infinity, multiplicador: 1.4 }
];
function getPrecioBaseFacturas(facturasMes, params) {
  const facturasParams = params.get("FACTURAS_MES") || [];
  for (const param of facturasParams) {
    if (param.minRange !== null && param.maxRange !== null) {
      if (facturasMes >= param.minRange && facturasMes <= param.maxRange) {
        return Number(param.paramValue);
      }
    }
  }
  if (facturasMes <= 25) return PRECIOS_BASE_FACTURAS[25];
  if (facturasMes <= 50) return PRECIOS_BASE_FACTURAS[50];
  if (facturasMes <= 100) return PRECIOS_BASE_FACTURAS[100];
  if (facturasMes <= 150) return PRECIOS_BASE_FACTURAS[150];
  return PRECIOS_BASE_FACTURAS[200];
}
function getPrecioNomina2(cantidad, params) {
  const tramos = params.get("TRAMO_NOMINAS") || [];
  for (const tramo of tramos) {
    if (tramo.minRange !== null && tramo.maxRange !== null) {
      if (cantidad >= tramo.minRange && cantidad <= tramo.maxRange) {
        return Number(tramo.paramValue);
      }
    }
  }
  return 10;
}
function getMultiplicadorFacturacion2(facturacion) {
  const tramo = MULTIPLICADORES_FACTURACION.find((t) => facturacion <= t.max);
  return tramo ? tramo.multiplicador : 1.4;
}
async function calculateAutonomo(input) {
  const items = [];
  let position = 1;
  const params = await getParameters2();
  const precioBase = getPrecioBaseFacturas(input.facturasMes, params);
  items.push({
    concept: `Contabilidad - Hasta ${input.facturasMes} facturas/mes (${precioBase}\u20AC/mes)`,
    category: "BASE_CONTABILIDAD",
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21
  });
  let totalContabilidad = precioBase;
  const extrasConfig = [
    { key: "IMPUESTO_111", label: "Modelo 111 (Retenciones IRPF)", enabled: input.irpfAlquileres, default: 10 },
    { key: "IMPUESTO_115", label: "Modelo 115 (Retenciones alquileres)", enabled: input.irpfAlquileres, default: 10 },
    { key: "IMPUESTO_303", label: "Modelo 303 (IVA Intracomunitario)", enabled: input.ivaIntracomunitario, default: 10 }
  ];
  extrasConfig.forEach((extra) => {
    if (extra.enabled) {
      const extraParam = params.get(extra.key)?.[0];
      const precio = extraParam ? Number(extraParam.paramValue) : extra.default;
      items.push({
        concept: extra.label,
        category: extra.key,
        position: position++,
        quantity: 1,
        unitPrice: precio,
        vatPct: 21,
        subtotal: precio,
        total: precio * 1.21
      });
      totalContabilidad += precio;
    }
  });
  if (input.notificaciones) {
    items.push({
      concept: "Notificaciones",
      category: "EXTRA_NOTIFICACIONES",
      position: position++,
      quantity: 1,
      unitPrice: 5,
      vatPct: 21,
      subtotal: 5,
      total: 5 * 1.21
    });
    totalContabilidad += 5;
  }
  if (input.estadisticasINE) {
    items.push({
      concept: "Estad\xEDsticas INE",
      category: "EXTRA_INE",
      position: position++,
      quantity: 1,
      unitPrice: 5,
      vatPct: 21,
      subtotal: 5,
      total: 5 * 1.21
    });
    totalContabilidad += 5;
  }
  const multiplicador = getMultiplicadorFacturacion2(input.facturacion);
  if (multiplicador > 1) {
    const incremento = totalContabilidad * (multiplicador - 1);
    items.push({
      concept: `Recargo por facturaci\xF3n (${input.facturacion.toLocaleString()}\u20AC) - ${((multiplicador - 1) * 100).toFixed(0)}%`,
      category: "RECARGO_FACTURACION",
      position: position++,
      quantity: 1,
      unitPrice: incremento,
      vatPct: 21,
      subtotal: incremento,
      total: incremento * 1.21
    });
    totalContabilidad += incremento;
  }
  let totalLaboral = 0;
  if (input.nominasMes > 0) {
    const precioNomina = getPrecioNomina2(input.nominasMes, params);
    const totalNominas = input.nominasMes * precioNomina;
    items.push({
      concept: `N\xF3minas (${input.nominasMes} x ${precioNomina}\u20AC)`,
      category: "NOMINAS",
      position: position++,
      quantity: input.nominasMes,
      unitPrice: precioNomina,
      vatPct: 21,
      subtotal: totalNominas,
      total: totalNominas * 1.21
    });
    totalLaboral = totalNominas;
  }
  let totalBase = totalContabilidad + totalLaboral;
  if (input.periodo === "MENSUAL") {
    const mensualidad = Math.max(totalBase * 0.2, 10);
    items.push({
      concept: "Recargo por liquidaciones mensuales",
      category: "RECARGO_MENSUALIDAD",
      position: position++,
      quantity: 1,
      unitPrice: mensualidad,
      vatPct: 21,
      subtotal: mensualidad,
      total: mensualidad * 1.21
    });
    totalBase += mensualidad;
    totalContabilidad += mensualidad;
  }
  if (input.sistemaTributacion === "ESN") {
    const recargo = totalBase * 0.1;
    items.push({
      concept: "Recargo por Estimaci\xF3n Simplificada Neta (+10%)",
      category: "RECARGO_ESN",
      position: position++,
      quantity: 1,
      unitPrice: recargo,
      vatPct: 21,
      subtotal: recargo,
      total: recargo * 1.21
    });
    totalBase += recargo;
  } else if (input.sistemaTributacion === "MODULOS") {
    const descuento = totalBase * 0.1;
    items.push({
      concept: "Descuento por M\xF3dulos (-10%)",
      category: "DESCUENTO_MODULOS",
      position: position++,
      quantity: 1,
      unitPrice: -descuento,
      vatPct: 21,
      subtotal: -descuento,
      total: -descuento * 1.21
    });
    totalBase -= descuento;
  }
  if (input.emprendedor) {
    const descuento = totalBase * 0.2;
    items.push({
      concept: "Descuento Emprendedor (-20%)",
      category: "DESCUENTO_EMPRENDEDOR",
      position: position++,
      quantity: 1,
      unitPrice: -descuento,
      vatPct: 21,
      subtotal: -descuento,
      total: -descuento * 1.21
    });
    totalBase -= descuento;
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearParametersCache2() {
  parametersCache2 = null;
  cacheTimestamp2 = 0;
}

// server/services/budgets/calculateRenta.ts
import { PrismaClient as PrismaClient7 } from "@prisma/client";
var prisma7 = new PrismaClient7();
var parametersCache3 = null;
var cacheTimestamp3 = 0;
var CACHE_DURATION3 = 5 * 60 * 1e3;
async function getParameters3() {
  const now = Date.now();
  if (parametersCache3 && now - cacheTimestamp3 < CACHE_DURATION3) {
    return parametersCache3;
  }
  const params = await prisma7.budget_parameters.findMany({
    where: {
      budgetType: "RENTA",
      isActive: true
    }
  });
  const paramsMap = /* @__PURE__ */ new Map();
  params.forEach((param) => {
    paramsMap.set(param.paramKey, param);
  });
  parametersCache3 = paramsMap;
  cacheTimestamp3 = now;
  return paramsMap;
}
var PRECIOS_BASE = {
  MATRIMONIO: 50,
  MATRIMONIO_HIJOS: 50,
  OTROS: 40
};
async function calculateRenta(input) {
  const items = [];
  let position = 1;
  const params = await getParameters3();
  let precioBase = 40;
  let conceptoBase = "Declaraci\xF3n Individual/Otros";
  if (input.unidadFamiliar === "MATRIMONIO") {
    const param = params.get("UNIDAD_FAMILIAR_MATRIMONIO");
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.MATRIMONIO;
    conceptoBase = "Declaraci\xF3n Matrimonio";
  } else if (input.unidadFamiliar === "MATRIMONIO_HIJOS") {
    const param = params.get("UNIDAD_FAMILIAR_MATRIMONIO_HIJOS");
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.MATRIMONIO_HIJOS;
    conceptoBase = "Declaraci\xF3n Matrimonio con hijos";
  } else {
    const param = params.get("UNIDAD_FAMILIAR_OTROS");
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.OTROS;
  }
  items.push({
    concept: conceptoBase,
    category: "BASE_RENTA",
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21
  });
  if (input.autonomo) {
    const param = params.get("EXTRA_AUTONOMO");
    const precio = param ? Number(param.paramValue) : 20;
    items.push({
      concept: "Actividad Econ\xF3mica (Aut\xF3nomo)",
      category: "EXTRA_AUTONOMO",
      position: position++,
      quantity: 1,
      unitPrice: precio,
      vatPct: 21,
      subtotal: precio,
      total: precio * 1.21
    });
  }
  if (input.inmueblesAlquilados > 0) {
    const total2 = input.inmueblesAlquilados * 15;
    items.push({
      concept: `Inmuebles alquilados (${input.inmueblesAlquilados} x 15\u20AC)`,
      category: "EXTRA_INMUEBLES_ALQ",
      position: position++,
      quantity: input.inmueblesAlquilados,
      unitPrice: 15,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  if (input.ventaInmuebles > 0) {
    const total2 = input.ventaInmuebles * 20;
    items.push({
      concept: `Venta de inmuebles (${input.ventaInmuebles} x 20\u20AC)`,
      category: "EXTRA_VENTA_INMUEBLES",
      position: position++,
      quantity: input.ventaInmuebles,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  if (input.ventaFinancieros > 0) {
    const total2 = input.ventaFinancieros * 20;
    items.push({
      concept: `Venta de productos financieros/acciones (${input.ventaFinancieros} x 20\u20AC)`,
      category: "EXTRA_VENTA_FINANCIEROS",
      position: position++,
      quantity: input.ventaFinancieros,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  if (input.otrasGanancias > 0) {
    const total2 = input.otrasGanancias * 20;
    items.push({
      concept: `Otras ganancias patrimoniales (${input.otrasGanancias} x 20\u20AC)`,
      category: "EXTRA_OTRAS_GANANCIAS",
      position: position++,
      quantity: input.otrasGanancias,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearParametersCache3() {
  parametersCache3 = null;
  cacheTimestamp3 = 0;
}

// server/services/budgets/calculateHerencias.ts
import { PrismaClient as PrismaClient8 } from "@prisma/client";
var prisma8 = new PrismaClient8();
var parametersCache4 = null;
var cacheTimestamp4 = 0;
var CACHE_DURATION4 = 5 * 60 * 1e3;
async function getParameters4() {
  const now = Date.now();
  if (parametersCache4 && now - cacheTimestamp4 < CACHE_DURATION4) {
    return parametersCache4;
  }
  const params = await prisma8.budget_parameters.findMany({
    where: {
      budgetType: "HERENCIAS",
      isActive: true
    }
  });
  const paramsMap = /* @__PURE__ */ new Map();
  params.forEach((param) => {
    paramsMap.set(param.paramKey, param);
  });
  parametersCache4 = paramsMap;
  cacheTimestamp4 = now;
  return paramsMap;
}
var PRECIOS_UNITARIOS = {
  HEREDERO: 25,
  FINCA_COMUNIDAD: 25,
  FINCA_OTRAS: 40,
  PRODUCTO_FINANCIERO: 20,
  VEHICULO: 30,
  PLUSVALIA_POR_FINCA: 50,
  REGISTRO_POR_FINCA: 50
};
var PORCENTAJE_CAUDAL = 1e-3;
var RECARGOS_PCT = {
  SIN_TESTAMENTO: 0.3,
  // +30%
  SIN_ACUERDO: 0.6,
  // +60%
  ESCRITURAR: 0.3
  // +30%
};
var DESCUENTO_COMERCIAL = 0.15;
async function calculateHerencias(input) {
  if (input.caudalHereditario < 2e4) {
    throw new Error("El caudal hereditario m\xEDnimo es de 20.000\u20AC");
  }
  const tieneActivos = input.fincasComunidad > 0 || input.fincasOtras > 0 || input.productosFinancieros > 0 || input.vehiculos > 0;
  if (!tieneActivos) {
    throw new Error("Debe haber al menos un inmueble, producto financiero o veh\xEDculo");
  }
  const items = [];
  let position = 1;
  const params = await getParameters4();
  if (input.herederos > 0) {
    const param = params.get("INMUEBLE_HEREDERO");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.HEREDERO;
    const subtotal2 = input.herederos * precio;
    items.push({
      concept: `Herederos (${input.herederos} x ${precio}\u20AC)`,
      category: "BASE_HEREDEROS",
      position: position++,
      quantity: input.herederos,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  const fincasComunidad = input.fincasComunidad || 0;
  if (fincasComunidad > 0) {
    const param = params.get("INMUEBLE_COMUNIDAD");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.FINCA_COMUNIDAD;
    const subtotal2 = fincasComunidad * precio;
    items.push({
      concept: `Fincas Comunidad Aut\xF3noma (${fincasComunidad} x ${precio}\u20AC)`,
      category: "BASE_FINCAS_COMUNIDAD",
      position: position++,
      quantity: fincasComunidad,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  const fincasOtras = input.fincasOtras || 0;
  if (fincasOtras > 0) {
    const param = params.get("INMUEBLE_OTRAS_CCAA");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.FINCA_OTRAS;
    const subtotal2 = fincasOtras * precio;
    items.push({
      concept: `Fincas otras CCAA (${fincasOtras} x ${precio}\u20AC)`,
      category: "BASE_FINCAS_OTRAS",
      position: position++,
      quantity: fincasOtras,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  if (input.productosFinancieros > 0) {
    const param = params.get("PRODUCTO_FINANCIERO");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.PRODUCTO_FINANCIERO;
    const subtotal2 = input.productosFinancieros * precio;
    items.push({
      concept: `Productos financieros (${input.productosFinancieros} x ${precio}\u20AC)`,
      category: "BASE_PRODUCTOS",
      position: position++,
      quantity: input.productosFinancieros,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  if (input.vehiculos > 0) {
    const param = params.get("VEHICULO");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.VEHICULO;
    const subtotal2 = input.vehiculos * precio;
    items.push({
      concept: `Veh\xEDculos (${input.vehiculos} x ${precio}\u20AC)`,
      category: "BASE_VEHICULOS",
      position: position++,
      quantity: input.vehiculos,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  const totalFincas = fincasComunidad + fincasOtras;
  if (totalFincas > 0) {
    const subtotal2 = totalFincas * PRECIOS_UNITARIOS.PLUSVALIA_POR_FINCA;
    items.push({
      concept: `Plusval\xEDas (${totalFincas} fincas x ${PRECIOS_UNITARIOS.PLUSVALIA_POR_FINCA}\u20AC)`,
      category: "SERVICIO_PLUSVALIAS",
      position: position++,
      quantity: totalFincas,
      unitPrice: PRECIOS_UNITARIOS.PLUSVALIA_POR_FINCA,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  if (totalFincas > 0) {
    const subtotal2 = totalFincas * PRECIOS_UNITARIOS.REGISTRO_POR_FINCA;
    items.push({
      concept: `Registros (${totalFincas} fincas x ${PRECIOS_UNITARIOS.REGISTRO_POR_FINCA}\u20AC)`,
      category: "SERVICIO_REGISTROS",
      position: position++,
      quantity: totalFincas,
      unitPrice: PRECIOS_UNITARIOS.REGISTRO_POR_FINCA,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  let subtotalBase = items.reduce((sum, item) => sum + item.subtotal, 0);
  const recargoCaudal = input.caudalHereditario * PORCENTAJE_CAUDAL;
  items.push({
    concept: `Recargo caudal hereditario (${input.caudalHereditario.toLocaleString("es-ES")}\u20AC x 0.1%)`,
    category: "RECARGO_CAUDAL",
    position: position++,
    quantity: 1,
    unitPrice: recargoCaudal,
    vatPct: 21,
    subtotal: recargoCaudal,
    total: recargoCaudal * 1.21
  });
  if (input.sinTestamento) {
    const recargo = subtotalBase * RECARGOS_PCT.SIN_TESTAMENTO;
    items.push({
      concept: "Recargo sin testamento (+30%)",
      category: "RECARGO_SIN_TESTAMENTO",
      position: position++,
      quantity: 1,
      unitPrice: recargo,
      vatPct: 21,
      subtotal: recargo,
      total: recargo * 1.21
    });
  }
  if (input.sinAcuerdo) {
    const recargo = subtotalBase * RECARGOS_PCT.SIN_ACUERDO;
    items.push({
      concept: "Recargo sin acuerdo entre herederos (+60%)",
      category: "RECARGO_SIN_ACUERDO",
      position: position++,
      quantity: 1,
      unitPrice: recargo,
      vatPct: 21,
      subtotal: recargo,
      total: recargo * 1.21
    });
  }
  if (input.escriturar) {
    const recargo = subtotalBase * RECARGOS_PCT.ESCRITURAR;
    items.push({
      concept: "Recargo por escrituraci\xF3n de herencia (+30%)",
      category: "RECARGO_ESCRITURAR",
      position: position++,
      quantity: 1,
      unitPrice: recargo,
      vatPct: 21,
      subtotal: recargo,
      total: recargo * 1.21
    });
  }
  if (input.aplicarDescuento15) {
    const subtotalConRecargos = items.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento = subtotalConRecargos * DESCUENTO_COMERCIAL;
    items.push({
      concept: "Descuento comercial (15%)",
      category: "DESCUENTO_COMERCIAL",
      position: position++,
      quantity: 1,
      unitPrice: -descuento,
      vatPct: 21,
      subtotal: -descuento,
      total: -descuento * 1.21
    });
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearParametersCache4() {
  parametersCache4 = null;
  cacheTimestamp4 = 0;
}

// server/budgets.ts
var prisma9 = new PrismaClient9();
var router3 = express3.Router();
function ensureRole(req, res, next) {
  const roleName = req.user?.roleName;
  if (roleName === "Administrador" || roleName === "Gestor") return next();
  return res.status(403).json({ error: "No autorizado" });
}
router3.get("/", authenticateToken, ensureRole, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 50);
    const skip = (page - 1) * size;
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.q) {
      const q = String(req.query.q);
      where.OR = [
        { code: { contains: q } },
        { clientName: { contains: q } },
        { clientEmail: { contains: q } }
      ];
    }
    const p = prisma9;
    const [items, total] = await Promise.all([
      p.budgets.findMany({ where, orderBy: { date: "desc" }, take: size, skip }),
      p.budgets.count({ where })
    ]);
    res.json({ items, total, page, size });
  } catch (err) {
    console.error("GET /api/budgets", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/:id", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("\u{1F50D} GET /api/budgets/:id - ID solicitado:", id);
    const p = prisma9;
    const budget = await p.budgets.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } },
        emails: { orderBy: { createdAt: "desc" } }
      }
    });
    console.log("\u{1F4CA} Resultado de la consulta:", budget ? `Encontrado: ${budget.code}` : "No encontrado");
    if (!budget) return res.status(404).json({ error: "Not found" });
    res.json(budget);
  } catch (err) {
    console.error("\u274C Error en GET /api/budgets/:id", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token || req.headers.authorization?.replace("Bearer ", "") || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    let user;
    try {
      user = jwt2.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (err) {
      return res.status(401).json({ error: "Token inv\xE1lido" });
    }
    const p = prisma9;
    const fullUser = await p.users.findUnique({
      where: { id: user.id },
      include: { roles: true }
    });
    if (!fullUser) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }
    if (fullUser.roles?.name !== "Administrador" && fullUser.roles?.name !== "Gestor") {
      return res.status(403).json({ error: "No autorizado" });
    }
    const budget = await p.budgets.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } }
      }
    });
    if (!budget) return res.status(404).json({ error: "Not found" });
    const pdfResult = await createBudgetPdf(budget);
    const filepath = path2.join(process.cwd(), "uploads", "budgets", pdfResult.filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${budget.code || "presupuesto"}.pdf"`);
    const fileStream = fs2.createReadStream(filepath);
    fileStream.pipe(res);
    fileStream.on("error", (err) => {
      console.error("Error streaming PDF:", err);
      res.status(500).json({ error: "Error al generar PDF" });
    });
  } catch (err) {
    console.error("GET /api/budgets/:id/pdf", err);
    res.status(500).json({ error: err.message });
  }
});
router3.post("/", authenticateToken, ensureRole, async (req, res) => {
  try {
    const data = req.body;
    let calculatedItems;
    let calculatedSubtotal;
    let calculatedVatTotal;
    let calculatedTotal;
    if (data.type && data.inputs) {
      let calcResult;
      switch (data.type) {
        case "PYME":
          calcResult = await calculatePyme(data.inputs);
          break;
        case "AUTONOMO":
          calcResult = await calculateAutonomo(data.inputs);
          break;
        case "RENTA":
          calcResult = await calculateRenta(data.inputs);
          break;
        case "HERENCIAS":
          calcResult = await calculateHerencias(data.inputs);
          break;
        default:
          return res.status(400).json({ error: `Tipo de presupuesto no v\xE1lido: ${data.type}` });
      }
      calculatedItems = calcResult.items.map((item) => ({
        catalogKey: null,
        description: item.concept,
        category: item.category,
        quantity: item.quantity,
        unit: "ud",
        unitPrice: item.unitPrice,
        vatPct: item.vatPct,
        subtotal: item.subtotal
      }));
      calculatedSubtotal = calcResult.subtotal;
      calculatedVatTotal = calcResult.vatTotal;
      calculatedTotal = calcResult.total;
    }
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const series = data.series || "AL";
    const p = prisma9;
    const last = await p.budgets.findFirst({ where: { year, series }, orderBy: { number: "desc" } });
    const number = last ? last.number + 1 : 1;
    const code = `${series}-${year}-${String(number).padStart(4, "0")}`;
    const date = data.date ? new Date(data.date) : now;
    const validDays = data.validDays ?? 30;
    const expiresAt = new Date(date);
    expiresAt.setDate(expiresAt.getDate() + Number(validDays));
    const acceptanceHash = generateAcceptanceHash(code, date);
    const created = await p.budgets.create({ data: {
      series,
      number,
      year,
      code,
      date,
      validDays: Number(validDays),
      expiresAt,
      acceptanceHash,
      // Hash de aceptación generado
      type: data.type || "PYME",
      // Nuevo campo
      companyBrand: data.companyBrand || "LA_LLAVE",
      // Empresa emisora
      clientName: data.clientName || "",
      clientNif: data.clientNif || null,
      clientEmail: data.clientEmail || null,
      clientPhone: data.clientPhone || null,
      clientAddress: data.clientAddress || null,
      notes: data.notes || null,
      subtotal: calculatedSubtotal ?? data.subtotal ?? 0,
      vatTotal: calculatedVatTotal ?? data.vatTotal ?? 0,
      total: calculatedTotal ?? data.total ?? 0,
      templateSnapshot: data.templateSnapshot || {},
      // CRITICAL: Incluir timestamps explícitamente para MariaDB
      createdAt: now,
      updatedAt: now
    } });
    const itemsToCreate = calculatedItems || data.items || [];
    if (Array.isArray(itemsToCreate) && itemsToCreate.length > 0) {
      for (let i = 0; i < itemsToCreate.length; i++) {
        const item = itemsToCreate[i];
        const subtotal = Number(item.subtotal || 0);
        const vatPct = Number(item.vatPct || 0);
        const total = subtotal * (1 + vatPct / 100);
        await p.budget_items.create({
          data: {
            budgetId: created.id,
            concept: item.description || item.concept || "",
            category: item.category || null,
            position: item.position ?? i + 1,
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            vatPct,
            subtotal,
            total
          }
        });
      }
    }
    const budgetWithItems = await p.budgets.findUnique({
      where: { id: created.id },
      include: { items: { orderBy: { position: "asc" } } }
    });
    res.status(201).json(budgetWithItems);
  } catch (err) {
    console.error("POST /api/budgets", err);
    res.status(500).json({ error: err.message });
  }
});
router3.put("/:id", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const p = prisma9;
    const existing = await p.budgets.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!existing) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }
    const updateData = {};
    if (data.clientName !== void 0) updateData.clientName = data.clientName;
    if (data.clientNif !== void 0) updateData.clientNif = data.clientNif;
    if (data.clientEmail !== void 0) updateData.clientEmail = data.clientEmail;
    if (data.clientPhone !== void 0) updateData.clientPhone = data.clientPhone;
    if (data.clientAddress !== void 0) updateData.clientAddress = data.clientAddress;
    if (data.validityDays !== void 0) updateData.validityDays = data.validityDays;
    if (data.paymentTerms !== void 0) updateData.paymentTerms = data.paymentTerms;
    if (data.notes !== void 0) updateData.notes = data.notes;
    if (data.customTotal !== void 0 && data.customTotal !== null) {
      updateData.customTotal = Number(data.customTotal);
      updateData.manuallyEdited = true;
    }
    if (data.subtotal !== void 0) updateData.subtotal = Number(data.subtotal);
    if (data.vatTotal !== void 0) updateData.vatTotal = Number(data.vatTotal);
    if (data.total !== void 0) updateData.total = Number(data.total);
    const updated = await p.budgets.update({
      where: { id },
      data: updateData
    });
    if (data.items && Array.isArray(data.items)) {
      await p.budget_items.deleteMany({ where: { budgetId: id } });
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unitPrice || 0);
        const vatPct = Number(item.vatPct || 21);
        const subtotal = quantity * unitPrice;
        const total = subtotal * (1 + vatPct / 100);
        await p.budget_items.create({
          data: {
            budgetId: id,
            concept: item.concept || item.description || "",
            category: item.category || null,
            position: item.position ?? i + 1,
            quantity,
            unitPrice,
            vatPct,
            subtotal,
            total,
            isManuallyEdited: item.isManuallyEdited || false
          }
        });
      }
    }
    const budgetWithItems = await p.budgets.findUnique({
      where: { id },
      include: { items: { orderBy: { position: "asc" } } }
    });
    console.log(`\u2705 Presupuesto ${updated.code} actualizado por ${req.user?.username}`);
    res.json(budgetWithItems);
  } catch (err) {
    console.error("PUT /api/budgets/:id", err);
    res.status(500).json({ error: err.message });
  }
});
router3.post("/:id/send", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    const p = prisma9;
    const budget = await p.budgets.findUnique({ where: { id } });
    if (!budget) return res.status(404).json({ error: "Not found" });
    const hash = generateAcceptanceHash(budget.code, budget.date);
    await p.budgets.update({ where: { id }, data: { acceptanceHash: hash, status: "SENT" } });
    let pdfRecord = null;
    try {
      const pdfPath = await createBudgetPdf(budget);
      pdfRecord = await p.budget_pdfs.create({ data: { budgetId: id, filename: pdfPath.filename, url: pdfPath.url } });
    } catch (pdfErr) {
      console.warn("PDF generation failed", pdfErr);
    }
    let emailLog = null;
    try {
      if (budget.clientEmail) {
        const smtp = getSMTPConfig();
        const transporter2 = smtp ? nodemailer2.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } }) : null;
        const acceptUrl = `${process.env.FRONTEND_URL || "https://tu-dominio"}/public/budgets/${encodeURIComponent(budget.code)}/accept?t=${encodeURIComponent(hash)}`;
        const subject = `Presupuesto ${budget.code} de Asesor\xEDa La Llave`;
        const html = `
          <div>
            <p>Hola ${budget.clientName || ""},</p>
            <p>Adjuntamos su presupuesto <strong>${budget.code}</strong>. Puede aceptarlo en el siguiente enlace:</p>
            <p><a href="${acceptUrl}">Aceptar presupuesto</a></p>
          </div>
        `;
        let sent = false;
        let response = null;
        if (transporter2) {
          try {
            response = await transporter2.sendMail({ from: smtp.user, to: budget.clientEmail, subject, html, attachments: pdfRecord ? [{ filename: pdfRecord.filename, path: path2.join(process.cwd(), "uploads", "budgets", pdfRecord.filename) }] : void 0 });
            sent = true;
          } catch (mailErr) {
            console.warn("Failed sending budget email", mailErr);
          }
        }
        emailLog = await p.budget_email_logs.create({ data: { budgetId: id, status: sent ? "SENT" : "FAILED", toEmail: budget.clientEmail, subject, response: response ? response : null } });
      }
    } catch (mailErr) {
      console.warn("Error sending email for budget", id, mailErr);
    }
    res.json({ ok: true, acceptanceHash: hash, pdf: pdfRecord, emailLog });
  } catch (err) {
    console.error("POST /api/budgets/:id/send", err);
    res.status(500).json({ error: err.message });
  }
});
router3.post("/:id/remind", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    const p = prisma9;
    const budget = await p.budgets.findUnique({ where: { id } });
    if (!budget) return res.status(404).json({ error: "Not found" });
    if (!budget.clientEmail) return res.status(400).json({ error: "No client email" });
    if (budget.status !== "SENT" && budget.status !== "DRAFT") {
      return res.status(400).json({ error: "Can only remind SENT or DRAFT budgets" });
    }
    if (budget.expiresAt && new Date(budget.expiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(400).json({ error: "Budget already expired" });
    }
    const smtp = getSMTPConfig();
    const transporter2 = smtp ? nodemailer2.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } }) : null;
    const acceptUrl = `${process.env.FRONTEND_URL || "https://tu-dominio"}/public/budgets/${encodeURIComponent(budget.code)}/accept?t=${encodeURIComponent(budget.acceptanceHash || "")}`;
    const subject = `Recordatorio: Presupuesto ${budget.code}`;
    const html = `
      <div>
        <p>Hola ${budget.clientName || ""},</p>
        <p>Te recordamos que tu presupuesto <strong>${budget.code}</strong> est\xE1 pendiente de aceptaci\xF3n.</p>
        ${budget.expiresAt ? `<p>V\xE1lido hasta: ${new Date(budget.expiresAt).toLocaleDateString()}</p>` : ""}
        <p><a href="${acceptUrl}">Aceptar presupuesto</a></p>
      </div>
    `;
    let sent = false;
    let response = null;
    if (transporter2) {
      try {
        response = await transporter2.sendMail({ from: smtp.user, to: budget.clientEmail, subject, html });
        sent = true;
      } catch (mailErr) {
        console.warn("Failed sending reminder email", mailErr);
      }
    }
    const emailLog = await p.budget_email_logs.create({
      data: {
        budgetId: id,
        status: sent ? "SENT" : "FAILED",
        toEmail: budget.clientEmail,
        subject,
        response: response ? response : null
      }
    });
    res.json({ ok: true, sent, emailLog });
  } catch (err) {
    console.error("POST /api/budgets/:id/remind", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/export.csv", authenticateToken, ensureRole, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    const p = prisma9;
    const items = await p.budgets.findMany({ where, orderBy: { date: "desc" } });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="budgets.csv"`);
    res.write("code,date,clientName,clientEmail,series,status,subtotal,vatTotal,total,expiresAt,acceptedAt\n");
    for (const b of items) {
      res.write(`${b.code},${new Date(b.date).toISOString()},"${(b.clientName || "").replace(/"/g, '""')}",${b.clientEmail || ""},${b.series},${b.status},${b.subtotal},${b.vatTotal},${b.total},${b.expiresAt || ""},${b.acceptedAt || ""}
`);
    }
    res.end();
  } catch (err) {
    console.error("GET /api/budgets/export.csv", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/export.xlsx", authenticateToken, ensureRole, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    const p = prisma9;
    const items = await p.budgets.findMany({ where, orderBy: { date: "desc" } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Presupuestos");
    sheet.columns = [
      { header: "code", key: "code", width: 20 },
      { header: "date", key: "date", width: 20 },
      { header: "clientName", key: "clientName", width: 30 },
      { header: "clientEmail", key: "clientEmail", width: 30 },
      { header: "series", key: "series", width: 10 },
      { header: "status", key: "status", width: 12 },
      { header: "subtotal", key: "subtotal", width: 12 },
      { header: "vatTotal", key: "vatTotal", width: 12 },
      { header: "total", key: "total", width: 12 },
      { header: "expiresAt", key: "expiresAt", width: 20 },
      { header: "acceptedAt", key: "acceptedAt", width: 20 }
    ];
    items.forEach((b) => {
      sheet.addRow({
        code: b.code,
        date: new Date(b.date).toISOString(),
        clientName: b.clientName,
        clientEmail: b.clientEmail || "",
        series: b.series,
        status: b.status,
        subtotal: Number(b.subtotal || 0),
        vatTotal: Number(b.vatTotal || 0),
        total: Number(b.total || 0),
        expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : "",
        acceptedAt: b.acceptedAt ? new Date(b.acceptedAt).toISOString() : ""
      });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="budgets.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("GET /api/budgets/export.xlsx", err);
    res.status(500).json({ error: err.message });
  }
});
var budgets_default = router3;

// server/public-budgets.ts
import express4 from "express";
import { PrismaClient as PrismaClient10 } from "@prisma/client";
import nodemailer3 from "nodemailer";

// server/logger.ts
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID as randomUUID2 } from "crypto";
import path3 from "path";
import fs3 from "fs";
var logsDir = process.env.LOG_DIR || path3.join(process.cwd(), "logs");
if (!fs3.existsSync(logsDir)) {
  fs3.mkdirSync(logsDir, { recursive: true });
}
var today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
var logFile = path3.join(logsDir, `app-${today}.log`);
var logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname"
    }
  } : void 0,
  ...process.env.NODE_ENV !== "development" && {
    // En producción, escribir a archivo
    stream: pino.destination({
      dest: logFile,
      sync: false
    })
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  }
});
var httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.headers["x-request-id"];
    if (existingId && typeof existingId === "string") {
      return existingId;
    }
    return randomUUID2();
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    if (res.statusCode >= 300) return "info";
    return "info";
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "duration"
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers?.host,
        "user-agent": req.headers?.["user-agent"],
        "content-type": req.headers?.["content-type"]
      },
      remoteAddress: req.socket?.remoteAddress,
      remotePort: req.socket?.remotePort
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type": typeof res.getHeader === "function" ? res.getHeader("content-type") : void 0,
        "content-length": typeof res.getHeader === "function" ? res.getHeader("content-length") : void 0
      }
    }),
    err: pino.stdSerializers.err
  },
  autoLogging: {
    ignore: (req) => {
      return !!(req.url === "/health" || req.url === "/ready" || req.url?.startsWith("/assets/") || req.url?.startsWith("/favicon"));
    }
  }
});
var securityLogger = logger.child({ module: "security" });
var dbLogger = logger.child({ module: "database" });
var authLogger = logger.child({ module: "auth" });
var jobLogger = logger.child({ module: "jobs" });
var storageLogger = logger.child({ module: "storage" });
function logError(error, context) {
  logger.error(
    {
      err: error,
      stack: error.stack,
      ...context
    },
    error.message
  );
}
function rotateOldLogs(retentionDays = 30) {
  try {
    const files = fs3.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1e3;
    files.forEach((file) => {
      if (!file.startsWith("app-") || !file.endsWith(".log")) return;
      const filePath = path3.join(logsDir, file);
      const stats = fs3.statSync(filePath);
      const age = now - stats.mtimeMs;
      if (age > maxAge) {
        fs3.unlinkSync(filePath);
        logger.info(`Deleted old log file: ${file}`);
      }
    });
  } catch (error) {
    logger.error({ err: error }, "Error rotating logs");
  }
}
rotateOldLogs(30);
var logger_default = logger;

// server/public-budgets.ts
import path4 from "path";
import fs4 from "fs";
var prisma10 = new PrismaClient10();
var router4 = express4.Router();
router4.get("/:code/accept", async (req, res) => {
  try {
    const { code } = req.params;
    const { t } = req.query;
    const p = prisma10;
    const budget = await p.budgets.findUnique({
      where: { code },
      include: { items: { orderBy: { position: "asc" } } }
    });
    if (!budget) return res.status(404).json({ error: "Presupuesto no encontrado" });
    if (!t) return res.status(400).json({ error: "Token requerido" });
    const valid = verifyAcceptanceHash(budget.code, budget.date, String(t));
    if (!valid) return res.status(403).json({ error: "Token inv\xE1lido" });
    res.json(budget);
  } catch (err) {
    console.error("GET /public/budgets/:code/accept", err);
    res.status(500).json({ error: "Error interno" });
  }
});
router4.post("/:code/accept", async (req, res) => {
  try {
    const { code } = req.params;
    const { t } = req.query;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const agent = String(req.headers["user-agent"] || "");
    const p = prisma10;
    const budget = await p.budgets.findUnique({ where: { code } });
    if (!budget) return res.status(404).json({ error: "Presupuesto no encontrado" });
    if (!t) return res.status(400).json({ error: "Token requerido" });
    logger_default.info(`\u{1F510} Verificando hash para presupuesto ${code}`);
    const valid = verifyAcceptanceHash(budget.code, budget.date, String(t));
    if (!valid) {
      logger_default.warn(`\u274C Hash inv\xE1lido para presupuesto ${code}`);
      return res.status(403).json({ error: "Token inv\xE1lido" });
    }
    if (budget.expiresAt && new Date(budget.expiresAt) < /* @__PURE__ */ new Date()) {
      logger_default.warn(`\u23F0 Presupuesto ${code} expirado`);
      return res.status(410).json({ error: "Presupuesto expirado" });
    }
    if (budget.acceptedAt) {
      logger_default.warn(`\u26A0\uFE0F Presupuesto ${code} ya fue aceptado anteriormente`);
      return res.status(400).json({
        error: "Este presupuesto ya fue aceptado anteriormente",
        acceptedAt: budget.acceptedAt
      });
    }
    const updatedBudget = await p.budgets.update({
      where: { id: budget.id },
      data: {
        acceptedAt: /* @__PURE__ */ new Date(),
        acceptedByIp: String(ip),
        acceptedByAgent: agent,
        status: "ACCEPTED"
      }
    });
    logger_default.info(`\u2705 Presupuesto ${code} aceptado exitosamente`);
    try {
      const isGestoriaOnline = budget.companyBrand === "GESTORIA_ONLINE";
      const companyName = isGestoriaOnline ? "GESTOR\xCDA ONLINE" : "ASESOR\xCDA LA LLAVE";
      const companyEmail = isGestoriaOnline ? "info@gestoriaonline.com" : "info@asesorialallave.com";
      const companyPhone = isGestoriaOnline ? "91 XXX XX XX" : "91 238 99 60";
      const companyColor = isGestoriaOnline ? "#1a7f64" : "#2E5C8A";
      if (budget.clientEmail) {
        const smtp = getSMTPConfig();
        const transporter2 = smtp ? nodemailer3.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: { user: smtp.user, pass: smtp.pass }
        }) : null;
        if (transporter2) {
          try {
            await transporter2.sendMail({
              from: smtp.user,
              to: budget.clientEmail,
              subject: `\u2705 Presupuesto ${budget.code} Aceptado - ${companyName}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .header { background: ${companyColor}; color: white; padding: 30px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .content { background: #f9f9f9; padding: 30px 20px; }
                    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .success-box h2 { color: #155724; margin-top: 0; font-size: 20px; }
                    .info-table { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .info-row:last-child { border-bottom: none; }
                    .info-label { font-weight: bold; color: #666; }
                    .info-value { color: #333; }
                    .total { background: ${companyColor}; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
                    .total .amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
                    .contact-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>\u2705 Confirmaci\xF3n de Aceptaci\xF3n</h1>
                    </div>
                    
                    <div class="content">
                      <div class="success-box">
                        <h2>\xA1Su presupuesto ha sido aceptado correctamente!</h2>
                        <p>Estimado/a <strong>${budget.clientName}</strong>,</p>
                        <p>Hemos recibido la aceptaci\xF3n de su presupuesto. A continuaci\xF3n le confirmamos los detalles:</p>
                      </div>

                      <div class="info-table">
                        <div class="info-row">
                          <span class="info-label">Presupuesto:</span>
                          <span class="info-value">${budget.code}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Tipo:</span>
                          <span class="info-value">${budget.type}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Fecha de aceptaci\xF3n:</span>
                          <span class="info-value">${(/* @__PURE__ */ new Date()).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}</span>
                        </div>
                      </div>

                      <div class="total">
                        <div>TOTAL ACEPTADO</div>
                        <div class="amount">${Number(budget.total).toFixed(2)} \u20AC</div>
                      </div>

                      <p><strong>Pr\xF3ximos pasos:</strong></p>
                      <ul>
                        <li>Nuestro equipo se pondr\xE1 en contacto con usted en un plazo m\xE1ximo de 24-48 horas.</li>
                        <li>Coordinaremos los detalles para iniciar los servicios contratados.</li>
                        <li>Recibir\xE1 toda la documentaci\xF3n necesaria por email.</li>
                      </ul>

                      <div class="contact-info">
                        <h3>\xBFTiene alguna duda?</h3>
                        <p>No dude en contactarnos:</p>
                        <ul>
                          <li><strong>Email:</strong> ${companyEmail}</li>
                          <li><strong>Tel\xE9fono:</strong> ${companyPhone}</li>
                          <li><strong>Horario:</strong> Lunes a Viernes, 9:00 - 18:00</li>
                        </ul>
                      </div>

                      <p style="text-align: center; margin-top: 30px;">
                        <strong>Gracias por confiar en ${companyName}</strong>
                      </p>
                    </div>

                    <div class="footer">
                      <p>${companyName} - Todos los derechos reservados \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
                      <p style="margin-top: 10px; opacity: 0.8;">
                        Este es un email autom\xE1tico generado por nuestro sistema de gesti\xF3n de presupuestos.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
              `
            });
            logger_default.info(`\u{1F4E7} Email de confirmaci\xF3n enviado a ${budget.clientEmail}`);
          } catch (mailError) {
            logger_default.error({ error: mailError }, "Error al enviar email de confirmaci\xF3n");
          }
        }
        if (transporter2) {
          try {
            await transporter2.sendMail({
              from: smtp.user,
              to: companyEmail,
              subject: `\u{1F389} \xA1Nuevo presupuesto aceptado! ${budget.code}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                    .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid ${companyColor}; margin: 15px 0; }
                    .label { font-weight: bold; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2 style="margin: 0;">\u{1F389} \xA1Presupuesto Aceptado!</h2>
                    </div>
                    
                    <p>Se ha aceptado un nuevo presupuesto:</p>
                    
                    <div class="info-box">
                      <p><span class="label">C\xF3digo:</span> ${budget.code}</p>
                      <p><span class="label">Cliente:</span> ${budget.clientName}</p>
                      <p><span class="label">Email:</span> ${budget.clientEmail || "No especificado"}</p>
                      <p><span class="label">Tel\xE9fono:</span> ${budget.clientPhone || "No especificado"}</p>
                      <p><span class="label">Tipo:</span> ${budget.type}</p>
                      <p><span class="label">Total:</span> ${Number(budget.total).toFixed(2)} \u20AC</p>
                      <p><span class="label">Fecha de aceptaci\xF3n:</span> ${(/* @__PURE__ */ new Date()).toLocaleString("es-ES")}</p>
                      <p><span class="label">IP:</span> ${ip || "No disponible"}</p>
                      <p><span class="label">User-Agent:</span> ${agent.substring(0, 100)}...</p>
                    </div>

                    <p><strong>Acci\xF3n requerida:</strong> Contactar con el cliente en un plazo de 24-48 horas.</p>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">
                      Este es un email autom\xE1tico del sistema de gesti\xF3n de presupuestos.
                    </p>
                  </div>
                </body>
                </html>
              `
            });
            logger_default.info(`\u{1F4E7} Notificaci\xF3n interna enviada a ${companyEmail}`);
          } catch (internalMailError) {
            logger_default.error({ error: internalMailError }, "Error al enviar notificaci\xF3n interna");
          }
        }
      }
    } catch (emailError) {
      logger_default.error({ error: emailError }, "Error en proceso de emails");
    }
    res.json({ ok: true, message: "Presupuesto aceptado correctamente", budget: updatedBudget });
  } catch (err) {
    logger_default.error({ error: err }, "POST /public/budgets/:code/accept");
    res.status(500).json({ error: "Error interno" });
  }
});
router4.get("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const p = prisma10;
    const budget = await p.budgets.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } }
      }
    });
    if (!budget) return res.status(404).json({ error: "Presupuesto no encontrado" });
    const pdfResult = await createBudgetPdf(budget);
    const filepath = path4.join(process.cwd(), "uploads", "budgets", pdfResult.filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${budget.code || "presupuesto"}.pdf"`);
    const fileStream = fs4.createReadStream(filepath);
    fileStream.pipe(res);
    fileStream.on("error", (err) => {
      console.error("Error streaming PDF:", err);
      res.status(500).json({ error: "Error al generar PDF" });
    });
  } catch (err) {
    console.error("GET /public/budgets/:id/pdf", err);
    res.status(500).json({ error: "Error interno" });
  }
});
var public_budgets_default = router4;

// server/budget-parameters.ts
import { Router } from "express";
import { PrismaClient as PrismaClient11 } from "@prisma/client";
var router5 = Router();
var prisma11 = new PrismaClient11();
function ensureAdmin(req, res, next) {
  const roleName = req.user?.roleName;
  if (roleName === "Administrador") return next();
  return res.status(403).json({ error: "Solo administradores pueden editar par\xE1metros" });
}
router5.get("/", authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const where = { isActive: true };
    if (type) {
      where.budgetType = String(type).toUpperCase();
    }
    const parameters = await prisma11.budget_parameters.findMany({
      where,
      orderBy: [
        { budgetType: "asc" },
        { category: "asc" },
        { minRange: "asc" }
      ]
    });
    const grouped = parameters.reduce((acc, param) => {
      const type2 = param.budgetType;
      if (!acc[type2]) {
        acc[type2] = [];
      }
      acc[type2].push({
        id: param.id,
        category: param.category,
        subcategory: param.subcategory,
        key: param.paramKey,
        label: param.paramLabel,
        value: Number(param.paramValue),
        minRange: param.minRange,
        maxRange: param.maxRange,
        description: param.description
      });
      return acc;
    }, {});
    res.json(grouped);
  } catch (error) {
    console.error("Error al obtener par\xE1metros:", error);
    res.status(500).json({ error: error.message });
  }
});
router5.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const parameter = await prisma11.budget_parameters.findUnique({
      where: { id }
    });
    if (!parameter) {
      return res.status(404).json({ error: "Par\xE1metro no encontrado" });
    }
    res.json({
      id: parameter.id,
      budgetType: parameter.budgetType,
      category: parameter.category,
      subcategory: parameter.subcategory,
      key: parameter.paramKey,
      label: parameter.paramLabel,
      value: Number(parameter.paramValue),
      minRange: parameter.minRange,
      maxRange: parameter.maxRange,
      description: parameter.description,
      isActive: parameter.isActive
    });
  } catch (error) {
    console.error("Error al obtener par\xE1metro:", error);
    res.status(500).json({ error: error.message });
  }
});
router5.put("/:id", authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label, description } = req.body;
    if (value === void 0 || value === null) {
      return res.status(400).json({ error: "El valor es requerido" });
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return res.status(400).json({ error: "El valor debe ser un n\xFAmero" });
    }
    const updateData = { paramValue: numValue };
    if (label !== void 0) updateData.paramLabel = label;
    if (description !== void 0) updateData.description = description;
    const updated = await prisma11.budget_parameters.update({
      where: { id },
      data: updateData
    });
    console.log(`\u2705 Par\xE1metro actualizado: ${updated.paramKey} = ${numValue}\u20AC (por ${req.user?.username})`);
    switch (updated.budgetType) {
      case "PYME":
        clearParametersCache();
        break;
      case "AUTONOMO":
        clearParametersCache2();
        break;
      case "RENTA":
        clearParametersCache3();
        break;
      case "HERENCIAS":
        clearParametersCache4();
        break;
    }
    res.json({
      id: updated.id,
      budgetType: updated.budgetType,
      category: updated.category,
      key: updated.paramKey,
      label: updated.paramLabel,
      value: Number(updated.paramValue),
      minRange: updated.minRange,
      maxRange: updated.maxRange
    });
  } catch (error) {
    console.error("Error al actualizar par\xE1metro:", error);
    res.status(500).json({ error: error.message });
  }
});
router5.put("/bulk/update", authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de actualizaciones" });
    }
    const results = await Promise.all(
      updates.map(async (update) => {
        const { id, value } = update;
        if (!id || value === void 0) return null;
        return await prisma11.budget_parameters.update({
          where: { id },
          data: { paramValue: Number(value) }
        });
      })
    );
    const successful = results.filter((r) => r !== null).length;
    console.log(`\u2705 Actualizaci\xF3n masiva: ${successful}/${updates.length} par\xE1metros (por ${req.user?.username})`);
    clearParametersCache();
    clearParametersCache2();
    clearParametersCache3();
    clearParametersCache4();
    res.json({
      updated: successful,
      total: updates.length
    });
  } catch (error) {
    console.error("Error en actualizaci\xF3n masiva:", error);
    res.status(500).json({ error: error.message });
  }
});
router5.post("/reset/:type", authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const budgetType = String(type).toUpperCase();
    if (!["PYME", "AUTONOMO", "RENTA", "HERENCIAS"].includes(budgetType)) {
      return res.status(400).json({ error: "Tipo de presupuesto inv\xE1lido" });
    }
    console.log(`\u26A0\uFE0F  Solicitud de reset de par\xE1metros ${budgetType} (por ${req.user?.username})`);
    res.json({
      message: `Par\xE1metros de ${budgetType} listos para restaurar`,
      warning: "Funci\xF3n de reset pendiente de implementar"
    });
  } catch (error) {
    console.error("Error al resetear par\xE1metros:", error);
    res.status(500).json({ error: error.message });
  }
});
var budget_parameters_default = router5;

// server/budget-templates.ts
import express5 from "express";
import { PrismaClient as PrismaClient12 } from "@prisma/client";
var prisma12 = new PrismaClient12();
var router6 = express5.Router();
router6.use(authenticateToken);
router6.use(checkIsAdmin);
router6.get("/", async (req, res) => {
  try {
    const { type, companyBrand, isActive, isDefault } = req.query;
    const where = {};
    if (type) where.type = type;
    if (companyBrand) where.companyBrand = companyBrand;
    if (isActive !== void 0) where.isActive = isActive === "true";
    if (isDefault !== void 0) where.isDefault = isDefault === "true";
    const templates = await prisma12.budget_templates.findMany({
      where,
      orderBy: { updatedAt: "desc" }
    });
    res.json(templates);
    logger_default.info(`Plantillas listadas: ${templates.length} encontradas`);
  } catch (error) {
    logger_default.error({ error }, "Error al listar plantillas");
    res.status(500).json({
      message: "Error al listar las plantillas de presupuesto",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router6.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma12.budget_templates.findUnique({
      where: { id }
    });
    if (!template) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    res.json(template);
    logger_default.info(`Plantilla obtenida: ${template.name}`);
  } catch (error) {
    logger_default.error({ error }, "Error al obtener plantilla");
    res.status(500).json({
      message: "Error al obtener la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router6.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      companyBrand,
      htmlContent,
      availableVars,
      customCss,
      isDefault,
      isActive
    } = req.body;
    if (!name || !type || !htmlContent) {
      return res.status(400).json({
        message: "Faltan campos requeridos: name, type, htmlContent"
      });
    }
    if (isDefault) {
      await prisma12.budget_templates.updateMany({
        where: {
          type,
          companyBrand: companyBrand || "LA_LLAVE",
          isDefault: true
        },
        data: { isDefault: false }
      });
    }
    const template = await prisma12.budget_templates.create({
      data: {
        name,
        description,
        type,
        companyBrand: companyBrand || "LA_LLAVE",
        htmlContent,
        availableVars,
        customCss,
        isDefault: isDefault || false,
        isActive: isActive !== void 0 ? isActive : true,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      }
    });
    res.status(201).json(template);
    logger_default.info(`Plantilla creada: ${template.name} (${template.id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al crear plantilla");
    res.status(500).json({
      message: "Error al crear la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router6.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      companyBrand,
      htmlContent,
      availableVars,
      customCss,
      isDefault,
      isActive
    } = req.body;
    const existing = await prisma12.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    if (isDefault && !existing.isDefault) {
      await prisma12.budget_templates.updateMany({
        where: {
          type: type || existing.type,
          companyBrand: companyBrand || existing.companyBrand,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }
    const template = await prisma12.budget_templates.update({
      where: { id },
      data: {
        name,
        description,
        type,
        companyBrand,
        htmlContent,
        availableVars,
        customCss,
        isDefault,
        isActive,
        updatedBy: req.user?.id,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.json(template);
    logger_default.info(`Plantilla actualizada: ${template.name} (${template.id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al actualizar plantilla");
    res.status(500).json({
      message: "Error al actualizar la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router6.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma12.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    if (existing.isDefault) {
      return res.status(400).json({
        message: "No se puede eliminar una plantilla predeterminada. Primero marca otra como predeterminada."
      });
    }
    await prisma12.budget_templates.delete({ where: { id } });
    res.json({ message: "Plantilla eliminada exitosamente" });
    logger_default.info(`Plantilla eliminada: ${existing.name} (${id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al eliminar plantilla");
    res.status(500).json({
      message: "Error al eliminar la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router6.post("/:id/set-default", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma12.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    await prisma12.budget_templates.updateMany({
      where: {
        type: existing.type,
        companyBrand: existing.companyBrand,
        isDefault: true,
        id: { not: id }
      },
      data: { isDefault: false }
    });
    const template = await prisma12.budget_templates.update({
      where: { id },
      data: {
        isDefault: true,
        updatedBy: req.user?.id,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.json(template);
    logger_default.info(`Plantilla marcada como predeterminada: ${template.name} (${template.id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al marcar plantilla como predeterminada");
    res.status(500).json({
      message: "Error al marcar la plantilla como predeterminada",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
var budget_templates_default = router6;

// server/services/version-service.ts
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
async function getCurrentVersion() {
  try {
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(packageJson);
    return pkg.version || "1.0.0";
  } catch (error) {
    console.error("Error al leer package.json:", error);
    return "1.0.0";
  }
}
async function getLatestGitHubVersion(owner, repo) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Asesoria-La-Llave-App"
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.log("No se encontraron releases en GitHub");
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const release = await response.json();
    if (release.draft || release.prerelease) {
      return null;
    }
    return release;
  } catch (error) {
    console.error("Error al consultar GitHub:", error);
    return null;
  }
}
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, "").split(".").map(Number);
  const parts2 = v2.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
async function checkForUpdates(owner, repo) {
  const currentVersion = await getCurrentVersion();
  const latestRelease = await getLatestGitHubVersion(owner, repo);
  if (!latestRelease) {
    return {
      current: currentVersion,
      latest: null,
      updateAvailable: false
    };
  }
  const latestVersion = latestRelease.tag_name.replace(/^v/, "");
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
  return {
    current: currentVersion,
    latest: latestVersion,
    updateAvailable,
    releaseNotes: latestRelease.body,
    publishedAt: latestRelease.published_at
  };
}
async function performHealthCheck() {
  const checks = [];
  let allPassed = true;
  try {
    await getCurrentVersion();
    checks.push({
      name: "Package.json",
      status: "pass",
      message: "Archivo legible y versi\xF3n disponible"
    });
  } catch (error) {
    allPassed = false;
    checks.push({
      name: "Package.json",
      status: "fail",
      message: `Error: ${error.message}`
    });
  }
  try {
    const serverUrl = process.env.NODE_ENV === "production" ? "http://localhost:5000" : "http://localhost:5000";
    const response = await fetch(`${serverUrl}/api/health`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    }).catch(() => null);
    if (response && response.ok) {
      checks.push({
        name: "API Health",
        status: "pass",
        message: "Servidor responde correctamente"
      });
    } else {
      checks.push({
        name: "API Health",
        status: "fail",
        message: "Servidor no responde o endpoint de health no disponible"
      });
    }
  } catch (error) {
    checks.push({
      name: "API Health",
      status: "fail",
      message: `Error al verificar servidor: ${error.message}`
    });
  }
  try {
    const { PrismaClient: PrismaClient21 } = await import("@prisma/client");
    const prisma21 = new PrismaClient21();
    await prisma21.$queryRaw`SELECT 1 as healthcheck`;
    await prisma21.$disconnect();
    checks.push({
      name: "Database",
      status: "pass",
      message: "Conexi\xF3n a base de datos exitosa"
    });
  } catch (error) {
    allPassed = false;
    checks.push({
      name: "Database",
      status: "fail",
      message: `Error de conexi\xF3n: ${error.message}`
    });
  }
  return {
    success: allPassed,
    checks,
    timestamp: /* @__PURE__ */ new Date()
  };
}

// server/services/backup-service.ts
init_websocket();
import { PrismaClient as PrismaClient13 } from "@prisma/client";
import archiver from "archiver";
import { createWriteStream, promises as fs5 } from "fs";
import { join as join2, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var prisma13 = new PrismaClient13();
function replacePatternVariables(pattern, version) {
  const now = /* @__PURE__ */ new Date();
  function getISOWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
    return weekNo;
  }
  const weekNumber = getISOWeekNumber(now);
  function getWeekOfMonth(date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const startDay = startOfMonth.getDay();
    const daysToMonday = startDay === 0 ? 1 : startDay === 1 ? 0 : 8 - startDay;
    const firstMonday = 1 + daysToMonday;
    const dayOfMonth = date.getDate();
    if (dayOfMonth < firstMonday) {
      return 0;
    }
    return Math.floor((dayOfMonth - firstMonday) / 7) + 1;
  }
  const weekNumberInMonth = getWeekOfMonth(now);
  const dayNames = ["Domingo", "Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes", "S\xE1bado"];
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const variables = {
    // Variables originales
    "{fecha}": now.toISOString().split("T")[0].replace(/-/g, ""),
    "{hora}": now.toTimeString().split(" ")[0].replace(/:/g, ""),
    "{version}": version,
    "{timestamp}": Date.now().toString(),
    // Nuevas variables de año
    "{YEAR_4}": now.getFullYear().toString(),
    "{YEAR_2}": now.getFullYear().toString().slice(-2),
    // Variables de mes
    "{MONTH_NUMBER}": String(now.getMonth() + 1).padStart(2, "0"),
    "{MONTH_NAME}": monthNames[now.getMonth()],
    // Variables de día
    "{MONTH_DAY_NUMBER}": String(now.getDate()).padStart(2, "0"),
    "{WEEK_DAY_NUMBER}": now.getDay().toString(),
    "{WEEK_DAY_NAME}": dayNames[now.getDay()],
    // Variables de tiempo
    "{HOURS}": String(now.getHours()).padStart(2, "0"),
    "{MINUTES}": String(now.getMinutes()).padStart(2, "0"),
    "{SECONDS}": String(now.getSeconds()).padStart(2, "0"),
    // Variables de semana
    "{WEEK_NUMBER}": String(weekNumber).padStart(2, "0"),
    "{WEEK_NUMBER_IN_THE_MONTH}": weekNumberInMonth.toString()
  };
  let result = pattern;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replaceAll(key, value);
  });
  return result;
}
async function createDatabaseBackup(fileName) {
  const backupDir = join2(__dirname2, "../../backups/db");
  await fs5.mkdir(backupDir, { recursive: true });
  const filePath = join2(backupDir, fileName);
  const dbUrl2 = process.env.DATABASE_URL;
  if (!dbUrl2) {
    throw new Error("DATABASE_URL no est\xE1 definida");
  }
  try {
    const match = dbUrl2.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      throw new Error("Formato de DATABASE_URL no v\xE1lido");
    }
    const [, user, password, host, port, database] = match;
    const command = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} > ${filePath}`;
    try {
      await execAsync(command);
      console.log("\u2705 Backup de BD creado con mysqldump");
    } catch (error) {
      console.log("\u26A0\uFE0F mysqldump no disponible, usando m\xE9todo alternativo");
      await createDatabaseBackupFallback(filePath);
    }
    const stats = await fs5.stat(filePath);
    return { path: filePath, size: BigInt(stats.size) };
  } catch (error) {
    console.error("Error creando backup de BD:", error);
    throw error;
  }
}
async function createDatabaseBackupFallback(filePath) {
  let sqlContent = `-- Backup creado el ${(/* @__PURE__ */ new Date()).toISOString()}
`;
  sqlContent += `-- Generado con Prisma (fallback sin mysqldump)

`;
  try {
    const tables = [
      { tableName: "users", model: prisma13.users },
      { tableName: "roles", model: prisma13.roles },
      { tableName: "permissions", model: prisma13.permissions },
      { tableName: "role_permissions", model: prisma13.role_permissions },
      { tableName: "clients", model: prisma13.clients },
      { tableName: "client_employees", model: prisma13.clientEmployee },
      { tableName: "tax_models", model: prisma13.taxModel },
      { tableName: "tax_periods", model: prisma13.tax_periods },
      { tableName: "client_tax", model: prisma13.clientTax },
      { tableName: "tax_files", model: prisma13.taxFile },
      { tableName: "tasks", model: prisma13.tasks },
      { tableName: "manuals", model: prisma13.manuals },
      { tableName: "manual_attachments", model: prisma13.manualAttachment },
      { tableName: "manual_versions", model: prisma13.manualVersion },
      { tableName: "activity_logs", model: prisma13.activityLog },
      { tableName: "audit_trail", model: prisma13.auditTrail },
      { tableName: "smtp_config", model: prisma13.smtpConfig },
      { tableName: "client_tax_requirements", model: prisma13.clientTaxRequirement },
      { tableName: "fiscal_periods", model: prisma13.fiscal_periods },
      { tableName: "client_tax_filings", model: prisma13.client_tax_filings },
      { tableName: "job_runs", model: prisma13.jobRun },
      { tableName: "system_settings", model: prisma13.systemSettings },
      { tableName: "smtp_accounts", model: prisma13.sMTPAccount },
      { tableName: "notification_templates", model: prisma13.notificationTemplate },
      { tableName: "notification_logs", model: prisma13.notificationLog },
      { tableName: "scheduled_notifications", model: prisma13.scheduledNotification },
      { tableName: "system_config", model: prisma13.system_config },
      { tableName: "system_backups", model: prisma13.system_backups },
      { tableName: "storage_configs", model: prisma13.storageConfig }
    ];
    for (const table of tables) {
      const records = await table.model.findMany();
      if (records.length > 0) {
        sqlContent += `-- Tabla ${table.tableName}
`;
        for (const record of records) {
          const columns = Object.keys(record);
          const values = columns.map((col) => {
            const val = record[col];
            if (val === null) return "NULL";
            if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === "boolean") return val ? "1" : "0";
            if (typeof val === "bigint") return val.toString();
            if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });
          sqlContent += `INSERT INTO ${table.tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});
`;
        }
        sqlContent += "\n";
      }
    }
    await fs5.writeFile(filePath, sqlContent, "utf-8");
    console.log("\u2705 Backup de BD creado con Prisma (m\xE9todo alternativo funcional)");
  } catch (error) {
    console.error("Error en backup alternativo:", error);
    throw error;
  }
}
async function createFilesBackup(fileName) {
  const backupDir = join2(__dirname2, "../../backups/files");
  await fs5.mkdir(backupDir, { recursive: true });
  const filePath = join2(backupDir, fileName);
  return new Promise((resolve, reject) => {
    const output = createWriteStream(filePath);
    const archive = archiver("zip", {
      zlib: { level: 9 }
      // Máxima compresión
    });
    output.on("close", async () => {
      const stats = await fs5.stat(filePath);
      resolve({ path: filePath, size: BigInt(stats.size) });
    });
    archive.on("error", (err) => {
      reject(err);
    });
    archive.pipe(output);
    const rootDir = join2(__dirname2, "../..");
    archive.glob("**/*", {
      cwd: rootDir,
      ignore: [
        "node_modules/**",
        ".git/**",
        "backups/**",
        "dist/**",
        ".env.local",
        "*.log"
      ]
    });
    try {
      archive.file(join2(rootDir, ".env"), { name: ".env" });
    } catch (error) {
      console.warn("No se pudo agregar .env al backup");
    }
    try {
      archive.directory(join2(rootDir, "uploads"), "uploads");
    } catch (error) {
      console.warn("No se pudo agregar carpeta uploads al backup");
    }
    archive.finalize();
  });
}
async function createSystemBackup(userId) {
  let backupId = null;
  try {
    emitSystemLog({ type: "backup", level: "info", message: "Iniciando creaci\xF3n de backup del sistema..." });
    const packageJsonPath = join2(__dirname2, "../../package.json");
    const packageJson = await fs5.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(packageJson);
    const version = pkg.version || "1.0.0";
    const dbPatternConfig = await prisma13.system_config.findUnique({
      where: { key: "backup_db_pattern" }
    });
    const filesPatternConfig = await prisma13.system_config.findUnique({
      where: { key: "backup_files_pattern" }
    });
    const dbPattern = dbPatternConfig?.value || "backup_db_{fecha}_{hora}.sql";
    const filesPattern = filesPatternConfig?.value || "backup_files_{fecha}_{hora}.zip";
    const dbFileName = replacePatternVariables(dbPattern, version);
    const filesFileName = replacePatternVariables(filesPattern, version);
    const backup = await prisma13.system_backups.create({
      data: {
        version,
        dbFile: dbFileName,
        filesFile: filesFileName,
        status: "CREATING",
        createdBy: userId
      }
    });
    backupId = backup.id;
    emitSystemLog({
      type: "backup",
      level: "info",
      message: "Backup registrado en base de datos",
      details: `ID: ${backup.id}, Versi\xF3n: ${version}`
    });
    emitSystemLog({ type: "backup", level: "info", message: "Creando backup de base de datos...", details: dbFileName });
    const dbBackup = await createDatabaseBackup(dbFileName);
    emitSystemLog({ type: "backup", level: "success", message: "Backup de base de datos completado" });
    emitSystemLog({ type: "backup", level: "info", message: "Creando backup de archivos...", details: filesFileName });
    const filesBackup = await createFilesBackup(filesFileName);
    emitSystemLog({ type: "backup", level: "success", message: "Backup de archivos completado" });
    await prisma13.system_backups.update({
      where: { id: backup.id },
      data: {
        status: "COMPLETED",
        dbSize: dbBackup.size,
        filesSize: filesBackup.size,
        completedAt: /* @__PURE__ */ new Date()
      }
    });
    emitSystemLog({ type: "backup", level: "success", message: "Backup completado exitosamente" });
    return {
      id: backup.id,
      dbFile: dbFileName,
      filesFile: filesFileName,
      dbSize: dbBackup.size,
      filesSize: filesBackup.size,
      version
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    emitSystemLog({ type: "backup", level: "error", message: "Error al crear backup", details: errorMessage });
    if (backupId) {
      await prisma13.system_backups.update({
        where: { id: backupId },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: /* @__PURE__ */ new Date()
        }
      });
    }
    throw error;
  }
}
async function listBackups() {
  return await prisma13.system_backups.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });
}
async function restoreFromBackup(backupId, userId) {
  let backup;
  try {
    emitSystemLog({ type: "restore", level: "info", message: "Iniciando restauraci\xF3n desde backup..." });
    backup = await prisma13.system_backups.findUnique({
      where: { id: backupId }
    });
    if (!backup) {
      throw new Error("Backup no encontrado");
    }
    if (backup.status !== "COMPLETED") {
      throw new Error("Solo se pueden restaurar backups completados");
    }
    emitSystemLog({
      type: "restore",
      level: "info",
      message: `Restaurando desde backup creado el ${new Date(backup.createdAt).toLocaleString("es-ES")}`,
      details: `Versi\xF3n: ${backup.version}`
    });
    await prisma13.system_backups.update({
      where: { id: backupId },
      data: { status: "RESTORING" }
    });
    const dbPath = join2(__dirname2, "../../backups/db", backup.dbFile);
    const filesPath = join2(__dirname2, "../../backups/files", backup.filesFile);
    await fs5.access(dbPath);
    await fs5.access(filesPath);
    emitSystemLog({ type: "restore", level: "info", message: "Descomprimiendo archivos del backup..." });
    await extractBackupFiles(filesPath);
    emitSystemLog({ type: "restore", level: "success", message: "Archivos descomprimidos correctamente" });
    emitSystemLog({ type: "restore", level: "info", message: "Restaurando base de datos..." });
    await restoreDatabase(dbPath);
    emitSystemLog({ type: "restore", level: "success", message: "Base de datos restaurada correctamente" });
    await prisma13.system_backups.update({
      where: { id: backupId },
      data: {
        status: "RESTORED",
        completedAt: /* @__PURE__ */ new Date()
      }
    });
    emitSystemLog({ type: "restore", level: "success", message: "Restauraci\xF3n completada exitosamente" });
    emitSystemLog({ type: "restore", level: "warning", message: "IMPORTANTE: Reinicie el servidor para aplicar los cambios" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    emitSystemLog({ type: "restore", level: "error", message: "Error al restaurar backup", details: errorMessage });
    if (backup) {
      await prisma13.system_backups.update({
        where: { id: backupId },
        data: {
          status: "FAILED",
          errorMessage
        }
      });
    }
    throw error;
  }
}
async function extractBackupFiles(zipPath) {
  const rootDir = join2(__dirname2, "../..");
  try {
    await execAsync(`unzip -o "${zipPath}" -d "${rootDir}"`);
    console.log("\u2705 Archivos extra\xEDdos con unzip");
  } catch (error) {
    console.log("\u26A0\uFE0F unzip no disponible, usando m\xE9todo alternativo");
    console.log("\u26A0\uFE0F Extracci\xF3n de archivos requiere unzip en el sistema");
  }
}
async function restoreDatabase(sqlPath) {
  const dbUrl2 = process.env.DATABASE_URL;
  if (!dbUrl2) {
    throw new Error("DATABASE_URL no est\xE1 definida");
  }
  const match = dbUrl2.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error("Formato de DATABASE_URL no v\xE1lido");
  }
  const [, user, password, host, port, database] = match;
  try {
    const command = `mysql -h ${host} -P ${port} -u ${user} -p${password} ${database} < ${sqlPath}`;
    await execAsync(command);
    console.log("\u2705 Base de datos restaurada con mysql");
  } catch (error) {
    console.error("\u26A0\uFE0F mysql no disponible para restaurar BD");
    console.log("\u26A0\uFE0F La restauraci\xF3n de BD requiere mysql client en el sistema");
    throw new Error("No se pudo restaurar la base de datos: mysql no disponible");
  }
}

// server/services/update-service.ts
import { PrismaClient as PrismaClient14 } from "@prisma/client";
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
init_websocket();
var execAsync2 = promisify2(exec2);
var prisma14 = new PrismaClient14();
async function performSystemUpdate(userId, onProgress) {
  const logs = [];
  let updateRecord = null;
  let backupId = null;
  const log2 = (step, message, level = "info") => {
    const progress = { step, message, timestamp: /* @__PURE__ */ new Date() };
    logs.push(progress);
    console.log(`[${step}] ${message}`);
    emitSystemLog({
      type: "update",
      level,
      message,
      details: step
    });
    if (onProgress) {
      onProgress(progress);
    }
  };
  try {
    const currentVersion = await getCurrentVersion();
    log2("VERSION_CHECK", `Versi\xF3n actual: ${currentVersion}`);
    const repoUrlConfig = await prisma14.system_config.findUnique({
      where: { key: "github_repo_url" }
    });
    if (!repoUrlConfig?.value) {
      throw new Error("URL del repositorio de GitHub no configurada");
    }
    const repoUrl = repoUrlConfig.value;
    let owner = null;
    let repo = null;
    if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(repoUrl)) {
      [owner, repo] = repoUrl.split("/");
    } else {
      try {
        const candidate = repoUrl.startsWith("http://") || repoUrl.startsWith("https://") ? repoUrl : `https://${repoUrl}`;
        const parsed = new URL(candidate);
        const hostname = parsed.hostname.toLowerCase();
        if (!(hostname === "github.com" || hostname.endsWith(".github.com"))) {
          throw new Error("URL de GitHub no v\xE1lida");
        }
        if (parsed.username || parsed.password) {
          throw new Error("URL de GitHub no v\xE1lida");
        }
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length < 2) throw new Error("URL de GitHub no v\xE1lida");
        owner = parts[0];
        repo = parts[1].replace(/\.git$/, "");
      } catch (e) {
        throw new Error("URL de GitHub no v\xE1lida");
      }
    }
    if (!owner || !repo) {
      throw new Error("URL de GitHub no v\xE1lida");
    }
    log2("UPDATE_CHECK", "Verificando actualizaciones disponibles...");
    const versionInfo = await checkForUpdates(owner, repo.replace(".git", ""));
    if (!versionInfo.updateAvailable) {
      log2("NO_UPDATE", "No hay actualizaciones disponibles");
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: currentVersion,
        logs
      };
    }
    log2("UPDATE_AVAILABLE", `Nueva versi\xF3n disponible: ${versionInfo.latest}`);
    updateRecord = await prisma14.systemUpdate.create({
      data: {
        fromVersion: currentVersion,
        toVersion: versionInfo.latest || "unknown",
        status: "CHECKING",
        initiatedBy: userId,
        logs: JSON.stringify(logs)
      }
    });
    log2("BACKUP_START", "Creando backup de seguridad antes de actualizar...");
    await prisma14.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: "BACKING_UP", logs: JSON.stringify(logs) }
    });
    const backup = await createSystemBackup(userId);
    backupId = backup.id;
    await prisma14.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { backupId: backup.id }
    });
    log2("BACKUP_COMPLETE", `Backup creado exitosamente: ${backup.id}`, "success");
    await prisma14.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: "DOWNLOADING", logs: JSON.stringify(logs) }
    });
    log2("GIT_PULL", "Descargando cambios desde GitHub...");
    const branchConfig = await prisma14.system_config.findUnique({
      where: { key: "github_branch" }
    });
    const branch = branchConfig?.value || "main";
    try {
      const { stdout: pullOutput } = await execAsync2(`git pull origin ${branch}`);
      log2("GIT_PULL_SUCCESS", `C\xF3digo descargado exitosamente desde rama '${branch}'`, "success");
      const newVersion = await getCurrentVersion();
      if (newVersion !== currentVersion) {
        log2("VERSION_CHANGED", `\u2728 Versi\xF3n actualizada: ${currentVersion} \u2192 ${newVersion}`, "success");
      }
    } catch (error) {
      log2("GIT_PULL_ERROR", `Error en git pull: ${error.message}`, "error");
      throw new Error(`Error al descargar cambios: ${error.message}`);
    }
    await prisma14.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: "INSTALLING", logs: JSON.stringify(logs) }
    });
    log2("NPM_INSTALL", "Instalando dependencias...");
    try {
      const { stdout: installOutput } = await execAsync2("npm install");
      log2("NPM_INSTALL_SUCCESS", "Dependencias instaladas correctamente", "success");
    } catch (error) {
      log2("NPM_INSTALL_ERROR", `Error en npm install: ${error.message}`, "error");
      throw new Error(`Error al instalar dependencias: ${error.message}`);
    }
    log2("DB_MIGRATE", "Aplicando migraciones de base de datos...");
    try {
      await execAsync2("npx prisma db push");
      log2("DB_MIGRATE_SUCCESS", "Migraciones aplicadas correctamente", "success");
    } catch (error) {
      log2("DB_MIGRATE_WARNING", `Advertencia en migraciones: ${error.message}`, "warning");
    }
    log2("BUILD", "Compilando aplicaci\xF3n para producci\xF3n...");
    try {
      await execAsync2("npm run build");
      log2("BUILD_SUCCESS", "Aplicaci\xF3n compilada exitosamente", "success");
    } catch (error) {
      log2("BUILD_ERROR", `Error en compilaci\xF3n: ${error.message}`, "error");
      throw new Error(`Error al compilar aplicaci\xF3n: ${error.message}`);
    }
    log2("HEALTH_CHECK", "Verificando estado del sistema...", "info");
    try {
      const healthResult = await performHealthCheck();
      if (healthResult.success) {
        log2("HEALTH_CHECK_SUCCESS", "Todas las verificaciones pasaron correctamente", "success");
      } else {
        const failedChecks = healthResult.checks.filter((c) => c.status === "fail").map((c) => c.name).join(", ");
        log2("HEALTH_CHECK_WARNING", `Algunas verificaciones fallaron: ${failedChecks}`, "warning");
      }
      for (const check of healthResult.checks) {
        const level = check.status === "pass" ? "success" : "warning";
        log2(`HEALTH_${check.name.toUpperCase()}`, `${check.name}: ${check.message}`, level);
      }
    } catch (error) {
      log2("HEALTH_CHECK_ERROR", `Error en health check: ${error.message}`, "warning");
    }
    await prisma14.systemUpdate.update({
      where: { id: updateRecord.id },
      data: {
        status: "COMPLETED",
        completedAt: /* @__PURE__ */ new Date(),
        logs: JSON.stringify(logs)
      }
    });
    log2("UPDATE_COMPLETE", `\u2705 Actualizaci\xF3n completada: ${currentVersion} \u2192 ${versionInfo.latest}`, "success");
    log2("RESTART_REQUIRED", "\u26A0\uFE0F  Reinicie el servidor para aplicar los cambios", "warning");
    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: versionInfo.latest || "unknown",
      backupId: backupId || void 0,
      logs
    };
  } catch (error) {
    log2("ERROR", `Error durante la actualizaci\xF3n: ${error.message}`, "error");
    if (backupId) {
      log2("ROLLBACK_START", "Iniciando rollback autom\xE1tico...");
      try {
        await restoreFromBackup(backupId, userId);
        log2("ROLLBACK_SUCCESS", "Rollback completado exitosamente", "success");
        if (updateRecord) {
          await prisma14.systemUpdate.update({
            where: { id: updateRecord.id },
            data: {
              status: "ROLLED_BACK",
              errorMessage: error.message,
              completedAt: /* @__PURE__ */ new Date(),
              logs: JSON.stringify(logs)
            }
          });
        }
      } catch (rollbackError) {
        log2("ROLLBACK_ERROR", `Error en rollback: ${rollbackError.message}`, "error");
        if (updateRecord) {
          await prisma14.systemUpdate.update({
            where: { id: updateRecord.id },
            data: {
              status: "FAILED",
              errorMessage: `Update failed: ${error.message}. Rollback also failed: ${rollbackError.message}`,
              completedAt: /* @__PURE__ */ new Date(),
              logs: JSON.stringify(logs)
            }
          });
        }
      }
    } else {
      if (updateRecord) {
        await prisma14.systemUpdate.update({
          where: { id: updateRecord.id },
          data: {
            status: "FAILED",
            errorMessage: error.message,
            completedAt: /* @__PURE__ */ new Date(),
            logs: JSON.stringify(logs)
          }
        });
      }
    }
    return {
      success: false,
      fromVersion: await getCurrentVersion(),
      toVersion: "unknown",
      backupId: backupId || void 0,
      logs,
      error: error.message
    };
  }
}
async function verifyGitSetup() {
  try {
    await execAsync2("git --version");
    try {
      const { stdout } = await execAsync2("git remote -v");
      if (stdout.includes("origin")) {
        return {
          installed: true,
          configured: true,
          message: "Git est\xE1 instalado y configurado correctamente"
        };
      } else {
        return {
          installed: true,
          configured: false,
          message: "Git est\xE1 instalado pero no hay un repositorio remoto configurado"
        };
      }
    } catch {
      return {
        installed: true,
        configured: false,
        message: "Git est\xE1 instalado pero este no es un repositorio Git"
      };
    }
  } catch {
    return {
      installed: false,
      configured: false,
      message: "Git no est\xE1 instalado en el sistema"
    };
  }
}
async function getUpdateHistory(limit = 10) {
  return await prisma14.systemUpdate.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      initiator: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });
}

// server/routes.ts
init_storage_factory();

// server/middleware/storage-upload.ts
init_storage_factory();
import fs7 from "fs/promises";
import path9 from "path";
async function uploadToStorage(req, res, next) {
  try {
    if (!req.file && !req.files) {
      return next();
    }
    const provider = await StorageFactory.getActiveProvider();
    if (req.file) {
      await processFile(req.file, provider);
    }
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        await processFile(file, provider);
      }
    }
    if (req.files && !Array.isArray(req.files)) {
      for (const fieldname in req.files) {
        const files = req.files[fieldname];
        for (const file of files) {
          await processFile(file, provider);
        }
      }
    }
    next();
  } catch (error) {
    console.error("Error al subir archivo al storage:", error);
    next(error);
  }
}
async function processFile(file, provider) {
  const uploadsDir2 = path9.join(process.cwd(), "uploads");
  const relativePath = path9.relative(uploadsDir2, file.path);
  const isLocal = provider.constructor.name === "LocalStorageProvider";
  if (isLocal) {
    file.path = relativePath;
    file.destination = path9.dirname(relativePath);
    return;
  }
  const tempFilePath = file.path;
  const readStream = (await import("fs")).createReadStream(tempFilePath);
  try {
    await provider.upload(readStream, relativePath);
    file.path = relativePath;
    file.destination = path9.dirname(relativePath);
    await fs7.unlink(tempFilePath);
  } catch (error) {
    readStream.destroy();
    throw error;
  }
}

// server/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";
var loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 5,
  // Máximo 5 intentos por IP en 15 minutos
  message: {
    error: "Demasiados intentos de inicio de sesi\xF3n. Por favor, int\xE9ntalo de nuevo en 15 minutos."
  },
  standardHeaders: true,
  // Retorna info en headers `RateLimit-*`
  legacyHeaders: false,
  // Desactiva headers `X-RateLimit-*`
  skipSuccessfulRequests: false,
  // Contar todos los intentos (exitosos y fallidos)
  skipFailedRequests: false,
  // Logging de bloqueos
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en login desde IP: ${req.ip}`);
    res.status(429).json({
      error: "Demasiados intentos de inicio de sesi\xF3n. Por favor, int\xE9ntalo de nuevo en 15 minutos.",
      retryAfter: Math.ceil(15 * 60)
      // segundos
    });
  }
});
var registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 3,
  // Máximo 3 registros por IP por hora
  message: {
    error: "Demasiados intentos de registro. Por favor, int\xE9ntalo de nuevo m\xE1s tarde."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en registro desde IP: ${req.ip}`);
    res.status(429).json({
      error: "Demasiados intentos de registro. Por favor, int\xE9ntalo de nuevo en 1 hora.",
      retryAfter: Math.ceil(60 * 60)
    });
  }
});
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 100,
  // Máximo 100 requests por IP en 15 minutos
  message: {
    error: "Demasiadas solicitudes. Por favor, int\xE9ntalo de nuevo m\xE1s tarde."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en API desde IP: ${req.ip} - Endpoint: ${req.path}`);
    res.status(429).json({
      error: "Demasiadas solicitudes. Por favor, int\xE9ntalo de nuevo m\xE1s tarde.",
      retryAfter: Math.ceil(15 * 60)
    });
  }
});
var strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 10,
  // Máximo 10 operaciones por hora
  message: {
    error: "L\xEDmite de operaciones excedido. Contacte al administrador si necesita realizar m\xE1s acciones."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit ESTRICTO excedido desde IP: ${req.ip} - Endpoint: ${req.path}`);
    res.status(429).json({
      error: "L\xEDmite de operaciones excedido. Por favor, int\xE9ntalo de nuevo en 1 hora.",
      retryAfter: Math.ceil(60 * 60)
    });
  }
});

// server/epic-tasks-routes.ts
import { PrismaClient as PrismaClient16 } from "@prisma/client";
import multer from "multer";
import path10 from "path";
import fs8 from "fs";
import { randomUUID as randomUUID3 } from "crypto";
var prisma16 = new PrismaClient16();
var tasksUploadsDir = path10.join(process.cwd(), "uploads", "tasks", "attachments");
if (!fs8.existsSync(tasksUploadsDir)) {
  fs8.mkdirSync(tasksUploadsDir, { recursive: true });
}
var taskAttachmentsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tasksUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var uploadTaskAttachment = multer({
  storage: taskAttachmentsStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB max
});
function registerEpicTasksRoutes(app2) {
  app2.get("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const comments = await prisma16.task_comments.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });
      res.json(comments);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener comentarios");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { contenido } = req.body;
      if (!contenido || contenido.trim() === "") {
        return res.status(400).json({ error: "El contenido del comentario es requerido" });
      }
      const task = await prisma16.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const comment = await prisma16.task_comments.create({
        data: {
          id: randomUUID3(),
          tasks: { connect: { id: taskId } },
          users: { connect: { id: req.user.id } },
          contenido,
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });
      await prisma16.task_activities.create({
        data: {
          id: randomUUID3(),
          taskId,
          userId: req.user.id,
          accion: "commented",
          descripcion: `${req.user.username} a\xF1adi\xF3 un comentario`,
          metadata: JSON.stringify({ commentId: comment.id })
        }
      });
      res.json(comment);
    } catch (error) {
      logger.error({ err: error }, "Error al crear comentario");
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tasks/:taskId/comments/:commentId", authenticateToken, async (req, res) => {
    try {
      const { taskId, commentId } = req.params;
      const { contenido } = req.body;
      const comment = await prisma16.task_comments.findUnique({
        where: { id: commentId }
      });
      if (!comment) {
        return res.status(404).json({ error: "Comentario no encontrado" });
      }
      if (comment.userId !== req.user.id) {
        return res.status(403).json({ error: "No tienes permiso para editar este comentario" });
      }
      const updated = await prisma16.task_comments.update({
        where: { id: commentId },
        data: {
          contenido,
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });
      res.json(updated);
    } catch (error) {
      logger.error({ err: error }, "Error al editar comentario");
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/tasks/:taskId/comments/:commentId", authenticateToken, async (req, res) => {
    try {
      const { commentId } = req.params;
      const comment = await prisma16.task_comments.findUnique({
        where: { id: commentId }
      });
      if (!comment) {
        return res.status(404).json({ error: "Comentario no encontrado" });
      }
      if (comment.userId !== req.user.id && !req.user.permissions.includes("admin:settings")) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este comentario" });
      }
      await prisma16.task_comments.delete({
        where: { id: commentId }
      });
      res.status(204).end();
    } catch (error) {
      logger.error({ err: error }, "Error al eliminar comentario");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/attachments", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const attachments = await prisma16.task_attachments.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { uploaded_at: "desc" }
      });
      res.json(attachments);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener adjuntos");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tasks/:taskId/attachments", authenticateToken, uploadTaskAttachment.single("file"), async (req, res) => {
    try {
      const { taskId } = req.params;
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcion\xF3 ning\xFAn archivo" });
      }
      const task = await prisma16.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const attachment = await prisma16.task_attachments.create({
        data: {
          id: randomUUID3(),
          tasks: { connect: { id: taskId } },
          users: { connect: { id: req.user.id } },
          fileName: req.file.filename,
          original_name: req.file.originalname,
          filePath: `/uploads/tasks/attachments/${req.file.filename}`,
          file_type: req.file.mimetype,
          fileSize: req.file.size
        },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
      await prisma16.task_activities.create({
        data: {
          id: randomUUID3(),
          taskId,
          userId: req.user.id,
          accion: "attachment_added",
          descripcion: `${req.user.username} a\xF1adi\xF3 un adjunto: ${req.file.originalname}`,
          metadata: JSON.stringify({ attachmentId: attachment.id, fileName: req.file.originalname })
        }
      });
      res.json(attachment);
    } catch (error) {
      logger.error({ err: error }, "Error al subir adjunto");
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/tasks/:taskId/attachments/:attachmentId", authenticateToken, async (req, res) => {
    try {
      const { attachmentId } = req.params;
      const attachment = await prisma16.task_attachments.findUnique({
        where: { id: attachmentId }
      });
      if (!attachment) {
        return res.status(404).json({ error: "Adjunto no encontrado" });
      }
      if (attachment.userId !== req.user.id && !req.user.permissions.includes("admin:settings")) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este adjunto" });
      }
      const filePath = path10.join(process.cwd(), "uploads", "tasks", "attachments", attachment.fileName);
      if (fs8.existsSync(filePath)) {
        fs8.unlinkSync(filePath);
      }
      await prisma16.task_attachments.delete({
        where: { id: attachmentId }
      });
      res.status(204).end();
    } catch (error) {
      logger.error({ err: error }, "Error al eliminar adjunto");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/time-entries", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const entries = await prisma16.task_time_entries.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { fecha: "desc" }
      });
      res.json(entries);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener registros de tiempo");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tasks/:taskId/time-entries", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { minutos, descripcion, startedAt, endedAt } = req.body;
      if (!minutos || minutos <= 0) {
        return res.status(400).json({ error: "Los minutos deben ser mayores a 0" });
      }
      const task = await prisma16.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const entry = await prisma16.task_time_entries.create({
        data: {
          id: randomUUID3(),
          tasks: { connect: { id: taskId } },
          users: { connect: { id: req.user.id } },
          minutos,
          descripcion: descripcion || null,
          started_at: startedAt ? new Date(startedAt) : null,
          ended_at: endedAt ? new Date(endedAt) : null
        },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
      await prisma16.tasks.update({
        where: { id: taskId },
        data: {
          tiempo_invertido: task.tiempo_invertido + minutos
        }
      });
      await prisma16.task_activities.create({
        data: {
          id: randomUUID3(),
          taskId,
          userId: req.user.id,
          accion: "time_logged",
          descripcion: `${req.user.username} registr\xF3 ${minutos} minutos`,
          metadata: JSON.stringify({ entryId: entry.id, minutos })
        }
      });
      res.json(entry);
    } catch (error) {
      logger.error({ err: error }, "Error al registrar tiempo");
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/tasks/:taskId/time-entries/:entryId", authenticateToken, async (req, res) => {
    try {
      const { taskId, entryId } = req.params;
      const entry = await prisma16.task_time_entries.findUnique({
        where: { id: entryId }
      });
      if (!entry) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      if (entry.userId !== req.user.id) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este registro" });
      }
      const task = await prisma16.tasks.findUnique({ where: { id: taskId } });
      if (task) {
        await prisma16.tasks.update({
          where: { id: taskId },
          data: {
            tiempo_invertido: Math.max(0, task.tiempo_invertido - entry.minutos)
          }
        });
      }
      await prisma16.task_time_entries.delete({
        where: { id: entryId }
      });
      res.status(204).end();
    } catch (error) {
      logger.error({ err: error }, "Error al eliminar registro de tiempo");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/activities", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const activities = await prisma16.task_activities.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 100
        // Últimas 100 actividades
      });
      res.json(activities);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener actividades");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/subtasks", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const subtasks = await prisma16.tasks.findMany({
        where: { parent_task_id: taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { orden: "asc" }
      });
      res.json(subtasks);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener subtareas");
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tasks/:taskId/move", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { estado, orden } = req.body;
      const task = await prisma16.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const updatedTask = await prisma16.tasks.update({
        where: { id: taskId },
        data: {
          ...estado !== void 0 && { estado },
          ...orden !== void 0 && { orden },
          fecha_actualizacion: /* @__PURE__ */ new Date()
        }
      });
      if (estado && estado !== task.estado) {
        await prisma16.task_activities.create({
          data: {
            id: randomUUID3(),
            taskId,
            userId: req.user.id,
            accion: "status_changed",
            descripcion: `${req.user.username} cambi\xF3 el estado de ${task.estado} a ${estado}`,
            metadata: JSON.stringify({ oldStatus: task.estado, newStatus: estado })
          }
        });
      }
      res.json(updatedTask);
    } catch (error) {
      logger.error({ err: error }, "Error al mover tarea");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/analytics/overview", authenticateToken, async (req, res) => {
    try {
      const [
        total,
        pendientes,
        enProgreso,
        completadas,
        vencidas,
        porPrioridad,
        porUsuario
      ] = await Promise.all([
        prisma16.tasks.count({ where: { is_archived: false } }),
        prisma16.tasks.count({ where: { estado: "PENDIENTE", is_archived: false } }),
        prisma16.tasks.count({ where: { estado: "EN_PROGRESO", is_archived: false } }),
        prisma16.tasks.count({ where: { estado: "COMPLETADA", is_archived: false } }),
        prisma16.tasks.count({
          where: {
            fecha_vencimiento: { lt: /* @__PURE__ */ new Date() },
            estado: { not: "COMPLETADA" },
            is_archived: false
          }
        }),
        prisma16.tasks.groupBy({
          by: ["prioridad"],
          where: { is_archived: false },
          _count: true
        }),
        prisma16.tasks.groupBy({
          by: ["asignado_a"],
          where: { is_archived: false, asignado_a: { not: null } },
          _count: true
        })
      ]);
      res.json({
        total,
        porEstado: {
          pendientes,
          enProgreso,
          completadas,
          vencidas
        },
        porPrioridad: porPrioridad.map((p) => ({
          prioridad: p.prioridad,
          count: p._count
        })),
        porUsuario: porUsuario.map((u) => ({
          userId: u.asignado_a,
          count: u._count
        }))
      });
    } catch (error) {
      logger.error({ err: error }, "Error al obtener analytics");
      res.status(500).json({ error: error.message });
    }
  });
  logger.info("\u{1F680} Epic Tasks routes registered successfully");
}

// server/routes.ts
var prisma18 = new PrismaClient18();
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET no est\xE1 configurado. Este valor es OBLIGATORIO para la seguridad del sistema.");
}
var JWT_SECRET2 = process.env.JWT_SECRET;
var SALT_ROUNDS = 10;
var uploadsDir = path12.join(process.cwd(), "uploads");
var manualsImagesDir = path12.join(uploadsDir, "manuals", "images");
var manualsAttachmentsDir = path12.join(uploadsDir, "manuals", "attachments");
[uploadsDir, manualsImagesDir, manualsAttachmentsDir].forEach((dir) => {
  if (!fs9.existsSync(dir)) {
    fs9.mkdirSync(dir, { recursive: true });
  }
});
var imagesMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
var attachmentsMimeTypes = [
  ...imagesMimeTypes,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed"
];
var multerStorageImages = multer2.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var multerStorageAttachments = multer2.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsAttachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var upload = multer2({
  storage: multer2.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB max
});
var uploadManualImage = multer2({
  storage: multerStorageImages,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB max para imágenes
  fileFilter: (req, file, cb) => {
    if (imagesMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten im\xE1genes (JPEG, PNG, GIF, WebP)"));
    }
  }
});
var uploadManualAttachment = multer2({
  storage: multerStorageAttachments,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB max para adjuntos
  fileFilter: (req, file, cb) => {
    if (attachmentsMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  }
});
var authenticateToken2 = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    const decoded = jwt3.verify(token, JWT_SECRET2);
    const user = await prismaStorage.getUserWithPermissions(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }
    const permissions = user.role?.permissions?.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`
    ) || [];
    req.user = {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      permissions
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inv\xE1lido" });
  }
};
var checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }
    if (req.user.roleName === "Administrador") {
      return next();
    }
    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: "No tienes permisos para esta acci\xF3n",
        required: requiredPermission
      });
    }
    next();
  };
};
async function createAudit(usuarioId, accion, tabla, registroId, valorAnterior = null, valorNuevo = null) {
  try {
    let cambios = "";
    if (accion === "CREATE") {
      cambios = `Nuevo registro creado en ${tabla}`;
    } else if (accion === "DELETE") {
      cambios = `Registro eliminado de ${tabla}`;
    } else if (accion === "UPDATE" && valorAnterior && valorNuevo) {
      const cambiosArray = [];
      Object.keys(valorNuevo).forEach((key) => {
        if (valorAnterior[key] !== valorNuevo[key] && !["fechaActualizacion", "updated_at"].includes(key)) {
          cambiosArray.push(`${key}: "${valorAnterior[key]}" \u2192 "${valorNuevo[key]}"`);
        }
      });
      cambios = cambiosArray.length > 0 ? cambiosArray.join(", ") : "Sin cambios detectados";
    }
    await prismaStorage.createAuditEntry({
      usuarioId,
      accion,
      tabla,
      registroId,
      valorAnterior: valorAnterior ? JSON.stringify(valorAnterior) : null,
      valorNuevo: valorNuevo ? JSON.stringify(valorNuevo) : null,
      cambios
    });
  } catch (error) {
    console.error("Error al crear auditor\xEDa:", error);
  }
}
async function registerRoutes(app2) {
  try {
    await prismaStorage.ensureTaxModelsConfigSeeded();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo inicializar tax_models_config";
    logger.fatal(
      {
        err: error,
        remediation: "Ejecuta `npx prisma db push` y reinicia el servidor"
      },
      message
    );
    throw error;
  }
  app2.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path === "/api/health") {
      return next();
    }
    return apiLimiter(req, res, next);
  });
  app2.get("/api/health", async (req, res) => {
    try {
      await prismaStorage.getAllUsers();
      res.status(200).json({
        status: "healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        database: "connected"
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        database: "disconnected"
      });
    }
  });
  app2.post(
    "/api/auth/register",
    registerLimiter,
    validateZod(registerSchema),
    async (req, res) => {
      try {
        const { username, email, password, roleId } = req.body;
        const existingUser = await prismaStorage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: "El usuario ya existe" });
        }
        const existingEmail = await prismaStorage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "El email ya est\xE1 registrado" });
        }
        let defaultRoleId = roleId;
        if (!defaultRoleId) {
          const defaultRole = await prisma18.roles.findUnique({
            where: { name: "Gestor" }
          });
          if (defaultRole) {
            defaultRoleId = defaultRole.id;
          }
        }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prismaStorage.createUser({
          username,
          email,
          password: hashedPassword,
          roleId: defaultRoleId || null
        });
        const token = jwt3.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET2, {
          expiresIn: "24h"
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await prismaStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: "Usuario desactivado. Contacte al administrador" });
      }
      const token = jwt3.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET2, {
        expiresIn: "24h"
      });
      const fullUser = await prismaStorage.getUserWithPermissions(user.id);
      if (!fullUser) {
        return res.status(500).json({ error: "Error al obtener informaci\xF3n del usuario" });
      }
      const { password: _, ...userWithoutPassword } = fullUser;
      const permissions = fullUser.roles?.role_permissions?.map(
        (rp) => `${rp.permissions.resource}:${rp.permissions.action}`
      ) || [];
      const roleName = fullUser.roles?.name || null;
      res.json({ user: { ...userWithoutPassword, permissions, roleName }, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Sesi\xF3n cerrada exitosamente" });
  });
  app2.get("/api/auth/profile", authenticateToken2, async (req, res) => {
    try {
      const user = await prismaStorage.getUserWithPermissions(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      const { password: _, ...userWithoutPassword } = user;
      const permissions = user.roles?.role_permissions?.map(
        (rp) => `${rp.permissions.resource}:${rp.permissions.action}`
      ) || [];
      const roleName = user.roles?.name || null;
      res.json({ ...userWithoutPassword, permissions, roleName });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/users", authenticateToken2, async (req, res) => {
    try {
      const users = await prismaStorage.getAllUsers();
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/users",
    authenticateToken2,
    checkPermission("users:create"),
    validateZod(userCreateSchema),
    async (req, res) => {
      try {
        const { username, email, password, roleId } = req.body;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prismaStorage.createUser({
          username,
          email,
          password: hashedPassword,
          roleId
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/users/:id",
    authenticateToken2,
    checkPermission("users:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = { ...req.body };
        if (updateData.password) {
          updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
        }
        const user = await prismaStorage.updateUser(id, updateData);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/users/:id/toggle-active",
    authenticateToken2,
    checkPermission("users:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const user = await prismaStorage.getUser(id);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const newActiveState = !user.isActive;
        const updatedUser = await prismaStorage.updateUser(id, { isActive: newActiveState });
        if (!updatedUser) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: newActiveState ? `Activ\xF3 el usuario ${user.username}` : `Desactiv\xF3 el usuario ${user.username}`,
          modulo: "admin",
          detalles: `Estado: ${newActiveState ? "Activo" : "Inactivo"}`
        });
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/users/:id",
    authenticateToken2,
    checkPermission("users:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const user = await prismaStorage.getUser(id);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const manuals = await prisma18.manuals.count({ where: { autor_id: id } });
        const activityLogs = await prisma18.activity_logs.count({ where: { usuarioId: id } });
        const auditTrails = await prisma18.audit_trail.count({ where: { usuarioId: id } });
        if (manuals > 0) {
          return res.status(409).json({
            error: `No se puede eliminar: el usuario tiene ${manuals} manual(es) asignado(s) que se borrar\xEDan permanentemente. Reasigne los manuales a otro usuario primero.`
          });
        }
        const deleted = await prismaStorage.deleteUser(id);
        if (!deleted) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 el usuario ${user.username}`,
          modulo: "admin",
          detalles: `Se eliminaron ${activityLogs} logs de actividad y ${auditTrails} registros de auditor\xEDa`
        });
        res.json({
          message: "Usuario eliminado exitosamente",
          deletedRelations: {
            activityLogs,
            auditTrails
          }
        });
      } catch (error) {
        if (error.code === "P2003") {
          return res.status(409).json({
            error: "No se puede eliminar el usuario: tiene relaciones activas con otros registros del sistema"
          });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/clients", authenticateToken2, async (req, res) => {
    try {
      const clients = await prismaStorage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get(
    "/api/clients/:id",
    authenticateToken2,
    async (req, res) => {
      try {
        const client = await prismaStorage.getClient(req.params.id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/clients",
    authenticateToken2,
    checkPermission("clients:create"),
    validateZod(clientCreateSchema),
    async (req, res) => {
      try {
        const client = await prismaStorage.createClient(req.body);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `NIF/CIF: ${client.nifCif}`
        });
        await createAudit(
          req.user.id,
          "CREATE",
          "clients",
          client.id,
          null,
          client
        );
        notifyClientChange("created", client);
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/clients/:id",
    authenticateToken2,
    checkPermission("clients:update"),
    validateZod(clientUpdateSchema),
    async (req, res) => {
      try {
        const { id } = req.params;
        const oldClient = await prismaStorage.getClient(id);
        const client = await prismaStorage.updateClient(id, req.body);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: null
        });
        await createAudit(
          req.user.id,
          "UPDATE",
          "clients",
          client.id,
          oldClient,
          client
        );
        notifyClientChange("updated", client);
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/clients/:id",
    authenticateToken2,
    checkPermission("clients:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const clientTaxes = await prisma18.client_tax.findMany({
          where: { clientId: id }
        });
        const assignmentCount = await prisma18.client_tax_assignments.count({
          where: { clientId: id }
        });
        if (clientTaxes.length > 0 || assignmentCount > 0) {
          const updated = await prismaStorage.updateClient(id, { isActive: false });
          await prismaStorage.createActivityLog({
            usuarioId: req.user.id,
            accion: `Desactiv\xF3 el cliente ${client.razonSocial}`,
            modulo: "clientes",
            detalles: `Cliente con ${clientTaxes.length} impuestos y ${assignmentCount} asignaciones fiscales asociadas`
          });
          await createAudit(
            req.user.id,
            "UPDATE",
            "clients",
            id,
            client,
            updated
          );
          res.json({
            message: "Cliente desactivado (posee impuestos o asignaciones fiscales)",
            softDelete: true,
            client: updated
          });
        } else {
          const deleted = await prismaStorage.deleteClient(id);
          if (!deleted) {
            return res.status(404).json({ error: "Error al eliminar cliente" });
          }
          await prismaStorage.createActivityLog({
            usuarioId: req.user.id,
            accion: `Elimin\xF3 permanentemente el cliente ${client.razonSocial}`,
            modulo: "clientes",
            detalles: "Sin impuestos asociados"
          });
          await createAudit(
            req.user.id,
            "DELETE",
            "clients",
            id,
            client,
            null
          );
          res.json({
            message: "Cliente eliminado permanentemente",
            hardDelete: true
          });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  const handleGetTaxConfigs = async (_req, res) => {
    try {
      const configs = await prismaStorage.getActiveTaxModelsConfig();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  app2.get(
    "/api/tax-models-config",
    authenticateToken2,
    checkPermission("taxes:read"),
    handleGetTaxConfigs
  );
  app2.get(
    "/api/tax/config",
    authenticateToken2,
    checkPermission("taxes:read"),
    handleGetTaxConfigs
  );
  app2.get(
    "/api/tax/assignments",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const clientId = req.query.clientId;
        if (!clientId) {
          return res.status(400).json({ error: "clientId es requerido" });
        }
        const assignments = await prismaStorage.getClientTaxAssignments(clientId);
        res.json(assignments);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax-assignments/:assignmentId/history",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const history = await prismaStorage.getTaxAssignmentHistory(assignmentId);
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/clients/:id/tax-assignments",
    authenticateToken2,
    checkPermission("clients:update"),
    validateZod(taxAssignmentCreateSchema),
    async (req, res) => {
      try {
        const clientId = req.params.id;
        const client = await prismaStorage.getClient(clientId);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const taxModelCode = String(req.body.taxModelCode).toUpperCase();
        const periodicity = String(req.body.periodicity).toUpperCase();
        const clientType = String(client.tipo || "").toUpperCase();
        validateTaxAssignmentAgainstRules(clientType, {
          taxModelCode,
          periodicity
        });
        const startDate = new Date(req.body.startDate);
        const endDate = req.body.endDate ? new Date(req.body.endDate) : null;
        const activeFlag = endDate ? false : req.body.activeFlag ?? true;
        const existing = await prismaStorage.findClientTaxAssignmentByCode(clientId, taxModelCode);
        if (existing) {
          const existingEnd = existing.endDate ? new Date(existing.endDate) : null;
          const overlaps = !existingEnd || existingEnd >= startDate;
          if (overlaps) {
            return res.status(409).json({ error: `El modelo ${taxModelCode} ya est\xE1 asignado y vigente o solapa con la nueva fecha de alta` });
          }
        }
        const assignment = await prismaStorage.createClientTaxAssignment(clientId, {
          taxModelCode,
          periodicity,
          startDate,
          endDate,
          activeFlag,
          notes: req.body.notes ?? null
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Asign\xF3 modelo ${taxModelCode} al cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Periodicidad: ${periodicity}, Activo: ${assignment.effectiveActive ? "S\xED" : "No"}`
        });
        await createAudit(
          req.user.id,
          "CREATE",
          "client_tax_assignments",
          assignment.id,
          null,
          assignment
        );
        notifyTaxChange("created", assignment);
        res.status(201).json(assignment);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/tax-assignments/:assignmentId",
    authenticateToken2,
    checkPermission("clients:update"),
    validateZod(taxAssignmentUpdateSchema),
    async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const existing = await prismaStorage.getClientTaxAssignment(assignmentId);
        if (!existing) {
          return res.status(404).json({ error: "Asignaci\xF3n no encontrada" });
        }
        const client = await prismaStorage.getClient(existing.clientId);
        if (!client) {
          return res.status(404).json({ error: "Cliente asociado no encontrado" });
        }
        const taxModelCode = req.body.taxModelCode ? String(req.body.taxModelCode).toUpperCase() : existing.taxModelCode;
        const periodicity = req.body.periodicity ? String(req.body.periodicity).toUpperCase() : existing.periodicity;
        const clientType = String(client.tipo || "").toUpperCase();
        validateTaxAssignmentAgainstRules(clientType, {
          taxModelCode,
          periodicity
        });
        if (taxModelCode !== existing.taxModelCode) {
          const duplicate = await prismaStorage.findClientTaxAssignmentByCode(existing.clientId, taxModelCode);
          if (duplicate && duplicate.id !== assignmentId) {
            return res.status(409).json({ error: `El modelo ${taxModelCode} ya est\xE1 asignado al cliente` });
          }
        }
        let endDate;
        if (Object.prototype.hasOwnProperty.call(req.body, "endDate")) {
          if (req.body.endDate === null || req.body.endDate === void 0) {
            endDate = null;
          } else {
            endDate = new Date(req.body.endDate);
          }
        }
        const startDate = req.body.startDate !== void 0 ? new Date(req.body.startDate) : void 0;
        const activeFlag = endDate && endDate !== null ? false : req.body.activeFlag !== void 0 ? req.body.activeFlag : void 0;
        const updated = await prismaStorage.updateClientTaxAssignment(assignmentId, {
          taxModelCode,
          periodicity,
          startDate,
          endDate: endDate ?? void 0,
          activeFlag: activeFlag ?? void 0,
          notes: Object.prototype.hasOwnProperty.call(req.body, "notes") ? req.body.notes ?? null : void 0
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 modelo ${taxModelCode} del cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Activo: ${updated.effectiveActive ? "S\xED" : "No"}`
        });
        await createAudit(
          req.user.id,
          "UPDATE",
          "client_tax_assignments",
          assignmentId,
          existing,
          updated
        );
        notifyTaxChange("updated", updated);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/tax-assignments/:assignmentId",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const existing = await prismaStorage.getClientTaxAssignment(assignmentId);
        if (!existing) {
          return res.status(404).json({ error: "Asignaci\xF3n no encontrada" });
        }
        const hasHistory = await prismaStorage.hasAssignmentHistoricFilings(
          existing.clientId,
          existing.taxModelCode
        );
        let result;
        let message;
        let action = "DELETE";
        if (hasHistory) {
          result = await prismaStorage.softDeactivateClientTaxAssignment(assignmentId, /* @__PURE__ */ new Date());
          message = "Asignaci\xF3n desactivada. Posee hist\xF3rico de presentaciones.";
          action = "UPDATE";
        } else {
          result = await prismaStorage.deleteClientTaxAssignment(assignmentId);
          message = "Asignaci\xF3n eliminada correctamente.";
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: action === "DELETE" ? `Elimin\xF3 modelo ${existing.taxModelCode} del cliente` : `Desactiv\xF3 modelo ${existing.taxModelCode} del cliente`,
          modulo: "clientes",
          detalles: message
        });
        await createAudit(
          req.user.id,
          action,
          "client_tax_assignments",
          assignmentId,
          existing,
          action === "DELETE" ? null : result
        );
        notifyTaxChange(action === "DELETE" ? "deleted" : "updated", result);
        res.json({
          assignment: result,
          softDeleted: hasHistory,
          message
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/clients/:id/toggle-active",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const newActiveState = !client.isActive;
        const updatedClient = await prismaStorage.updateClient(id, { isActive: newActiveState });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: newActiveState ? `Activ\xF3 el cliente ${client.razonSocial}` : `Desactiv\xF3 el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Estado cambiado a: ${newActiveState ? "Activo" : "Inactivo"}`
        });
        await createAudit(
          req.user.id,
          "UPDATE",
          "clients",
          id,
          client,
          updatedClient
        );
        res.json(updatedClient);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.put(
    "/api/clients/:id/employees",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { employeeIds, primaryEmployeeId } = req.body;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        await prisma18.client_employees.deleteMany({
          where: { clientId: id }
        });
        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
          await prisma18.client_employees.createMany({
            data: employeeIds.map((userId) => ({
              clientId: id,
              userId,
              is_primary: userId === primaryEmployeeId
            }))
          });
          if (primaryEmployeeId) {
            await prismaStorage.updateClient(id, { responsableAsignado: primaryEmployeeId });
          }
        } else {
          await prismaStorage.updateClient(id, { responsableAsignado: null });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 empleados del cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `${employeeIds?.length || 0} empleados asignados`
        });
        const updatedClient = await prismaStorage.getClient(id);
        res.json(updatedClient);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/clients/:id/employees/:userId",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id, userId } = req.params;
        const { isPrimary } = req.body;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const user = await prismaStorage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        if (isPrimary) {
          await prisma18.client_employees.updateMany({
            where: { clientId: id },
            data: { is_primary: false }
          });
        }
        await prisma18.client_employees.upsert({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          },
          create: {
            clientId: id,
            userId,
            is_primary: isPrimary || false
          },
          update: {
            is_primary: isPrimary || false
          }
        });
        if (isPrimary) {
          await prismaStorage.updateClient(id, { responsableAsignado: userId });
        } else {
          const primaryEmployee = await prisma18.client_employees.findFirst({
            where: { clientId: id, is_primary: true }
          });
          await prismaStorage.updateClient(id, {
            responsableAsignado: primaryEmployee ? primaryEmployee.userId : null
          });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Asign\xF3 empleado ${user.username} al cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: isPrimary ? "Como responsable principal" : "Como colaborador"
        });
        const updatedClient = await prismaStorage.getClient(id);
        res.json(updatedClient);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/clients/:id/employees/:userId",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id, userId } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const user = await prismaStorage.getUser(userId);
        const employeeToDelete = await prisma18.client_employees.findUnique({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });
        await prisma18.client_employees.delete({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });
        if (employeeToDelete?.is_primary) {
          const remainingEmployee = await prisma18.client_employees.findFirst({
            where: { clientId: id }
          });
          if (remainingEmployee) {
            await prisma18.client_employees.update({
              where: {
                clientId_userId: {
                  clientId: id,
                  userId: remainingEmployee.userId
                }
              },
              data: { is_primary: true }
            });
            await prismaStorage.updateClient(id, { responsableAsignado: remainingEmployee.userId });
          } else {
            await prismaStorage.updateClient(id, { responsableAsignado: null });
          }
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Desasign\xF3 empleado ${user?.username || userId} del cliente ${client.razonSocial}`,
          modulo: "clientes"
        });
        const updatedClient = await prismaStorage.getClient(id);
        res.json(updatedClient);
      } catch (error) {
        if (error.code === "P2025") {
          return res.status(404).json({ error: "Asignaci\xF3n no encontrada" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/impuestos",
    authenticateToken2,
    async (req, res) => {
      try {
        const impuestos = await prismaStorage.getAllImpuestos();
        res.json(impuestos);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/impuestos",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { modelo, nombre, descripcion } = req.body;
        if (!modelo || !nombre) {
          return res.status(400).json({ error: "Modelo y nombre son requeridos" });
        }
        const impuesto = await prismaStorage.createImpuesto({ modelo, nombre, descripcion });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el impuesto: ${modelo} - ${nombre}`,
          modulo: "impuestos",
          detalles: descripcion || ""
        });
        res.status(201).json(impuesto);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(400).json({ error: "Ya existe un impuesto con ese modelo" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/impuestos/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const { modelo, nombre, descripcion } = req.body;
        const impuesto = await prismaStorage.updateImpuesto(req.params.id, { modelo, nombre, descripcion });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el impuesto: ${impuesto.modelo}`,
          modulo: "impuestos",
          detalles: JSON.stringify({ modelo, nombre, descripcion })
        });
        res.json(impuesto);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(400).json({ error: "Ya existe un impuesto con ese modelo" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/impuestos/:id",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        await prismaStorage.deleteImpuesto(req.params.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 un impuesto`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/obligaciones-fiscales",
    authenticateToken2,
    async (req, res) => {
      try {
        const obligaciones = await prismaStorage.getAllObligacionesFiscales();
        res.json(obligaciones);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/obligaciones-fiscales/cliente/:clienteId",
    authenticateToken2,
    async (req, res) => {
      try {
        const obligaciones = await prismaStorage.getObligacionesByCliente(req.params.clienteId);
        res.json(obligaciones);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/obligaciones-fiscales",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { clienteId, impuestoId, periodicidad, diaVencimiento, observaciones, fechaInicio, fechaFin, activo } = req.body;
        if (!clienteId || !impuestoId || !periodicidad || !fechaInicio) {
          return res.status(400).json({ error: "Cliente, impuesto, periodicidad y fecha de inicio son requeridos" });
        }
        const obligacion = await prismaStorage.createObligacionFiscal({
          clienteId,
          impuestoId,
          periodicidad,
          diaVencimiento: diaVencimiento || null,
          observaciones: observaciones || null,
          fechaInicio: new Date(fechaInicio),
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          activo: activo !== void 0 ? activo : true,
          fechaAsignacion: /* @__PURE__ */ new Date()
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 obligaci\xF3n fiscal para cliente`,
          modulo: "impuestos",
          detalles: `Cliente: ${clienteId}, Impuesto: ${impuestoId}`
        });
        res.status(201).json(obligacion);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/obligaciones-fiscales/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const updateData = { ...req.body };
        if (updateData.fechaInicio && typeof updateData.fechaInicio === "string") {
          updateData.fechaInicio = new Date(updateData.fechaInicio);
        }
        if (updateData.fechaFin && typeof updateData.fechaFin === "string") {
          updateData.fechaFin = new Date(updateData.fechaFin);
        }
        const obligacion = await prismaStorage.updateObligacionFiscal(req.params.id, updateData);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 obligaci\xF3n fiscal`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json(obligacion);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/obligaciones-fiscales/:id",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        await prismaStorage.deleteObligacionFiscal(req.params.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 obligaci\xF3n fiscal`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/tasks", authenticateToken2, async (req, res) => {
    try {
      const tasks = await prismaStorage.getAllTasks();
      const clients = await prismaStorage.getAllClients();
      const users = await prismaStorage.getAllUsers();
      const enriched = tasks.map((task) => ({
        ...task,
        client: clients.find((c) => c.id === task.clienteId),
        assignedUser: users.find((u) => u.id === task.asignadoA)
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/tasks",
    authenticateToken2,
    checkPermission("tasks:create"),
    validateZod(taskCreateSchema),
    async (req, res) => {
      try {
        const taskData = { ...req.body };
        if (taskData.fechaVencimiento && /^\d{4}-\d{2}-\d{2}$/.test(taskData.fechaVencimiento)) {
          taskData.fechaVencimiento = (/* @__PURE__ */ new Date(taskData.fechaVencimiento + "T00:00:00.000Z")).toISOString();
        }
        if (!taskData.asignadoA || taskData.asignadoA === "") {
          delete taskData.asignadoA;
        }
        if (!taskData.clienteId || taskData.clienteId === "") {
          delete taskData.clienteId;
        }
        const task = await prismaStorage.createTask(taskData);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 la tarea "${task.titulo}"`,
          modulo: "tareas",
          detalles: null
        });
        notifyTaskChange("created", task, task.asignadoA || void 0);
        res.json(task);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/tasks/:id",
    authenticateToken2,
    async (req, res) => {
      try {
        const { id } = req.params;
        const taskData = { ...req.body };
        if (taskData.fechaVencimiento && /^\d{4}-\d{2}-\d{2}$/.test(taskData.fechaVencimiento)) {
          taskData.fechaVencimiento = (/* @__PURE__ */ new Date(taskData.fechaVencimiento + "T00:00:00.000Z")).toISOString();
        }
        if (!taskData.asignadoA || taskData.asignadoA === "") {
          delete taskData.asignadoA;
        }
        if (!taskData.clienteId || taskData.clienteId === "") {
          delete taskData.clienteId;
        }
        const task = await prismaStorage.updateTask(id, taskData);
        if (!task) {
          return res.status(404).json({ error: "Tarea no encontrada" });
        }
        notifyTaskChange("updated", task, task.asignadoA || void 0);
        res.json(task);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/manuals", authenticateToken2, async (req, res) => {
    try {
      const manuals = await prismaStorage.getAllManuals();
      res.json(manuals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/manuals/:id", authenticateToken2, async (req, res) => {
    try {
      const { id } = req.params;
      const manual = await prismaStorage.getManual(id);
      if (!manual) {
        return res.status(404).json({ error: "Manual no encontrado" });
      }
      res.json(manual);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/manuals",
    authenticateToken2,
    checkPermission("manuals:create"),
    async (req, res) => {
      try {
        const manual = await prismaStorage.createManual({
          ...req.body,
          autor_id: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: null
        });
        res.json(manual);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/manuals/:id",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const currentManual = await prismaStorage.getManual(id);
        if (currentManual && req.body.createVersion) {
          const nextVersion = await prismaStorage.getNextVersionNumber(id);
          await prismaStorage.createManualVersion({
            manualId: id,
            versionNumber: nextVersion,
            titulo: currentManual.titulo,
            contenidoHtml: currentManual.contenidoHtml,
            etiquetas: currentManual.etiquetas || null,
            categoria: currentManual.categoria || null,
            createdBy: req.user.id
          });
        }
        const manual = await prismaStorage.updateManual(id, req.body);
        if (!manual) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: null
        });
        res.json(manual);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/manuals/:id",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      const { id } = req.params;
      try {
        const ok = await prismaStorage.deleteManual(id);
        if (!ok) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 un manual`,
          modulo: "manuales",
          detalles: `ID: ${id}`
        });
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ error: error.message || "No se pudo eliminar" });
      }
    }
  );
  app2.post(
    "/api/manuals/upload-image",
    authenticateToken2,
    checkPermission("manuals:update"),
    uploadManualImage.single("image"),
    uploadToStorage,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcion\xF3 imagen" });
        }
        const imageUrl = `/uploads/manuals/images/${req.file.filename}`;
        res.json({ url: imageUrl });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/manuals/:id/attachments",
    authenticateToken2,
    checkPermission("manuals:update"),
    uploadManualAttachment.single("file"),
    uploadToStorage,
    async (req, res) => {
      try {
        const { id } = req.params;
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcion\xF3 archivo" });
        }
        const manual = await prismaStorage.getManual(id);
        if (!manual) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        const attachment = await prismaStorage.createManualAttachment({
          manualId: id,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          filePath: req.file.path,
          fileType: path12.extname(req.file.originalname).toLowerCase(),
          fileSize: req.file.size,
          uploadedBy: req.user.id
        });
        res.json(attachment);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/manuals/:id/attachments",
    authenticateToken2,
    async (req, res) => {
      try {
        const { id } = req.params;
        const attachments = await prismaStorage.getManualAttachments(id);
        res.json(attachments);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/manuals/:manualId/attachments/:attachmentId",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      try {
        const { attachmentId } = req.params;
        const attachment = await prismaStorage.getManualAttachment(attachmentId);
        if (!attachment) {
          return res.status(404).json({ error: "Adjunto no encontrado" });
        }
        if (fs9.existsSync(attachment.filePath)) {
          fs9.unlinkSync(attachment.filePath);
        }
        const deleted = await prismaStorage.deleteManualAttachment(attachmentId);
        if (!deleted) {
          return res.status(500).json({ error: "Error al eliminar adjunto" });
        }
        res.json({ message: "Adjunto eliminado correctamente" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/manuals/:id/versions",
    authenticateToken2,
    async (req, res) => {
      try {
        const { id } = req.params;
        const versions = await prismaStorage.getManualVersions(id);
        res.json(versions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/manuals/:id/versions/restore/:versionId",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      try {
        const { id, versionId } = req.params;
        const manual = await prismaStorage.restoreManualVersion(id, versionId);
        if (!manual) {
          return res.status(404).json({ error: "No se pudo restaurar la versi\xF3n" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Restaur\xF3 versi\xF3n del manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: `Versi\xF3n ID: ${versionId}`
        });
        res.json(manual);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/activity-logs",
    authenticateToken2,
    checkPermission("audits:read"),
    async (req, res) => {
      try {
        const logs = await prismaStorage.getAllActivityLogs();
        const users = await prismaStorage.getAllUsers();
        const enriched = logs.map((log2) => ({
          ...log2,
          user: users.find((u) => u.id === log2.usuarioId)
        }));
        res.json(enriched);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/dashboard/stats", authenticateToken2, async (req, res) => {
    try {
      const clients = await prismaStorage.getAllClients();
      const tasks = await prismaStorage.getAllTasks();
      const manuals = await prismaStorage.getAllManuals();
      const stats = {
        totalClientes: clients.length,
        clientesActivos: clients.filter((c) => c.responsableAsignado).length,
        tareasGenerales: tasks.filter((t) => t.visibilidad === "GENERAL").length,
        tareasPersonales: tasks.filter((t) => t.visibilidad === "PERSONAL").length,
        tareasPendientes: tasks.filter((t) => t.estado === "PENDIENTE").length,
        tareasEnProgreso: tasks.filter((t) => t.estado === "EN_PROGRESO").length,
        tareasCompletadas: tasks.filter((t) => t.estado === "COMPLETADA").length,
        manualesPublicados: manuals.filter((m) => m.publicado).length,
        manualesTotal: manuals.length
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/admin/smtp-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    validateZod(smtpConfigSchema),
    async (req, res) => {
      try {
        const { host, port, user, pass } = req.body;
        if (!host || !port || !user || !pass) {
          return res.status(400).json({ error: "Faltan par\xE1metros de configuraci\xF3n SMTP" });
        }
        if (typeof host !== "string" || host.length > 200) {
          return res.status(400).json({ error: "Host SMTP inv\xE1lido" });
        }
        const hostPattern = /^[a-zA-Z0-9._:-]+$/;
        if (!hostPattern.test(host)) {
          return res.status(400).json({ error: "Host SMTP inv\xE1lido" });
        }
        const portNum = parseInt(String(port), 10);
        if (Number.isNaN(portNum) || portNum <= 0 || portNum > 65535) {
          return res.status(400).json({ error: "Puerto SMTP inv\xE1lido" });
        }
        configureSMTP({ host, port: portNum, user, pass });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Configur\xF3 los par\xE1metros SMTP",
          modulo: "admin",
          detalles: `Host: ${host}, Puerto: ${port}`
        });
        res.json({ success: true, message: "Configuraci\xF3n SMTP guardada exitosamente" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/admin/smtp-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const config = getSMTPConfig();
        if (!config) {
          return res.json({ configured: false });
        }
        res.json({
          configured: true,
          host: config.host,
          port: config.port,
          user: config.user
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/admin/online-count", authenticateToken2, async (req, res) => {
    try {
      const count = await prisma18.sessions.count({
        where: { ended_at: null }
      });
      res.json({ count });
    } catch (error) {
      console.error("Error getting online count:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.use("/api/admin/sessions", admin_sessions_default);
  app2.use("/api/price-catalog", price_catalog_default);
  app2.use("/api/budgets", budgets_default);
  app2.use("/public/budgets", public_budgets_default);
  app2.use("/api/budget-parameters", budget_parameters_default);
  app2.use("/api/budget-templates", budget_templates_default);
  app2.get(
    "/api/admin/smtp-accounts",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const accounts = await prismaStorage.getAllSMTPAccounts();
        const accountsWithoutPassword = accounts.map((acc) => ({
          ...acc,
          password: void 0
        }));
        res.json(accountsWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/smtp-accounts",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    validateZod(smtpAccountSchema),
    async (req, res) => {
      try {
        const { nombre, host, port, user, password, isPredeterminada, activa } = req.body;
        if (!nombre || !host || !port || !user || !password) {
          return res.status(400).json({ error: "Faltan par\xE1metros requeridos" });
        }
        const account = await prismaStorage.createSMTPAccount({
          nombre,
          host,
          port: parseInt(port),
          user,
          password,
          isPredeterminada: isPredeterminada || false,
          activa: activa !== void 0 ? activa : true,
          creadaPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Cre\xF3 cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta: ${nombre} (${user})`
        });
        res.json({ ...account, password: void 0 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/admin/smtp-accounts/:id",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.port) {
          updates.port = parseInt(updates.port);
        }
        const account = await prismaStorage.updateSMTPAccount(id, updates);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta ID: ${id}`
        });
        res.json({ ...account, password: void 0 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/admin/smtp-accounts/:id",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await prismaStorage.deleteSMTPAccount(id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Elimin\xF3 cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta ID: ${id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/smtp-accounts/test",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const { host, port, user, password } = req.body;
        const nodemailer5 = __require("nodemailer");
        const transporter2 = nodemailer5.createTransport({
          host,
          port: parseInt(port),
          secure: parseInt(port) === 465,
          auth: { user, pass: password }
        });
        await transporter2.verify();
        res.json({ success: true, message: "Conexi\xF3n SMTP exitosa" });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );
  app2.get(
    "/api/admin/storage-config",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const config = await prisma18.storage_configs.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "desc" }
        });
        if (!config) {
          return res.json({
            type: "LOCAL",
            base_path: "/uploads",
            isActive: true
          });
        }
        res.json({
          id: config.id,
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          base_path: config.base_path,
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/storage-config",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const { type, host, port, username, password, basePath } = req.body;
        if (!type) {
          return res.status(400).json({ error: "El tipo de almacenamiento es requerido" });
        }
        if (type === "FTP" || type === "SMB") {
          if (!host || !port || !username || !password) {
            return res.status(400).json({
              error: "Para FTP/SMB se requieren: host, port, username y password"
            });
          }
        }
        const encryptedPassword = password ? encryptPassword2(password) : null;
        await prisma18.storage_configs.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        });
        const config = await prisma18.storage_configs.create({
          data: {
            id: randomUUID4(),
            type,
            name: `${type} - ${(/* @__PURE__ */ new Date()).toISOString()}`,
            host,
            port: port ? parseInt(port) : null,
            username,
            encrypted_password: encryptedPassword,
            base_path: basePath || (type === "LOCAL" ? "/uploads" : "/"),
            isActive: true
          }
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Configur\xF3 almacenamiento ${type}`,
          modulo: "admin",
          detalles: type === "LOCAL" ? "Almacenamiento local" : `${host}:${port}`
        });
        await StorageFactory.clearInstance();
        res.json({
          id: config.id,
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          base_path: config.base_path,
          isActive: config.isActive
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/storage-config/test",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const { type, host, port, username, password, basePath } = req.body;
        if (!type) {
          return res.status(400).json({ error: "El tipo de almacenamiento es requerido" });
        }
        if (type === "FTP" || type === "SMB") {
          if (!host || !port || !username || !password) {
            return res.status(400).json({
              error: "Para FTP/SMB se requieren: host, port, username y password"
            });
          }
        }
        const config = {
          type,
          host,
          port: port ? parseInt(port) : void 0,
          username,
          encryptedPassword: password ? encryptPassword2(password) : null,
          base_path: basePath || (type === "LOCAL" ? "/uploads" : "/")
        };
        const result = await StorageFactory.testConfigurationData(config);
        if (result.success) {
          res.json({
            success: true,
            message: `Conexi\xF3n ${type} exitosa`,
            details: result.message
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.message
          });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/storage-config/migrate",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const { targetConfigId } = req.body;
        if (!targetConfigId) {
          return res.status(400).json({
            error: "Se requiere targetConfigId"
          });
        }
        const { migrateStorage: migrateStorage2 } = await Promise.resolve().then(() => (init_migration_service(), migration_service_exports));
        const result = await migrateStorage2(targetConfigId);
        res.json({
          success: result.success,
          totalFiles: result.totalFiles,
          migratedFiles: result.migratedFiles,
          errors: result.errors,
          message: result.success ? `Migraci\xF3n exitosa: ${result.migratedFiles} archivos migrados` : `Migraci\xF3n con errores: ${result.migratedFiles}/${result.totalFiles} archivos migrados`
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          success: false
        });
      }
    }
  );
  app2.get(
    "/api/admin/system-settings",
    async (req, res) => {
      try {
        const settings = await prismaStorage.getSystemSettings();
        if (!settings) {
          return res.json({ registrationEnabled: true });
        }
        res.json(settings);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/admin/system-settings",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const { registrationEnabled } = req.body;
        const settings = await prismaStorage.updateSystemSettings({
          registrationEnabled
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: registrationEnabled ? "Habilit\xF3 el registro de usuarios" : "Deshabilit\xF3 el registro de usuarios",
          modulo: "admin",
          detalles: `Registro de usuarios: ${registrationEnabled ? "Habilitado" : "Deshabilitado"}`
        });
        res.json(settings);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/config",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const configs = await prisma18.system_config.findMany({
          orderBy: { key: "asc" }
        });
        res.json(configs);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/config/:key",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const config = await prisma18.system_config.findUnique({
          where: { key: req.params.key }
        });
        if (!config) {
          return res.status(404).json({ error: "Configuraci\xF3n no encontrada" });
        }
        res.json(config);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.put(
    "/api/system/config/:key",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const { value } = req.body;
        if (value === void 0 || value === null) {
          return res.status(400).json({ error: "El valor de la configuraci\xF3n es requerido" });
        }
        const existing = await prisma18.system_config.findUnique({
          where: { key: req.params.key }
        });
        if (!existing) {
          return res.status(404).json({ error: "Configuraci\xF3n no encontrada" });
        }
        if (!existing.is_editable) {
          return res.status(403).json({ error: "Esta configuraci\xF3n no es editable" });
        }
        const config = await prisma18.system_config.update({
          where: { key: req.params.key },
          data: { value: String(value) }
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 configuraci\xF3n del sistema`,
          modulo: "admin",
          detalles: `Configuraci\xF3n "${req.params.key}" actualizada a: ${value}`
        });
        res.json(config);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/admin/github-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const repoConfig = await prisma18.system_config.findUnique({
          where: { key: "github_repo_url" }
        });
        const branchConfig = await prisma18.system_config.findUnique({
          where: { key: "github_branch" }
        });
        res.json({
          repoUrl: repoConfig?.value || "",
          branch: branchConfig?.value || "main",
          configured: !!repoConfig?.value
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.put(
    "/api/admin/github-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    validateZod(githubConfigSchema),
    async (req, res) => {
      try {
        const { repoUrl, branch } = req.body;
        if (repoUrl) {
          if (typeof repoUrl !== "string" || repoUrl.length > 300) {
            return res.status(400).json({ error: "Formato inv\xE1lido de repoUrl" });
          }
          const ownerRepoMatch = repoUrl.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
          if (!ownerRepoMatch) {
            try {
              const candidate = repoUrl.startsWith("http://") || repoUrl.startsWith("https://") ? repoUrl : `https://${repoUrl}`;
              const parsed = new URL(candidate);
              const hostname = parsed.hostname.toLowerCase();
              if (!(hostname === "github.com" || hostname.endsWith(".github.com"))) {
                return res.status(400).json({ error: "Solo se permiten URLs de GitHub en repoUrl" });
              }
              if (parsed.username || parsed.password) {
                return res.status(400).json({ error: "URL inv\xE1lida en repoUrl" });
              }
              const parts = parsed.pathname.split("/").filter(Boolean);
              if (parts.length < 2) {
                return res.status(400).json({ error: "URL de GitHub inv\xE1lida, debe apuntar a owner/repo" });
              }
              const owner = parts[0];
              const repo = parts[1];
              req.body.repoUrl = `https://github.com/${owner}/${repo}`;
            } catch (e) {
              return res.status(400).json({ error: "Formato inv\xE1lido. Use 'owner/repo' o una URL v\xE1lida de GitHub" });
            }
          }
        }
        if (repoUrl !== void 0) {
          await prisma18.system_config.upsert({
            where: { key: "github_repo_url" },
            create: {
              id: randomUUID4(),
              key: "github_repo_url",
              value: repoUrl,
              description: "URL del repositorio de GitHub para actualizaciones",
              is_editable: true,
              updatedAt: /* @__PURE__ */ new Date()
            },
            update: { value: repoUrl }
          });
        }
        if (branch !== void 0) {
          await prisma18.system_config.upsert({
            where: { key: "github_branch" },
            create: {
              id: randomUUID4(),
              key: "github_branch",
              value: branch,
              description: "Rama de GitHub para actualizaciones",
              is_editable: true,
              updatedAt: /* @__PURE__ */ new Date()
            },
            update: { value: branch }
          });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 configuraci\xF3n de GitHub",
          modulo: "admin",
          detalles: `Repositorio: ${repoUrl || "sin cambios"}, Rama: ${branch || "sin cambios"}`
        });
        res.json({
          success: true,
          message: "Configuraci\xF3n de GitHub actualizada exitosamente",
          repoUrl,
          branch
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/version",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const currentVersion = await getCurrentVersion();
        const repoConfig = await prisma18.system_config.findUnique({
          where: { key: "github_repo_url" }
        });
        if (!repoConfig?.value) {
          return res.json({
            current: currentVersion,
            latest: null,
            updateAvailable: false,
            configured: false,
            message: "Repositorio de GitHub no configurado"
          });
        }
        const match = repoConfig.value.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
          return res.json({
            current: currentVersion,
            latest: null,
            updateAvailable: false,
            configured: false,
            message: "URL de GitHub no v\xE1lida"
          });
        }
        const [, owner, repo] = match;
        const versionInfo = await checkForUpdates(owner, repo.replace(".git", ""));
        res.json({
          ...versionInfo,
          configured: true
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/system/update",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const gitCheck = await verifyGitSetup();
        if (!gitCheck.installed) {
          return res.status(400).json({
            error: "Git no est\xE1 instalado",
            message: gitCheck.message
          });
        }
        if (!gitCheck.configured) {
          return res.status(400).json({
            error: "Repositorio Git no configurado",
            message: gitCheck.message
          });
        }
        performSystemUpdate(req.user.id, (progress) => {
          const io3 = req.app.io;
          if (io3) {
            io3.to(`user:${req.user.id}`).emit("update:progress", progress);
          }
        }).then((result) => {
          const io3 = req.app.io;
          if (io3) {
            io3.to(`user:${req.user.id}`).emit("update:complete", result);
          }
        }).catch((error) => {
          const io3 = req.app.io;
          if (io3) {
            io3.to(`user:${req.user.id}`).emit("update:error", { error: error.message });
          }
        });
        res.json({
          success: true,
          message: "Actualizaci\xF3n iniciada. Recibir\xE1 notificaciones del progreso."
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/backups",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const backups = await listBackups();
        res.json(backups);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/system/backups",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const backup = await createSystemBackup(req.user.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Cre\xF3 backup del sistema",
          modulo: "sistema",
          detalles: `Backup ID: ${backup.id}, Versi\xF3n: ${backup.version}`
        });
        res.json(backup);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/system/restore/:id",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        await restoreFromBackup(req.params.id, req.user.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Restaur\xF3 sistema desde backup",
          modulo: "sistema",
          detalles: `Backup ID: ${req.params.id}`
        });
        res.json({
          success: true,
          message: "Sistema restaurado exitosamente. Reinicie el servidor para aplicar los cambios."
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/updates",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const updates = await getUpdateHistory(20);
        res.json(updates);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/roles",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const roles = await prismaStorage.getAllRoles();
        res.json(roles);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/roles/:id",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const role = await prismaStorage.getRoleById(req.params.id);
        if (!role) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }
        res.json(role);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/roles",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const { name, description } = req.body;
        if (!name) {
          return res.status(400).json({ error: "El nombre del rol es requerido" });
        }
        const role = await prismaStorage.createRole({ name, description });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el rol: ${name}`,
          modulo: "admin",
          detalles: description || ""
        });
        res.status(201).json(role);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(400).json({ error: "Ya existe un rol con ese nombre" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/roles/:id",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const { name, description } = req.body;
        const role = await prismaStorage.updateRole(req.params.id, { name, description });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el rol: ${role.name}`,
          modulo: "admin",
          detalles: JSON.stringify({ name, description })
        });
        res.json(role);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(400).json({ error: "Ya existe un rol con ese nombre" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/roles/:id",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        await prismaStorage.deleteRole(req.params.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 un rol`,
          modulo: "admin",
          detalles: `ID: ${req.params.id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/permissions",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const permissions = await prismaStorage.getAllPermissions();
        res.json(permissions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/roles/:id/permissions",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const { permissionIds } = req.body;
        if (!Array.isArray(permissionIds)) {
          return res.status(400).json({ error: "permissionIds debe ser un array" });
        }
        const role = await prismaStorage.assignPermissionsToRole(req.params.id, permissionIds);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Asign\xF3 permisos al rol: ${role?.name}`,
          modulo: "admin",
          detalles: `${permissionIds.length} permisos asignados`
        });
        res.json(role);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/audit",
    authenticateToken2,
    checkPermission("audits:read"),
    async (req, res) => {
      try {
        const { table, recordId, userId } = req.query;
        let audits;
        if (table && recordId) {
          audits = await prismaStorage.getAuditEntriesByRecord(table, recordId);
        } else if (table) {
          audits = await prismaStorage.getAuditEntriesByTable(table);
        } else if (userId) {
          audits = await prismaStorage.getAuditEntriesByUser(userId);
        } else {
          audits = await prismaStorage.getAllAuditEntries();
        }
        const usersMap = /* @__PURE__ */ new Map();
        const users = await prismaStorage.getAllUsers();
        users.forEach((u) => usersMap.set(u.id, u));
        const auditsWithUsers = audits.map((audit) => ({
          ...audit,
          usuario: usersMap.get(audit.usuarioId)
        }));
        res.json(auditsWithUsers);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/search",
    authenticateToken2,
    async (req, res) => {
      try {
        const { q } = req.query;
        if (!q || typeof q !== "string" || q.trim().length < 2) {
          return res.status(400).json({ error: "Consulta de b\xFAsqueda demasiado corta (m\xEDnimo 2 caracteres)" });
        }
        console.log("About to call globalSearch with:", q.trim());
        const results = await prismaStorage.globalSearch(q.trim());
        console.log("globalSearch returned successfully");
        console.log("Search results:", {
          clientes: results.clientes.length,
          tareas: results.tareas.length,
          impuestos: results.impuestos.length,
          manuales: results.manuales.length
        });
        const serializedResults = JSON.parse(JSON.stringify(results));
        res.json(serializedResults);
      } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/tax-requirements", authenticateToken2, async (req, res) => {
    try {
      const requirements = await prisma18.client_tax_requirements.findMany({
        include: { clients: true }
      });
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tax-requirements", authenticateToken2, checkPermission("taxes:create"), async (req, res) => {
    try {
      const { clientId, taxModelCode, impuesto, required = true, note, colorTag, detalle } = req.body;
      const requirement = await prisma18.client_tax_requirements.create({
        data: {
          id: randomUUID4(),
          clientId,
          taxModelCode: taxModelCode || null,
          impuesto: impuesto || taxModelCode || "SIN_ESPECIFICAR",
          detalle: detalle || null,
          required,
          note: note || null,
          color_tag: colorTag || null
        },
        include: { clients: true }
      });
      res.json(requirement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tax-requirements/:id/toggle", authenticateToken2, checkPermission("taxes:update"), async (req, res) => {
    try {
      const { id } = req.params;
      const current = await prisma18.client_tax_requirements.findUnique({ where: { id } });
      if (!current) {
        return res.status(404).json({ error: "Requisito no encontrado" });
      }
      const updated = await prisma18.client_tax_requirements.update({
        where: { id },
        data: { required: !current.required },
        include: { clients: true }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tax-requirements/:id", authenticateToken2, checkPermission("taxes:update"), async (req, res) => {
    try {
      const { id } = req.params;
      const { note, color_tag: colorTag } = req.body;
      const updated = await prisma18.client_tax_requirements.update({
        where: { id },
        data: { note, color_tag: colorTag },
        include: { clients: true }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/fiscal-periods", authenticateToken2, async (req, res) => {
    try {
      const periods = await prisma18.fiscal_periods.findMany({
        orderBy: [{ year: "desc" }, { quarter: "asc" }]
      });
      res.json(periods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get(
    "/api/tax/periods",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const year = req.query.year ? parseInt(req.query.year, 10) : void 0;
        const periods = await prismaStorage.getFiscalPeriodsSummary(year);
        res.json(periods);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/periods/:id",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const period = await prismaStorage.getFiscalPeriod(req.params.id);
        if (!period) {
          return res.status(404).json({ error: "Periodo no encontrado" });
        }
        res.json(period);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/periods/create-year",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const year = parseInt(req.body?.year, 10);
        if (!Number.isFinite(year)) {
          return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        }
        const periods = await prismaStorage.createFiscalYear(year);
        res.json(periods);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/periods/create",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { year, kind, label, quarter, startsAt, endsAt } = req.body;
        if (!year || !kind || !label || !startsAt || !endsAt) {
          return res.status(400).json({ error: "Faltan campos obligatorios" });
        }
        const summary = await prismaStorage.createFiscalPeriod({
          year: parseInt(year, 10),
          kind,
          label,
          quarter: quarter ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt)
        });
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/tax/periods/:id/status",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
          return res.status(400).json({ error: "Estado requerido" });
        }
        const updated = await prismaStorage.toggleFiscalPeriodStatus(id, status, req.user?.id);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/calendar",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const y = Number(req.query.year);
        const model = req.query.model?.toUpperCase();
        const periodicity = req.query.periodicity?.toLowerCase();
        const status = req.query.status?.toUpperCase();
        const where = {};
        if (!Number.isNaN(y)) where.year = y;
        if (model) where.modelCode = model;
        if (periodicity === "monthly") where.period = { startsWith: "M" };
        if (periodicity === "quarterly") where.period = { in: ["1T", "2T", "3T", "4T"] };
        if (periodicity === "annual") where.period = "ANUAL";
        if (periodicity === "special") where.period = { in: ["M04", "M10", "M12"] };
        if (status && ["PENDIENTE", "ABIERTO", "CERRADO"].includes(status)) where.status = status;
        const list = await prisma18.tax_calendar.findMany({ where, orderBy: [{ endDate: "asc" }] });
        const rows = list.map((r) => ({
          id: r.id,
          modelCode: r.modelCode,
          period: r.period,
          year: r.year,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          daysToStart: r.days_to_start,
          daysToEnd: r.days_to_end
        }));
        res.json(rows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/calendar",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { modelCode, period, year, startDate, endDate, active = true } = req.body || {};
        if (!modelCode || !period || !year || !startDate || !endDate) {
          return res.status(400).json({ error: "Campos requeridos: modelCode, period, year, startDate, endDate" });
        }
        const parsedYear = Number(year);
        if (!Number.isFinite(parsedYear)) return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        const entry = await prismaStorage.createTaxCalendar({
          modelCode: String(modelCode).toUpperCase(),
          period: String(period).toUpperCase(),
          year: parsedYear,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          active: Boolean(active)
        });
        res.status(201).json(entry);
      } catch (error) {
        if (error?.code === "P2002") {
          return res.status(409).json({ error: "Ya existe un periodo para ese Modelo/Periodo/A\xF1o" });
        }
        res.status(500).json({ error: error?.message || "Error desconocido" });
      }
    }
  );
  app2.patch(
    "/api/tax/calendar/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const data = {};
        if (req.body.startDate) data.startDate = new Date(req.body.startDate);
        if (req.body.endDate) data.endDate = new Date(req.body.endDate);
        if (typeof req.body.active !== "undefined") data.active = Boolean(req.body.active);
        const updated = await prismaStorage.updateTaxCalendar(req.params.id, data);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/tax/calendar/:id",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        const ok = await prismaStorage.deleteTaxCalendar(req.params.id);
        if (!ok) return res.status(404).json({ error: "Periodo no encontrado" });
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/calendar/create-year",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const y = Number(req.body?.year);
        if (!Number.isFinite(y)) return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        const created = await prismaStorage.cloneTaxCalendarYear(y);
        res.json({ created: created.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/calendar/seed-year",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const y = Number(req.body?.year);
        if (!Number.isFinite(y)) return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        const model = req.body?.model?.toUpperCase();
        const periodicity = req.body?.periodicity?.toLowerCase();
        const result = await prismaStorage.seedTaxCalendarYear(y, {
          modelCode: model,
          periodicity: periodicity === "monthly" || periodicity === "quarterly" || periodicity === "annual" || periodicity === "special" ? periodicity : "all"
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/calendar/:year.ics",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const y = Number(req.params.year);
        if (!Number.isFinite(y)) return res.status(400).send("");
        const rows = await prisma18.tax_calendar.findMany({ where: { year: y }, orderBy: [{ startDate: "asc" }] });
        const toICSDate = (d) => {
          const pad = (n) => String(n).padStart(2, "0");
          const yyyy = d.getUTCFullYear();
          const mm = pad(d.getUTCMonth() + 1);
          const dd = pad(d.getUTCDate());
          const hh = pad(d.getUTCHours());
          const mi = pad(d.getUTCMinutes());
          const ss = pad(d.getUTCSeconds());
          return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
        };
        const lines = [];
        lines.push("BEGIN:VCALENDAR");
        lines.push("VERSION:2.0");
        lines.push("PRODID:-//Asesoria La Llave//Calendario AEAT//ES");
        for (const r of rows) {
          const dtStart = toICSDate(r.startDate);
          const dtEnd = toICSDate(r.endDate);
          const summary = `${r.modelCode} ${r.period}/${r.year}`;
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:${r.id}@asesoria-la-llave`);
          lines.push(`DTSTAMP:${toICSDate(/* @__PURE__ */ new Date())}`);
          lines.push(`DTSTART:${dtStart}`);
          lines.push(`DTEND:${dtEnd}`);
          lines.push(`SUMMARY:${summary}`);
          lines.push("END:VEVENT");
        }
        lines.push("END:VCALENDAR");
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.send(lines.join("\r\n"));
      } catch (error) {
        res.status(500).send("");
      }
    }
  );
  app2.get(
    "/api/tax/filings",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const filings = await prismaStorage.getTaxFilings({
          periodId: req.query.periodId,
          status: req.query.status,
          model: req.query.model,
          search: req.query.search
        });
        res.json(filings);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/tax/filings/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const isAdmin = req.user?.roleName === "Administrador";
        const updated = await prismaStorage.updateTaxFiling(
          req.params.id,
          {
            status: req.body.status ?? void 0,
            notes: req.body.notes ?? void 0,
            presentedAt: req.body.presentedAt ? new Date(req.body.presentedAt) : req.body.presentedAt === null ? null : void 0,
            assigneeId: req.body.assigneeId ?? void 0
          },
          { allowClosed: isAdmin }
        );
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  setInterval(() => {
    checkAndSendReminders(prismaStorage).catch(console.error);
  }, 60 * 60 * 1e3);
  registerEpicTasksRoutes(app2);
  const httpServer = createServer(app2);
  const io2 = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  io2.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("No token provided"));
      }
      const decoded = jwt3.verify(token, JWT_SECRET2);
      const user = await prismaStorage.getUser(decoded.id);
      if (!user) {
        return next(new Error("User not found"));
      }
      const userWithRole = await prismaStorage.getUserWithPermissions(decoded.id);
      const roleName = userWithRole?.roles?.name || "Solo Lectura";
      socket.data.user = {
        id: user.id,
        username: user.username,
        role: roleName,
        roleId: user.roleId
      };
      next();
    } catch (error) {
      console.error("Socket.IO auth error:", error);
      next(new Error("Invalid token"));
    }
  });
  app2.get(
    "/api/notification-templates",
    authenticateToken2,
    checkPermission("notifications:view_history"),
    async (req, res) => {
      try {
        const templates = await prismaStorage.getAllNotificationTemplates();
        res.json(templates);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/notification-templates",
    authenticateToken2,
    checkPermission("notifications:create"),
    async (req, res) => {
      try {
        const { nombre, asunto, contenidoHTML, variables, tipo, activa } = req.body;
        if (!nombre || !asunto || !contenidoHTML) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }
        const template = await prismaStorage.createNotificationTemplate({
          nombre,
          asunto,
          contenidoHTML,
          variables: variables || null,
          tipo: tipo || "INFORMATIVO",
          activa: activa !== void 0 ? activa : true,
          creadoPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Cre\xF3 plantilla de notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Plantilla: ${nombre}`
        });
        res.json(template);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/notification-templates/:id",
    authenticateToken2,
    checkPermission("notifications:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        const template = await prismaStorage.updateNotificationTemplate(id, updates);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 plantilla de notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Plantilla ID: ${id}`
        });
        res.json(template);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/notification-templates/:id",
    authenticateToken2,
    checkPermission("notifications:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await prismaStorage.deleteNotificationTemplate(id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Elimin\xF3 plantilla de notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Plantilla ID: ${id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/notifications/send",
    authenticateToken2,
    checkPermission("notifications:send"),
    async (req, res) => {
      try {
        const { plantillaId, smtpAccountId, destinatarios, asunto, contenido } = req.body;
        if (!destinatarios || destinatarios.length === 0) {
          return res.status(400).json({ error: "Debe seleccionar al menos un destinatario" });
        }
        const log2 = await prismaStorage.createNotificationLog({
          plantillaId: plantillaId || null,
          smtpAccountId: smtpAccountId || null,
          destinatarios,
          asunto,
          contenido,
          tipo: "EMAIL",
          estado: "ENVIADO",
          fechaEnvio: /* @__PURE__ */ new Date(),
          enviadoPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Envi\xF3 notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `${destinatarios.length} destinatarios`
        });
        res.json(log2);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/notifications/history",
    authenticateToken2,
    checkPermission("notifications:view_history"),
    async (req, res) => {
      try {
        const logs = await prismaStorage.getAllNotificationLogs();
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/notifications/scheduled",
    authenticateToken2,
    checkPermission("notifications:view_history"),
    async (req, res) => {
      try {
        const scheduled = await prismaStorage.getAllScheduledNotifications();
        res.json(scheduled);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/notifications/schedule",
    authenticateToken2,
    checkPermission("notifications:send"),
    async (req, res) => {
      try {
        const { plantillaId, smtpAccountId, destinatariosSeleccionados, fechaProgramada, recurrencia } = req.body;
        if (!plantillaId || !fechaProgramada) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }
        const notification = await prismaStorage.createScheduledNotification({
          plantillaId,
          smtpAccountId: smtpAccountId || null,
          destinatariosSeleccionados,
          fechaProgramada: new Date(fechaProgramada),
          estado: "PENDIENTE",
          recurrencia: recurrencia || "NINGUNA",
          creadoPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Program\xF3 notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Fecha: ${fechaProgramada}`
        });
        res.json(notification);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/notifications/scheduled/:id",
    authenticateToken2,
    checkPermission("notifications:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.fechaProgramada) {
          updates.fechaProgramada = new Date(updates.fechaProgramada);
        }
        const notification = await prismaStorage.updateScheduledNotification(id, updates);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 notificaci\xF3n programada",
          modulo: "notificaciones",
          detalles: `Notificaci\xF3n ID: ${id}`
        });
        res.json(notification);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/notifications/scheduled/:id",
    authenticateToken2,
    checkPermission("notifications:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await prismaStorage.deleteScheduledNotification(id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Elimin\xF3 notificaci\xF3n programada",
          modulo: "notificaciones",
          detalles: `Notificaci\xF3n ID: ${id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  io2.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`Usuario conectado: ${user.username} (${socket.id})`);
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
    let heartbeatInterval;
    let lastHeartbeat = Date.now();
    heartbeatInterval = setInterval(async () => {
      try {
        await prisma18.sessions.updateMany({
          where: { socket_id: socket.id, ended_at: null },
          data: { last_seen_at: /* @__PURE__ */ new Date() }
        });
        if (socket.connected) {
          socket.emit("heartbeat", { timestamp: Date.now() });
        } else {
          clearInterval(heartbeatInterval);
        }
      } catch (err) {
        console.error("Error en heartbeat:", err);
      }
    }, 3e4);
    socket.on("heartbeat-response", async () => {
      lastHeartbeat = Date.now();
      try {
        await prisma18.sessions.updateMany({
          where: { socket_id: socket.id, ended_at: null },
          data: { last_seen_at: /* @__PURE__ */ new Date() }
        });
      } catch (err) {
        console.error("Error actualizando heartbeat:", err);
      }
    });
    const connectedCount = io2.sockets.sockets.size;
    io2.emit("online-count", connectedCount);
    io2.emit("user:connected", {
      userId: user.id,
      username: user.username,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    (async () => {
      try {
        const ipHeader = socket.handshake.headers["x-forwarded-for"] || "";
        const ip = ipHeader ? ipHeader.split(",")[0].trim() : socket.handshake.address;
        io2.to("role:Administrador").emit("session:new", {
          userId: user.id,
          username: user.username,
          ip,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          socket_id: socket.id
        });
      } catch (err) {
        console.error("Error notificando nueva sesi\xF3n:", err);
      }
    })();
    (async () => {
      try {
        const ipHeader = socket.handshake.headers["x-forwarded-for"] || "";
        const ip = ipHeader ? ipHeader.split(",")[0].trim() : socket.handshake.address;
        const userAgent = String(socket.handshake.headers["user-agent"] || "");
        await prisma18.sessions.create({
          data: {
            id: randomUUID4(),
            userId: user.id,
            socket_id: socket.id,
            ip,
            user_agent: userAgent,
            last_seen_at: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date()
          }
        });
        console.log(`\u2705 Sesi\xF3n creada para usuario ${user.username} (${socket.id})`);
      } catch (err) {
        console.error("\u274C Error al crear sesi\xF3n:", err);
      }
    })();
    socket.on("get:online-count", () => {
      const connectedCount2 = io2.sockets.sockets.size;
      socket.emit("online-count", connectedCount2);
    });
    socket.on("disconnect", (reason) => {
      console.log(`Usuario desconectado: ${user.username} - Raz\xF3n: ${reason}`);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      const isTemporaryDisconnect = reason === "client namespace disconnect" || reason === "server namespace disconnect" || reason === "ping timeout";
      if (!isTemporaryDisconnect) {
        const connectedCount2 = io2.sockets.sockets.size;
        io2.emit("online-count", connectedCount2);
        io2.emit("user:disconnected", {
          userId: user.id,
          username: user.username,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          reason
        });
        (async () => {
          try {
            await prisma18.sessions.updateMany({
              where: { socket_id: socket.id, ended_at: null },
              data: { ended_at: /* @__PURE__ */ new Date(), last_seen_at: /* @__PURE__ */ new Date() }
            });
            console.log(`\u2705 Sesi\xF3n finalizada para usuario ${user.username} (${socket.id}) - Raz\xF3n: ${reason}`);
          } catch (err) {
            console.error("\u274C Error al finalizar sesi\xF3n:", err);
          }
        })();
      } else {
        console.log(`\u{1F504} Desconexi\xF3n temporal para usuario ${user.username} - No cerrando sesi\xF3n`);
      }
    });
  });
  httpServer.io = io2;
  setSocketIO(io2);
  return httpServer;
}

// server/vite.ts
import express6 from "express";
import fs10 from "fs";
import path14 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path13 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path13.resolve(import.meta.dirname, "client", "src"),
      "@shared": path13.resolve(import.meta.dirname, "shared"),
      "@assets": path13.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path13.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path13.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path14.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs10.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path14.resolve(import.meta.dirname, "public");
  if (!fs10.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express6.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path14.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import helmet from "helmet";
import cors from "cors";
import { PrismaClient as PrismaClient20 } from "@prisma/client";

// server/jobs.ts
import cron from "node-cron";
import { PrismaClient as PrismaClient19 } from "@prisma/client";
import nodemailer4 from "nodemailer";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
var prisma19;
function initializeJobs(client) {
  prisma19 = client;
}
var transporter = nodemailer4.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : void 0
});
var isMailConfigured = false;
transporter.verify((error, success) => {
  if (error) {
    console.warn("\u26A0\uFE0F  SMTP no configurado - emails deshabilitados:", error.message);
    isMailConfigured = false;
  } else {
    console.log("\u2705 SMTP configurado correctamente");
    isMailConfigured = true;
  }
});
async function sendEmail(to, subject, html) {
  if (!isMailConfigured) {
    console.log(`\u{1F4E7} Email no enviado (SMTP no configurado): ${to} - ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html
    });
    console.log(`\u2705 Email enviado: ${to} - ${subject}`);
  } catch (error) {
    console.error(`\u274C Error enviando email a ${to}:`, error);
  }
}
var taskRemindersJob = cron.createTask("0 9 * * *", async () => {
  console.log("\u{1F514} Ejecutando job: recordatorios de tareas");
  try {
    const tomorrow = addDays(/* @__PURE__ */ new Date(), 1);
    const nextWeek = addDays(/* @__PURE__ */ new Date(), 7);
    const upcomingTasks = await prisma19.tasks.findMany({
      where: {
        estado: { notIn: ["COMPLETADA"] },
        fecha_vencimiento: {
          gte: /* @__PURE__ */ new Date(),
          lte: nextWeek
        }
      },
      include: {
        clients: true,
        users: true
        // asignado → users
      }
    });
    console.log(`\u{1F4CB} Tareas pr\xF3ximas a vencer: ${upcomingTasks.length}`);
    for (const task of upcomingTasks) {
      if (!task.fecha_vencimiento) continue;
      const diasRestantes = Math.ceil(
        (new Date(task.fecha_vencimiento).getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24)
      );
      if (diasRestantes <= 0) continue;
      const urgencia = diasRestantes <= 1 ? "URGENTE" : diasRestantes <= 3 ? "Pr\xF3ximo" : "Recordatorio";
      const color = diasRestantes <= 1 ? "#dc2626" : diasRestantes <= 3 ? "#f59e0b" : "#3b82f6";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">${urgencia}: Tarea pr\xF3xima a vencer</h2>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <h3>${task.titulo}</h3>
            <p><strong>Cliente:</strong> ${task.clients?.razonSocial || "Sin cliente"}</p>
            <p><strong>Descripci\xF3n:</strong> ${task.descripcion || "Sin descripci\xF3n"}</p>
            <p><strong>Vence:</strong> ${format(new Date(task.fecha_vencimiento), "dd 'de' MMMM, yyyy", { locale: es })}</p>
            <p><strong>D\xEDas restantes:</strong> ${diasRestantes}</p>
            <p><strong>Prioridad:</strong> ${task.prioridad}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Este es un recordatorio autom\xE1tico del sistema Asesor\xEDa La Llave.
            </p>
          </div>
        </div>
      `;
      if (task.users?.email) {
        await sendEmail(
          task.users.email,
          `${urgencia}: ${task.titulo} - Vence en ${diasRestantes} d\xEDa(s)`,
          html
        );
      }
    }
  } catch (error) {
    console.error("\u274C Error en job de recordatorios de tareas:", error);
  }
});
var taxRemindersJob = cron.createTask("0 8 * * *", async () => {
  console.log("\u{1F514} Ejecutando job: recordatorios fiscales");
  try {
    const now = /* @__PURE__ */ new Date();
    const nextMonth = addDays(now, 30);
    const clientes = await prisma19.clients.findMany({
      include: {
        clientTaxes: {
          include: {
            period: {
              include: {
                modelo: true
              }
            }
          }
        }
      }
    });
    console.log(`\u{1F4CA} Clientes con impuestos: ${clientes.length}`);
    for (const cliente of clientes) {
      if (!cliente.clientTaxes || cliente.clientTaxes.length === 0) continue;
      for (const clientTax of cliente.clientTaxes) {
        const period = clientTax.period;
        if (!period) continue;
        const diasRestantes = Math.ceil(
          (new Date(period.finPresentacion).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)
        );
        if ([7, 3, 1].includes(diasRestantes)) {
          const color = diasRestantes === 1 ? "#dc2626" : diasRestantes === 3 ? "#f59e0b" : "#3b82f6";
          const urgencia = diasRestantes === 1 ? "URGENTE" : "Recordatorio";
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">${urgencia}: Obligaci\xF3n Fiscal Pr\xF3xima</h2>
              </div>
              <div style="padding: 20px; background: #f9fafb;">
                <h3>${period.modelo.nombre} - ${period.anio}</h3>
                <p><strong>Cliente:</strong> ${cliente.razonSocial}</p>
                <p><strong>NIF/CIF:</strong> ${cliente.nifCif}</p>
                <p><strong>Periodo:</strong> ${period.trimestre ? `Trimestre ${period.trimestre}` : period.mes ? `Mes ${period.mes}` : period.anio}</p>
                <p><strong>Fecha l\xEDmite:</strong> ${format(new Date(period.finPresentacion), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                <p><strong>D\xEDas restantes:</strong> ${diasRestantes}</p>
                <p><strong>Estado:</strong> ${clientTax.estado}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px;">
                  Este es un recordatorio autom\xE1tico del sistema Asesor\xEDa La Llave.
                </p>
              </div>
            </div>
          `;
          if (cliente.email) {
            await sendEmail(
              cliente.email,
              `${urgencia}: ${period.modelo.nombre} - Vence en ${diasRestantes} d\xEDa(s)`,
              html
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("\u274C Error en job de recordatorios fiscales:", error);
  }
});
var taxCalendarRefreshJob = cron.createTask("0 0 * * *", async () => {
  if (!prisma19) {
    console.warn("\u26A0\uFE0F  taxCalendarRefreshJob: Prisma no inicializado");
    return;
  }
  console.log("\u{1F5D3}\uFE0F  Ejecutando job: refresco calendario fiscal");
  try {
    const entries = await prisma19.tax_calendar.findMany();
    let updated = 0;
    for (const entry of entries) {
      const derived = calculateDerivedFields(entry.startDate, entry.endDate);
      if (entry.status !== derived.status || entry.days_to_start !== derived.daysToStart || entry.days_to_end !== derived.daysToEnd) {
        await prisma19.tax_calendar.update({
          where: { id: entry.id },
          data: {
            status: derived.status,
            days_to_start: derived.daysToStart,
            days_to_end: derived.daysToEnd
          }
        });
        updated++;
      }
    }
    console.log(`\u2705 Calendario fiscal actualizado (${updated} registros)`);
  } catch (error) {
    console.error("\u274C Error actualizando calendario fiscal:", error);
  }
});
var ensureDeclarationsDailyJob = cron.createTask("10 1 * * *", async () => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  try {
    const result = await prismaStorage.ensureDeclarationsForYear(year);
    console.log(`\u{1F9E9} ensureDeclarationsDailyJob: a\xF1o ${year} => creadas ${result.created}, omitidas ${result.skipped}`);
  } catch (e) {
    console.error("\u274C Error en ensureDeclarationsDailyJob:", e);
  }
});
var cleanupSessionsJob = cron.createTask("0 * * * *", async () => {
  console.log("\u{1F9F9} Ejecutando job: limpieza de sesiones");
  try {
    const prisma21 = new PrismaClient19();
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const closedSessionsResult = await prisma21.sessions.deleteMany({
      where: {
        ended_at: {
          not: null,
          lt: sevenDaysAgo
        }
      }
    });
    const twoHoursAgo = /* @__PURE__ */ new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    const inactiveSessionsResult = await prisma21.sessions.updateMany({
      where: {
        ended_at: null,
        last_seen_at: { lt: twoHoursAgo }
      },
      data: {
        ended_at: /* @__PURE__ */ new Date()
      }
    });
    console.log(`\u2705 Sesiones limpias: ${closedSessionsResult.count} eliminadas, ${inactiveSessionsResult.count} marcadas como inactivas`);
    await prisma21.$disconnect();
  } catch (error) {
    console.error("\u274C Error en job de limpieza:", error);
  }
});
var backupDatabaseJob = cron.createTask("0 3 * * *", async () => {
  console.log("\u{1F4BE} Ejecutando job: backup de base de datos");
  try {
    const { spawn } = __require("child_process");
    const path15 = __require("path");
    const backupScript = path15.join(process.cwd(), "scripts", "backup.sh");
    const backup = spawn("bash", [backupScript], {
      env: process.env,
      stdio: "inherit"
    });
    backup.on("close", (code) => {
      if (code === 0) {
        console.log("\u2705 Backup completado exitosamente");
      } else {
        console.error(`\u274C Backup fall\xF3 con c\xF3digo: ${code}`);
      }
    });
  } catch (error) {
    console.error("\u274C Error en job de backup:", error);
  }
});
function startAllJobs() {
  if (!prisma19) {
    throw new Error(
      "\u274C JOBS ERROR: Prisma client no inicializado.\n   Debe llamar a initializeJobs(prisma) antes de startAllJobs().\n   Ver server/index.ts para el orden correcto de inicializaci\xF3n."
    );
  }
  const isDev2 = process.env.NODE_ENV !== "production";
  const enableCronJobs = process.env.ENABLE_CRON_JOBS === "true";
  if (!isDev2 && !enableCronJobs) {
    console.warn(
      "\u26A0\uFE0F  ADVERTENCIA: Cron jobs deshabilitados en este entorno.\n   Los Autoscale Deployments no soportan procesos persistentes.\n   Use Scheduled Deployments de Replit para tareas programadas.\n   O configure ENABLE_CRON_JOBS=true en Reserved VM Deployments.\n   Documentaci\xF3n: https://docs.replit.com/hosting/deployments/scheduled-deployments"
    );
    return;
  }
  console.log("\u{1F680} Iniciando jobs programados...");
  taskRemindersJob.start();
  console.log("  \u2713 Recordatorios de tareas (09:00 diario)");
  taxRemindersJob.start();
  console.log("  \u2713 Recordatorios fiscales (08:00 diario)");
  cleanupSessionsJob.start();
  console.log("  \u2713 Limpieza de sesiones (cada hora)");
  backupDatabaseJob.start();
  console.log("  \u2713 Backup autom\xE1tico (03:00 diario)");
  console.log("\u2705 Todos los jobs activos");
}
function stopAllJobs() {
  if (!prisma19) {
    throw new Error("Jobs no inicializados: debe llamar initializeJobs(prisma) primero");
  }
  taskRemindersJob.stop();
  taxRemindersJob.stop();
  cleanupSessionsJob.stop();
  backupDatabaseJob.stop();
  console.log("\u{1F6D1} Todos los jobs detenidos");
}

// server/index.ts
import bcrypt2 from "bcrypt";

// server/middleware/security-validation.ts
function validateJWTSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !jwtSecret) {
    throw new Error(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u274C ERROR CR\xCDTICO DE SEGURIDAD: JWT_SECRET NO CONFIGURADO             \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  En producci\xF3n, JWT_SECRET es OBLIGATORIO y debe ser una cadena      \u2551
\u2551  aleatoria fuerte de al menos 64 caracteres.                         \u2551
\u2551                                                                       \u2551
\u2551  Configura JWT_SECRET en tu archivo .env con un valor \xFAnico:         \u2551
\u2551                                                                       \u2551
\u2551  Genera uno con:                                                      \u2551
\u2551    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  \u2551
\u2551                                                                       \u2551
\u2551  O:                                                                   \u2551
\u2551    openssl rand -hex 64                                               \u2551
\u2551                                                                       \u2551
\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  }
  const forbiddenSecrets = [
    "your-secret-key-change-this-in-production",
    "your-secret-key",
    "change-this-in-production",
    "change_this_in_production",
    "secret",
    "jwt-secret",
    "jwt_secret",
    "123456",
    "password",
    "admin",
    "test",
    "development",
    "prod",
    "production"
  ];
  if (jwtSecret && forbiddenSecrets.some((forbidden) => jwtSecret.toLowerCase().includes(forbidden))) {
    throw new Error(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u274C ERROR CR\xCDTICO DE SEGURIDAD: JWT_SECRET INSEGURO                   \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  El JWT_SECRET actual contiene un valor de ejemplo o predecible.     \u2551
\u2551  Esto compromete COMPLETAMENTE la seguridad de la aplicaci\xF3n.        \u2551
\u2551                                                                       \u2551
\u2551  Valor detectado: ${jwtSecret.substring(0, 20)}...                    \u2551
\u2551                                                                       \u2551
\u2551  DEBES cambiar JWT_SECRET a un valor aleatorio \xFAnico.                \u2551
\u2551                                                                       \u2551
\u2551  Genera uno seguro con:                                               \u2551
\u2551    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  \u2551
\u2551                                                                       \u2551
\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  }
  if (isProduction && jwtSecret && jwtSecret.length < 64) {
    throw new Error(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u26A0\uFE0F  ADVERTENCIA DE SEGURIDAD: JWT_SECRET DEMASIADO CORTO            \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  JWT_SECRET actual: ${jwtSecret.length} caracteres                   \u2551
\u2551  Longitud m\xEDnima recomendada: 64 caracteres                          \u2551
\u2551                                                                       \u2551
\u2551  Un secret corto puede ser vulnerable a ataques de fuerza bruta.     \u2551
\u2551                                                                       \u2551
\u2551  Genera uno de 64+ caracteres con:                                   \u2551
\u2551    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  \u2551
\u2551                                                                       \u2551
\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  }
  if (!isProduction && (!jwtSecret || jwtSecret === "your-secret-key-change-this-in-production")) {
    console.warn(
      "\n\u26A0\uFE0F  ADVERTENCIA: Usando JWT_SECRET por defecto en desarrollo.\nEsto es aceptable SOLO en desarrollo local.\nEn producci\xF3n, esto ser\xEDa un ERROR CR\xCDTICO DE SEGURIDAD.\n"
    );
  }
}
function validateSecurityConfig() {
  validateJWTSecret();
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.DATABASE_URL) {
    throw new Error("ERROR CR\xCDTICO: DATABASE_URL no configurado en producci\xF3n");
  }
  if (isProduction && !process.env.FRONTEND_URL) {
    console.warn("\u26A0\uFE0F  ADVERTENCIA: FRONTEND_URL no configurado en producci\xF3n. CORS podr\xEDa fallar.");
  }
  console.log("\u2705 Validaciones de seguridad completadas exitosamente");
}

// server/index.ts
import { randomUUID as randomUUID5 } from "crypto";
var SALT_ROUNDS2 = 10;
var app = express7();
validateSecurityConfig();
app.set("trust proxy", 1);
var dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  logger.fatal("\n\n\u274C FATAL: DATABASE_URL no est\xE1 configurada. Este proyecto requiere una base de datos MariaDB externa.\nPor favor a\xF1ade DATABASE_URL en tu archivo .env con el formato:\n  mysql://USER:PASS@HOST:3306/asesoria_llave?socket_timeout=60&connect_timeout=60\no\n  mariadb://USER:PASS@HOST:3306/asesoria_llave\n\n");
  process.exit(1);
}
if (!/^mysql:\/\//i.test(dbUrl) && !/^mariadb:\/\//i.test(dbUrl)) {
  logger.fatal(`

\u274C FATAL: DATABASE_URL debe usar el driver MySQL/MariaDB (mysql:// o mariadb://).
Valor actual: ${dbUrl}
Aseg\xFArate de usar MariaDB como base de datos externa.

`);
  process.exit(1);
}
try {
  const parsed = new URL(dbUrl);
  const host = parsed.hostname;
  const allowLocal = process.env.ALLOW_LOCAL_DB === "true";
  const localHosts = ["localhost", "127.0.0.1", "::1", "db"];
  if (!allowLocal && localHosts.includes(host)) {
    logger.fatal(`

\u274C FATAL: Se requiere una base de datos MariaDB EXTERNA.
DATABASE_URL apunta a un host local/internal: ${host}
Si quieres permitir uso de una base de datos local (ej. docker-compose) define ALLOW_LOCAL_DB=true en tu .env

`);
    process.exit(1);
  }
} catch (e) {
  logger.warn({ err: e }, "No se pudo parsear DATABASE_URL para validaci\xF3n de host");
}
var prisma20 = new PrismaClient20({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "warn", emit: "event" }
  ]
});
prisma20.$on("query", (e) => {
  dbLogger.debug({ duration: e.duration, query: e.query }, "Database query");
});
prisma20.$on("error", (e) => {
  dbLogger.error({ target: e.target }, e.message);
});
prisma20.$on("warn", (e) => {
  dbLogger.warn({ target: e.target }, e.message);
});
var isDev = process.env.NODE_ENV === "development";
app.use(helmet({
  contentSecurityPolicy: isDev ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536e3,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || (isDev ? "*" : false),
  credentials: true
}));
app.use(express7.json({ limit: "10mb" }));
app.use(express7.urlencoded({ extended: false, limit: "10mb" }));
app.use("/uploads", express7.static("uploads"));
app.use(httpLogger);
app.get("/health", async (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime()
  });
});
app.get("/ready", async (_req, res) => {
  try {
    await prisma20.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ready",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: "connected",
      s3: process.env.S3_ENDPOINT ? "configured" : "not configured",
      smtp: process.env.SMTP_HOST ? "configured" : "not configured"
    });
  } catch (error) {
    logger.error({ err: error }, "Readiness check failed");
    res.status(503).json({
      status: "not ready",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
async function createInitialAdmin() {
  try {
    const adminRole = await prisma20.roles.findFirst({
      where: { name: "Administrador" }
    });
    if (!adminRole) {
      logger.warn("\u26A0\uFE0F  Rol Administrador no encontrado. Ejecuta las migraciones primero.");
      return;
    }
    const existingAdmin = await prisma20.users.findFirst({
      where: { roleId: adminRole.id }
    });
    if (existingAdmin) {
      logger.info("\u2139\uFE0F  Usuario administrador ya existe en el sistema");
      return;
    }
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminUsername || !adminPassword) {
      logger.fatal(
        "\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551  \u274C ERROR CR\xCDTICO: CONFIGURACI\xD3N DE ADMINISTRADOR REQUERIDA           \u2551\n\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563\n\u2551                                                                       \u2551\n\u2551  No existe ning\xFAn usuario administrador en el sistema y las           \u2551\n\u2551  variables de entorno no est\xE1n configuradas.                          \u2551\n\u2551                                                                       \u2551\n\u2551  Configura las siguientes variables en tu archivo .env:              \u2551\n\u2551                                                                       \u2551\n\u2551    ADMIN_EMAIL=tu-email@ejemplo.com                                   \u2551\n\u2551    ADMIN_USERNAME=tu-usuario                                          \u2551\n\u2551    ADMIN_PASSWORD=tu-contrase\xF1a-segura                                \u2551\n\u2551                                                                       \u2551\n\u2551  Requisitos:                                                          \u2551\n\u2551    - Email v\xE1lido (debe contener @)                                   \u2551\n\u2551    - Usuario m\xEDnimo 3 caracteres                                      \u2551\n\u2551    - Contrase\xF1a m\xEDnimo 6 caracteres                                   \u2551\n\u2551                                                                       \u2551\n\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551\n\u2551                                                                       \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n"
      );
      process.exit(1);
    }
    const validationErrors = [];
    const forbiddenPlaceholders = {
      email: [
        "CAMBIAR_ESTE_EMAIL@ejemplo.com",
        "CAMBIAR_ESTE_EMAIL@EJEMPLO.COM",
        "admin@asesoriallave.com",
        // Old example
        "admin@tuempresa.com"
        // Documentation example
      ],
      username: [
        "CAMBIAR_ESTE_USUARIO",
        "admin",
        // Common default
        "administrator",
        // Common default
        "root"
        // Common default
      ],
      password: [
        "CAMBIAR_ESTA_CONTRASE\xD1A_AHORA",
        "CAMBIAR_ESTA_CONTRASENA_AHORA",
        // Without tilde
        "Admin123!",
        // Old example
        "admin123",
        // Common weak
        "password",
        // Common weak
        "password123",
        // Common weak
        "CambiaEstoAhora123!"
        // Documentation example
      ]
    };
    if (forbiddenPlaceholders.email.some((p) => p.toLowerCase() === adminEmail.toLowerCase())) {
      validationErrors.push("- ADMIN_EMAIL es un valor de ejemplo. Usa un email real \xFAnico.");
    }
    if (forbiddenPlaceholders.username.some((p) => p.toLowerCase() === adminUsername.toLowerCase())) {
      validationErrors.push("- ADMIN_USERNAME es un valor de ejemplo o com\xFAn. Usa un usuario \xFAnico.");
    }
    if (forbiddenPlaceholders.password.some((p) => p.toLowerCase() === adminPassword.toLowerCase())) {
      validationErrors.push("- ADMIN_PASSWORD es un valor de ejemplo o muy d\xE9bil. Usa una contrase\xF1a segura \xFAnica.");
    }
    if (adminUsername.length < 3) {
      validationErrors.push("- ADMIN_USERNAME debe tener al menos 3 caracteres");
    }
    if (adminPassword.length < 6) {
      validationErrors.push("- ADMIN_PASSWORD debe tener al menos 6 caracteres");
    }
    if (!adminEmail.includes("@") || !adminEmail.includes(".")) {
      validationErrors.push("- ADMIN_EMAIL debe ser un email v\xE1lido (ejemplo: admin@ejemplo.com)");
    }
    if (validationErrors.length > 0) {
      logger.fatal(
        `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u274C ERROR: CREDENCIALES DE ADMINISTRADOR INV\xC1LIDAS                    \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  ${validationErrors.join("\n\u2551  ")}                                   \u2551
\u2551                                                                       \u2551
\u2551  Corrige las variables en tu archivo .env y reinicia el servidor.    \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
      );
      process.exit(1);
    }
    const existingUser = await prisma20.users.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username: adminUsername }
        ]
      }
    });
    if (existingUser) {
      logger.fatal(
        `
\u274C ERROR: Usuario con email ${adminEmail} o username ${adminUsername} ya existe.
   Usa credenciales diferentes para el administrador inicial.
`
      );
      process.exit(1);
    }
    const hashedPassword = await bcrypt2.hash(adminPassword, SALT_ROUNDS2);
    const adminUser = await prisma20.users.create({
      data: {
        id: randomUUID5(),
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRole.id
      }
    });
    logger.info(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u2705 ADMINISTRADOR INICIAL CREADO EXITOSAMENTE                         \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  Usuario: ${adminUser.username.padEnd(56)} \u2551
\u2551  Email:   ${adminUser.email.padEnd(56)} \u2551
\u2551                                                                       \u2551
\u2551  \u{1F510} IMPORTANTE: Cambia la contrase\xF1a despu\xE9s del primer login         \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  } catch (error) {
    const msg = error?.message || String(error);
    logger.error({ err: error }, "\u26A0\uFE0F No se pudo crear usuario administrador inicial");
    if (msg.includes("Can't reach database server") || msg.includes("PrismaClientInitializationError")) {
      logger.warn("DB no disponible. Continuando arranque para permitir trabajo de frontend/API stub.");
      return;
    }
    return;
  }
}
(async () => {
  await createInitialAdmin();
  initializeJobs(prisma20);
  const enableCronJobs = process.env.ENABLE_CRON_JOBS === "true";
  if (isDev || enableCronJobs) {
    try {
      startAllJobs();
      logger.info("\u2705 Cron jobs iniciados");
    } catch (error) {
      logger.error({ err: error }, "Error iniciando jobs");
    }
  } else {
    logger.info(
      "\u2139\uFE0F  Cron jobs deshabilitados (entorno Autoscale). Use Scheduled Deployments de Replit para tareas programadas."
    );
  }
  const server = await registerRoutes(app);
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logError(err, {
      requestId: req.id,
      method: req.method,
      url: req.url,
      status
    });
    res.status(status).json({
      error: message,
      ...isDev && { stack: err.stack }
    });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions = {
    port,
    host: "0.0.0.0"
  };
  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }
  const maxAttempts = 10;
  let attempts = 0;
  const startPort = port;
  const tryListen = (p) => {
    attempts += 1;
    const opts = { ...listenOptions, port: p };
    const onError = (err) => {
      if (err && err.code === "EADDRINUSE") {
        logger.warn({ port: p }, `Puerto ${p} en uso, intentando puerto ${p + 1}...`);
        if (attempts <= maxAttempts) {
          setTimeout(() => tryListen(p + 1), 200);
          return;
        }
      }
      logger.fatal({ err }, `Error iniciando servidor en puerto ${p}`);
      process.exit(1);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      const addr = server.address();
      const boundPort = typeof addr === "object" && addr ? addr.port : p;
      logger.info({
        port: boundPort,
        env: process.env.NODE_ENV,
        nodeVersion: process.version,
        reusePort: Boolean(listenOptions.reusePort)
      }, `\u{1F680} Server listening on port ${boundPort}`);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(opts);
  };
  tryListen(startPort);
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      logger.info("HTTP server closed");
    });
    if (isDev || enableCronJobs) {
      try {
        stopAllJobs();
      } catch (error) {
        logger.error({ err: error }, "Error deteniendo jobs");
      }
    }
    await prisma20.$disconnect();
    logger.info("Database connection closed");
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
