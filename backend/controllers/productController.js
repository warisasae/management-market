import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

export async function createProduct(req, res, next) {
  try {
    const { product_name, category_id, barcode, cost_price, sell_price, unit } = req.body;
    if (!product_name || !category_id || sell_price == null || !unit)
      throw new Error('product_name, category_id, sell_price, unit are required');

    const cat = await prisma.categories.findUnique({ where: { category_id } });
    if (!cat) throw new Error('category_id not found');

    const product_id = await genId({ model: 'products', field: 'product_id', prefix: 'PR' });

    const created = await prisma.products.create({
      data: {
        product_id,
        product_name,
        category_id,
        barcode: barcode || null,
        cost_price: cost_price != null ? String(cost_price) : '0',
        sell_price: String(sell_price),
        unit,
        stock_qty: 0
      }
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function getAllProducts(req, res, next) {
  try {
    const rows = await prisma.products.findMany({
      orderBy: { product_name: 'asc' },
      include: { category: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
}

export async function getProduct(req, res, next) {
  try {
    const row = await prisma.products.findUnique({
      where: { product_id: req.params.id },
      include: { category: true }
    });
    if (!row) return res.status(404).json({ error: 'product not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function updateProduct(req, res, next) {
  try {
    const { product_name, category_id, barcode, cost_price, sell_price, unit } = req.body;
    const updated = await prisma.products.update({
      where: { product_id: req.params.id },
      data: {
        product_name,
        category_id,
        barcode: barcode || null,
        cost_price: cost_price != null ? String(cost_price) : '0',
        sell_price: String(sell_price),
        unit
      }
    });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function deleteProduct(req, res, next) {
  try {
    // ควรตรวจ FK (sale_items/stock_transactions) ก่อนลบจริง หรือใช้ soft-delete
    const deleted = await prisma.products.delete({ where: { product_id: req.params.id } });
    res.json(deleted);
  } catch (e) { next(e); }
}
