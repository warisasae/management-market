import { Router } from "express";
import { getExpiring, getLowStock } from "../controllers/inventoryController.js";
const router = Router();

router.get("/expiring", getExpiring);
router.get("/low-stock", getLowStock);

export default router;
