import { Router } from "express";
import {
  createStockTx,
  getAllStockTx,
  getStockTxById,
  listStockActors,
} from "../controllers/stockController.js";

const router = Router();

// ลำดับสำคัญ: /actors ต้องมาก่อน /:id
router.get("/", getAllStockTx);
router.get("/actors", listStockActors);
router.get("/:id", getStockTxById);
router.post("/", createStockTx);

export default router;
