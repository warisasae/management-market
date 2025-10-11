// src/pages/checkout.jsx
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

// =================================================================
// ** ฟังก์ชันพิมพ์ใบเสร็จ (ฉบับแก้ไขล่าสุด) **
// =================================================================
const printReceipt = (saleData) => {
  // 1. CSS ที่คุณต้องการทั้งหมดจะอยู่ในนี้
  const receiptStyles = `
    /* 1. สไตล์พื้นฐาน */
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }
    html, body {
        width: 48mm;
        background: #fff;
        color: #0f172a;
        font-family: monospace, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        font-weight: normal;
        font-variant-numeric: tabular-nums;
    }
    /* 2. สไตล์ .receipt */
    .receipt {
        width: 100%;
        padding: 0 1mm 0 0;
        box-shadow: none;
        border: 0;
    }
    /* --- สไตล์สำหรับรายการสินค้า --- */
    .item-name {
        flex-grow: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 12px;
    }
    .item-quantity {
        flex-shrink: 0;
        margin-right: 12px;
    }
    .item-price {
        flex-shrink: 0;
        text-align: right;
    }
    /* --- สไตล์ Utility Classes --- */
    .border-dashed { border-top: 1px dashed #d1d5db; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-sm { font-size: 10px; line-height: 1.4; }
    .text-xs { font-size: 8px; line-height: 1.4; }
    .font-bold { font-weight: 700; }
    .mt-1 { margin-top: 4px; }
    .mt-2 { margin-top: 8px; }
    .mb-3 { margin-bottom: 12px; }
    .space-y-1 > * + * { margin-top: 4px; }
    .flex { display: flex; }
    .justify-between { justify-content: space-between; }
    /* 4. @page: การตั้งค่าหน้าพิมพ์ */
    @page {
        size: 48mm auto;
        margin: 0;
    }
    @media print {
        html, body, .receipt {
            width: 48mm !important;
            margin: 0 !important;
            padding: 0 1mm 0 0 !important;
        }
        .print\\:hidden, .print\\:hidden * {
            display: none !important;
        }
    }
  `;

  // 2. ฟังก์ชันช่วยในการจัดรูปแบบข้อมูล
  const formatNumber = (n) => (Number(n) || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear() + 543;
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return "";
    }
  };

  // 3. สร้าง HTML ของใบเสร็จโดยใช้ Class ที่เรากำหนดใน CSS
  const itemsHtml = saleData.items.map(it => `
    <div class="flex text-sm">
      <span class="item-name">${it.name}</span>
      <span class="item-quantity">x${it.qty}</span>
      <span class="item-price">${formatNumber(it.totalPrice)}</span>
    </div>
  `).join('');

  const receiptHtml = `
    <div class="receipt text-sm">
      <div class="text-center">
        <div class="font-bold">GROCERY STORE</div>
        <div class="text-xs">POS#${saleData.saleId}</div>
      </div>
      <div class="border-dashed mt-2"></div>
      <div class="mb-3 mt-2 space-y-1">
        ${itemsHtml}
      </div>
      <div class="border-dashed"></div>
      <div class="mt-2 space-y-1">
        <div class="flex justify-between">
          <span>ยอดรวม</span>
          <span>${formatNumber(saleData.subTotal)}</span>
        </div>
        <div class="flex justify-between">
          <span>VAT ${saleData.vatRate}%</span>
          <span>${formatNumber(saleData.vatAmount)}</span>
        </div>
        <div class="flex justify-between font-bold">
          <span>ยอดสุทธิ</span>
          <span>${formatNumber(saleData.grandTotal)}</span>
        </div>
        <div class="flex justify-between">
          <span>ชำระโดย</span>
          <span>${saleData.paymentMethod}</span>
        </div>
      </div>
      <div class="border-dashed mt-2"></div>
      <div class="text-center text-xs mt-2 space-y-1">
        <div>${formatDate(saleData.dateTime)}</div>
        <div>พนักงาน: ${saleData.cashierName}</div>
        <div className="mt-1">${saleData.receiptFooter}</div>
      </div>
    </div>
  `;

  // 4. สร้าง Iframe และสั่งพิมพ์
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>${receiptStyles}</style></head><body>${receiptHtml}</body></html>`);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 200);
    }, 80);
  };
};


export default function Checkout() {
  const navigate = useNavigate();
  const cashRef = useRef(null);
  const [settings, setSettings] = useState(null); 
  // รับ payload จาก POS (sessionStorage)
  const payload = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("mm_checkout");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const items = Array.isArray(payload.items) ? payload.items : [];
  const vatRate = typeof payload.vatRate === "number" ? payload.vatRate : 0;
  const payCash = payload.payCash ?? true;
  const payPromptPay = payload.payPromptPay ?? false;
  const promptpayNumber = payload.promptpayNumber ?? "";

  // คำนวณยอด
  const subTotal = useMemo(() => {
    return items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  }, [items]);

  const vat = useMemo(() => +(subTotal * (vatRate / 100)).toFixed(2), [subTotal, vatRate]);
  const grand = useMemo(() => +(subTotal + vat).toFixed(2), [subTotal, vat]);

  const [cash, setCash] = useState("");
  const [method, setMethod] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saleResult, setSaleResult] = useState(null);

  const needCash = method === "เงินสด";
  const enoughCash = !needCash || (Number(cash) || 0) >= grand;
  const change = Math.max(0, (Number(cash) || 0) - grand);
  const canSubmit = items.length > 0 && method && enoughCash && !saving;

  // Autofocus ช่องเงินสด
  useEffect(() => {
    if (needCash) cashRef.current?.focus();
  }, [needCash]);
 useEffect(() => {
    // ฟังก์ชันสำหรับดึงข้อมูลการตั้งค่า
    const fetchSettings = async () => {
      try {
        const res = await api.get("/settings/basic");
        if (res.data) {
          setSettings(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchSettings();
  }, []); // [] หมายถึงให้ทำงานแค่ครั้งเดียวตอนโหลด
  const getCashierName = useCallback(() => {
    try {
      const raw = localStorage.getItem("user");
      const me = raw ? JSON.parse(raw) : null;
      return me?.name || "พนักงาน"; // ดึงชื่อพนักงานจาก localStorage
    } catch {
      return "พนักงาน";
    }
  }, []);

  const completeTransaction = () => {
    setShow(false); // ปิด Modal
    sessionStorage.removeItem("mm_checkout");
    navigate("/dashboard/pos");
  };

  // กดชำระเงิน -> บันทึกลง DB
  const confirmPay = async () => {
    if (!canSubmit) return;

    try {
      setSaving(true);

      const cashierName = getCashierName(); // ดึงชื่อพนักงาน

      const raw = localStorage.getItem("user");
      const me = raw ? JSON.parse(raw) : null;
      const user_id = me?.user_id || null;

      const dataPayload = {
        user_id,
        payment_method: method,
        cash_received: method === "เงินสด" ? Number(cash) : null,
        vat_rate: vatRate,
        sub_total: subTotal,
        vat_amount: vat,
        grand_total: grand,
        items: items.map((it) => ({
          product_id: it.id,
          price: Number(it.price),
          quantity: Number(it.qty),
        })),
        payCash,
        payPromptPay,
        promptpayNumber,
      };

      // บันทึกการขายและรับ response
      const response = await api.post("/sales", dataPayload);

      // ข้อมูลที่จำเป็นสำหรับการพิมพ์ใบเสร็จ
      const saleData = {
        saleId: response.data?.sale_id || new Date().getTime(),
        dateTime: new Date().toISOString(),
        cashierName,
        items: items.map(it => ({
            name: it.name,
            qty: Number(it.qty),
            totalPrice: Number(it.price) * Number(it.qty),
        })),
        subTotal: subTotal,
        vatRate: vatRate,
        vatAmount: vat,
        grandTotal: grand,
        paymentMethod: method === "PromptPay" ? "โอนเงิน" : method,
        receiptFooter: settings?.receiptFooter || '** ขอบคุณที่ใช้บริการ **',
      };

      setSaleResult(saleData);
      setShow(true);

      // เรียกฟังก์ชันพิมพ์ใบเสร็จอัตโนมัติ
      printReceipt(saleData);

    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "บันทึกการขายไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white hover:bg-green-700"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-2xl font-extrabold">ชำระเงิน</h1>
        </div>

        {/* ตารางรายการ */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 p-4">
          <div className="overflow-hidden rounded-xl ring-1 ring-black/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#C80036] text-white">
                  <th className="px-4 py-3 text-left">สินค้า</th>
                  <th className="px-4 py-3 text-center">จำนวน</th>
                  <th className="px-4 py-3 text-center">ราคา</th>
                  <th className="px-4 py-3 text-center">รวม</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-3">{it.name}</td>
                    <td className="px-4 py-3 text-center">{it.qty}</td>
                    <td className="px-4 py-3 text-center">{Number(it.price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {(Number(it.price) * Number(it.qty)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* สรุปยอด */}
          <div className="mt-4 flex justify-end text-lg font-extrabold leading-8">
            <div className="text-right">
              <div>ยอดรวม : {subTotal.toLocaleString()} บาท</div>
              <div>VAT({vatRate}%) : {vat.toLocaleString()} บาท</div>
              <div>ยอดสุทธิ : {grand.toLocaleString()} บาท</div>
            </div>
          </div>
        </div>

        {/* ฟอร์มชำระเงิน */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {payCash && (
            <div>
              <div className="font-extrabold mb-2">จำนวนเงินที่รับ</div>
              <input
                ref={cashRef}
                type="text"
                inputMode="decimal"
                value={cash}
                onChange={(e) => setCash(e.target.value.replace(/,/g, ""))}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) setCash(n.toFixed(2));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) {
                    e.preventDefault();
                    confirmPay();
                  }
                }}
                placeholder="กรอกจำนวนเงินที่ได้รับ เช่น 100.00"
                className="w-full h-11 px-3 rounded-lg border border-black/20 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {!enoughCash && <span className="text-red-600">เงินสดไม่พอสำหรับยอดสุทธิ</span>}
              {enoughCash && Number(cash) > 0 && <span className="text-gray-600">เงินทอนโดยประมาณ: {change.toLocaleString()} บาท</span>}
            </div>
          )}

          <div>
            <div className="font-extrabold mb-2">วิธีชำระเงิน</div>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-black/20 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">เลือกวิธีชำระเงิน</option>
              {payCash && <option value="เงินสด">เงินสด</option>}
              {payPromptPay && <option value="PromptPay">PromptPay</option>}
              {!payCash && !payPromptPay && <option value="โอนเงิน">โอนเงิน</option>}
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={confirmPay}
              disabled={!canSubmit}
              className="px-5 h-11 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "ยืนยันชำระเงิน"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal สำเร็จ */}
      {show && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[min(520px,92vw)] text-center shadow-lg">
            <div className="text-lg font-extrabold mb-2">ผลการทำรายการ</div>
            <div className="mx-auto my-3 flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600">✓</div>
            <div className="font-semibold">ชำระเงินสำเร็จ</div>
            {method === "เงินสด" && <div className="mt-1">เงินทอน : {change.toLocaleString()} บาท</div>}
            <div className="mt-4 flex justify-center gap-3">
              {/* ปุ่มพิมพ์ใบเสร็จ (เผื่อกรณีพิมพ์อัตโนมัติไม่สำเร็จ) */}
              {saleResult && (
                <button 
                  onClick={() => printReceipt(saleResult)} 
                  className="px-6 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  พิมพ์ใบเสร็จซ้ำ
                </button>
              )}
              {/* ใช้ completeTransaction แทน closeModal */}
              <button onClick={completeTransaction} className="px-6 h-10 rounded-lg bg-green-600 text-white hover:bg-green-700">
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}