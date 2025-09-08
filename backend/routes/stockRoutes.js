import { Router } from 'express';
import { createStockTx, getAllStockTx } from '../controllers/stockController.js';

const router = Router();
router.post('/', createStockTx);
router.get('/', getAllStockTx);

export default router;
