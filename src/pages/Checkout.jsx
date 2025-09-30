// src/pages/checkout.jsx
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

// ฟังก์ชันสำหรับสร้าง HTML ใบเสร็จอย่างง่าย (Simple Receipt HTML Generation)
// **ฟังก์ชันนี้เหมือนเดิม**
const generateReceiptHtml = (saleData) => {
  const {
    saleId,
    dateTime,
    cashierName,
    items,
    subTotal,
    vatRate,
    vatAmount,
    grandTotal,
    paymentMethod,
  } = saleData;

  // ฟังก์ชันช่วยจัดรูปแบบตัวเลขให้เป็นสกุลเงิน (ทศนิยม 2 ตำแหน่ง)
  const formatCurrency = (num) => Number(num).toFixed(2);
  const formatDate = (date) => new Date(date).toLocaleString("th-TH", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '/').replace(/,/g, '').replace(/(\d{4})/, (match) => `${Number(match) + 543}`); // แปลงปี พ.ศ.

  // กำหนดรูปแบบวันที่/เวลาตามรูป (29/9/2568 01:03:38)
  const formattedDateTime = formatDate(dateTime || new Date());

  // กำหนดชื่อร้าน (Hardcode ตามรูป)
  const storeName = "My Grocery";

  // กำหนดเลข POS (Hardcode ตามรูป)
  const posId = "SL00028";

  // เนื้อหารายการสินค้า
  const itemsHtml = items.map(item => `
    <div style="display: flex; justify-content: space-between; padding-top: 5px;">
      <span>${item.name || 'Product'} x${item.qty || 1}</span>
      <span>฿${formatCurrency(item.totalPrice)}</span>
    </div>
  `).join('');

  // **สำคัญ**: เราจะสร้างเฉพาะเนื้อหาใบเสร็จ (ไม่ใช่ HTML เต็มหน้า)
  const receiptContent = `
      <div id="print-receipt-area" style="font-family: monospace; font-size: 10pt; width: 80mm; padding: 0; margin: 0; line-height: 1.4;">
        <div style="text-align: center; font-weight: bold; font-size: 12pt;">${storeName}</div>
        <div style="text-align: center;">POS#${posId}</div>

        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
        
        ${itemsHtml}

        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>

        <div style="display: flex; justify-content: space-between;">
          <span>ยอดรวม</span>
          <span style="text-align: right;">฿${formatCurrency(subTotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>VAT ${vatRate}%</span>
          <span style="text-align: right;">฿${formatCurrency(vatAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>ยอดสุทธิ</span>
          <span style="text-align: right;">฿${formatCurrency(grandTotal)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <span>ชำระโดย</span>
          <span style="text-align: right;">${paymentMethod}</span>
        </div>

        <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>

        <div style="text-align: center;">#${posId} ${formattedDateTime}</div>
        <div style="text-align: center;">พนักงาน: ${cashierName || 'พนักงาน'}</div>
        <div style="text-align: center; font-weight: bold; margin-top: 5px;">ขอบคุณที่อุดหนุน</div>
      </div>
  `;
  return receiptContent;
};

// *****************************************************************
// **ฟังก์ชันสำหรับสั่งพิมพ์ใบเสร็จ (แบบไม่เปิดหน้าใหม่)**
// *****************************************************************
const printReceipt = (saleData) => {
  const receiptContent = generateReceiptHtml(saleData);
  
  // 1. สร้าง div ชั่วคราวเพื่อใส่เนื้อหาใบเสร็จ
  const printArea = document.createElement('div');
  printArea.id = 'print-receipt-container';
  printArea.style.display = 'none'; // ซ่อนคอนเทนเนอร์หลัก

  // 2. ใส่เนื้อหาใบเสร็จเข้าไป
  printArea.innerHTML = receiptContent;
  document.body.appendChild(printArea);

  // 3. เตรียม CSS พิเศษสำหรับ Print
  const style = document.createElement('style');
  style.id = 'print-style';
  style.innerHTML = `
    /* ซ่อนทุกอย่างยกเว้นเนื้อหาใบเสร็จเมื่อพิมพ์ */
    @media print {
        body > * {
            display: none !important;
        }
        #print-receipt-container {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            margin: 0;
            padding: 10px; /* เพิ่ม padding เล็กน้อยเพื่อให้ไม่ติดขอบ */
        }
        @page { 
            size: 80mm auto; 
            margin: 0; 
        }
    }
  `;
  document.head.appendChild(style);

  // 4. สั่งพิมพ์
  window.print();

  // 5. ล้าง DOM ทันทีหลังจากสั่งพิมพ์ (เพื่อคืนค่าหน้าเว็บปกติ)
  // ใช้ setTimeout เพื่อให้เบราว์เซอร์มีเวลาจัดการคำสั่งพิมพ์
  setTimeout(() => {
    document.body.removeChild(printArea);
    document.head.removeChild(style);
  }, 500);
};

// *****************************************************************
// **โค้ดส่วนอื่น ๆ เหมือนเดิม**
// *****************************************************************

export default function Checkout() {
  const navigate = useNavigate();
  const cashRef = useRef(null);

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