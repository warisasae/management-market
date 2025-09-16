// controllers/productController.js
import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

// POST /api/products
export async function createProduct(req, res, next) {
  try {
    let { product_name, category_id, barcode, cost_price, sell_price, unit, stock_qty, status } = req.body;

    // ✅ ตรวจสอบค่า required
    if (!product_name?.trim() || !category_id || sell_price == null || !unit?.trim()) {
      return res.status(400).json({ error: 'product_name, category_id, sell_price, unit are required' });
    }

    // ตรวจสอบ category_id
    const cat = await prisma.category.findUnique({ where: { category_id } });
    if (!cat) return res.status(409).json({ error: 'category_id not found' });

    // สร้าง product_id อัตโนมัติ
    const product_id = await genId({ model: 'product', field: 'product_id', prefix: 'PR', pad: 3 });

    // แปลงเป็นตัวเลข
    const cost = cost_price == null ? 0 : Number(cost_price);
    const sell = Number(sell_price);
    const qty = stock_qty == null ? 0 : Number(stock_qty);

    if (Number.isNaN(cost) || Number.isNaN(sell) || Number.isNaN(qty)) {
      return res.status(400).json({ error: 'cost_price, sell_price, stock_qty must be numbers' });
    }

    const created = await prisma.product.create({
      data: {
        product_id,
        product_name: product_name.trim(),
        category_id,
        barcode: barcode?.trim() || null,
        cost_price: cost,
        sell_price: sell,
        unit: unit.trim(),
        stock_qty: qty,
        status: status || 'AVAILABLE'
      }
    });

    res.status(201).json(created);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Duplicate value', target: e.meta?.target });
    next(e);
  }
}

// GET /api/products
export async function getAllProducts(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();

    const where = q
      ? {
          OR: [
            { product_name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q } },
            { category: { category_name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {};

    const rows = await prisma.product.findMany({
      where,
      orderBy: { product_id: "asc" },
      include: { category: { select: { category_id: true, category_name: true } } },
      take: 1000,
    });

    res.json(rows);
  } catch (e) {
    next(e);
  }
}

// GET /api/products/:id
export async function getProduct(req, res, next) {
  try {
    const row = await prisma.product.findUnique({
      where: { product_id: req.params.id },
      include: { category: true }
    });

    if (!row) return res.status(404).json({ error: 'product not found' });
    res.json(row);
  } catch (e) { next(e); }
}

// PUT /api/products/:id
export async function updateProduct(req, res, next) {
  try {
    const { product_name, category_id, barcode, cost_price, sell_price, unit, stock_qty, status } = req.body;

    const data = {};
    if (product_name !== undefined) data.product_name = product_name.trim();
    if (category_id !== undefined) data.category_id = category_id;
    if (barcode !== undefined) data.barcode = barcode?.trim() || null;
    if (cost_price !== undefined) data.cost_price = Number(cost_price);
    if (sell_price !== undefined) data.sell_price = Number(sell_price);
    if (unit !== undefined) data.unit = unit.trim();
    if (stock_qty !== undefined) data.stock_qty = Number(stock_qty);
    if (status !== undefined) data.status = status;

    const updated = await prisma.product.update({
      where: { product_id: req.params.id },
      data
    });

    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'product not found' });
    if (e.code === 'P2002') return res.status(409).json({ error: 'Duplicate value', target: e.meta?.target });
    next(e);
  }
}

// GET /api/products/barcode/:barcode
export async function getProductByBarcode(req, res, next) {
  try {
    const row = await prisma.product.findUnique({ where: { barcode: req.params.barcode } });
    if (!row) return res.status(404).json({ error: 'product not found' });
    res.json(row);
  } catch (e) { next(e); }
}

// GET /api/products/search?q=...
export async function searchProducts(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();
    const where = q
      ? {
          OR: [
            { product_name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q } },
            { category: { category_name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {};

    const rows = await prisma.product.findMany({
      where,
      take: 20,
      orderBy: { product_name: "asc" },
      select: {
        product_id: true,
        product_name: true,
        sell_price: true,
        unit: true,
        barcode: true,
        status: true,
        category: { select: { category_id: true, category_name: true } },
      },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req, res, next) {
  try {
    await prisma.product.delete({ where: { product_id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'product not found' });
    next(e);
  }
}
