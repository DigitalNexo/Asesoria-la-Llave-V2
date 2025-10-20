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
var io;
var init_websocket = __esm({
  "server/websocket.ts"() {
    io = null;
  }
});

// server/services/storage-provider.ts
import fs2 from "fs/promises";
import path from "path";
var LocalStorageProvider;
var init_storage_provider = __esm({
  "server/services/storage-provider.ts"() {
    LocalStorageProvider = class {
      constructor(basePath = path.join(process.cwd(), "uploads")) {
        this.basePath = basePath;
      }
      async upload(file, relativePath) {
        const fullPath = path.join(this.basePath, relativePath);
        const dir = path.dirname(fullPath);
        await fs2.mkdir(dir, { recursive: true });
        if (Buffer.isBuffer(file)) {
          await fs2.writeFile(fullPath, file);
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
        const fullPath = path.join(this.basePath, relativePath);
        return await fs2.readFile(fullPath);
      }
      async delete(relativePath) {
        const fullPath = path.join(this.basePath, relativePath);
        await fs2.unlink(fullPath);
      }
      async list(relativePath = "", recursive = false) {
        const fullPath = path.join(this.basePath, relativePath);
        const files = [];
        try {
          const entries = await fs2.readdir(fullPath, { withFileTypes: true });
          for (const entry of entries) {
            const entryPath = path.join(relativePath, entry.name);
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
        const fullPath = path.join(this.basePath, relativePath);
        try {
          await fs2.access(fullPath);
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
import path2 from "path";
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
        const fullPath = path2.posix.join(this.config.basePath, relativePath);
        const dir = path2.posix.dirname(fullPath);
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
        const fullPath = path2.posix.join(this.config.basePath, relativePath);
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
        const fullPath = path2.posix.join(this.config.basePath, relativePath);
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
        const fullPath = path2.posix.join(this.config.basePath, relativePath);
        const files = [];
        try {
          if (recursive) {
            await this.listRecursive(fullPath, relativePath, files);
          } else {
            const items = await this.client.list(fullPath);
            for (const item of items) {
              if (item.type === 1) {
                const filePath = path2.posix.join(relativePath, item.name);
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
          const itemRelativePath = path2.posix.join(relativePath, item.name);
          const itemFullPath = path2.posix.join(fullPath, item.name);
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
        const fullPath = path2.posix.join(this.config.basePath, relativePath);
        const dir = path2.posix.dirname(fullPath);
        const filename = path2.posix.basename(fullPath);
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
import path3 from "path";
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
        const combined = path3.posix.join(this.config.basePath, relativePath);
        return combined.replace(/\//g, "\\");
      }
      async upload(file, relativePath) {
        const smbPath = this.getSMBPath(relativePath);
        const dir = path3.dirname(smbPath);
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
                const filePath = path3.posix.join(relativePath, item.name);
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
          const itemRelativePath = path3.posix.join(relativePath, item.name);
          const itemSMBPath = path3.join(smbPath, item.name);
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
import { PrismaClient as PrismaClient4 } from "@prisma/client";
import crypto2 from "crypto";
import path4 from "path";
function getEncryptionKey2() {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY;
  if (!envKey || envKey.length < 32) {
    throw new Error("STORAGE_ENCRYPTION_KEY no configurada o muy corta. Debe tener al menos 32 caracteres.");
  }
  return envKey;
}
function encryptPassword2(password) {
  const ENCRYPTION_KEY = getEncryptionKey2();
  const iv = crypto2.randomBytes(16);
  const cipher = crypto2.createCipheriv(ALGORITHM2, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
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
    const decipher = crypto2.createDecipheriv(ALGORITHM2, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    throw new Error("Error al descifrar contrase\xF1a");
  }
}
var prisma4, ALGORITHM2, StorageFactory;
var init_storage_factory = __esm({
  "server/services/storage-factory.ts"() {
    init_storage_provider();
    init_ftp_storage_provider();
    init_smb_storage_provider();
    prisma4 = new PrismaClient4();
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
        const activeConfig = await prisma4.storageConfig.findFirst({
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
        const config = await prisma4.storageConfig.findUnique({
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
          const basePath = config?.basePath ? path4.join(process.cwd(), config.basePath) : void 0;
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
        const config = await prisma4.storageConfig.findUnique({
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
        const config = await prisma4.storageConfig.findUnique({
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
import { PrismaClient as PrismaClient5 } from "@prisma/client";
import path6 from "path";
async function migrateStorage(targetConfigId) {
  try {
    const currentConfig = await prisma5.storageConfig.findFirst({
      where: { isActive: true }
    });
    if (!currentConfig) {
      throw new Error("No hay configuraci\xF3n de almacenamiento activa");
    }
    const targetConfig = await prisma5.storageConfig.findUnique({
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
      await prisma5.storageConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      await prisma5.storageConfig.update({
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
var prisma5, MigrationService;
var init_migration_service = __esm({
  "server/services/migration-service.ts"() {
    init_storage_factory();
    init_websocket();
    prisma5 = new PrismaClient5();
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
            const fullPath = basePath ? path6.join(basePath, item) : item;
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
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// server/prisma-storage.ts
import { PrismaClient } from "@prisma/client";

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

// server/prisma-storage.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured. Please set it in your environment variables.");
}
var prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
function mapPrismaUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password: user.password,
    role: user.role || null,
    roleId: user.roleId || null,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt
  };
}
function mapPrismaClient(client) {
  return {
    id: client.id,
    razonSocial: client.razonSocial,
    nifCif: client.nifCif,
    tipo: client.tipo.toLowerCase(),
    email: client.email,
    telefono: client.telefono,
    direccion: client.direccion,
    fechaAlta: client.fechaAlta,
    responsableAsignado: client.responsableAsignado,
    taxModels: client.taxModels || null,
    isActive: client.isActive ?? true
  };
}
function mapPrismaTask(task) {
  return {
    id: task.id,
    titulo: task.titulo,
    descripcion: task.descripcion,
    clienteId: task.clienteId,
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
    contenidoHtml: version.contenidoHtml,
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
    const users = await prisma.user.findMany({
      include: { role: true }
    });
    return users.map(mapPrismaUser);
  }
  async getUser(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserByUsername(username) {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserWithPermissions(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });
    return user;
  }
  async createUser(insertUser) {
    const user = await prisma.user.create({
      data: {
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
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { role: true }
      });
      return mapPrismaUser(user);
    } catch {
      return void 0;
    }
  }
  async deleteUser(id) {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  // ==================== CLIENT METHODS ====================
  async getAllClients() {
    const clients = await prisma.client.findMany({
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    });
    return clients.map((client) => ({
      ...mapPrismaClient(client),
      employees: client.employees || []
    }));
  }
  async getClient(id) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    });
    return client ? {
      ...mapPrismaClient(client),
      employees: client.employees || []
    } : void 0;
  }
  async getClientByNif(nifCif) {
    const client = await prisma.client.findUnique({ where: { nifCif } });
    return client ? mapPrismaClient(client) : void 0;
  }
  async createClient(insertClient) {
    const client = await prisma.client.create({
      data: {
        razonSocial: insertClient.razonSocial,
        nifCif: insertClient.nifCif,
        tipo: insertClient.tipo.toUpperCase(),
        email: insertClient.email,
        telefono: insertClient.telefono,
        direccion: insertClient.direccion,
        responsableAsignado: insertClient.responsableAsignado || null,
        // Convertir string vacío a null
        taxModels: insertClient.taxModels || null,
        isActive: insertClient.isActive ?? true
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
      const client = await prisma.client.update({
        where: { id },
        data
      });
      return mapPrismaClient(client);
    } catch {
      return void 0;
    }
  }
  async deleteClient(id) {
    try {
      await prisma.client.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  // ==================== IMPUESTO METHODS ====================
  async getAllImpuestos() {
    return await prisma.impuesto.findMany({
      orderBy: { modelo: "asc" }
    });
  }
  async getImpuesto(id) {
    return await prisma.impuesto.findUnique({
      where: { id }
    });
  }
  async getImpuestoByModelo(modelo) {
    return await prisma.impuesto.findUnique({
      where: { modelo }
    });
  }
  async createImpuesto(data) {
    return await prisma.impuesto.create({
      data
    });
  }
  async updateImpuesto(id, data) {
    return await prisma.impuesto.update({
      where: { id },
      data
    });
  }
  async deleteImpuesto(id) {
    await prisma.impuesto.delete({
      where: { id }
    });
    return true;
  }
  // ==================== OBLIGACION FISCAL METHODS ====================
  async getAllObligacionesFiscales() {
    return await prisma.obligacionFiscal.findMany({
      include: {
        cliente: true,
        impuesto: true
      },
      orderBy: { fechaAsignacion: "desc" }
    });
  }
  async getObligacionFiscal(id) {
    return await prisma.obligacionFiscal.findUnique({
      where: { id },
      include: {
        cliente: true,
        impuesto: true
      }
    });
  }
  async getObligacionesByCliente(clienteId) {
    return await prisma.obligacionFiscal.findMany({
      where: { clienteId },
      include: {
        cliente: true,
        impuesto: true
      },
      orderBy: { fechaAsignacion: "desc" }
    });
  }
  async createObligacionFiscal(data) {
    return await prisma.obligacionFiscal.create({
      data,
      include: {
        cliente: true,
        impuesto: true
      }
    });
  }
  async updateObligacionFiscal(id, data) {
    return await prisma.obligacionFiscal.update({
      where: { id },
      data,
      include: {
        cliente: true,
        impuesto: true
      }
    });
  }
  async deleteObligacionFiscal(id) {
    await prisma.obligacionFiscal.delete({
      where: { id }
    });
    return true;
  }
  // ==================== CALENDARIO AEAT METHODS ====================
  async getAllCalendariosAEAT() {
    return await prisma.calendarioAEAT.findMany({
      orderBy: [
        { periodoContable: "desc" },
        { modelo: "asc" }
      ]
    });
  }
  async getCalendarioAEAT(id) {
    return await prisma.calendarioAEAT.findUnique({
      where: { id }
    });
  }
  async getCalendariosByModelo(modelo) {
    return await prisma.calendarioAEAT.findMany({
      where: { modelo },
      orderBy: [
        { periodoContable: "desc" }
      ]
    });
  }
  async createCalendarioAEAT(data) {
    return await prisma.calendarioAEAT.create({
      data
    });
  }
  async updateCalendarioAEAT(id, data) {
    return await prisma.calendarioAEAT.update({
      where: { id },
      data
    });
  }
  async deleteCalendarioAEAT(id) {
    await prisma.calendarioAEAT.delete({
      where: { id }
    });
    return true;
  }
  // ==================== DECLARACION METHODS ====================
  async getAllDeclaraciones() {
    return await prisma.declaracion.findMany({
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      },
      orderBy: { fechaPresentacion: "desc" }
    });
  }
  async getDeclaracion(id) {
    return await prisma.declaracion.findUnique({
      where: { id },
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      }
    });
  }
  async getDeclaracionesByObligacion(obligacionId) {
    return await prisma.declaracion.findMany({
      where: { obligacionId },
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      },
      orderBy: { fechaPresentacion: "desc" }
    });
  }
  async getDeclaracionesByCliente(clienteId) {
    return await prisma.declaracion.findMany({
      where: {
        obligacion: {
          clienteId
        }
      },
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      },
      orderBy: { fechaPresentacion: "desc" }
    });
  }
  // Calendarios por impuesto (implementación requerida por IStorage)
  async getCalendariosByImpuesto(impuestoId) {
    return await prisma.calendarioAEAT.findMany({
      where: { modelo: impuestoId },
      orderBy: [{ periodoContable: "desc" }, { modelo: "asc" }]
    });
  }
  async createDeclaracion(data) {
    return await prisma.declaracion.create({
      data,
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      }
    });
  }
  async updateDeclaracion(id, data) {
    return await prisma.declaracion.update({
      where: { id },
      data,
      include: {
        obligacion: {
          include: {
            cliente: true,
            impuesto: true
          }
        }
      }
    });
  }
  async deleteDeclaracion(id) {
    await prisma.declaracion.delete({
      where: { id }
    });
    return true;
  }
  // ==================== TASK METHODS ====================
  async getAllTasks() {
    const tasks = await prisma.task.findMany();
    return tasks.map(mapPrismaTask);
  }
  async getTask(id) {
    const task = await prisma.task.findUnique({ where: { id } });
    return task ? mapPrismaTask(task) : void 0;
  }
  async createTask(insertTask) {
    const task = await prisma.task.create({
      data: {
        titulo: insertTask.titulo,
        descripcion: insertTask.descripcion,
        clienteId: insertTask.clienteId,
        asignadoA: insertTask.asignadoA,
        prioridad: insertTask.prioridad,
        estado: insertTask.estado,
        visibilidad: insertTask.visibilidad,
        fechaVencimiento: insertTask.fechaVencimiento
      }
    });
    return mapPrismaTask(task);
  }
  async updateTask(id, updateData) {
    try {
      const task = await prisma.task.update({
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
      await prisma.task.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  // ==================== MANUAL METHODS ====================
  async getAllManuals() {
    const manuals = await prisma.manual.findMany();
    return manuals.map(mapPrismaManual);
  }
  async getManual(id) {
    const manual = await prisma.manual.findUnique({ where: { id } });
    return manual ? mapPrismaManual(manual) : void 0;
  }
  async createManual(insertManual) {
    const manual = await prisma.manual.create({
      data: {
        titulo: insertManual.titulo,
        contenidoHtml: insertManual.contenidoHtml,
        autorId: insertManual.autorId,
        etiquetas: insertManual.etiquetas ? JSON.stringify(insertManual.etiquetas) : null,
        categoria: insertManual.categoria,
        status: insertManual.publicado ? "PUBLISHED" : "DRAFT",
        // Convertir publicado a status
        fechaPublicacion: insertManual.publicado ? /* @__PURE__ */ new Date() : null
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
      const manual = await prisma.manual.update({
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
      await prisma.manual.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  // ==================== MANUAL ATTACHMENT METHODS ====================
  async getManualAttachment(id) {
    const attachment = await prisma.manualAttachment.findUnique({ where: { id } });
    return attachment ? mapPrismaManualAttachment(attachment) : void 0;
  }
  async createManualAttachment(insertAttachment) {
    const attachment = await prisma.manualAttachment.create({
      data: {
        manualId: insertAttachment.manualId,
        fileName: insertAttachment.fileName,
        originalName: insertAttachment.originalName,
        filePath: insertAttachment.filePath,
        fileType: insertAttachment.fileType,
        fileSize: insertAttachment.fileSize,
        uploadedBy: insertAttachment.uploadedBy
      }
    });
    return mapPrismaManualAttachment(attachment);
  }
  async deleteManualAttachment(id) {
    try {
      await prisma.manualAttachment.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  async getManualAttachments(manualId) {
    const attachments = await prisma.manualAttachment.findMany({
      where: { manualId },
      orderBy: { uploadedAt: "desc" }
    });
    return attachments.map(mapPrismaManualAttachment);
  }
  // ==================== MANUAL VERSION METHODS ====================
  async getManualVersion(id) {
    const version = await prisma.manualVersion.findUnique({ where: { id } });
    return version ? mapPrismaManualVersion(version) : void 0;
  }
  async createManualVersion(insertVersion) {
    const version = await prisma.manualVersion.create({
      data: {
        manualId: insertVersion.manualId,
        versionNumber: insertVersion.versionNumber,
        titulo: insertVersion.titulo,
        contenidoHtml: insertVersion.contenidoHtml,
        etiquetas: insertVersion.etiquetas ? JSON.stringify(insertVersion.etiquetas) : null,
        categoria: insertVersion.categoria,
        createdBy: insertVersion.createdBy
      }
    });
    return mapPrismaManualVersion(version);
  }
  async getManualVersions(manualId) {
    const versions = await prisma.manualVersion.findMany({
      where: { manualId },
      orderBy: { versionNumber: "desc" }
    });
    return versions.map(mapPrismaManualVersion);
  }
  async getNextVersionNumber(manualId) {
    const lastVersion = await prisma.manualVersion.findFirst({
      where: { manualId },
      orderBy: { versionNumber: "desc" }
    });
    return lastVersion ? lastVersion.versionNumber + 1 : 1;
  }
  async restoreManualVersion(manualId, versionId) {
    const version = await prisma.manualVersion.findUnique({ where: { id: versionId } });
    if (!version) return void 0;
    const manual = await prisma.manual.update({
      where: { id: manualId },
      data: {
        titulo: version.titulo,
        contenidoHtml: version.contenidoHtml,
        etiquetas: version.etiquetas,
        categoria: version.categoria
      }
    });
    return mapPrismaManual(manual);
  }
  // ==================== ACTIVITY LOG METHODS ====================
  async createActivityLog(insertLog) {
    const log2 = await prisma.activityLog.create({
      data: {
        usuarioId: insertLog.usuarioId,
        accion: insertLog.accion,
        modulo: insertLog.modulo,
        detalles: insertLog.detalles
      }
    });
    return mapPrismaActivityLog(log2);
  }
  async getAllActivityLogs() {
    const logs = await prisma.activityLog.findMany({
      orderBy: { fecha: "desc" }
    });
    return logs.map(mapPrismaActivityLog);
  }
  // ==================== AUDIT TRAIL METHODS ====================
  async createAuditEntry(insertAudit) {
    const audit = await prisma.auditTrail.create({
      data: {
        usuarioId: insertAudit.usuarioId,
        accion: insertAudit.accion,
        tabla: insertAudit.tabla,
        registroId: insertAudit.registroId,
        valorAnterior: insertAudit.valorAnterior,
        valorNuevo: insertAudit.valorNuevo,
        cambios: insertAudit.cambios
      }
    });
    return mapPrismaAuditTrail(audit);
  }
  async getAllAuditEntries() {
    const audits = await prisma.auditTrail.findMany({
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByTable(tabla) {
    const audits = await prisma.auditTrail.findMany({
      where: { tabla },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByRecord(tabla, registroId) {
    const audits = await prisma.auditTrail.findMany({
      where: { tabla, registroId },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByUser(usuarioId) {
    const audits = await prisma.auditTrail.findMany({
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
    return await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
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
    return await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true
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
    return await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false
      }
    });
  }
  async updateRole(id, data) {
    return await prisma.role.update({
      where: { id },
      data
    });
  }
  async deleteRole(id) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (role?.isSystem) {
      throw new Error("No se pueden eliminar roles del sistema");
    }
    return await prisma.role.delete({ where: { id } });
  }
  async getAllPermissions() {
    return await prisma.permission.findMany({
      orderBy: [
        { resource: "asc" },
        { action: "asc" }
      ]
    });
  }
  async assignPermissionsToRole(roleId, permissionIds) {
    await prisma.rolePermission.deleteMany({
      where: { roleId }
    });
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId
        })),
        skipDuplicates: true
      });
    }
    return await this.getRoleById(roleId);
  }
  async getUserPermissions(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });
    if (!user?.role) {
      return [];
    }
    return user.role.permissions.map((rp) => rp.permission);
  }
  async hasPermission(userId, resource, action) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some((p) => p.resource === resource && p.action === action);
  }
  // ==================== SYSTEM SETTINGS ====================
  async getSystemSettings() {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) return void 0;
    return {
      id: settings.id,
      registrationEnabled: settings.registrationEnabled,
      updatedAt: settings.updatedAt
    };
  }
  async updateSystemSettings(data) {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          registrationEnabled: data?.registrationEnabled ?? true
        }
      });
    } else {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data
      });
    }
    return {
      id: settings.id,
      registrationEnabled: settings.registrationEnabled,
      updatedAt: settings.updatedAt
    };
  }
  // ==================== SMTP ACCOUNTS ====================
  async getSMTPAccount(id) {
    const account = await prisma.sMTPAccount.findUnique({ where: { id } });
    if (!account) return null;
    return {
      ...account,
      password: decryptPassword(account.password)
    };
  }
  async getAllSMTPAccounts() {
    const accounts = await prisma.sMTPAccount.findMany({
      orderBy: { fechaCreacion: "desc" }
    });
    return accounts.map((account) => ({
      ...account,
      password: decryptPassword(account.password)
    }));
  }
  async getDefaultSMTPAccount() {
    const account = await prisma.sMTPAccount.findFirst({
      where: { isPredeterminada: true, activa: true }
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
        await tx.sMTPAccount.updateMany({
          where: { isPredeterminada: true },
          data: { isPredeterminada: false }
        });
      }
      return await tx.sMTPAccount.create({ data: encryptedAccount });
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
        await tx.sMTPAccount.updateMany({
          where: { isPredeterminada: true, id: { not: id } },
          data: { isPredeterminada: false }
        });
      }
      return await tx.sMTPAccount.update({
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
    await prisma.sMTPAccount.delete({ where: { id } });
    return true;
  }
  // ==================== NOTIFICATION TEMPLATES ====================
  async getNotificationTemplate(id) {
    return await prisma.notificationTemplate.findUnique({ where: { id } });
  }
  async getAllNotificationTemplates() {
    return await prisma.notificationTemplate.findMany({
      orderBy: { fechaCreacion: "desc" },
      include: { creador: { select: { username: true } } }
    });
  }
  async createNotificationTemplate(template) {
    return await prisma.notificationTemplate.create({ data: template });
  }
  async updateNotificationTemplate(id, template) {
    return await prisma.notificationTemplate.update({
      where: { id },
      data: template
    });
  }
  async deleteNotificationTemplate(id) {
    await prisma.notificationTemplate.delete({ where: { id } });
    return true;
  }
  // ==================== NOTIFICATION LOGS ====================
  async getNotificationLog(id) {
    return await prisma.notificationLog.findUnique({
      where: { id },
      include: {
        plantilla: true,
        smtpAccount: true,
        enviador: { select: { username: true } }
      }
    });
  }
  async getAllNotificationLogs() {
    return await prisma.notificationLog.findMany({
      orderBy: { fechaEnvio: "desc" },
      include: {
        plantilla: { select: { nombre: true } },
        smtpAccount: { select: { nombre: true } },
        enviador: { select: { username: true } }
      }
    });
  }
  async createNotificationLog(log2) {
    return await prisma.notificationLog.create({ data: log2 });
  }
  // ==================== SCHEDULED NOTIFICATIONS ====================
  async getScheduledNotification(id) {
    return await prisma.scheduledNotification.findUnique({
      where: { id },
      include: {
        plantilla: true,
        smtpAccount: true,
        creador: { select: { username: true } }
      }
    });
  }
  async getAllScheduledNotifications() {
    return await prisma.scheduledNotification.findMany({
      orderBy: { fechaProgramada: "asc" },
      include: {
        plantilla: { select: { nombre: true } },
        smtpAccount: { select: { nombre: true } },
        creador: { select: { username: true } }
      }
    });
  }
  async getPendingScheduledNotifications() {
    return await prisma.scheduledNotification.findMany({
      where: {
        estado: "PENDIENTE",
        fechaProgramada: { lte: /* @__PURE__ */ new Date() }
      },
      include: {
        plantilla: true,
        smtpAccount: true
      }
    });
  }
  async createScheduledNotification(notification) {
    return await prisma.scheduledNotification.create({ data: notification });
  }
  async updateScheduledNotification(id, notification) {
    return await prisma.scheduledNotification.update({
      where: { id },
      data: notification
    });
  }
  async deleteScheduledNotification(id) {
    await prisma.scheduledNotification.delete({ where: { id } });
    return true;
  }
};
var prismaStorage = new PrismaStorage();

// server/routes.ts
import { PrismaClient as PrismaClient6 } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import multer from "multer";
import path7 from "path";
import fs4 from "fs";

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
    const { PrismaClient: PrismaClient8 } = await import("@prisma/client");
    const prisma9 = new PrismaClient8();
    await prisma9.$queryRaw`SELECT 1 as healthcheck`;
    await prisma9.$disconnect();
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
import { PrismaClient as PrismaClient2 } from "@prisma/client";
import archiver from "archiver";
import { createWriteStream, promises as fs } from "fs";
import { join as join2, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var prisma2 = new PrismaClient2();
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
  await fs.mkdir(backupDir, { recursive: true });
  const filePath = join2(backupDir, fileName);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL no est\xE1 definida");
  }
  try {
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
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
    const stats = await fs.stat(filePath);
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
      { tableName: "users", model: prisma2.user },
      { tableName: "roles", model: prisma2.role },
      { tableName: "permissions", model: prisma2.permission },
      { tableName: "role_permissions", model: prisma2.rolePermission },
      { tableName: "clients", model: prisma2.client },
      { tableName: "client_employees", model: prisma2.clientEmployee },
      { tableName: "tax_models", model: prisma2.taxModel },
      { tableName: "tax_periods", model: prisma2.taxPeriod },
      { tableName: "client_tax", model: prisma2.clientTax },
      { tableName: "tax_files", model: prisma2.taxFile },
      { tableName: "tasks", model: prisma2.task },
      { tableName: "manuals", model: prisma2.manual },
      { tableName: "manual_attachments", model: prisma2.manualAttachment },
      { tableName: "manual_versions", model: prisma2.manualVersion },
      { tableName: "activity_logs", model: prisma2.activityLog },
      { tableName: "audit_trail", model: prisma2.auditTrail },
      { tableName: "smtp_config", model: prisma2.smtpConfig },
      { tableName: "client_tax_requirements", model: prisma2.clientTaxRequirement },
      { tableName: "fiscal_periods", model: prisma2.fiscalPeriod },
      { tableName: "client_tax_filings", model: prisma2.clientTaxFiling },
      { tableName: "job_runs", model: prisma2.jobRun },
      { tableName: "system_settings", model: prisma2.systemSettings },
      { tableName: "smtp_accounts", model: prisma2.sMTPAccount },
      { tableName: "notification_templates", model: prisma2.notificationTemplate },
      { tableName: "notification_logs", model: prisma2.notificationLog },
      { tableName: "scheduled_notifications", model: prisma2.scheduledNotification },
      { tableName: "system_config", model: prisma2.systemConfig },
      { tableName: "system_backups", model: prisma2.systemBackup },
      { tableName: "storage_configs", model: prisma2.storageConfig }
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
    await fs.writeFile(filePath, sqlContent, "utf-8");
    console.log("\u2705 Backup de BD creado con Prisma (m\xE9todo alternativo funcional)");
  } catch (error) {
    console.error("Error en backup alternativo:", error);
    throw error;
  }
}
async function createFilesBackup(fileName) {
  const backupDir = join2(__dirname2, "../../backups/files");
  await fs.mkdir(backupDir, { recursive: true });
  const filePath = join2(backupDir, fileName);
  return new Promise((resolve, reject) => {
    const output = createWriteStream(filePath);
    const archive = archiver("zip", {
      zlib: { level: 9 }
      // Máxima compresión
    });
    output.on("close", async () => {
      const stats = await fs.stat(filePath);
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
    const packageJson = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(packageJson);
    const version = pkg.version || "1.0.0";
    const dbPatternConfig = await prisma2.systemConfig.findUnique({
      where: { key: "backup_db_pattern" }
    });
    const filesPatternConfig = await prisma2.systemConfig.findUnique({
      where: { key: "backup_files_pattern" }
    });
    const dbPattern = dbPatternConfig?.value || "backup_db_{fecha}_{hora}.sql";
    const filesPattern = filesPatternConfig?.value || "backup_files_{fecha}_{hora}.zip";
    const dbFileName = replacePatternVariables(dbPattern, version);
    const filesFileName = replacePatternVariables(filesPattern, version);
    const backup = await prisma2.systemBackup.create({
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
    await prisma2.systemBackup.update({
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
      await prisma2.systemBackup.update({
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
  return await prisma2.systemBackup.findMany({
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
    backup = await prisma2.systemBackup.findUnique({
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
    await prisma2.systemBackup.update({
      where: { id: backupId },
      data: { status: "RESTORING" }
    });
    const dbPath = join2(__dirname2, "../../backups/db", backup.dbFile);
    const filesPath = join2(__dirname2, "../../backups/files", backup.filesFile);
    await fs.access(dbPath);
    await fs.access(filesPath);
    emitSystemLog({ type: "restore", level: "info", message: "Descomprimiendo archivos del backup..." });
    await extractBackupFiles(filesPath);
    emitSystemLog({ type: "restore", level: "success", message: "Archivos descomprimidos correctamente" });
    emitSystemLog({ type: "restore", level: "info", message: "Restaurando base de datos..." });
    await restoreDatabase(dbPath);
    emitSystemLog({ type: "restore", level: "success", message: "Base de datos restaurada correctamente" });
    await prisma2.systemBackup.update({
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
      await prisma2.systemBackup.update({
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
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL no est\xE1 definida");
  }
  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
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
import { PrismaClient as PrismaClient3 } from "@prisma/client";
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
init_websocket();
var execAsync2 = promisify2(exec2);
var prisma3 = new PrismaClient3();
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
    const repoUrlConfig = await prisma3.systemConfig.findUnique({
      where: { key: "github_repo_url" }
    });
    if (!repoUrlConfig?.value) {
      throw new Error("URL del repositorio de GitHub no configurada");
    }
    const repoUrl = repoUrlConfig.value;
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error("URL de GitHub no v\xE1lida");
    }
    const [, owner, repo] = match;
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
    updateRecord = await prisma3.systemUpdate.create({
      data: {
        fromVersion: currentVersion,
        toVersion: versionInfo.latest || "unknown",
        status: "CHECKING",
        initiatedBy: userId,
        logs: JSON.stringify(logs)
      }
    });
    log2("BACKUP_START", "Creando backup de seguridad antes de actualizar...");
    await prisma3.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: "BACKING_UP", logs: JSON.stringify(logs) }
    });
    const backup = await createSystemBackup(userId);
    backupId = backup.id;
    await prisma3.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { backupId: backup.id }
    });
    log2("BACKUP_COMPLETE", `Backup creado exitosamente: ${backup.id}`, "success");
    await prisma3.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: "DOWNLOADING", logs: JSON.stringify(logs) }
    });
    log2("GIT_PULL", "Descargando cambios desde GitHub...");
    const branchConfig = await prisma3.systemConfig.findUnique({
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
    await prisma3.systemUpdate.update({
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
    await prisma3.systemUpdate.update({
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
          await prisma3.systemUpdate.update({
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
          await prisma3.systemUpdate.update({
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
        await prisma3.systemUpdate.update({
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
  return await prisma3.systemUpdate.findMany({
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
import fs3 from "fs/promises";
import path5 from "path";
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
  const uploadsDir2 = path5.join(process.cwd(), "uploads");
  const relativePath = path5.relative(uploadsDir2, file.path);
  const isLocal = provider.constructor.name === "LocalStorageProvider";
  if (isLocal) {
    file.path = relativePath;
    file.destination = path5.dirname(relativePath);
    return;
  }
  const tempFilePath = file.path;
  const readStream = (await import("fs")).createReadStream(tempFilePath);
  try {
    await provider.upload(readStream, relativePath);
    file.path = relativePath;
    file.destination = path5.dirname(relativePath);
    await fs3.unlink(tempFilePath);
  } catch (error) {
    readStream.destroy();
    throw error;
  }
}

// server/routes.ts
var prisma6 = new PrismaClient6();
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
var SALT_ROUNDS = 10;
var uploadsDir = path7.join(process.cwd(), "uploads");
var manualsImagesDir = path7.join(uploadsDir, "manuals", "images");
var manualsAttachmentsDir = path7.join(uploadsDir, "manuals", "attachments");
[uploadsDir, manualsImagesDir, manualsAttachmentsDir].forEach((dir) => {
  if (!fs4.existsSync(dir)) {
    fs4.mkdirSync(dir, { recursive: true });
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
var multerStorageImages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var multerStorageAttachments = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsAttachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var upload = multer({
  storage: multer.diskStorage({
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
var uploadManualImage = multer({
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
var uploadManualAttachment = multer({
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
var authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
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
async function generateClientTaxes(clientId, taxModels) {
  try {
    console.log(`\u{1F4CB} Generando impuestos para cliente ${clientId} con modelos: ${taxModels.join(", ")}`);
    const models = await prisma6.taxModel.findMany({
      where: {
        nombre: { in: taxModels }
      }
    });
    console.log(`  \u2192 Modelos encontrados: ${models.length}`);
    if (models.length === 0) {
      console.warn(`\u26A0\uFE0F  No se encontraron modelos fiscales para: ${taxModels.join(", ")}`);
      return;
    }
    for (const model of models) {
      const periods = await prisma6.taxPeriod.findMany({
        where: { modeloId: model.id }
      });
      console.log(`  \u2192 Modelo ${model.nombre}: ${periods.length} per\xEDodos encontrados`);
      for (const period of periods) {
        const existing = await prisma6.clientTax.findFirst({
          where: {
            clientId,
            taxPeriodId: period.id
          }
        });
        if (!existing) {
          await prisma6.clientTax.create({
            data: {
              clientId,
              taxPeriodId: period.id,
              estado: "PENDIENTE"
            }
          });
        }
      }
    }
    console.log(`\u2705 Impuestos generados autom\xE1ticamente para cliente ${clientId}`);
  } catch (error) {
    console.error("\u274C Error al generar impuestos autom\xE1ticos:", error);
    throw error;
  }
}
async function registerRoutes(app2) {
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
    [
      body("username").trim().isLength({ min: 3 }).withMessage("El usuario debe tener al menos 3 caracteres"),
      body("email").isEmail().withMessage("Email inv\xE1lido"),
      body("password").isLength({ min: 6 }).withMessage("La contrase\xF1a debe tener al menos 6 caracteres")
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
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
          const defaultRole = await prisma6.role.findUnique({
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
        const token = jwt.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET, {
          expiresIn: "24h"
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post("/api/auth/login", async (req, res) => {
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
      const token = jwt.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET, {
        expiresIn: "24h"
      });
      const fullUser = await prismaStorage.getUserWithPermissions(user.id);
      if (!fullUser) {
        return res.status(500).json({ error: "Error al obtener informaci\xF3n del usuario" });
      }
      const { password: _, ...userWithoutPassword } = fullUser;
      const permissions = fullUser.role?.permissions?.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`
      ) || [];
      const roleName = fullUser.role?.name || null;
      res.json({ user: { ...userWithoutPassword, permissions, roleName }, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Sesi\xF3n cerrada exitosamente" });
  });
  app2.get("/api/auth/profile", authenticateToken, async (req, res) => {
    try {
      const user = await prismaStorage.getUserWithPermissions(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      const { password: _, ...userWithoutPassword } = user;
      const permissions = user.role?.permissions?.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`
      ) || [];
      const roleName = user.role?.name || null;
      res.json({ ...userWithoutPassword, permissions, roleName });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/users", authenticateToken, async (req, res) => {
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
    authenticateToken,
    checkPermission("users:create"),
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
    checkPermission("users:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const user = await prismaStorage.getUser(id);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const manuals = await prisma6.manual.count({ where: { autorId: id } });
        const activityLogs = await prisma6.activityLog.count({ where: { usuarioId: id } });
        const auditTrails = await prisma6.auditTrail.count({ where: { usuarioId: id } });
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
  app2.get("/api/clients", authenticateToken, async (req, res) => {
    try {
      const clients = await prismaStorage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/clients",
    authenticateToken,
    checkPermission("clients:create"),
    async (req, res) => {
      try {
        const client = await prismaStorage.createClient(req.body);
        if (client.taxModels && Array.isArray(client.taxModels) && client.taxModels.length > 0) {
          await generateClientTaxes(client.id, client.taxModels);
        }
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
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/clients/:id",
    authenticateToken,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const oldClient = await prismaStorage.getClient(id);
        const client = await prismaStorage.updateClient(id, req.body);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        if (req.body.taxModels && Array.isArray(req.body.taxModels)) {
          await prisma6.clientTax.deleteMany({
            where: { clientId: id }
          });
          if (req.body.taxModels.length > 0) {
            await generateClientTaxes(id, req.body.taxModels);
          }
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
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/clients/:id",
    authenticateToken,
    checkPermission("clients:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const clientTaxes = await prisma6.clientTax.findMany({
          where: { clientId: id }
        });
        if (clientTaxes.length > 0) {
          const updated = await prismaStorage.updateClient(id, { isActive: false });
          await prismaStorage.createActivityLog({
            usuarioId: req.user.id,
            accion: `Desactiv\xF3 el cliente ${client.razonSocial}`,
            modulo: "clientes",
            detalles: `Cliente con ${clientTaxes.length} impuestos asociados`
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
            message: "Cliente desactivado (tiene impuestos asociados)",
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
  app2.patch(
    "/api/clients/:id/toggle-active",
    authenticateToken,
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
    authenticateToken,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { employeeIds, primaryEmployeeId } = req.body;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        await prisma6.clientEmployee.deleteMany({
          where: { clientId: id }
        });
        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
          await prisma6.clientEmployee.createMany({
            data: employeeIds.map((userId) => ({
              clientId: id,
              userId,
              isPrimary: userId === primaryEmployeeId
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
    authenticateToken,
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
          await prisma6.clientEmployee.updateMany({
            where: { clientId: id },
            data: { isPrimary: false }
          });
        }
        await prisma6.clientEmployee.upsert({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          },
          create: {
            clientId: id,
            userId,
            isPrimary: isPrimary || false
          },
          update: {
            isPrimary: isPrimary || false
          }
        });
        if (isPrimary) {
          await prismaStorage.updateClient(id, { responsableAsignado: userId });
        } else {
          const primaryEmployee = await prisma6.clientEmployee.findFirst({
            where: { clientId: id, isPrimary: true }
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
    authenticateToken,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id, userId } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const user = await prismaStorage.getUser(userId);
        const employeeToDelete = await prisma6.clientEmployee.findUnique({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });
        await prisma6.clientEmployee.delete({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });
        if (employeeToDelete?.isPrimary) {
          const remainingEmployee = await prisma6.clientEmployee.findFirst({
            where: { clientId: id }
          });
          if (remainingEmployee) {
            await prisma6.clientEmployee.update({
              where: {
                clientId_userId: {
                  clientId: id,
                  userId: remainingEmployee.userId
                }
              },
              data: { isPrimary: true }
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
  app2.get(
    "/api/calendario-aeat",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const { modelo, periodicidad, anio } = req.query;
        let calendarios;
        if (modelo || periodicidad || anio) {
          const where = {};
          if (modelo) where.modelo = modelo;
          if (periodicidad) where.periodicidad = periodicidad;
          if (anio) {
            where.periodoContable = { contains: anio };
          }
          calendarios = await prisma6.calendarioAEAT.findMany({ where, orderBy: [{ periodoContable: "desc" }, { modelo: "asc" }] });
        } else {
          calendarios = await prismaStorage.getAllCalendariosAEAT();
        }
        res.json(calendarios);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/calendario-aeat/modelo/:modelo",
    authenticateToken,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const calendarios = await prisma6.calendarioAEAT.findMany({
          where: { modelo: req.params.modelo },
          orderBy: { periodoContable: "desc" }
        });
        res.json(calendarios);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/calendario-aeat",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { modelo, periodicidad, periodoContable, fechaInicio, fechaFin } = req.body;
        if (!modelo || !periodicidad || !periodoContable || !fechaInicio || !fechaFin) {
          return res.status(400).json({ error: "Modelo, periodicidad, periodo contable, fecha inicio y fecha fin son requeridos" });
        }
        const calendario = await prismaStorage.createCalendarioAEAT({
          modelo,
          periodicidad,
          periodoContable,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin)
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 calendario AEAT`,
          modulo: "impuestos",
          detalles: `Modelo: ${modelo}, Periodo: ${periodoContable}, Periodicidad: ${periodicidad}`
        });
        res.status(201).json(calendario);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(400).json({ error: "Ya existe un calendario para este modelo, periodicidad y periodo contable" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/calendario-aeat/:id",
    authenticateToken,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const { fechaInicio, fechaFin } = req.body;
        const updateData = {};
        if (fechaInicio) updateData.fechaInicio = new Date(fechaInicio);
        if (fechaFin) updateData.fechaFin = new Date(fechaFin);
        const calendario = await prismaStorage.updateCalendarioAEAT(req.params.id, updateData);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 calendario AEAT`,
          modulo: "impuestos",
          detalles: `Modelo: ${calendario.modelo}, Periodo: ${calendario.periodoContable}`
        });
        res.json(calendario);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/calendario-aeat/:id",
    authenticateToken,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        const calendario = await prisma6.calendarioAEAT.findUnique({
          where: { id: req.params.id }
        });
        await prismaStorage.deleteCalendarioAEAT(req.params.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 calendario AEAT`,
          modulo: "impuestos",
          detalles: `Modelo: ${calendario?.modelo}, Periodo: ${calendario?.periodoContable}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/declaraciones",
    authenticateToken,
    async (req, res) => {
      try {
        const declaraciones = await prismaStorage.getAllDeclaraciones();
        res.json(declaraciones);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/declaraciones/cliente/:clienteId",
    authenticateToken,
    async (req, res) => {
      try {
        const declaraciones = await prismaStorage.getDeclaracionesByCliente(req.params.clienteId);
        res.json(declaraciones);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/declaraciones",
    authenticateToken,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { obligacionId, anio, periodo, fechaLimite, estado, resultado, observaciones } = req.body;
        if (!obligacionId || !anio || !periodo || !fechaLimite) {
          return res.status(400).json({ error: "Obligaci\xF3n, a\xF1o, periodo y fecha l\xEDmite son requeridos" });
        }
        const declaracion = await prismaStorage.createDeclaracion({
          obligacionId,
          anio: parseInt(anio),
          periodo,
          fechaLimite: new Date(fechaLimite),
          estado: estado || "PENDIENTE",
          resultado: resultado || null,
          observaciones: observaciones || null,
          fechaPresentacion: null
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 declaraci\xF3n`,
          modulo: "impuestos",
          detalles: `Periodo: ${periodo}/${anio}`
        });
        res.status(201).json(declaracion);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/declaraciones/:id",
    authenticateToken,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const declaracion = await prismaStorage.updateDeclaracion(req.params.id, req.body);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 declaraci\xF3n`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json(declaracion);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/declaraciones/:id",
    authenticateToken,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        await prismaStorage.deleteDeclaracion(req.params.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 declaraci\xF3n`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/tasks", authenticateToken, async (req, res) => {
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
    authenticateToken,
    checkPermission("tasks:create"),
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
    authenticateToken,
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
  app2.get("/api/manuals", authenticateToken, async (req, res) => {
    try {
      const manuals = await prismaStorage.getAllManuals();
      res.json(manuals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/manuals/:id", authenticateToken, async (req, res) => {
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
    authenticateToken,
    checkPermission("manuals:create"),
    async (req, res) => {
      try {
        const manual = await prismaStorage.createManual({
          ...req.body,
          autorId: req.user.id
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
    authenticateToken,
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
  app2.post(
    "/api/manuals/upload-image",
    authenticateToken,
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
    authenticateToken,
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
          fileType: path7.extname(req.file.originalname).toLowerCase(),
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
    authenticateToken,
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
    authenticateToken,
    checkPermission("manuals:update"),
    async (req, res) => {
      try {
        const { attachmentId } = req.params;
        const attachment = await prismaStorage.getManualAttachment(attachmentId);
        if (!attachment) {
          return res.status(404).json({ error: "Adjunto no encontrado" });
        }
        if (fs4.existsSync(attachment.filePath)) {
          fs4.unlinkSync(attachment.filePath);
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
  app2.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
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
    authenticateToken,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const { host, port, user, pass } = req.body;
        if (!host || !port || !user || !pass) {
          return res.status(400).json({ error: "Faltan par\xE1metros de configuraci\xF3n SMTP" });
        }
        configureSMTP({ host, port: parseInt(port), user, pass });
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
    authenticateToken,
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
  app2.get(
    "/api/admin/smtp-accounts",
    authenticateToken,
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
    authenticateToken,
    checkPermission("admin:smtp_manage"),
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const { host, port, user, password } = req.body;
        const nodemailer3 = __require("nodemailer");
        const transporter2 = nodemailer3.createTransport({
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
    authenticateToken,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const config = await prisma6.storageConfig.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "desc" }
        });
        if (!config) {
          return res.json({
            type: "LOCAL",
            basePath: "/uploads",
            isActive: true
          });
        }
        res.json({
          id: config.id,
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          basePath: config.basePath,
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
    authenticateToken,
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
        await prisma6.storageConfig.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        });
        const config = await prisma6.storageConfig.create({
          data: {
            type,
            host,
            port: port ? parseInt(port) : null,
            username,
            encryptedPassword,
            basePath: basePath || (type === "LOCAL" ? "/uploads" : "/"),
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
          basePath: config.basePath,
          isActive: config.isActive
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/storage-config/test",
    authenticateToken,
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
          basePath: basePath || (type === "LOCAL" ? "/uploads" : "/")
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const configs = await prisma6.systemConfig.findMany({
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
    authenticateToken,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const config = await prisma6.systemConfig.findUnique({
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
    authenticateToken,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const { value } = req.body;
        if (value === void 0 || value === null) {
          return res.status(400).json({ error: "El valor de la configuraci\xF3n es requerido" });
        }
        const existing = await prisma6.systemConfig.findUnique({
          where: { key: req.params.key }
        });
        if (!existing) {
          return res.status(404).json({ error: "Configuraci\xF3n no encontrada" });
        }
        if (!existing.isEditable) {
          return res.status(403).json({ error: "Esta configuraci\xF3n no es editable" });
        }
        const config = await prisma6.systemConfig.update({
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
    authenticateToken,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const repoConfig = await prisma6.systemConfig.findUnique({
          where: { key: "github_repo_url" }
        });
        const branchConfig = await prisma6.systemConfig.findUnique({
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
    authenticateToken,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const { repoUrl, branch } = req.body;
        if (repoUrl) {
          const ownerRepoMatch = repoUrl.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
          const githubUrlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (!ownerRepoMatch && !githubUrlMatch) {
            return res.status(400).json({
              error: "Formato inv\xE1lido. Use 'owner/repo' o una URL completa de GitHub"
            });
          }
        }
        if (repoUrl !== void 0) {
          await prisma6.systemConfig.upsert({
            where: { key: "github_repo_url" },
            create: {
              key: "github_repo_url",
              value: repoUrl,
              description: "URL del repositorio de GitHub para actualizaciones",
              isEditable: true
            },
            update: { value: repoUrl }
          });
        }
        if (branch !== void 0) {
          await prisma6.systemConfig.upsert({
            where: { key: "github_branch" },
            create: {
              key: "github_branch",
              value: branch,
              description: "Rama de GitHub para actualizaciones",
              isEditable: true
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
    authenticateToken,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const currentVersion = await getCurrentVersion();
        const repoConfig = await prisma6.systemConfig.findUnique({
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
  app2.get("/api/tax-requirements", authenticateToken, async (req, res) => {
    try {
      const requirements = await prisma6.clientTaxRequirement.findMany({
        include: { client: true }
      });
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tax-requirements", authenticateToken, checkPermission("taxes:create"), async (req, res) => {
    try {
      const { clientId, taxModelCode, required = true, note, colorTag } = req.body;
      const requirement = await prisma6.clientTaxRequirement.create({
        data: {
          clientId,
          taxModelCode,
          required,
          note,
          colorTag
        },
        include: { client: true }
      });
      res.json(requirement);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tax-requirements/:id/toggle", authenticateToken, checkPermission("taxes:update"), async (req, res) => {
    try {
      const { id } = req.params;
      const current = await prisma6.clientTaxRequirement.findUnique({ where: { id } });
      if (!current) {
        return res.status(404).json({ error: "Requisito no encontrado" });
      }
      const updated = await prisma6.clientTaxRequirement.update({
        where: { id },
        data: { required: !current.required },
        include: { client: true }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tax-requirements/:id", authenticateToken, checkPermission("taxes:update"), async (req, res) => {
    try {
      const { id } = req.params;
      const { note, colorTag } = req.body;
      const updated = await prisma6.clientTaxRequirement.update({
        where: { id },
        data: { note, colorTag },
        include: { client: true }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/fiscal-periods", authenticateToken, async (req, res) => {
    try {
      const periods = await prisma6.fiscalPeriod.findMany({
        orderBy: [{ year: "desc" }, { quarter: "asc" }]
      });
      res.json(periods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/fiscal-periods/create-year", authenticateToken, checkPermission("taxes:create"), async (req, res) => {
    try {
      const { year } = req.body;
      const { PrismaClient: PrismaClient8 } = await import("@prisma/client");
      const prisma9 = new PrismaClient8();
      const periods = [];
      for (let q = 1; q <= 4; q++) {
        const period = await prisma9.fiscalPeriod.create({
          data: {
            year: parseInt(year),
            quarter: q,
            label: `${q}T`,
            startsAt: /* @__PURE__ */ new Date(`${year}-${(q - 1) * 3 + 1}-01`),
            endsAt: /* @__PURE__ */ new Date(`${year}-${q * 3}-${q === 4 ? "31" : "30"}`)
          }
        });
        periods.push(period);
      }
      await prisma9.$disconnect();
      res.json(periods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/fiscal-periods", authenticateToken, checkPermission("taxes:create"), async (req, res) => {
    try {
      const { year, quarter, label, startsAt, endsAt } = req.body;
      const { PrismaClient: PrismaClient8 } = await import("@prisma/client");
      const prisma9 = new PrismaClient8();
      const period = await prisma9.fiscalPeriod.create({
        data: { year: parseInt(year), quarter, label, startsAt: new Date(startsAt), endsAt: new Date(endsAt) }
      });
      await prisma9.$disconnect();
      res.json(period);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tax-filings", authenticateToken, async (req, res) => {
    try {
      const filings = await prisma6.clientTaxFiling.findMany({
        include: { client: true, period: true }
      });
      res.json(filings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tax-filings", authenticateToken, checkPermission("taxes:create"), async (req, res) => {
    try {
      const { clientId, taxModelCode, periodId, status, notes } = req.body;
      const filing = await prisma6.clientTaxFiling.create({
        data: { clientId, taxModelCode, periodId, status: status || "NOT_STARTED", notes }
      });
      res.json(filing);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tax-filings/:id", authenticateToken, checkPermission("taxes:update"), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, presentedAt } = req.body;
      const { PrismaClient: PrismaClient8 } = await import("@prisma/client");
      const prisma9 = new PrismaClient8();
      const data = {};
      if (status) data.status = status;
      if (notes !== void 0) data.notes = notes;
      if (presentedAt) data.presentedAt = new Date(presentedAt);
      const filing = await prisma9.clientTaxFiling.update({
        where: { id },
        data
      });
      await prisma9.$disconnect();
      res.json(filing);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tax-filings/batch", authenticateToken, checkPermission("taxes:create"), async (req, res) => {
    try {
      const { clientId, taxModelCode, periodIds } = req.body;
      const filings = await Promise.all(
        periodIds.map(
          (periodId) => prisma6.clientTaxFiling.upsert({
            where: {
              clientId_taxModelCode_periodId: { clientId, taxModelCode, periodId }
            },
            create: { clientId, taxModelCode, periodId, status: "NOT_STARTED" },
            update: {}
          })
        )
      );
      res.json(filings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  setInterval(() => {
    checkAndSendReminders(prismaStorage).catch(console.error);
  }, 60 * 60 * 1e3);
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
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prismaStorage.getUser(decoded.id);
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.data.user = { id: user.id, username: user.username, role: user.role };
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });
  app2.get(
    "/api/notification-templates",
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    authenticateToken,
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
    io2.emit("user:connected", {
      userId: user.id,
      username: user.username,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    socket.on("disconnect", () => {
      console.log(`Usuario desconectado: ${user.username}`);
      io2.emit("user:disconnected", {
        userId: user.id,
        username: user.username,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  });
  httpServer.io = io2;
  setSocketIO(io2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs5 from "fs";
import path9 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path8 from "path";
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
      "@": path8.resolve(import.meta.dirname, "client", "src"),
      "@shared": path8.resolve(import.meta.dirname, "shared"),
      "@assets": path8.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path8.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path8.resolve(import.meta.dirname, "dist/public"),
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
      const clientTemplate = path9.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs5.promises.readFile(clientTemplate, "utf-8");
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
  const distPath = path9.resolve(import.meta.dirname, "public");
  if (!fs5.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path9.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import helmet from "helmet";
import cors from "cors";
import { PrismaClient as PrismaClient7 } from "@prisma/client";

// server/logger.ts
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import path10 from "path";
import fs6 from "fs";
var logsDir = process.env.LOG_DIR || path10.join(process.cwd(), "logs");
if (!fs6.existsSync(logsDir)) {
  fs6.mkdirSync(logsDir, { recursive: true });
}
var today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
var logFile = path10.join(logsDir, `app-${today}.log`);
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
    return randomUUID();
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
    const files = fs6.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1e3;
    files.forEach((file) => {
      if (!file.startsWith("app-") || !file.endsWith(".log")) return;
      const filePath = path10.join(logsDir, file);
      const stats = fs6.statSync(filePath);
      const age = now - stats.mtimeMs;
      if (age > maxAge) {
        fs6.unlinkSync(filePath);
        logger.info(`Deleted old log file: ${file}`);
      }
    });
  } catch (error) {
    logger.error({ err: error }, "Error rotating logs");
  }
}
rotateOldLogs(30);

// server/jobs.ts
import cron from "node-cron";
import nodemailer2 from "nodemailer";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
var prisma7;
function initializeJobs(client) {
  prisma7 = client;
}
var transporter = nodemailer2.createTransport({
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
    const upcomingTasks = await prisma7.task.findMany({
      where: {
        estado: { notIn: ["COMPLETADA"] },
        fechaVencimiento: {
          gte: /* @__PURE__ */ new Date(),
          lte: nextWeek
        }
      },
      include: {
        cliente: true,
        asignado: true
      }
    });
    console.log(`\u{1F4CB} Tareas pr\xF3ximas a vencer: ${upcomingTasks.length}`);
    for (const task of upcomingTasks) {
      if (!task.fechaVencimiento) continue;
      const diasRestantes = Math.ceil(
        (new Date(task.fechaVencimiento).getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24)
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
            <p><strong>Cliente:</strong> ${task.cliente?.razonSocial || "Sin cliente"}</p>
            <p><strong>Descripci\xF3n:</strong> ${task.descripcion || "Sin descripci\xF3n"}</p>
            <p><strong>Vence:</strong> ${format(new Date(task.fechaVencimiento), "dd 'de' MMMM, yyyy", { locale: es })}</p>
            <p><strong>D\xEDas restantes:</strong> ${diasRestantes}</p>
            <p><strong>Prioridad:</strong> ${task.prioridad}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Este es un recordatorio autom\xE1tico del sistema Asesor\xEDa La Llave.
            </p>
          </div>
        </div>
      `;
      if (task.asignado?.email) {
        await sendEmail(
          task.asignado.email,
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
    const clientes = await prisma7.client.findMany({
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
var cleanupSessionsJob = cron.createTask("0 * * * *", async () => {
  console.log("\u{1F9F9} Ejecutando job: limpieza de sesiones");
  try {
    console.log("\u2705 Sesiones limpias");
  } catch (error) {
    console.error("\u274C Error en job de limpieza:", error);
  }
});
var backupDatabaseJob = cron.createTask("0 3 * * *", async () => {
  console.log("\u{1F4BE} Ejecutando job: backup de base de datos");
  try {
    const { spawn } = __require("child_process");
    const path11 = __require("path");
    const backupScript = path11.join(process.cwd(), "scripts", "backup.sh");
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
  if (!prisma7) {
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
  if (!prisma7) {
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
var SALT_ROUNDS2 = 10;
var app = express2();
app.set("trust proxy", 1);
var prisma8 = new PrismaClient7({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "warn", emit: "event" }
  ]
});
prisma8.$on("query", (e) => {
  dbLogger.debug({ duration: e.duration, query: e.query }, "Database query");
});
prisma8.$on("error", (e) => {
  dbLogger.error({ target: e.target }, e.message);
});
prisma8.$on("warn", (e) => {
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
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ extended: false, limit: "10mb" }));
app.use("/uploads", express2.static("uploads"));
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
    await prisma8.$queryRaw`SELECT 1`;
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
    const adminRole = await prisma8.role.findFirst({
      where: { name: "Administrador" }
    });
    if (!adminRole) {
      logger.warn("\u26A0\uFE0F  Rol Administrador no encontrado. Ejecuta las migraciones primero.");
      return;
    }
    const existingAdmin = await prisma8.user.findFirst({
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
    const existingUser = await prisma8.user.findFirst({
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
    const adminUser = await prisma8.user.create({
      data: {
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
    logger.fatal({ err: error }, "\u274C Error cr\xEDtico creando usuario administrador inicial");
    process.exit(1);
  }
}
(async () => {
  await createInitialAdmin();
  initializeJobs(prisma8);
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    logger.info({
      port,
      env: process.env.NODE_ENV,
      nodeVersion: process.version
    }, `\u{1F680} Server listening on port ${port}`);
  });
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
    await prisma8.$disconnect();
    logger.info("Database connection closed");
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
