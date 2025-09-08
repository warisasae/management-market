import { Router } from 'express';
import { getSaleItemsBySale } from '../controllers/saleItemController.js';

const router = Router();
router.get('/by-sale/:sale_id', getSaleItemsBySale);

export default router;





