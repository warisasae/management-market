import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

// POST /api/categories
// POST /api/categories
export async function createCategory(req, res, next) {
  try {
    const { category_name } = req.body;
    if (!category_name) return res.status(400).json({ error: 'category_name required' });

    // ใช้ genId เพื่อ gen CA001, CA002
    const category_id = await genId({ model: 'category', field: 'category_id', prefix: 'CA' });

    const created = await prisma.category.create({
      data: { category_id, category_name },
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function listCategories(req, res, next) {
  try {
    const rows = await prisma.category.findMany({
      orderBy: { category_name: 'asc' },
      include: {
        _count: { select: { products: true } },  // ✅ นับจำนวนสินค้าตาม relation "products"
      },
    });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/categories
// นับสินค้าทุกสถานะในหมวด
export async function getAllCategories(req, res, next) {
  try {
    const rows = await prisma.category.findMany({
      orderBy: { category_name: 'asc' },
      include: {
        _count: { select: { products: true } },  // ← นับทั้งหมด
      },
    });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/categories/:id
export async function getCategory(req, res, next) {
  try {
    const row = await prisma.category.findUnique({
      where: { category_id: req.params.id },
    });
    if (!row) return res.status(404).json({ error: 'category not found' });
    res.json(row);
  } catch (e) { next(e); }
}

// PUT /api/categories/:id
export async function updateCategory(req, res, next) {
  try {
    const { category_name } = req.body;
    const updated = await prisma.category.update({
      where: { category_id: req.params.id },
      data: { category_name },
    });
    res.json(updated);
  } catch (e) { next(e); }
}

// DELETE /api/categories/:id
// controllers/categoryController.js
export async function deleteCategory(req, res, next) {
  try {
    const id = req.params.id;

    const cnt = await prisma.product.count({ where: { category_id: id } });
    if (cnt > 0) {
      return res.status(409).json({
        error: 'Category is in use',
        detail: `มีสินค้า ${cnt} รายการที่อ้างอิงหมวดนี้ ต้องย้าย/ลบสินค้าก่อน`,
      });
    }

    await prisma.category.delete({ where: { category_id: id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

