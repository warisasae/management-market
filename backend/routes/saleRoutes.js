// backend/routes/saleRoutes.js
import { Router } from "express";
import { requireLogin, requireAdmin } from "../middlewares/authMiddleware.js";
import {
  createSale, listSales, getSale, listSalesWithItems,
  voidSale, refundSale
} from "../controllers/saleController.js";

const router = Router();

// สร้างขาย
router.post("/", requireLogin, createSale);

// รายการขาย
router.get("/", requireLogin, listSales);

// ต้องมาก่อน "/:id" ไม่งั้นจะโดนจับเป็น id
router.get("/with-items", requireLogin, listSalesWithItems);

// ปุ่มยกเลิก/คืนเงิน (เฉพาะแอดมิน)
router.post("/:id/void", requireAdmin, voidSale);
router.post("/:id/refund", requireAdmin, refundSale);

// รายละเอียดบิล
router.get("/:id", requireLogin, getSale);

export default router;
