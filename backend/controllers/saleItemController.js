import { prisma } from '../config/prisma.js';

// GET /api/sale-items/by-sale/:sale_id
export async function getSaleItemsBySale(req, res, next) {
  try {
    const rows = await prisma.sale_items.findMany({
      where: { sale_id: req.params.sale_id },
      include: { product: true, sale: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
}
