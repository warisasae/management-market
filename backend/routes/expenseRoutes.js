import { Router } from 'express';
import { createExpense, getAllExpenses, getExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';

const router = Router();
router.post('/', createExpense);
router.get('/', getAllExpenses);
router.get('/:id', getExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
