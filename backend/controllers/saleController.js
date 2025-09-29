import { prisma } from "../config/prisma.js";
import { genId } from "../utils/id.js";

// ---------- helpers ----------
const asNum = (v, name) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};

// ดึง user_id จาก auth middleware (และ fallback เคสอื่น ๆ หากมี)
function pickUserId(req) {
  return (
    req.user?.user_id ??
    req.session?.user?.user_id ??
    req.auth?.user_id ??
    null
  );
}

async function findSaleByParam(idParam) {
  const asNumber = Number(idParam);
  const where = Number.isFinite(asNumber)
    ? { sale_id: String(asNumber) }
    : { sale_id: String(idParam) };
  return prisma.sale.findFirst({ where, include: { items: true } });
}

/** คืนสินค้าเข้าสต๊อก + บันทึก movement (ใช้ใน prisma.$transaction) */
async function _returnItemsToStock({ tx, sale, changeType, note, user_id }) {
  // ใช้ delegate ให้ตรงกับ Model: SaleItem -> tx.saleItem
  const items = await tx.saleItem.findMany({
    where: { sale_id: sale.sale_id },
    select: { product_id: true, quantity: true, price: true },
  });

  if (!items?.length) return;

  for (const it of items) {
    const qty = Number(it.quantity) || 0;
    if (qty <= 0) continue;

    // 1) เพิ่มสต๊อกคืน
    const updated = await tx.product.update({
      where: { product_id: it.product_id },
      data: { stock_qty: { increment: qty } },
      select: { stock_qty: true },
    });

    // 2) ปรับสถานะสินค้า
    const newStatus =
      (updated.stock_qty ?? 0) > 0 ? "AVAILABLE" : "OUT_OF_STOCK";
    await tx.product.update({
      where: { product_id: it.product_id },
      data: { status: newStatus },
    });

    // 3) บันทึก StockTransaction
    await tx.stockTransaction.create({
      data: {
        // stock_id ปล่อยให้ default(uuid()) สร้างเอง
        product_id: it.product_id,
        change_type: changeType, // "IN"
        quantity: Math.abs(qty),
        note, // เช่น `REFUND_SALE SL00043`
        user_id: user_id ?? null,
        timestamp: new Date(),
      },
    });
  }
}

// ---------- create sale ----------
export async function createSale(req, res, next) {
  try {
    const {
      items = [],
      user_id: bodyUserId,
      payment_method,
      cash_received,
      vat_rate = 0, // % เช่น 7 = 7%
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items required" });
    }

    const actorId = pickUserId(req) || bodyUserId || null;

    const sub_total_calc = items.reduce((sum, it) => {
      const qty = Number(it.quantity ?? it.qty) || 0;
      const price = Number(it.price) || 0;
      return sum + qty * price;
    }, 0);

    const vat_amount_calc = +(
      sub_total_calc * (Number(vat_rate) / 100)
    ).toFixed(2);
    const grand_total_calc = +(sub_total_calc + vat_amount_calc).toFixed(2);

    const newSaleId = await genId({
      client: prisma,
      model: "sale",
      field: "sale_id",
      prefix: "SL",
      pad: 5,
    });

    await prisma.$transaction(async (tx) => {
      // 1) สร้างหัวบิล
      await tx.sale.create({
        data: {
          sale_id: newSaleId,
          user_id: actorId,
          payment_method,
          cash_received,
          vat_rate: Number(vat_rate) || 0,
          sub_total: sub_total_calc,
          vat_amount: vat_amount_calc,
          grand_total: grand_total_calc,
          status: "PAID",
        },
      });

      // 2) สร้างรายการ + หักสต๊อก + log movement
      for (const it of items) {
        const qty = Number(it.quantity ?? it.qty) || 0;
        const price = Number(it.price) || 0;
        const pid = it.product_id ?? it.id;
        const lineTotal = +(qty * price).toFixed(2);

        // 2.1 รายการย่อย
        await tx.saleItem.create({
          data: {
            sale_id: newSaleId,
            product_id: pid,
            quantity: qty,
            price,
            total: lineTotal,
          },
        });

        // 2.2 ตรวจสต๊อก & อัปเดต
        const prod = await tx.product.findUnique({
          where: { product_id: pid },
          select: { stock_qty: true, status: true },
        });
        if (!prod) throw new Error("product_not_found");
        const before = Number(prod.stock_qty ?? 0);
        if (before - qty < 0) throw new Error("insufficient_stock");

        const after = before - qty;
        const newStatus = after <= 0 ? "OUT_OF_STOCK" : "AVAILABLE";
        await tx.product.update({
          where: { product_id: pid },
          data: { stock_qty: after, status: newStatus },
        });

        // 2.3 บันทึก movement ของการขาย (OUT)
        await tx.stockTransaction.create({
          data: {
            product_id: pid,
            change_type: "OUT",
            quantity: -Math.abs(qty), // ติดลบตามดีไซน์ปัจจุบัน
            note: `SALE ${newSaleId}`,
            user_id: actorId,
          },
        });
      }
    });

    const full = await prisma.sale.findUnique({
      where: { sale_id: newSaleId },
      include: {
        user: { select: { user_id: true, username: true, name: true } },
        items: { include: { product: true } },
      },
    });

    res.status(201).json(full);
  } catch (e) {
    if (e.message === "product_not_found") {
      return res.status(404).json({ error: "product not found" });
    }
    if (e.message === "insufficient_stock") {
      return res.status(400).json({ error: "Not enough stock" });
    }
    next(e);
  }
}

// ---------- list & get ----------
export async function listSales(req, res, next) {
  try {
    const rows = await prisma.sale.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
      include: { user: true },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getSale(req, res, next) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { sale_id: req.params.id },
      include: {
        user: { select: { user_id: true, username: true, name: true } },
        items: { include: { product: true } },
      },
    });
    if (!sale) return res.status(404).json({ error: "sale not found" });
    res.json(sale);
  } catch (e) {
    next(e);
  }
}

export async function listSalesWithItems(req, res, next) {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { created_at: "desc" },
      select: {
        sale_id: true,
        created_at: true,
        grand_total: true,
        items: {
          select: {
            sale_item_id: true,
            price: true,
            quantity: true,
            total: true,
            product: {
              select: {
                product_id: true,
                product_name: true,
                unit: true,
                barcode: true,
                sell_price: true,
                cost_price: true,
                category: { select: { category_name: true } },
              },
            },
          },
        },
      },
    });
    res.json(sales);
  } catch (err) {
    console.error("Error fetching sales data:", err);
    res.status(500).json({ error: err.message });
  }
}

// ---------- VOID / REFUND ----------
export async function voidSale(req, res) {
  const saleId = req.params.id;
  const userId = pickUserId(req);
  const now = new Date();

  try {
    const sale = await prisma.sale.findUnique({
      where: { sale_id: saleId },
      include: { items: true },
    });
    if (!sale) return res.status(404).json({ error: "ไม่พบใบเสร็จ" });

    if (sale.status === "VOID") {
      return res.status(400).json({ error: "บิลนี้ถูกยกเลิกไปแล้ว" });
    }
    if (sale.status === "REFUNDED") {
      return res.status(400).json({ error: "บิลนี้ถูกคืนเงินไปแล้ว" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1) อัปเดตสถานะบิล
      const u = await tx.sale.update({
        where: { sale_id: saleId },
        data: {
          status: "VOID",
          voided_at: now,
          voided_by: userId ?? undefined,
        },
      });

      // 2) ตีกลับสต๊อก (IN)
      for (const it of sale.items) {
        await tx.stockTransaction.create({
          data: {
            product_id: it.product_id,
            change_type: "IN",
            quantity: it.quantity,
            note: `VOID_SALE ${saleId}`,
            user_id: userId ?? undefined,
            timestamp: now,
          },
        });

        // คืนยอดคงเหลือสินค้า
        await tx.product.update({
          where: { product_id: it.product_id },
          data: { stock_qty: { increment: it.quantity }, status: "AVAILABLE" },
        });
      }
      return u;
    });

    return res.json(updated);
  } catch (err) {
    console.error("voidSale error", err);
    return res.status(500).json({ error: "ยกเลิกบิลไม่สำเร็จ" });
  }
}

export async function refundSale(req, res) {
  const saleId = req.params.id;
  const userId = pickUserId(req);
  const now = new Date();

  try {
    const sale = await prisma.sale.findUnique({
      where: { sale_id: saleId },
      include: { items: true },
    });
    if (!sale) return res.status(404).json({ error: "ไม่พบใบเสร็จ" });

    if (sale.status === "REFUNDED") {
      return res.status(400).json({ error: "บิลนี้ถูกคืนเงินไปแล้ว" });
    }
    if (sale.status === "VOID") {
      return res.status(400).json({ error: "บิลนี้ถูกยกเลิกแล้ว" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1) อัปเดตสถานะบิล
      const u = await tx.sale.update({
        where: { sale_id: saleId },
        data: {
          status: "REFUNDED",
          refunded_at: now,
          refunded_by: userId ?? undefined,
        },
      });

      // 2) คืนสต็อก (IN)
      for (const it of sale.items) {
        await tx.stockTransaction.create({
          data: {
            product_id: it.product_id,
            change_type: "IN",
            quantity: it.quantity,
            note: `REFUND_SALE ${saleId}`,
            user_id: userId ?? undefined,
            timestamp: now,
          },
        });

        // เพิ่มยอดคงเหลือกลับ
        await tx.product.update({
          where: { product_id: it.product_id },
          data: { stock_qty: { increment: it.quantity }, status: "AVAILABLE" },
        });
      }
      return u;
    });

    return res.json(updated);
  } catch (err) {
    console.error("refundSale error", err);
    return res.status(500).json({ error: "ทำรายการคืนเงินไม่สำเร็จ" });
  }
}
