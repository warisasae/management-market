// controllers/productController.js
import { prisma } from '../config/prisma.js';
import { ProductStatus } from '@prisma/client';
import { genId } from '../utils/id-generator.js'; 

// ---------- small helpers ----------
const toNum = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
const safeNum = (v) => {
    const n = toNum(v);
    return n === undefined || Number.isNaN(n) ? undefined : n;
};

// ⭐️ กำหนด Prefix สำหรับ ID ทั่วไป
const PRODUCT_ID_PREFIX = 'P'; // เช่น P001, P002, P003

// ========== CRUD ==========
export async function createProduct(req, res, next) {
    try {
        let {
            product_name, category_id, barcode,
            cost_price, sell_price, unit, stock_qty, status, expiry_date,
        } = req.body;

        if (!product_name?.trim() || !category_id || sell_price == null || !unit?.trim()) {
            return res.status(400).json({ error: 'product_name, category_id, sell_price, unit are required' });
        }

        // 1. ตรวจสอบ category_id ว่ามีจริง
        const cat = await prisma.category.findUnique({ where: { category_id } });
        if (!cat) return res.status(409).json({ error: 'category_id not found' });

        // 2. สร้าง product_id โดยใช้ Prefix ทั่วไป 'P'
        const newProductId = await genId({
            model: 'product',
            field: 'product_id',
            prefix: PRODUCT_ID_PREFIX, 
            pad: 3 // เช่น P001, P002
        });

        // 🛑 การแก้ไข: ตรวจสอบ newProductId ว่าได้ค่ามาจริง
        if (!newProductId) {
             // ส่ง 500 กลับไปพร้อมข้อความที่ Frontend จะแสดงได้
            return res.status(500).json({ error: 'Failed to generate a new product ID.' });
        }

        // 3. ตรวจสอบและแปลงค่าตัวเลข
        const cost = safeNum(cost_price) ?? 0;
        const sell = safeNum(sell_price);
        const qty = safeNum(stock_qty) ?? 0;
        if (sell === undefined) return res.status(400).json({ error: 'sell_price must be a valid number' });

        const created = await prisma.product.create({
            data: {
                product_id: newProductId, // ⭐️ ใช้ ID ใหม่ (เช่น P001)
                product_name: product_name.trim(),
                category_id,
                barcode: barcode?.trim() || null,
                cost_price: cost,
                sell_price: sell,
                unit: unit.trim(),
                stock_qty: qty,
                status: status || ProductStatus.AVAILABLE,
                expiry_date: expiry_date ? new Date(expiry_date) : null,
            },
            include: {
                category: { select: { category_id: true, category_name: true } },
            },
        });

        res.status(201).json(created);
    } catch (e) {
        // จัดการ Duplicate Key Error
        if (e.code === 'P2002') return res.status(409).json({ error: 'Duplicate value', target: e.meta?.target });
        
        // หากมี Error จาก Prisma อื่นๆ หรือ Error ทั่วไป ให้ next()
        next(e);
    }
}

export async function getAllProducts(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const where = q
      ? {
          OR: [
            { product_name: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q } },
            { category: { category_name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {};

    const rows = await prisma.product.findMany({
      where,
      orderBy: { product_id: 'asc' },
      include: { category: { select: { category_id: true, category_name: true } } },
      take: 1000,
    });

    res.json(rows);
  } catch (e) { next(e); }
}

export async function getProduct(req, res, next) {
  try {
    const row = await prisma.product.findUnique({
      where: { product_id: req.params.id },
      include: { category: true },
    });
    if (!row) return res.status(404).json({ error: 'product not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function updateProduct(req, res, next) {
  try {
    const {
      product_name, category_id, barcode,
      cost_price, sell_price, unit, stock_qty, status, expiry_date,
    } = req.body;

    const data = {};
    if (product_name !== undefined) data.product_name = (product_name ?? '').toString().trim();
    if (category_id !== undefined) data.category_id = category_id;
    if (barcode !== undefined)     data.barcode     = barcode?.toString().trim() || null;

    if (cost_price !== undefined) {
      const n = safeNum(cost_price);
      if (n !== undefined) data.cost_price = n;
    }
    if (sell_price !== undefined) {
      const n = safeNum(sell_price);
      if (n !== undefined) data.sell_price = n;
    }
    if (stock_qty !== undefined) {
      const n = safeNum(stock_qty);
      if (n !== undefined) data.stock_qty = n;
    }
    if (status !== undefined)      data.status      = status; // Prisma จะ validate enum ให้
    if (expiry_date !== undefined) data.expiry_date = expiry_date ? new Date(expiry_date) : null;

    const updated = await prisma.product.update({
      where: { product_id: req.params.id },
      data,
      include: {
        category: { select: { category_id: true, category_name: true } },
      },
    });

    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'product not found' });
    if (e.code === 'P2002') return res.status(409).json({ error: 'Duplicate value', target: e.meta?.target });
    next(e);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await prisma.product.delete({ where: { product_id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'product not found' });
    next(e);
  }
}

// ========== Lookups ==========
export async function getProductByBarcode(req, res, next) {
  try {
    const code = String(req.params.barcode || '').trim();
    if (!code) return res.status(400).json({ error: 'barcode is required' });

    // findFirst เพื่อไม่บังคับให้ barcode เป็น @unique
    const row = await prisma.product.findFirst({
      where: { barcode: code },
      select: {
        product_id: true, product_name: true, barcode: true, sell_price: true,
        unit: true, status: true, stock_qty: true, category_id: true,
      },
    });

    if (!row) return res.status(404).json({ error: 'product not found' });
    res.json(row);
  } catch (e) { next(e); }
}

export async function searchProducts(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const where = q
      ? {
          OR: [
            { product_name: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q } },
            { category: { category_name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {};

    const rows = await prisma.product.findMany({
      where,
      take: 20,
      orderBy: { product_name: 'asc' },
      select: {
        product_id: true, product_name: true, sell_price: true, unit: true,
        barcode: true, status: true,
        category: { select: { category_id: true, category_name: true } },
      },
    });
    res.json(rows);
  } catch (e) { next(e); }
}

// ========== Dashboard feeds ==========
export async function getNearExpiryProducts(req, res, next) {
  try {
    const daysRaw = Number(req.query.days ?? 7);
    const days = Number.isFinite(daysRaw) ? daysRaw : 7;

    const today = new Date();
    const limit = new Date(today);
    limit.setDate(today.getDate() + days);

    const products = await prisma.product.findMany({
      where: {
        expiry_date: { gte: today, lte: limit },
        status: { not: ProductStatus.UNAVAILABLE }, // ❗️ซ่อนเลิกขาย
      },
      select: {
        product_id: true, product_name: true, sell_price: true, unit: true,
        stock_qty: true, expiry_date: true, status: true, barcode: true,
      },
      orderBy: { expiry_date: 'asc' },
    });

    res.json(products); // [] ถ้าไม่มี
  } catch (error) {
    console.error('Error fetching near expiry products:', error);
    res.status(500).json({ error: 'Error fetching near expiry products' });
  }
}

export async function getLowStockProducts(req, res, next) {
  try {
    const thresholdRaw = Number(req.query.threshold ?? 5);
    const threshold = Number.isFinite(thresholdRaw) && thresholdRaw >= 0 ? thresholdRaw : 5;

    const rows = await prisma.product.findMany({
      where: {
        stock_qty: { gt: 0, lte: threshold },
        status: { not: ProductStatus.UNAVAILABLE }, // ❗️ซ่อนเลิกขาย
      },
      orderBy: { stock_qty: 'asc' },
      select: {
        product_id: true, product_name: true, barcode: true, unit: true,
        status: true, stock_qty: true,
        category: { select: { category_id: true, category_name: true } },
      },
      take: 200,
    });

    res.json(rows);
  } catch (e) { next(e); }
}

export async function getOutOfStockProducts(req, res, next) {
  try {
    const rows = await prisma.product.findMany({
      where: {
        stock_qty: { lte: 0 },                 // ถ้า stock_qty เป็น non-null ใช้อันนี้พอ
        status: { not: ProductStatus.UNAVAILABLE }, // ❗️ซ่อนเลิกขาย
      },
      orderBy: { product_name: 'asc' },
      select: {
        product_id: true, product_name: true, barcode: true, unit: true,
        status: true, stock_qty: true,
        category: { select: { category_id: true, category_name: true } },
      },
      take: 200,
    });

    res.json(rows);
  } catch (e) { next(e); }
}
