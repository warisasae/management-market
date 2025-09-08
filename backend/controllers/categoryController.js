import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

export async function createCategory(req, res, next) {
  try {
    const { category_name } = req.body;
    if (!category_name) throw new Error('category_name is required');

    const category_id = await genId({ model: 'categories', field: 'category_id', prefix: 'CT' });
    const created = await prisma.categories.create({ data: { category_id, category_name } });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function getAllCategories(req, res, next) {
  try {
    const rows = await prisma.categories.findMany({ orderBy: { category_name: 'asc' } });
    res.json(rows);
  } catch (e) { next(e); }
}

export async function updateCategory(req, res, next) {
  try {
    const { category_name } = req.body;
    const updated = await prisma.categories.update({
      where: { category_id: req.params.id },
      data: { category_name }
    });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function deleteCategory(req, res, next) {
  try {
    // แนะนำ: ตรวจว่ามี products อ้างอิงหรือไม่ ก่อนลบ
    const deleted = await prisma.categories.delete({ where: { category_id: req.params.id } });
    res.json(deleted);
  } catch (e) { next(e); }
}
