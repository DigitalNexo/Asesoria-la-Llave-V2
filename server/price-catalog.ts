import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, checkIsAdmin } from './middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// GET /api/price-catalog
router.get('/', authenticateToken, async (req, res) => {
  try {
    const p: any = prisma;
    const items = await p.priceCatalog.findMany({ where: { active: true }, orderBy: { title: 'asc' } });
    res.json(items);
  } catch (err: any) {
    console.error('GET /api/price-catalog', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/price-catalog
router.post('/', authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { key, title, unit, basePrice, vatPct, active } = req.body;
    const p: any = prisma;
    const item = await p.priceCatalog.create({ data: { key, title, unit, basePrice: Number(basePrice), vatPct: Number(vatPct || 21), active: active ?? true } as any });
    res.status(201).json(item);
  } catch (err: any) {
    console.error('POST /api/price-catalog', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/price-catalog/:id
router.patch('/:id', authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.basePrice !== undefined) updates.basePrice = Number(updates.basePrice);
    if (updates.vatPct !== undefined) updates.vatPct = Number(updates.vatPct);
    const p: any = prisma;
    const updated = await p.priceCatalog.update({ where: { id }, data: updates as any });
    res.json(updated);
  } catch (err: any) {
    console.error('PATCH /api/price-catalog/:id', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
