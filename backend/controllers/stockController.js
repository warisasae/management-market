// controllers/stockController.js
import { prisma } from "../config/prisma.js";
import { genId } from "../utils/id.js";

// แปลงคำที่รับมาให้เป็น IN/OUT/ADJUST แบบชัดเจน
const normalizeChangeType = (t) => {
  if (!t) return null;
  const k = String(t).trim().toUpperCase();
  if (k === "ADD") return "IN";
  if (k === "REMOVE") return "OUT";
  if (["IN", "OUT", "ADJUST"].includes(k)) return k;
  return null;
};

// POST /api/stocks
export async function createStockTx(req, res, next) {
  try {
    const { product_id, change_type, quantity, note, user_id: userIdFromBody } = req.body;

    // รองรับทั้ง auth middleware และ body
    const actorId = req.user?.user_id || userIdFromBody || null;

    const type = normalizeChangeType(change_type);
    const qty = Number(quantity);

    if (!product_id || !type || !Number.isFinite(qty)) {
      return res
        .status(400)
        .json({ error: "product_id, change_type(IN/OUT/ADJUST), quantity(number) required" });
    }
    if (["IN", "OUT"].includes(type) && qty <= 0) {
      return res.status(400).json({ error: "quantity must be > 0 for IN/OUT" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.findUnique({ where: { product_id } });
      if (!prod) throw new Error("product_not_found");

      // บล็อกสินค้าที่ UNAVAILABLE ทุกกรณี
      if (prod.status === "UNAVAILABLE") throw new Error("product_unavailable");

      // คำนวณ delta
      let delta = 0;
      if (type === "IN") delta = Math.abs(qty);
      else if (type === "OUT") delta = -Math.abs(qty);
      else delta = qty; // ADJUST อนุญาตเลข +/- ได้

      const newQty = (Number(prod.stock_qty) || 0) + delta;
      if (newQty < 0) throw new Error("insufficient_stock");

      // อัปเดตสถานะ
      const newStatus = newQty <= 0 ? "OUT_OF_STOCK" : "AVAILABLE";

      // gen ไอดี
      const stock_id = await genId({
        client: tx,
        model: "stockTransaction",
        field: "stock_id",
        prefix: "ST",
        pad: 3,
      });

      // สร้าง transaction
      const createdTx = await tx.stockTransaction.create({
        data: {
          stock_id,
          product_id,
          change_type: type,
          quantity: delta, // delta จริง
          note: note || null,
          user_id: actorId,
        },
        include: {
          product: true,
          user: { select: { user_id: true, username: true, name: true } },
        },
      });

      // อัปเดตสินค้า
      await tx.product.update({
        where: { product_id },
        data: { stock_qty: newQty, status: newStatus },
      });

      return { createdTx, newQty, newStatus };
    });

    return res.status(201).json({
      ok: true,
      transaction: result.createdTx,
      product_after: {
        product_id,
        stock_qty: result.newQty,
        status: result.newStatus,
      },
    });
  } catch (e) {
    if (e.message === "product_not_found")
      return res.status(404).json({ error: "product not found" });
    if (e.message === "product_unavailable")
      return res.status(400).json({ error: "Product is UNAVAILABLE" });
    if (e.message === "insufficient_stock")
      return res.status(400).json({ error: "Not enough stock" });
    next(e);
  }
}

// GET /api/stocks
export async function getAllStockTx(req, res, next) {
  try {
    const rows = await prisma.stockTransaction.findMany({
      orderBy: { timestamp: "desc" },
      include: {
        product: true,
        user: { select: { user_id: true, username: true, name: true } },
      },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

// GET /api/stocks/:id
export async function getStockTxById(req, res, next) {
  try {
    const row = await prisma.stockTransaction.findUnique({
      where: { stock_id: req.params.id },
      include: {
        product: true,
        user: { select: { user_id: true, username: true, name: true } },
      },
    });
    if (!row) return res.status(404).json({ error: "stock transaction not found" });
    res.json(row);
  } catch (e) {
    next(e);
  }
}
