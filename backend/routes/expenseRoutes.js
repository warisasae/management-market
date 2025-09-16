// routes/expenseRoutes.js
import { Router } from 'express';
import {
  createExpense,
  listExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';

const router = Router();

router.post('/', createExpense);
router.get('/', listExpenses);
router.get('/:id', getExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;
