import { prisma } from "../config/prisma.js";

/** ปรับได้ผ่าน .env ถ้าอยาก */
const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);

/** แสดงเฉพาะสินค้าที่ขายอยู่เท่านั้น */
const ALLOWED_STATES = ["AVAILABLE", "OUT_OF_STOCK"];

/** คำนวณช่วง "วันนี้" ตามเวลาไทย แล้วแปลงเป็น UTC สำหรับ query created_at */
/** คำนวณช่วง "วันนี้" เวลาไทย แล้วแปลงเป็น UTC สำหรับ query created_at */
/** คำนวณช่วง "วันนี้" เวลาไทย 00:00–23:59:59 แล้วแปลงเป็น UTC สำหรับ query created_at */
function todayRangeUTCForBangkok() {
  const now = new Date();

  // เวลาไทย = UTC+7
  const bkkOffset = 7 * 60 * 60 * 1000;

  // เอาเวลา UTC ปัจจุบัน +7 ชั่วโมง = เวลาไทย
  const bkkNow = new Date(now.getTime() + bkkOffset);

  // เริ่มต้นวันไทย 00:00
  const bkkStart = new Date(
    bkkNow.getFullYear(),
    bkkNow.getMonth(),
    bkkNow.getDate(),
    0, 0, 0, 0
  );

  // แปลงกลับเป็น UTC สำหรับ query
  const startUtc = new Date(bkkStart.getTime() - bkkOffset);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000); // 23:59:59.999

  console.log("=== Dashboard Today Range ===");
  console.log("startUtc:", startUtc.toISOString());
  console.log("endUtc:", endUtc.toISOString());

  return { startUtc, endUtc };
}



/** ดึง sale_id ภายในช่วงเวลา (ใช้ created_at) */
async function saleIdsBetween(startUtc, endUtc) {
  const sales = await prisma.sale.findMany({
    where: { created_at: { gte: startUtc, lt: endUtc } },
    select: { sale_id: true },
  });
  return sales.map((s) => s.sale_id);
}

/** ดึง SaleItem ของ sale_id ชุดหนึ่ง */
async function saleItemsByIds(saleIds, select) {
  if (!saleIds.length) return [];
  return prisma.saleItem.findMany({
    where: { sale_id: { in: saleIds } },
    select,
  });
}

/** รวมยอดขายวันนี้และกำไรวันนี้จาก SaleItem */
async function calcTodayTotals(startUtc, endUtc) {
  const todayIds = await saleIdsBetween(startUtc, endUtc);
  if (!todayIds.length) return { totalSales: 0, netProfit: 0 };

  // ลองแบบ qty ก่อน
  try {
    const items = await saleItemsByIds(todayIds, {
      qty: true,
      price: true,
      product: { select: { cost_price: true } },
    });
    const totals = items.reduce(
      (acc, it) => {
        const q = Number(it.qty || 0);
        const price = Number(it.price || 0);
        const cost = Number(it.product?.cost_price || 0);
        acc.totalSales += price * q;
        acc.netProfit += (price - cost) * q;
        return acc;
      },
      { totalSales: 0, netProfit: 0 }
    );
    return totals;
  } catch {
    // fallback: quantity
    const items = await saleItemsByIds(todayIds, {
      quantity: true,
      price: true,
      product: { select: { cost_price: true } },
    });
    const totals = items.reduce(
      (acc, it) => {
        const q = Number(it.quantity || 0);
        const price = Number(it.price || 0);
        const cost = Number(it.product?.cost_price || 0);
        acc.totalSales += price * q;
        acc.netProfit += (price - cost) * q;
        return acc;
      },
      { totalSales: 0, netProfit: 0 }
    );
    return totals;
  }
}

/** สินค้าขายดีย้อนหลัง 30 วัน */
async function bestSellersSince(sinceDate, limit = 10) {
  const now = new Date();
  const ids = await saleIdsBetween(sinceDate, now);
  if (!ids.length) return [];

  try {
    const grouped = await prisma.saleItem.groupBy({
      by: ["product_id"],
      where: { sale_id: { in: ids } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: limit,
    });

    const prodIds = grouped.map((g) => g.product_id);
    const prods =
      prodIds.length > 0
        ? await prisma.product.findMany({
            where: { product_id: { in: prodIds }, status: { in: ALLOWED_STATES } },
            select: { product_id: true, product_name: true, unit: true, status: true },
          })
        : [];

    const map = new Map(prods.map((p) => [p.product_id, p]));
    return grouped
      .map((g) => {
        const p = map.get(g.product_id);
        if (!p) return null;
        return {
          product_id: g.product_id,
          name: p.product_name,
          unit: p.unit ?? "ชิ้น",
          sold: Number(g._sum.qty || 0),
        };
      })
      .filter(Boolean);
  } catch {
    // fallback quantity
    const grouped = await prisma.saleItem.groupBy({
      by: ["product_id"],
      where: { sale_id: { in: ids } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    const prodIds = grouped.map((g) => g.product_id);
    const prods =
      prodIds.length > 0
        ? await prisma.product.findMany({
            where: { product_id: { in: prodIds }, status: { in: ALLOWED_STATES } },
            select: { product_id: true, product_name: true, unit: true, status: true },
          })
        : [];

    const map = new Map(prods.map((p) => [p.product_id, p]));
    return grouped
      .map((g) => {
        const p = map.get(g.product_id);
        if (!p) return null;
        return {
          product_id: g.product_id,
          name: p.product_name,
          unit: p.unit ?? "ชิ้น",
          sold: Number(g._sum.quantity || 0),
        };
      })
      .filter(Boolean);
  }
}

/** --- Controller --- */
export async function getDashboardSummary(_req, res) {
  try {
    res.setHeader("Cache-Control", "no-store"); // ป้องกัน 304
    const { startUtc, endUtc } = todayRangeUTCForBangkok();
    console.log("=== Dashboard Today Range ===");
    console.log("startUtc:", startUtc.toISOString());
    console.log("endUtc:", endUtc.toISOString());

    const { totalSales, netProfit } = await calcTodayTotals(startUtc, endUtc);

    const [totalProducts, stockAgg] = await Promise.all([
      prisma.product.count(),
      prisma.product.aggregate({ _sum: { stock_qty: true } }),
    ]);
    const stockCount = Number(stockAgg?._sum?.stock_qty ?? 0);

    const [lowStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({
        where: { AND: [{ stock_qty: { gt: 0, lte: LOW_STOCK_THRESHOLD } }, { status: { in: ALLOWED_STATES } }] },
      }),
      prisma.product.count({
        where: { AND: [{ stock_qty: { lte: 0 } }, { status: { in: ALLOWED_STATES } }] },
      }),
    ]);

    const [lowStocks, outOfStocks] = await Promise.all([
      prisma.product.findMany({
        where: { AND: [{ stock_qty: { gt: 0, lte: LOW_STOCK_THRESHOLD } }, { status: { in: ALLOWED_STATES } }] },
        select: { product_id: true, product_name: true, barcode: true, unit: true, sell_price: true, stock_qty: true, status: true },
        orderBy: [{ stock_qty: "asc" }, { product_name: "asc" }],
        take: 50,
      }),
      prisma.product.findMany({
        where: { AND: [{ stock_qty: { lte: 0 } }, { status: { in: ALLOWED_STATES } }] },
        select: { product_id: true, product_name: true, barcode: true, unit: true, sell_price: true, stock_qty: true, status: true },
        orderBy: { product_name: "asc" },
        take: 50,
      }),
    ]);

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const bestSellers = await bestSellersSince(since, 10);

    return res.json({
      totalSales,
      netProfit,
      totalProducts,
      stockCount,
      lowStockCount,
      outOfStockCount,
      lowStocks,
      outOfStocks,
      bestSellers,
    });
  } catch (err) {
    console.error("[dashboard error]", err);
    return res.status(500).json({ message: err.message });
  }
}
