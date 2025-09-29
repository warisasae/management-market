import { Router } from "express";
import { exportExcel } from "../controllers/backupController.js";
const router = Router();

// แนะนำให้ล็อกอินก่อนดาวน์โหลด (เส้นนี้อยู่ใต้ authed)
router.get("/excel", exportExcel);

export default router;
