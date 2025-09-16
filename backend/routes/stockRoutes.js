import { Router } from 'express';
import { createStockTx, getAllStockTx, getStockTxById } from '../controllers/stockController.js';

const router = Router();
router.post('/', createStockTx);
router.get('/', getAllStockTx);
router.get('/:id', getStockTxById);
export default router;
