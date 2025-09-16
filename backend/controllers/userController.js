// controllers/userController.js
import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

// ฟังก์ชันช่วย: map error Prisma เป็นสถานะ/ข้อความอ่านง่าย
function handlePrismaError(e, res, next) {
  if (e?.code === 'P2002') {
    // unique constraint (เช่น username ซ้ำ)
    return res.status(409).json({ error: 'unique constraint violated', code: 'P2002', fields: e.meta?.target });
  }
  if (e?.code === 'P2025') {
    // not found
    return res.status(404).json({ error: 'record not found', code: 'P2025' });
  }
  next(e);
}

// POST /api/users
export async function createUser(req, res, next) {
  try {
    const { username, password, name, role = 'USER', image_url } = req.body;
    if (!username || !password || !name)
      return res.status(400).json({ error: 'username, password, name are required' });

    const user_id = await genId({ model: 'user', field: 'user_id', prefix: 'US', pad: 3 });

    const created = await prisma.user.create({
      data: { user_id, username, password, name, role, image_url: image_url || null },
      select: { user_id: true, username: true, name: true, role: true, image_url: true }
    });

    res.status(201).json(created);
  } catch (e) { handlePrismaError(e, res, next); }
}

// GET /api/users
export async function getAllUsers(req, res, next) {
  try {
    const rows = await prisma.user.findMany({
      orderBy: { username: 'asc' },
      select: { user_id: true, username: true, name: true, role: true, image_url: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/users/:id
export async function getUser(req, res, next) {
  try {
    const row = await prisma.user.findUnique({
      where: { user_id: req.params.id },
      select: { user_id: true, username: true, name: true, role: true, image_url: true }
    });
    if (!row) return res.status(404).json({ error: 'user not found' });
    res.json(row);
  } catch (e) { next(e); }
}

/**
 * PUT /api/users/:id
 * แก้ไขข้อมูลโปรไฟล์ทั่วไป (name, role, image_url)
 * ไม่แตะ username/password ที่นี่
 */
export async function updateUser(req, res, next) {
  try {
    const { name, role, image_url } = req.body;

    const updated = await prisma.user.update({
      where: { user_id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(image_url !== undefined ? { image_url } : {}),
      },
      select: { user_id: true, username: true, name: true, role: true, image_url: true }
    });

    res.json(updated);
  } catch (e) { handlePrismaError(e, res, next); }
}

/**
 * PUT /api/users/:id/username
 * เปลี่ยน username (unique)
 */
export async function updateUsername(req, res, next) {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });

    const updated = await prisma.user.update({
      where: { user_id: req.params.id },
      data: { username },
      select: { user_id: true, username: true, name: true, role: true, image_url: true }
    });

    res.json(updated);
  } catch (e) { handlePrismaError(e, res, next); }
}

/**
 * PUT /api/users/:id/password
 * เปลี่ยนรหัสผ่าน (หมายเหตุ: โปรดักชันควรใช้ bcrypt.hash)
 */
export async function updatePassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });

    const updated = await prisma.user.update({
      where: { user_id: req.params.id },
      data: { password }
    });

    res.json({ user_id: updated.user_id, ok: true });
  } catch (e) { handlePrismaError(e, res, next); }
}

// DELETE /api/users/:id
export async function deleteUser(req, res, next) {
  try {
    const deleted = await prisma.user.delete({
      where: { user_id: req.params.id },
      select: { user_id: true, username: true, name: true, role: true, image_url: true }
    });
    res.json(deleted);
  } catch (e) { handlePrismaError(e, res, next); }
}
