import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

// POST /api/sales
export async function createSale(req, res, next) {
  const { user_id, items } = req.body; // items: [{ product_id, quantity, price? }, ...]
  if (!user_id || !Array.isArray(items) || items.length === 0)
    return next(new Error('user_id and items[] are required'));

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const sale_id = await genId({ client: tx, model: 'sales', field: 'sale_id', prefix: 'SA' });
      await tx.sales.create({ data: { sale_id, user_id, total_amount: '0' } });

      let total = 0;

      for (const [i, it] of items.entries()) {
        if (!it.product_id || !it.quantity)
          throw new Error(`items[${i}] missing product_id or quantity`);

        const prod = await tx.products.findUnique({ where: { product_id: it.product_id } });
        if (!prod) throw new Error(`product not found: ${it.product_id}`);

        const qty = Number(it.quantity);
        if (qty <= 0) throw new Error('quantity must be > 0');

        const price = it.price != null ? Number(it.price) : Number(prod.sell_price);
        const newQty = prod.stock_qty - qty;
        if (newQty < 0) throw new Error(`Insufficient stock for ${prod.product_id}`);

        const sale_item_id = await genId({ client: tx, model: 'sale_items', field: 'sale_item_id', prefix: 'SI' });
        const subtotal = price * qty;
        total += subtotal;

        await tx.sale_items.create({
          data: {
            sale_item_id,
            sale_id,
            product_id: prod.product_id,
            quantity: qty,
            price: String(price.toFixed(2)),
            subtotal: String(subtotal.toFixed(2))
          }
        });

        await tx.products.update({ where: { product_id: prod.product_id }, data: { stock_qty: newQty } });
      }

      return tx.sales.update({
        where: { sale_id },
        data: { total_amount: String(total.toFixed(2)) },
        include: { items: true, user: true }
      });
    });

    res.status(201).json(sale);
  } catch (e) { next(e); }
}

// GET /api/sales
export async function getAllSales(req, res, next) {
  try {
    const rows = await prisma.sales.findMany({
      orderBy: { sale_date: 'desc' },
      include: { items: true, user: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/sales/:id
export async function getSale(req, res, next) {
  try {
    const row = await prisma.sales.findUnique({
      where: { sale_id: req.params.id },
      include: { items: true, user: true }
    });
    if (!row) return res.status(404).json({ error: 'sale not found' });
    res.json(row);
  } catch (e) { next(e); }
}
