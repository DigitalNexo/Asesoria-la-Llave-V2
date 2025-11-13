import { nanoid } from "nanoid";
import prisma from "../prisma-client";

export class DocumentsService {
  /**
   * Generar siguiente número de recibo
   */
  private async getNextReceiptNumber(
    year: number
  ): Promise<{ numero: string; sequential: number }> {
    const lastReceipt = await prisma.receipts.findFirst({
      where: { year },
      orderBy: { sequential: "desc" },
    });

    const sequential = lastReceipt ? lastReceipt.sequential + 1 : 1;
    const numero = `REC-${year}-${sequential.toString().padStart(4, "0")}`;

    return { numero, sequential };
  }

  /**
   * Crear recibo
   */
  async createReceipt(data: {
    concepto: string;
    base_imponible: number;
    iva_porcentaje?: number;
    clientId?: string;
    recipient_name: string;
    recipient_nif: string;
    recipient_email: string;
    recipient_address?: string;
    notes?: string;
    createdBy: string;
  }) {
    const year = new Date().getFullYear();
    const { numero, sequential } = await this.getNextReceiptNumber(year);

    const iva_porcentaje = data.iva_porcentaje || 21;
    const iva_importe = (data.base_imponible * iva_porcentaje) / 100;
    const total = data.base_imponible + iva_importe;

    return await prisma.receipts.create({
      data: {
        id: nanoid(),
        numero,
        year,
        sequential,
        client_id: data.clientId || null,
        recipient_name: data.recipient_name,
        recipient_nif: data.recipient_nif,
        recipient_email: data.recipient_email,
        recipient_address: data.recipient_address,
        concepto: data.concepto,
        base_imponible: data.base_imponible,
        iva_porcentaje,
        iva_importe,
        total,
        notes: data.notes,
        status: "BORRADOR",
        created_by: data.createdBy,
      },
      include: {
        clients: true,
        creator: { select: { id: true, username: true, email: true } },
      },
    });
  }

  /**
   * Listar recibos
   */
  async listReceipts(filters?: {
    status?: string;
    clientId?: string;
    year?: number;
  }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.client_id = filters.clientId;
    if (filters?.year) where.year = filters.year;

    return await prisma.receipts.findMany({
      where,
      include: {
        clients: true,
        creator: { select: { id: true, username: true, email: true } },
      },
      orderBy: [{ year: "desc" }, { sequential: "desc" }],
    });
  }

  /**
   * Obtener recibo por ID
   */
  async getReceiptById(id: string) {
    const receipt = await prisma.receipts.findUnique({
      where: { id },
      include: {
        clients: true,
        creator: { select: { id: true, username: true, email: true } },
      },
    });
    if (!receipt) throw new Error("Recibo no encontrado");
    return receipt;
  }

  /**
   * Actualizar recibo
   */
  async updateReceipt(id: string, data: any) {
    // Separar clientId del resto de datos
    const { clientId, ...updateData } = data;

    // Calcular IVA y total si se proporcionan base_imponible o iva_porcentaje
    if (
      updateData.base_imponible !== undefined ||
      updateData.iva_porcentaje !== undefined
    ) {
      const receipt = await prisma.receipts.findUnique({ where: { id } });
      if (!receipt) throw new Error("Recibo no encontrado");

      const base = updateData.base_imponible ?? receipt.base_imponible;
      const ivaPct = updateData.iva_porcentaje ?? receipt.iva_porcentaje;

      updateData.iva_importe = (Number(base) * Number(ivaPct)) / 100;
      updateData.total = Number(base) + updateData.iva_importe;
    }

    // Construir el objeto de actualización
    const prismaUpdate: any = { ...updateData };

    // Si hay clientId, usar la relación
    if (clientId !== undefined) {
      if (clientId) {
        prismaUpdate.clients = { connect: { id: clientId } };
      } else {
        prismaUpdate.clients = { disconnect: true };
      }
    }

    return await prisma.receipts.update({
      where: { id },
      data: prismaUpdate,
      include: { clients: true },
    });
  }

  /**
   * Crear documento
   */
  async createDocument(data: {
    type: "DATA_PROTECTION" | "BANKING_DOMICILIATION";
    clientId: string;
    templateId?: string;
    notes?: string;
    createdBy: string;
  }) {
    const client = await prisma.clients.findUnique({
      where: { id: data.clientId },
    });
    if (!client) throw new Error("Cliente no encontrado");

    const docName =
      data.type === "DATA_PROTECTION"
        ? `Protección de Datos - ${client.razonSocial}`
        : `Domiciliación Bancaria - ${client.razonSocial}`;

    return await prisma.documents.create({
      data: {
        id: nanoid(),
        type: data.type,
        name: docName,
        description: data.notes,
        template_id: data.templateId,
        client_id: data.clientId,
        created_by: data.createdBy,
        status: "BORRADOR",
        signature_status: "PENDIENTE",
      },
      include: {
        clients: true,
        template: true,
        users: { select: { id: true, username: true, email: true } },
      },
    });
  }

  /**
   * Listar documentos
   */
  async listDocuments(filters?: {
    type?: string;
    status?: string;
    clientId?: string;
  }) {
    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.client_id = filters.clientId;

    return await prisma.documents.findMany({
      where,
      include: {
        clients: true,
        template: true,
        users: { select: { id: true, username: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  /**
   * Obtener documento por ID
   */
  async getDocumentById(id: string) {
    const doc = await prisma.documents.findUnique({
      where: { id },
      include: {
        clients: true,
        template: true,
        users: { select: { id: true, username: true, email: true } },
        versions: true,
      },
    });
    if (!doc) throw new Error("Documento no encontrado");
    return doc;
  }

  /**
   * Actualizar documento
   */
  async updateDocument(id: string, data: any) {
    return await prisma.documents.update({
      where: { id },
      data,
      include: { clients: true },
    });
  }

  /**
   * Marcar documento como aceptado
   */
  async markDocumentAsAccepted(
    documentId: string,
    signedFilePath: string,
    userId: string
  ) {
    return await prisma.documents.update({
      where: { id: documentId },
      data: {
        status: "ACEPTADO",
        signature_status: "FIRMADO",
        signature_date: new Date(),
        file_path: signedFilePath,
        signed_by: userId,
      },
      include: { clients: true },
    });
  }

  /**
   * CRUD Plantillas
   */
  async createTemplate(data: {
    type: string;
    name: string;
    content: string;
    description?: string;
  }) {
    return await prisma.document_templates.create({
      data: {
        id: nanoid(),
        type: data.type as any,
        name: data.name,
        content: data.content,
        description: data.description,
        available_vars: JSON.stringify([]),
        is_active: true,
      },
    });
  }

  async listTemplates(filters?: { type?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.isActive !== undefined) where.is_active = filters.isActive;

    return await prisma.document_templates.findMany({
      where,
      orderBy: { created_at: "desc" },
    });
  }

  async getTemplateById(id: string) {
    const template = await prisma.document_templates.findUnique({
      where: { id },
    });
    if (!template) throw new Error("Plantilla no encontrada");
    return template;
  }

  async updateTemplate(id: string, data: any) {
    // Si se está activando una plantilla de recibo, desactivar todas las demás de ese tipo
    if (data.is_active === true) {
      const template = await prisma.document_templates.findUnique({
        where: { id },
      });
      if (template && template.type === "RECEIPT") {
        // Desactivar todas las otras plantillas de recibo
        await prisma.document_templates.updateMany({
          where: {
            type: "RECEIPT",
            id: { not: id },
          },
          data: { is_active: false },
        });
      }
    }

    return await prisma.document_templates.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  async deleteTemplate(id: string) {
    const count = await prisma.documents.count({ where: { template_id: id } });
    if (count > 0) {
      throw new Error(`No se puede eliminar: ${count} documentos la usan`);
    }
    await prisma.document_templates.delete({ where: { id } });
    return { success: true };
  }
}

export const documentsService = new DocumentsService();
