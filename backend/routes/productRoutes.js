// routes/productRoute.js
import { Router } from "express";
import { prisma } from "../config/prisma.js";
import {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
  searchProducts
} from "../controllers/productController.js";

const router = Router();

// health check
router.get("/ping", (_req, res) => res.json({ ok: true, at: "products" }));

/* -------------------- specific routes first -------------------- */

// สินค้าใกล้หมด stock
router.get("/low-stock", async (req, res) => {
  try {
    const threshold = Number(req.query.threshold ?? 5);
    const rows = await prisma.product.findMany({
      where: {
        AND: [
          { stock_qty: { gt: 0, lte: threshold } },
          { status: { in: ["AVAILABLE", "OUT_OF_STOCK"] } },
        ],
      },
      orderBy: [{ stock_qty: "asc" }, { product_name: "asc" }],
      select: { product_id: true, product_name: true, barcode: true, unit: true, sell_price: true, stock_qty: true, status: true },
    });
    res.json(rows);
  } catch (err) {
    console.error("low-stock error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// สินค้าหมด stock
router.get("/out-of-stock", async (_req, res) => {
  try {
    const rows = await prisma.product.findMany({
      where: {
        AND: [
          { stock_qty: { lte: 0 } },
          { status: { in: ["AVAILABLE", "OUT_OF_STOCK"] } },
        ],
      },
      orderBy: [{ product_name: "asc" }],
      select: { product_id: true, product_name: true, barcode: true, unit: true, sell_price: true, stock_qty: true, status: true },
    });
    res.json(rows);
  } catch (err) {
    console.error("out-of-stock error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// search / barcode
router.get("/barcode/:barcode", getProductByBarcode);
router.get("/search", searchProducts);

// CRUD
router.post("/", createProduct);
router.get("/", getAllProducts);

// dynamic route ต้องวางท้ายสุด
router.get("/:id", getProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
