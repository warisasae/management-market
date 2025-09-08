import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

// POST /api/expenses
export async function createExpense(req, res, next) {
  try {
    const { user_id, expense_name, amount, expense_date, note } = req.body;
    if (!user_id || !expense_name || amount == null) throw new Error('user_id, expense_name, amount are required');

    const expense_id = await genId({ model: 'expenses', field: 'expense_id', prefix: 'EX' });
    const created = await prisma.expenses.create({
      data: {
        expense_id,
        user_id,
        expense_name,
        amount: String(Number(amount).toFixed(2)),
        expense_date: expense_date ? new Date(expense_date) : undefined,
        note: note || null
      }
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
}

// GET /api/expenses
export async function getAllExpenses(req, res, next) {
  try {
    const rows = await prisma.expenses.findMany({ orderBy: { expense_date: 'desc' } });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/expenses/:id
export async function getExpense(req, res, next) {
  try {
    const row = await prisma.expenses.findUnique({ where: { expense_id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'expense not found' });
    res.json(row);
  } catch (e) { next(e); }
}

// PUT /api/expenses/:id
export async function updateExpense(req, res, next) {
  try {
    const { expense_name, amount, expense_date, note } = req.body;
    const updated = await prisma.expenses.update({
      where: { expense_id: req.params.id },
      data: {
        expense_name,
        amount: amount != null ? String(Number(amount).toFixed(2)) : undefined,
        expense_date: expense_date ? new Date(expense_date) : undefined,
        note
      }
    });
    res.json(updated);
  } catch (e) { next(e); }
}

// DELETE /api/expenses/:id
export async function deleteExpense(req, res, next) {
  try {
    const deleted = await prisma.expenses.delete({ where: { expense_id: req.params.id } });
    res.json(deleted);
  } catch (e) { next(e); }
}
