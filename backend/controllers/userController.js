import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

// POST /api/users
export async function createUser(req, res, next) {
  try {
    const { username, password, name, role = 'USER' } = req.body;
    if (!username || !password || !name) throw new Error('username, password, name are required');

    const user_id = await genId({ model: 'users', field: 'user_id', prefix: 'US' });
    const created = await prisma.users.create({
      data: { user_id, username, password, name, role }
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

// GET /api/users
export async function getAllUsers(req, res, next) {
  try {
    // ชื่อด้านล่างต้อง “ตรงกับโมเดล” ใน schema.prisma
    const rows = await prisma.users.findMany({ orderBy: { username: 'asc' } });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/users/:id
export async function getUser(req, res, next) {
  try {
    const row = await prisma.users.findUnique({ where: { user_id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'user not found' });
    res.json(row);
  } catch (e) { next(e); }
}

// PUT /api/users/:id
export async function updateUser(req, res, next) {
  try {
    const { name, role } = req.body;
    const updated = await prisma.users.update({
      where: { user_id: req.params.id },
      data: { name, role }
    });
    res.json(updated);
  } catch (e) { next(e); }
}

// PUT /api/users/:id/password
export async function updatePassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) throw new Error('password required');
    const updated = await prisma.users.update({
      where: { user_id: req.params.id },
      data: { password }
    });
    res.json({ user_id: updated.user_id, ok: true });
  } catch (e) { next(e); }
}
