// backend/routes/dashboard.routes.js
import { Router } from "express";
import { requireLogin } from "../middlewares/authMiddleware.js";  // นำเข้า middleware
import { getDashboardSummary } from "../controllers/dashboardController.js";
const router = Router();
router.get("/summary", requireLogin, getDashboardSummary);
router.get("/", (req, res) => {
  // ส่งข้อมูลสรุปที่ต้องการใน dashboard
  res.json({ message: "Welcome to the Dashboard" });
});
export default router;
