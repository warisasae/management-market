import { Router } from 'express';
import { createSale, listSales, getSale, listSalesWithItems } from '../controllers/saleController.js';

const router = Router();

// ✅ เจาะจงก่อน
router.get('/with-items', listSalesWithItems);

// รายการทั้งหมด
router.get('/', listSales);

// ตาม id (ประกาศหลังสุด)
router.get('/:id', getSale);

// สร้างรายการขาย
router.post('/', createSale);

export default router;
