// controllers/expenseController.js
import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

const toNumber = (v, name) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};
const toDateOrNow = (v) => (v ? new Date(v) : new Date());
const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

// POST /api/expenses
export async function createExpense(req, res, next) {
  try {
    const { expense_name, amount, expense_date, note } = req.body;
    if (!expense_name || amount == null) {
      return res.status(400).json({ error: 'expense_name and amount are required' });
    }

    const amt = toNumber(amount, 'amount');
    const dt = toDateOrNow(expense_date);
    if (!isValidDate(dt)) return res.status(400).json({ error: 'expense_date is invalid ISO date' });

    const expense_id = await genId({ model: 'expense', field: 'expense_id', prefix: 'EX', pad: 3 });

    const created = await prisma.expense.create({
      data: {
        expense_id,
        expense_name: expense_name.trim(),
        amount: amt,
        expense_date: dt,
        note: note?.trim() || null,
      },
    });

    res.status(201).json(created);
  } catch (e) { next(e); }
}

// GET /api/expenses
// Query params supported: ?start=2025-09-01&end=2025-09-30&min=100&max=500&q=น้ำ
export async function listExpenses(req, res, next) {
  try {
    const { start, end, min, max, q } = req.query;

    const where = {};
    if (start || end) {
      const gte = start ? new Date(start) : undefined;
      const lt  = end ? new Date(new Date(end).getTime() + 24*60*60*1000) : undefined; // inclusive end by +1d
      where.expense_date = {};
      if (gte && isValidDate(gte)) where.expense_date.gte = gte;
      if (lt && isValidDate(lt)) where.expense_date.lt = lt;
    }
    if (min != null || max != null) {
      where.amount = {};
      if (min != null) where.amount.gte = Number(min);
      if (max != null) where.amount.lte = Number(max);
    }
    if (q) {
      where.expense_name = { contains: String(q), mode: 'insensitive' };
    }

    const rows = await prisma.expense.findMany({
      where,
      orderBy: [{ expense_date: 'desc' }, { expense_id: 'desc' }],
      take: 200,
    });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/expenses/:id
export async function getExpense(req, res, next) {
  try {
    const row = await prisma.expense.findUnique({ where: { expense_id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'expense not found' });
    res.json(row);
  } catch (e) { next(e); }
}

// PUT /api/expenses/:id
export async function updateExpense(req, res, next) {
  try {
    const { expense_name, amount, expense_date, note } = req.body;
    const data = {};

    if (expense_name !== undefined) data.expense_name = String(expense_name).trim();
    if (amount !== undefined) {
      const amt = toNumber(amount, 'amount');
      data.amount = amt;
    }
    if (expense_date !== undefined) {
      const dt = toDateOrNow(expense_date);
      if (!isValidDate(dt)) return res.status(400).json({ error: 'expense_date is invalid ISO date' });
      data.expense_date = dt;
    }
    if (note !== undefined) data.note = note?.trim() || null;

    const updated = await prisma.expense.update({
      where: { expense_id: req.params.id },
      data,
    });

    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'expense not found' });
    next(e);
  }
}

// DELETE /api/expenses/:id
export async function deleteExpense(req, res, next) {
  try {
    const deleted = await prisma.expense.delete({ where: { expense_id: req.params.id } });
    res.json(deleted);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'expense not found' });
    next(e);
  }
}
