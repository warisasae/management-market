import { prisma } from "../lib/prisma.js";

// ✅ เพิ่ม vatRate (ปรับเลขตามที่คุณใช้จริง เช่น 7)
const DEFAULTS = {
  storeName: "My Grocery",
  phone: "",
  address: "",
  openTime: "07:00",
  closeTime: "21:00",
  payCash: true,
  payPromptPay: true,
  promptpayNumber: "",
  printCopies: 1,
  vatIncluded: false,
  vatRate: 0,                 // 👈 เพิ่มค่าเริ่มต้น
  receiptFooter: "ขอบคุณที่อุดหนุน",
  lowStockThreshold: 3,
  expiryAlertDays: 7,
  requireOpenShift: true,
  shiftFloat: 500,
};

export async function getSettings(_req, res) {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "system_basic" } });
    let data = row?.value ?? DEFAULTS;
    if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = DEFAULTS; } }
    // เติมช่องที่ไม่มีให้ครบ (กัน undefined)
    data = { ...DEFAULTS, ...data };
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
}

export async function updateSettings(req, res) {
  try {
    const payload = req.body;
    const saved = await prisma.setting.upsert({
      where: { key: "system_basic" },
      create: { key: "system_basic", value: payload },
      update: { value: payload },
    });
    let out = saved.value;
    if (typeof out === "string") { try { out = JSON.parse(out); } catch {} }
    // ส่งกลับแบบเติมค่าเริ่มต้นให้ครบ
    return res.json({ message: "บันทึกการตั้งค่าเรียบร้อย", settings: { ...DEFAULTS, ...out } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update settings" });
  }
}

/** 👇 NEW: สำหรับ POS ที่เรียก /api/settings/vat */
export async function getVatSettings(_req, res) {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "system_basic" } });
    let data = row?.value ?? {};
    if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = {}; } }
    const vatIncluded = data.vatIncluded ?? DEFAULTS.vatIncluded;
    const vatRate = data.vatRate ?? DEFAULTS.vatRate; // ปกติ 0 หรือ 7 แล้วแต่ระบบคุณ
    return res.json({ vatIncluded, vatRate });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch VAT settings" });
  }
}
