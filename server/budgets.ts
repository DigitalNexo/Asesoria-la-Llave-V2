import express from 'express';
import prisma from './prisma-client';
import { authenticateToken, AuthRequest } from './middleware/auth';
import { generateAcceptanceHash, createBudgetPdf } from './utils';
import { getSMTPConfig } from './email';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import {
  calculatePyme,
  calculateAutonomo,
  calculateRenta,
  calculateHerencias,
  type PymeInput,
  type AutonomoInput,
  type RentaInput,
  type HerenciasInput,
} from './services/budgets';
import { randomUUID } from 'crypto';
const router = express.Router();

const toNumber = (value: any | null | undefined, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseJsonMaybe = (value: any) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeBudgetItem = (item: any) => {
  if (!item) return item;
  const quantity = toNumber(item.quantity, 0) || 1;
  let unitPriceRaw = item.unitPrice ?? item.unit_price ?? item.price ?? null;
  if (!unitPriceRaw || toNumber(unitPriceRaw, 0) === 0) {
    if (item.subtotal !== undefined) {
      unitPriceRaw = toNumber(item.subtotal, 0) / quantity;
    }
  }
  return {
    ...item,
    quantity,
    unitPrice: toNumber(unitPriceRaw, 0),
    price: toNumber(unitPriceRaw, 0),
    vatPct: item.vatPct !== undefined ? toNumber(item.vatPct, null) : toNumber(item.vat_pct, null),
    subtotal: toNumber(item.subtotal, 0),
    total: toNumber(item.total, 0),
  };
};

const normalizeBudget = (budget: any) => {
  if (!budget) return null;
  const {
    budget_items,
    budget_email_logs,
    client_nif,
    client_email,
    client_phone,
    client_address,
    company_brand,
    template_snapshot,
    vat_total,
    custom_total,
    manually_edited,
    ...rest
  } = budget;

  const subtotal = toNumber(rest.subtotal, 0);
  const total = toNumber(rest.total, 0);

  return {
    ...rest,
    subtotal,
    total,
    clientNif: client_nif ?? null,
    clientEmail: client_email ?? null,
    clientPhone: client_phone ?? null,
    clientAddress: client_address ?? null,
    companyBrand: company_brand ?? 'LA_LLAVE',
    templateSnapshot: parseJsonMaybe(template_snapshot),
    vatTotal: vat_total !== undefined ? toNumber(vat_total, 0) : null,
    customTotal: custom_total !== undefined ? (custom_total === null ? null : toNumber(custom_total)) : null,
    manuallyEdited: Boolean(manually_edited),
    items: Array.isArray(budget_items) ? budget_items.map(normalizeBudgetItem) : undefined,
    emails: Array.isArray(budget_email_logs) ? budget_email_logs : undefined,
  };
};

function ensureRole(req: AuthRequest, res: any, next: any) {
  const roleName = req.user?.roleName;
  if (roleName === 'Administrador' || roleName === 'Gestor') return next();
  return res.status(403).json({ error: 'No autorizado' });
}

// GET /api/budgets - list with basic filters
router.get('/', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 50);
    const skip = (page - 1) * size;
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    if (req.query.type) where.type = String(req.query.type); // Nuevo filtro por tipo
    if (req.query.q) {
      const q = String(req.query.q);
      where.OR = [
        { code: { contains: q } },
        { clientName: { contains: q } },
        { clientEmail: { contains: q } },
      ];
    }
    const p: any = prisma;
    const [items, total] = await Promise.all([
      p.budgets.findMany({ where, orderBy: { date: 'desc' }, take: size, skip }),
      p.budgets.count({ where }),
    ]);
    const normalizedItems = items.map((item: any) => normalizeBudget(item));
    res.json({ items: normalizedItems, total, page, size });
  } catch (err: any) {
    console.error('GET /api/budgets', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/budgets/:id - detail with items and emails
router.get('/:id', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 GET /api/budgets/:id - ID solicitado:', id);
    const p: any = prisma;
    const budget = await p.budgets.findUnique({ 
      where: { id },
      include: {
        budget_items: { orderBy: { position: 'asc' } },
        budget_email_logs: { orderBy: { createdAt: 'desc' } }
      }
    });
    console.log('📊 Resultado de la consulta:', budget ? `Encontrado: ${budget.code}` : 'No encontrado');
    if (!budget) return res.status(404).json({ error: 'Not found' });
    res.json(normalizeBudget(budget));
  } catch (err: any) {
    console.error('❌ Error en GET /api/budgets/:id', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/budgets/:id/pdf - download budget as PDF
router.get('/:id/pdf', async (req: any, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    // Verificar autenticación manualmente
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Verificar el token JWT
    let user: any;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Buscar el usuario con su rol
    const p: any = prisma;
    const fullUser = await p.users.findUnique({
      where: { id: user.id },
      include: { roles: true }
    });
    
    if (!fullUser) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Verificar rol (solo Admin y Gestor pueden descargar PDFs)
    if (fullUser.roles?.name !== 'Administrador' && fullUser.roles?.name !== 'Gestor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const budget = await p.budgets.findUnique({ 
      where: { id },
      include: {
        items: { orderBy: { position: 'asc' } }
      }
    });
    if (!budget) return res.status(404).json({ error: 'Not found' });

    // Generate PDF on-the-fly
    const pdfResult = await createBudgetPdf(budget);
    const filepath = path.join(process.cwd(), 'uploads', 'budgets', pdfResult.filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${budget.code || 'presupuesto'}.pdf"`);
    
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err: any) => {
      console.error('Error streaming PDF:', err);
      res.status(500).json({ error: 'Error al generar PDF' });
    });
  } catch (err: any) {
    console.error('GET /api/budgets/:id/pdf', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/budgets - create
router.post('/', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    
    // 1. Si viene con `type` e `inputs`, usar servicio de cálculo
    let calculatedItems: any[] | undefined;
    let calculatedSubtotal: number | undefined;
    let calculatedVatTotal: number | undefined;
    let calculatedTotal: number | undefined;
    
    if (data.type && data.inputs) {
      let calcResult;
      switch (data.type) {
        case 'PYME':
          calcResult = await calculatePyme(data.inputs as PymeInput);
          break;
        case 'AUTONOMO':
          calcResult = await calculateAutonomo(data.inputs as AutonomoInput);
          break;
        case 'RENTA':
          calcResult = await calculateRenta(data.inputs as RentaInput);
          break;
        case 'HERENCIAS':
          calcResult = await calculateHerencias(data.inputs as HerenciasInput);
          break;
        default:
          return res.status(400).json({ error: `Tipo de presupuesto no válido: ${data.type}` });
      }
      
      calculatedItems = calcResult.items.map((item: any) => ({
        catalogKey: null,
        description: item.concept,
        category: item.category,
        quantity: item.quantity,
        unit: 'ud',
        unitPrice: item.unitPrice,
        vatPct: item.vatPct,
        subtotal: item.subtotal,
      }));
      
      calculatedSubtotal = calcResult.subtotal;
      calculatedVatTotal = calcResult.vatTotal;
      calculatedTotal = calcResult.total;
    }
    
    // 2. Generar código, número, año
    const now = new Date();
    const year = now.getFullYear();
    const series = data.series || 'AL';
    const p: any = prisma;
    const last = await p.budgets.findFirst({ where: { year, series }, orderBy: { number: 'desc' } });
    const number = last ? last.number + 1 : 1;
    const code = `${series}-${year}-${String(number).padStart(4, '0')}`;
    const date = data.date ? new Date(data.date) : now;
    const validDays = data.validDays ?? 30;
    const expiresAt = new Date(date);
    expiresAt.setDate(expiresAt.getDate() + Number(validDays));

    // Generar acceptance hash inmediatamente
    const acceptanceHash = generateAcceptanceHash(code, date);

    // 3. Crear presupuesto
    const budgetId = randomUUID();

    const created = await p.budgets.create({
      data: {
        id: budgetId,
        series,
        number,
        year,
        code,
        date,
        validDays: Number(validDays),
        expiresAt,
        acceptanceHash,
        type: data.type || 'PYME',
        company_brand: data.companyBrand || 'LA_LLAVE',
        clientName: data.clientName || '',
        client_nif: data.clientNif || null,
        client_email: data.clientEmail || null,
        client_phone: data.clientPhone || null,
        client_address: data.clientAddress || null,
        notes: data.notes || null,
        subtotal: calculatedSubtotal ?? Number(data.subtotal || 0),
        vat_total: calculatedVatTotal ?? Number(data.vatTotal || 0),
        total: calculatedTotal ?? Number(data.total || 0),
        template_snapshot: data.templateSnapshot ? JSON.stringify(data.templateSnapshot) : null,
        manually_edited: Boolean(data.manuallyEdited ?? false),
        custom_total: data.customTotal !== undefined && data.customTotal !== null ? Number(data.customTotal) : null,
        currency: data.currency || 'EUR',
        createdAt: now,
        updatedAt: now,
      },
    });

    // 4. Create budget items (usar calculatedItems si existe, sino data.items)
    const itemsToCreate = calculatedItems || data.items || [];
    if (Array.isArray(itemsToCreate) && itemsToCreate.length > 0) {
      for (let i = 0; i < itemsToCreate.length; i++) {
        const item = itemsToCreate[i];
        const quantity = toNumber(item.quantity, 1);
        const unitPrice = toNumber(
          item.unitPrice ?? item.price ?? (item.subtotal !== undefined ? toNumber(item.subtotal, 0) / (quantity || 1) : 0),
          0
        );
        const vatPct = toNumber(item.vatPct, 0);
        const subtotal = item.subtotal !== undefined ? toNumber(item.subtotal, 0) : quantity * unitPrice;
        const total = subtotal * (1 + vatPct / 100);
        await p.budget_items.create({
          data: {
            id: randomUUID(),
            budgetId: created.id,
            concept: item.description || item.concept || '',
            category: item.category || null,
            position: item.position ?? item.order ?? i + 1,
            quantity,
            unitPrice,
            vatPct,
            subtotal,
            total,
          } as any
        });
      }
    }

    // 5. Return created budget with items
    const budgetWithItems = await p.budgets.findUnique({
      where: { id: created.id },
      include: {
        budget_items: { orderBy: { position: 'asc' } },
        budget_email_logs: { orderBy: { createdAt: 'desc' } },
      },
    });

    res.status(201).json(normalizeBudget(budgetWithItems));
  } catch (err: any) {
    console.error('POST /api/budgets', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/budgets/:id
 * Actualizar presupuesto existente (edición manual)
 */
router.put('/:id', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const p: any = prisma;

    // Verificar que el presupuesto existe
    const existing = await p.budgets.findUnique({ 
      where: { id },
      include: { items: true }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Actualizar datos del presupuesto
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.clientNif !== undefined) updateData.client_nif = data.clientNif;
    if (data.clientEmail !== undefined) updateData.client_email = data.clientEmail;
    if (data.clientPhone !== undefined) updateData.client_phone = data.clientPhone;
    if (data.clientAddress !== undefined) updateData.client_address = data.clientAddress;
    if (data.companyBrand !== undefined) updateData.company_brand = data.companyBrand;
    if (data.validDays !== undefined) updateData.validDays = Number(data.validDays);
    if (data.validityDays !== undefined) updateData.validDays = Number(data.validityDays);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.templateSnapshot !== undefined) {
      updateData.template_snapshot = data.templateSnapshot ? JSON.stringify(data.templateSnapshot) : null;
    }
    
    // Si se proporciona customTotal, marcar como editado manualmente
    if (data.customTotal !== undefined) {
      if (data.customTotal === null) {
        updateData.custom_total = null;
        updateData.manually_edited = false;
      } else {
        updateData.custom_total = Number(data.customTotal);
        updateData.manually_edited = true;
      }
    }
    
    // Actualizar totales si se proporcionan
    if (data.subtotal !== undefined) updateData.subtotal = Number(data.subtotal);
    if (data.vatTotal !== undefined) updateData.vat_total = Number(data.vatTotal);
    if (data.total !== undefined) updateData.total = Number(data.total);

    const updated = await p.budgets.update({
      where: { id },
      data: updateData
    });

    // Actualizar items si se proporcionan
    if (data.items && Array.isArray(data.items)) {
      // Eliminar items existentes
      await p.budget_items.deleteMany({ where: { budgetId: id } });
      
      // Crear nuevos items
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const quantity = toNumber(item.quantity, 1);
        const unitPrice = toNumber(
          item.unitPrice ?? item.price ?? (item.subtotal !== undefined ? toNumber(item.subtotal, 0) / (quantity || 1) : 0),
          0
        );
        const vatPct = toNumber(item.vatPct, 21);
        const subtotal = item.subtotal !== undefined ? toNumber(item.subtotal, quantity * unitPrice) : quantity * unitPrice;
        const total = item.total !== undefined ? toNumber(item.total, subtotal * (1 + vatPct / 100)) : subtotal * (1 + vatPct / 100);
        
        await p.budget_items.create({
          data: {
            id: randomUUID(),
            budgetId: id,
            concept: item.concept || item.description || '',
            category: item.category || null,
            position: item.position ?? item.order ?? i + 1,
            quantity: quantity,
            unitPrice: unitPrice,
            vatPct: vatPct,
            subtotal: subtotal,
            total: total,
            isManuallyEdited: item.isManuallyEdited || false,
          }
        });
      }
    }

    // Retornar presupuesto actualizado con items
    const budgetWithItems = await p.budgets.findUnique({
      where: { id },
      include: {
        budget_items: { orderBy: { position: 'asc' } },
        budget_email_logs: { orderBy: { createdAt: 'desc' } },
      }
    });

    console.log(`✅ Presupuesto ${updated.code} actualizado por ${req.user?.username}`);
    
    res.json(normalizeBudget(budgetWithItems));
  } catch (err: any) {
    console.error('PUT /api/budgets/:id', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/budgets/:id/send - generate acceptanceHash, create PDF and send email
router.post('/:id/send', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const p: any = prisma;
    const budget = await p.budgets.findUnique({ where: { id } });
    if (!budget) return res.status(404).json({ error: 'Not found' });

    const hash = generateAcceptanceHash(budget.code, budget.date);
    await p.budgets.update({ where: { id }, data: { acceptanceHash: hash, status: 'SENT' } as any });

    // generate PDF (best-effort)
    let pdfRecord: any = null;
    try {
      const pdfPath = await createBudgetPdf(budget);
      pdfRecord = await p.budget_pdfs.create({ data: { budgetId: id, filename: pdfPath.filename, url: pdfPath.url } as any });
    } catch (pdfErr) {
      console.warn('PDF generation failed', pdfErr);
    }

    // send email with acceptance link
    let emailLog: any = null;
    try {
      if (budget.client_email) {
        const smtp = getSMTPConfig();
        const transporter = smtp ? nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: (smtp as any).pass } }) : null;
        const acceptUrl = `${process.env.FRONTEND_URL || 'https://tu-dominio'}/public/budgets/${encodeURIComponent(budget.code)}/accept?t=${encodeURIComponent(hash)}`;
        const subject = `Presupuesto ${budget.code} de Asesoría La Llave`;
        const html = `
          <div>
            <p>Hola ${budget.clientName || ''},</p>
            <p>Adjuntamos su presupuesto <strong>${budget.code}</strong>. Puede aceptarlo en el siguiente enlace:</p>
            <p><a href="${acceptUrl}">Aceptar presupuesto</a></p>
          </div>
        `;

        let sent = false;
        let response: any = null;
        if (transporter) {
          try {
            response = await transporter.sendMail({ from: smtp!.user, to: budget.client_email, subject, html, attachments: pdfRecord ? [{ filename: pdfRecord.filename, path: path.join(process.cwd(), 'uploads', 'budgets', pdfRecord.filename) }] : undefined });
            sent = true;
          } catch (mailErr) {
            console.warn('Failed sending budget email', mailErr);
          }
        }

        emailLog = await p.budget_email_logs.create({ data: { budgetId: id, status: sent ? 'SENT' : 'FAILED', toEmail: budget.client_email, subject, response: response ? response : null } as any });
      }
    } catch (mailErr) {
      console.warn('Error sending email for budget', id, mailErr);
    }

    res.json({ ok: true, acceptanceHash: hash, pdf: pdfRecord, emailLog });
  } catch (err: any) {
    console.error('POST /api/budgets/:id/send', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/budgets/:id/remind - send reminder email manually
router.post('/:id/remind', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const p: any = prisma;
    const budget = await p.budgets.findUnique({ where: { id } });
    if (!budget) return res.status(404).json({ error: 'Not found' });
    if (!budget.client_email) return res.status(400).json({ error: 'No client email' });
    if (budget.status !== 'SENT' && budget.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only remind SENT or DRAFT budgets' });
    }
    if (budget.expiresAt && new Date(budget.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Budget already expired' });
    }

    // Send reminder email
    const smtp = getSMTPConfig();
    const transporter = smtp ? nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: (smtp as any).pass } }) : null;
    
    const acceptUrl = `${process.env.FRONTEND_URL || 'https://tu-dominio'}/public/budgets/${encodeURIComponent(budget.code)}/accept?t=${encodeURIComponent(budget.acceptanceHash || '')}`;
    const subject = `Recordatorio: Presupuesto ${budget.code}`;
    const html = `
      <div>
        <p>Hola ${budget.clientName || ''},</p>
        <p>Te recordamos que tu presupuesto <strong>${budget.code}</strong> está pendiente de aceptación.</p>
        ${budget.expiresAt ? `<p>Válido hasta: ${new Date(budget.expiresAt).toLocaleDateString()}</p>` : ''}
        <p><a href="${acceptUrl}">Aceptar presupuesto</a></p>
      </div>
    `;

    let sent = false;
    let response: any = null;
    if (transporter) {
      try {
        response = await transporter.sendMail({ from: smtp!.user, to: budget.client_email, subject, html });
        sent = true;
      } catch (mailErr) {
        console.warn('Failed sending reminder email', mailErr);
      }
    }

    const emailLog = await p.budget_email_logs.create({ 
      data: { 
        budgetId: id, 
        status: sent ? 'SENT' : 'FAILED', 
        toEmail: budget.client_email, 
        subject, 
        response: response ? response : null 
      } as any 
    });

    res.json({ ok: true, sent, emailLog });
  } catch (err: any) {
    console.error('POST /api/budgets/:id/remind', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/budgets/export.csv - export filtered list as CSV
router.get('/export.csv', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    const p: any = prisma;
    const items = await p.budgets.findMany({ where, orderBy: { date: 'desc' } });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=\"budgets.csv\"`);
    // simple csv
    res.write('code,date,clientName,clientEmail,series,status,subtotal,vatTotal,total,expiresAt,acceptedAt\n');
    for (const raw of items) {
      const b = normalizeBudget(raw);
      res.write(`${b.code},${new Date(b.date).toISOString()},"${(b.clientName||'').replace(/"/g,'""')}",${b.clientEmail || ''},${b.series},${b.status},${b.subtotal},${b.vatTotal},${b.total},${b.expiresAt || ''},${b.acceptedAt || ''}\n`);
    }
    res.end();
  } catch (err: any) {
    console.error('GET /api/budgets/export.csv', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/budgets/export.xlsx - export filtered list as XLSX
router.get('/export.xlsx', authenticateToken, ensureRole, async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    const p: any = prisma;
    const items = await p.budgets.findMany({ where, orderBy: { date: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Presupuestos');

    sheet.columns = [
      { header: 'code', key: 'code', width: 20 },
      { header: 'date', key: 'date', width: 20 },
      { header: 'clientName', key: 'clientName', width: 30 },
      { header: 'clientEmail', key: 'clientEmail', width: 30 },
      { header: 'series', key: 'series', width: 10 },
      { header: 'status', key: 'status', width: 12 },
      { header: 'subtotal', key: 'subtotal', width: 12 },
      { header: 'vatTotal', key: 'vatTotal', width: 12 },
      { header: 'total', key: 'total', width: 12 },
      { header: 'expiresAt', key: 'expiresAt', width: 20 },
      { header: 'acceptedAt', key: 'acceptedAt', width: 20 },
    ];

    items.forEach((raw: any) => {
      const b = normalizeBudget(raw);
      sheet.addRow({
        code: b.code,
        date: new Date(b.date).toISOString(),
        clientName: b.clientName,
        clientEmail: b.clientEmail || '',
        series: b.series,
        status: b.status,
        subtotal: Number(b.subtotal || 0),
        vatTotal: Number(b.vatTotal || 0),
        total: Number(b.total || 0),
        expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : '',
        acceptedAt: b.acceptedAt ? new Date(b.acceptedAt).toISOString() : '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="budgets.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('GET /api/budgets/export.xlsx', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
