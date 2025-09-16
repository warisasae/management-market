// controllers/salesController.js
import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';

const asNum = (v, name) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};

export async function createSale(req, res, next) {
  try {
    const {
      items = [],
      user_id: bodyUserId,
      payment_method,
      cash_received,
      vat_rate = 0,   // % (เช่น 7 = 7%)
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items required" });
    }

    const actorId = req.user?.user_id || bodyUserId || null;

    // 👉 คำนวณยอดจาก items เองเสมอ
    const sub_total_calc = items.reduce((sum, it) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.price) || 0;
      return sum + qty * price;
    }, 0);

    const vat_amount_calc   = +(sub_total_calc * (Number(vat_rate) / 100)).toFixed(2);
    const grand_total_calc  = +(sub_total_calc + vat_amount_calc).toFixed(2);

    const sale_id = await prisma.$transaction(async (tx) => {
      // 1) สร้างหัวบิลด้วยยอดที่คำนวณแล้ว
      await tx.sale.create({
        data: {
          sale_id: await genId({
            client: tx,
            model: "sale",
            field: "sale_id",
            prefix: "SL",
            pad: 5,
          }),
          user_id: actorId,
          payment_method,
          cash_received,
          vat_rate: Number(vat_rate) || 0,
          sub_total: sub_total_calc,
          vat_amount: vat_amount_calc,
          grand_total: grand_total_calc,
        },
      });

      // อ่าน sale_id ที่เพิ่ง gen (หรือคุณจะเก็บไว้จาก genId ก็ได้)
      // แต่ในที่นี้เราใช้ค่าเดียวกับที่ส่งตอนสร้าง เพื่อความชัดเจน ดึงจากบิลล่าสุดที่ user นี้สร้างก็ได้
      // ง่ายสุด: สร้างก่อนแล้ว "จำค่า" จาก genId
      const created = await tx.sale.findFirst({
        orderBy: { created_at: 'desc' },
        select: { sale_id: true },
      });
      const sid = created.sale_id;

      // 2) ลูปสร้างรายการ + บันทึก total ของรายการ + ตัดสต๊อก + สร้าง stockTransaction
      for (const it of items) {
        const qty   = Number(it.quantity) || 0;
        const price = Number(it.price) || 0;
        const lineTotal = +(qty * price).toFixed(2);

        await tx.saleItem.create({
          data: {
            sale_id: sid,
            product_id: it.product_id,
            quantity: qty,
            price,
            total: lineTotal,       // ✅ บันทึกยอดรวมของบรรทัด
          },
        });

        // ตัดสต๊อก
        const prod = await tx.product.findUnique({
          where: { product_id: it.product_id },
          select: { stock_qty: true, status: true },
        });
        if (!prod) throw new Error("product_not_found");
        if (prod.stock_qty - qty < 0) throw new Error("insufficient_stock");

        const newQty = prod.stock_qty - qty;
        const newStatus = newQty <= 0 ? "OUT_OF_STOCK" : "AVAILABLE";
        await tx.product.update({
          where: { product_id: it.product_id },
          data: { stock_qty: newQty, status: newStatus },
        });

        // ประวัติสต๊อก (OUT)
        await tx.stockTransaction.create({
          data: {
            stock_id: await genId({
              client: tx,
              model: "stockTransaction",
              field: "stock_id",
              prefix: "ST",
              pad: 3,
            }),
            product_id: it.product_id,
            change_type: "OUT",
            quantity: -Math.abs(qty),
            note: `sale ${sid}`,
            user_id: actorId,
          },
        });
      }

      return created.sale_id;
    });

    // ส่งกลับพร้อมข้อมูล user
    const full = await prisma.sale.findUnique({
      where: { sale_id },
      include: { user: { select: { user_id: true, username: true, name: true } } },
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

// GET /api/sales  — ดูรายการขายล่าสุด
export async function listSales(req, res, next) {
  try {
    const rows = await prisma.sale.findMany({
      orderBy: { created_at: 'desc' },   // ✅ เปลี่ยนจาก sale_date → created_at
      take: 100,
      include: { user: true }
    });
    res.json(rows);
  } catch (e) { next(e); }
}

// GET /api/sales/:id — ดูบิลขาย + ไอเท็ม (แก้ให้ไม่ select field ที่ไม่มี)
export async function getSale(req, res, next) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { sale_id: req.params.id },
      include: {
        user: { select: { user_id: true, username: true, name: true } },
        items: {
          include: {
            product: true,   // ✅ เอามาทั้ง object ป้องกัน select ฟิลด์ผิด
          },
        },
      },
    });

    if (!sale) return res.status(404).json({ error: "sale not found" });
    res.json(sale);
  } catch (e) { next(e); }
}

// controllers/saleController.js
export async function listSalesWithItems(req, res, next) {
  try {
    const sales = await prisma.sale.findMany({
  orderBy: { created_at: 'desc' },
  select: {
    sale_id: true,
    created_at: true,
    grand_total: true,
    items: {
      select: {
        sale_item_id: true,
        price: true,
        quantity: true,   // ✅ ใช้อันนี้แทน
        total: true,
        product: {
          select: {
            product_id: true,
            product_name: true,
            unit: true,
            barcode: true,
            sell_price: true,
            cost_price: true,
            category: { select: { category_name: true } }
          }
        }
      }
    }
  }
});

    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales data:', err);
    res.status(500).json({ error: err.message });
  }
}