import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../lib/api";

const THB = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  });

// *** เพิ่ม: ฟังก์ชันสำหรับดึง Role ของผู้ใช้จาก localStorage ***
const getCurrentUserRole = () => {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return user?.role || "guest"; // คืนค่า role (เช่น "admin", "employee", "guest")
  } catch {
    return "guest";
  }
};

// ❌ ลบ: ตัวแปร isEmployeeRole ที่กำหนดเป็น true ถาวรออกไป

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [sale, setSale] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // 🛠️ เพิ่ม: ดึง Role ของผู้ใช้ปัจจุบัน
  const userRole = getCurrentUserRole();
  const isAdmin = userRole === "ADMIN"; // ตรวจสอบว่าเป็น Admin หรือไม่

  // DOM ใบเสร็จสำหรับพิมพ์เฉพาะส่วน
  const receiptRef = useRef(null);

  // โหลดข้อมูลใบเสร็จ + การตั้งค่า
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const [saleRes, settingsRes] = await Promise.allSettled([
          api.get(`/sales/${id}`),
          api.get(`/settings/basic`),
        ]);
        if (ignore) return;

        if (saleRes.status === "fulfilled") setSale(saleRes.value.data);
        if (settingsRes.status === "fulfilled") setSettings(settingsRes.value.data);
      } catch (err) {
        console.error("โหลดรายละเอียดการขายล้มเหลว", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [id]);

  // พิมพ์อัตโนมัติถ้ามี ?print=1 และข้อมูลพร้อม
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const wantPrint = qs.get("print") === "1";
    if (!wantPrint) return;
    if (loading || !sale) return;

    const t = setTimeout(() => {
      handlePrint();
    }, 200);
    return () => clearTimeout(t);
  }, [location.search, loading, sale]);

  // ---------- Actions ----------
  const handleBack = () => navigate(-1);

  // พิมพ์เฉพาะใบเสร็จผ่าน <iframe> ซ่อน (ดูเสถียรกว่า window.open)
  const handlePrint = () => {
    const node = receiptRef.current;
    if (!node) return;

    const html = node.outerHTML;

    // สไตล์ขั้นต่ำสำหรับหน้าพิมพ์ (ปรับให้เป็น 50mm)
    const styles = `
    <style>
    /* 1. สไตล์พื้นฐาน: ลบ margin/padding ทั้งหมด */
    *{box-sizing:border-box}
    html, body{
        margin:0;
        padding:0;
        background:#fff;
        color:#0f172a;
        font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
        /* สำคัญ: บังคับความกว้างของหน้าให้เป็น 58mm ในขณะพิมพ์ */
        width: 50mm; 
    }
    
    /* 2. สไตล์ .receipt: กำหนดความกว้างจริงและลบขอบที่ไม่ต้องการ */
    .receipt{
      /* *** เปลี่ยนจาก width:360px เป็นขนาดสำหรับ 58mm *** */
      width: 50mm;
      margin: 0; /* ลบ margin:12px auto */
      border: 0; /* ลบ border:1px */
      border-radius: 0; /* ลบ border-radius:12px */
      padding: 0; /* ลบ padding:16px */
      box-shadow: none; /* ลบ box-shadow */
    }
    
    /* 3. สไตล์เนื้อหาภายใน: หากต้องการ padding ด้านข้าง ให้เพิ่มเข้าไป */
    .receipt > div, .receipt > div.text-sm, .receipt > div.text-xs {
       /* เพิ่ม padding ซ้ายขวาเล็กน้อย (เช่น 2-4px) ให้เนื้อหาด้านใน */
       padding: 0 2px; 
    }
    /* 4. สไตล์ชื่อสินค้า: บังคับให้เป็น 1 บรรทัดและตัดคำเมื่อเกิน */
.item-name-no-wrap {
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    /* 🚨 เปลี่ยนตรงนี้: ลดจาก 65% เพื่อให้ราคาด้านขวามีพื้นที่ */
    max-width: 42% !important; 
    display: inline-block; 
}
    /* คงสไตล์ของข้อความและเส้นประไว้ */
    .border-dashed{border-top:1px dashed #d1d5db}
    .text-center{text-align:center}
    .text-right{text-align:right}
    .text-sm{font-size:12px;line-height:1.25}
    .text-xs{font-size:10px;line-height:1.25}
    .font-bold{font-weight:700}
    .leading-5{line-height:1.25}
    .mb-3{margin-bottom:12px}
    .mt-1{margin-top:4px}
    .mt-2{margin-top:8px}
    .space-y-1 > * + *{margin-top:4px}
    .flex{display:flex}
    .justify-between{justify-content:space-between}

    /* 4. @page: การตั้งค่าหน้าพิมพ์ (สำคัญที่สุด) */
    @page{
      /* กำหนดขนาดหน้าพิมพ์: 40mm กว้าง, auto สูง */
      size: 50mm auto; 
      /* ลบ margin ของหน้าพิมพ์ที่เบราว์เซอร์จะใส่เข้ามา */
      margin: 0; 
    }
    
    @media print{
        html, body, .receipt {
            width: 50mm !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        /* ซ่อนส่วนอื่นๆ ที่ไม่ต้องการพิมพ์ */
        .print\\:hidden, .print\\:hidden * {
            display: none !important;
        }
    }
  </style>
`;

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
    doc.write(`<!doctype html><html><head><meta charset="utf-8">${styles}</head><body>${html}</body></html>`);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 200);
      }, 80);
    };
  };

  const handleVoid = async () => {
    if (!confirm("ยืนยันยกเลิกบิลนี้?")) return;
    try {
      setBusy(true);
      const res = await api.post(`/sales/${id}/void`, null, {
        validateStatus: (s) => s >= 200 && s < 500,
      });
      if (res.status === 200) {
        alert("ยกเลิกบิลสำเร็จ");
        setSale((prev) => ({ ...prev, ...res.data }));
      } else {
        alert(res.data?.error || "ยกเลิกบิลไม่สำเร็จ");
      }
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "ไม่สามารถยกเลิกบิลได้");
    } finally {
      setBusy(false);
    }
  };

  const handleRefund = async () => {
    if (!confirm("ยืนยันทำเรื่องคืนเงิน (Refund) บิลนี้?")) return;
    try {
      setBusy(true);
      const res = await api.post(`/sales/${id}/refund`, null, {
        validateStatus: (s) => s >= 200 && s < 500,
      });
      if (res.status === 200) {
        alert("ทำรายการคืนเงินสำเร็จ");
        setSale((prev) => ({ ...prev, ...res.data }));
      } else {
        alert(res.data?.error || "คืนเงินไม่สำเร็จ");
      }
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "ไม่สามารถคืนเงินได้");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6">กำลังโหลด...</div>;

  if (!sale) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg">ไม่พบใบเสร็จ</div>
        <button onClick={handleBack} className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-white">
          กลับ
        </button>
      </div>
    );
  }

  // ---------- settings ----------
  const storeName = settings?.storeName || sale.store?.name || "My Grocery Store";
  const footerText = settings?.receiptFooter || sale.receipt_footer || "** ขอบคุณที่ใช้บริการ **";
  const vatIncluded = sale.vat_included ?? settings?.vatIncluded ?? false;
  const rawRate = sale.vat_rate ?? settings?.vatRate ?? 0;
  const vatRate = Number(rawRate > 1 ? rawRate / 100 : rawRate);
  const vatPercentDisplay = Math.round((vatRate * 100 + Number.EPSILON) * 100) / 100;

  // ---------- totals ----------
  const items = Array.isArray(sale.items) ? sale.items : [];
  const subTotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.price) || 0;
    return sum + qty * price;
  }, 0);
  const vatAmount = (() => {
    if (!vatRate) return 0;
    const v = vatIncluded ? subTotal - subTotal / (1 + vatRate) : subTotal * vatRate;
    return Math.round(v * 100) / 100;
  })();
  const grandTotal = vatIncluded ? subTotal : subTotal + vatAmount;

  const status = sale.status || "PAID";
  const statusStyle =
    status === "VOID"
      ? "bg-red-100 text-red-700"
      : status === "REFUNDED"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-emerald-100 text-emerald-700";

  return (
    <div className="min-h-screen p-6 from-white to-slate-50">
      {/* กลับ */}
      <div className="max-w-3xl mx-auto -mt-1 mb-2">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
          title="กลับ"
        >
          <span className="text-xl">←</span>
          <span className="font-medium">กลับ</span>
        </button>
      </div>

      {/* Header */}
      <div className="max-w-3xl mx-auto mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm text-slate-500">ใบเสร็จรับเงิน</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              #{sale.sale_id} · {storeName}
            </h1>
            <div className="mt-1 text-slate-500 text-sm">
              วันที่: {sale.created_at ? new Date(sale.created_at).toLocaleString("th-TH") : "-"} · พนักงาน:{" "}
              {sale.user?.name || sale.user?.username || "-"}
            </div>
          </div>

          {/* ขวาบน: สถานะ / ยอดสุทธิ — เพิ่มระยะห่างด้วย flex-col + gap-3 */}
          <div className="shrink-0 text-right flex flex-col items-end gap-3">

            <div className={`inline-flex px-2 py-1 rounded-full ${statusStyle}`}>{status}</div>
            <div className="text-2xl font-bold">{THB(grandTotal)}</div>
          </div>
        </div>
      </div>

      {/* ใบเสร็จ (พิมพ์เฉพาะส่วนนี้) */}
      <div className="max-w-md mx-auto">
        <div ref={receiptRef} className="receipt bg-white p-4 shadow ring-1 ring-gray-200 rounded-lg">
          <div className="text-center text-sm leading-5 mb-1">
            <div className="font-bold">{storeName}</div>
            <div>POS#{sale.sale_id}</div>
            <div className="mt-2 border-t border-dashed" />
          </div>
          <div className="text-sm mb-3 space-y-1 px-2">
            {items.map((it, idx) => {
              const p = it.product || {};
              const name = p.product_name || p.name || p.title || p.barcode || "-";
              const lineTotal = (Number(it.quantity) || 0) * (Number(it.price) || 0);
              return (
                <div key={idx} className="flex justify-between">
                  {/* ชื่อสินค้า: ใช้คลาส item-name-no-wrap เพื่อบังคับตัดคำและแสดง ... */}
                  <span className="item-name-no-wrap" style={{ marginRight: '8px' }}>
                    {name} x{it.quantity}
                  </span>
                  <span className="text-right shrink-0">{THB(lineTotal)}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-dashed my-2 px-1" />

          <div className="text-sm space-y-1 px-1">
            <div className="flex justify-between">
              <span>ยอดรวม</span>
              <span>{THB(subTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT {vatPercentDisplay}%</span>
              <span>{THB(vatAmount)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>ยอดสุทธิ</span>
              <span>{THB(grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ชำระโดย</span>
              <span>{sale.payment_method || settings?.paymentMethodPreview || "-"}</span>
            </div>
          </div>

          <div className="border-t border-dashed my-2 px-1" />
          <div className="text-xs text-center space-y-1 px-1">
            <div>
             {sale.created_at ? new Date(sale.created_at).toLocaleString("th-TH") : ""}
            </div>
            <div>พนักงาน: {sale.user?.name || sale.user?.username || "-"}</div>
            <div className="mt-1">{footerText}</div>
          </div>
        </div>
      </div>

      {/* แถบปุ่มล่าง — จัดกลาง เรียง: พิมพ์ → คืนเงิน → ยกเลิกบิล */}
      <div className="sticky bottom-0 mt-6 print:hidden">
        <div className="mx-auto max-w-3xl">
          <div className="bg-transparent p-0">
            <div className="flex flex-wrap gap-2 justify-center">
              {/* พิมพ์ */}
              <button
                onClick={handlePrint}
                className="min-w-[140px] h-11 px-5 rounded-lg bg-slate-900 text-white hover:opacity-90"
                disabled={busy}
                title="พิมพ์ใบเสร็จ"
              >
                🖨️ พิมพ์
              </button>

              {/* 🛠️ แก้ไข: ปุ่มคืนเงิน - แสดงเมื่อเป็น Admin เท่านั้น */}
              {isAdmin && (
                <button
                  onClick={handleRefund}
                  className="min-w-[140px] h-11 px-5 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                  disabled={busy || sale.status === "REFUNDED" || sale.status === "VOID"}
                  title="คืนเงิน"
                >
                  💸 คืนเงิน
                </button>
              )}

              {/* 🛠️ แก้ไข: ปุ่มยกเลิกบิล - แสดงเมื่อเป็น Admin เท่านั้น */}
              {isAdmin && (
                <button
                  onClick={handleVoid}
                  className="min-w-[140px] h-11 px-5 rounded-lg bg-red-600 text-white hover:opacity-90 disabled:opacity-50"
                  disabled={busy || sale.status === "VOID"}
                  title="ยกเลิกบิล"
                >
                  ✖️ ยกเลิกบิล
                </button>
              )}
            </div>
            {busy && <div className="text-xs text-gray-500 mt-2 text-center">กำลังทำรายการ...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}