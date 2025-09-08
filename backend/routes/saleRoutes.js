import { Router } from 'express';
import { createSale, getAllSales, getSale } from '../controllers/saleController.js';

const router = Router();
router.post('/', createSale);
router.get('/', getAllSales);
router.get('/:id', getSale);

export default router;
