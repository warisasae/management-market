import { Router } from 'express';
import {
  createCategory,
  listCategories ,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

const router = Router();

router.post('/', createCategory);
router.get('/', listCategories); // GET /api/categories
router.get('/', getAllCategories);
router.get('/:id', getCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
