import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== USERS & AUTH ====================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("LECTURA"), // ADMIN, GESTOR, LECTURA
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ==================== CLIENTS ====================
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  razonSocial: text("razon_social").notNull(),
  nifCif: text("nif_cif").notNull().unique(),
  tipo: text("tipo").notNull(), // autonomo, empresa
  email: text("email"),
  telefono: text("telefono"),
  direccion: text("direccion"),
  fechaAlta: timestamp("fecha_alta").notNull().defaultNow(),
  responsableAsignado: varchar("responsable_asignado").references(() => users.id),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  fechaAlta: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ==================== TAX MODELS ====================
export const taxModels = pgTable("tax_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(), // 303, 390, 130, 131
  descripcion: text("descripcion"),
});

export const insertTaxModelSchema = createInsertSchema(taxModels).omit({
  id: true,
});

export type InsertTaxModel = z.infer<typeof insertTaxModelSchema>;
export type TaxModel = typeof taxModels.$inferSelect;

// ==================== TAX PERIODS ====================
export const taxPeriods = pgTable("tax_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modeloId: varchar("modelo_id").notNull().references(() => taxModels.id),
  anio: integer("anio").notNull(),
  trimestre: integer("trimestre"), // 1, 2, 3, 4 (null for annual)
  mes: integer("mes"), // 1-12 (null for quarterly/annual)
  inicioPresentacion: timestamp("inicio_presentacion").notNull(),
  finPresentacion: timestamp("fin_presentacion").notNull(),
});

export const insertTaxPeriodSchema = createInsertSchema(taxPeriods).omit({
  id: true,
});

export type InsertTaxPeriod = z.infer<typeof insertTaxPeriodSchema>;
export type TaxPeriod = typeof taxPeriods.$inferSelect;

// ==================== CLIENT TAX ====================
export const clientTax = pgTable("client_tax", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  taxPeriodId: varchar("tax_period_id").notNull().references(() => taxPeriods.id),
  estado: text("estado").notNull().default("PENDIENTE"), // PENDIENTE, CALCULADO, REALIZADO
  notas: text("notas"),
  fechaCreacion: timestamp("fecha_creacion").notNull().defaultNow(),
  fechaActualizacion: timestamp("fecha_actualizacion").notNull().defaultNow(),
});

export const insertClientTaxSchema = createInsertSchema(clientTax).omit({
  id: true,
  fechaCreacion: true,
  fechaActualizacion: true,
});

export type InsertClientTax = z.infer<typeof insertClientTaxSchema>;
export type ClientTax = typeof clientTax.$inferSelect;

// ==================== TAX FILES ====================
export const taxFiles = pgTable("tax_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientTaxId: varchar("client_tax_id").notNull().references(() => clientTax.id),
  nombreArchivo: text("nombre_archivo").notNull(),
  ruta: text("ruta").notNull(),
  tipo: text("tipo"), // pdf, excel, word
  fechaSubida: timestamp("fecha_subida").notNull().defaultNow(),
  subidoPor: varchar("subido_por").references(() => users.id),
});

export const insertTaxFileSchema = createInsertSchema(taxFiles).omit({
  id: true,
  fechaSubida: true,
});

export type InsertTaxFile = z.infer<typeof insertTaxFileSchema>;
export type TaxFile = typeof taxFiles.$inferSelect;

// ==================== TASKS ====================
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  clienteId: varchar("cliente_id").references(() => clients.id),
  asignadoA: varchar("asignado_a").references(() => users.id),
  prioridad: text("prioridad").notNull().default("MEDIA"), // BAJA, MEDIA, ALTA
  estado: text("estado").notNull().default("PENDIENTE"), // PENDIENTE, EN_PROGRESO, COMPLETADA
  visibilidad: text("visibilidad").notNull().default("GENERAL"), // GENERAL, PERSONAL
  fechaVencimiento: timestamp("fecha_vencimiento"),
  fechaCreacion: timestamp("fecha_creacion").notNull().defaultNow(),
  fechaActualizacion: timestamp("fecha_actualizacion").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  fechaCreacion: true,
  fechaActualizacion: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ==================== MANUALS ====================
export const manuals = pgTable("manuals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  contenidoHtml: text("contenido_html").notNull(),
  autorId: varchar("autor_id").notNull().references(() => users.id),
  etiquetas: text("etiquetas").array(),
  categoria: text("categoria"),
  publicado: boolean("publicado").notNull().default(false),
  fechaCreacion: timestamp("fecha_creacion").notNull().defaultNow(),
  fechaActualizacion: timestamp("fecha_actualizacion").notNull().defaultNow(),
});

export const insertManualSchema = createInsertSchema(manuals).omit({
  id: true,
  fechaCreacion: true,
  fechaActualizacion: true,
});

export type InsertManual = z.infer<typeof insertManualSchema>;
export type Manual = typeof manuals.$inferSelect;

// ==================== ACTIVITY LOGS ====================
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => users.id),
  accion: text("accion").notNull(),
  modulo: text("modulo").notNull(), // clientes, impuestos, tareas, manuales, usuarios
  detalles: text("detalles"),
  fecha: timestamp("fecha").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  fecha: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// ==================== AUDIT TRAIL ====================
export const auditTrail = pgTable("audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").notNull().references(() => users.id),
  accion: text("accion").notNull(), // CREATE, UPDATE, DELETE
  tabla: text("tabla").notNull(), // clients, tasks, tax_periods, etc
  registroId: varchar("registro_id").notNull(), // ID del registro modificado
  valorAnterior: text("valor_anterior"), // JSON del estado anterior
  valorNuevo: text("valor_nuevo"), // JSON del estado nuevo
  cambios: text("cambios"), // Descripción legible de los cambios
  fecha: timestamp("fecha").notNull().defaultNow(),
});

export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({
  id: true,
  fecha: true,
});

export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;
export type AuditTrail = typeof auditTrail.$inferSelect;
