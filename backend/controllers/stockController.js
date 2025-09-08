import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

// POST /api/stock
export async function createStockTx(req, res, next) {
  const { product_id, change_type, quantity, note } = req.body;

  if (!product_id || !change_type || typeof quantity !== 'number')
    return next(new Error('product_id, change_type, quantity are required'));
  if (!['IN', 'OUT', 'ADJUST'].includes(change_type))
    return next(new Error('change_type must be IN | OUT | ADJUST'));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const prod = await tx.products.findUnique({ where: { product_id } });
      if (!prod) throw new Error('product not found');

      let delta = 0;
      if (change_type === 'IN') delta = Math.abs(quantity);
      if (change_type === 'OUT') delta = -Math.abs(quantity);
      if (change_type === 'ADJUST') delta = quantity;

      const newQty = prod.stock_qty + delta;
      if (newQty < 0) throw new Error('Insufficient stock');

      const stock_id = await genId({ client: tx, model: 'stock_transactions', field: 'stock_id', prefix: 'ST' });

      const createdTx = await tx.stock_transactions.create({
        data: { stock_id, product_id, change_type, quantity: delta, note: note || null }
      });

      await tx.products.update({ where: { product_id }, data: { stock_qty: newQty } });

      return { createdTx, newQty };
    });

    res.status(201).json({ ...result.createdTx, new_stock_qty: result.newQty });
  } catch (e) { next(e); }
}

// GET /api/stock
export async function getAllStockTx(req, res, next) {
  try {
    const rows = await prisma.stock_transactions.findMany({
      orderBy: { timestamp: 'desc' },
      include: { product: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
}
