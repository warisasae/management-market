import React from 'react';

// ตัวช่วยจัดรูปแบบสกุลเงินบาท (ใช้การตั้งค่าเดียวกับใน checkout.jsx)
const THB = (n, digits = 2) =>
  "฿" + Number(n).toLocaleString('th-TH', { 
    minimumFractionDigits: digits, 
    maximumFractionDigits: digits 
  });

/**
 * Component สำหรับแสดงใบเสร็จรับเงิน
 * ใช้สำหรับแสดงผลการพิมพ์หรือในหน้าประวัติการขาย
 * @param {object} props
 * @param {object} props.sale ข้อมูลการขาย (Sale object)
 * @param {object} props.settings การตั้งค่าร้านค้า (Settings object)
 * @param {boolean} [props.isPrinting=false] Flag เพื่อระบุว่ากำลังสั่งพิมพ์
 * @returns {React.Component}
 */
export default function ReceiptContent({ sale, settings, isPrinting = false }) {
  if (!sale) return null;

  // ---------- ตั้งค่าและคำนวณ ----------
  // ใช้ข้อมูลร้านค้าจาก Settings หรือ Sale
  const storeName = settings?.storeName || sale.store?.name || "My Grocery";
  const taxId = settings?.taxId || sale.store?.tax_id || "0107542000011";
  const vatCode = settings?.vatCode || sale.store?.vat_code || "00639";
  const footerText = sale.receipt_footer || settings?.receiptFooter || "ขอบคุณที่อุดหนุน";
  
  // การคำนวณ VAT (ใช้ตรรกะเดิมจากไฟล์ที่สอง)
  const rawRate = sale.vat_rate ?? settings?.vatRate ?? 0;
  const vatRate = Number(rawRate > 1 ? rawRate / 100 : rawRate);
  const vatPercentDisplay = Math.round((vatRate * 100 + Number.EPSILON) * 100) / 100;
  const vatIncluded = sale.vat_included ?? settings?.vatIncluded ?? false;

  const items = Array.isArray(sale.items) ? sale.items : [];
  
  const subTotalBeforeVat = items.reduce((sum, it) => {
    // รองรับทั้ง quantity (SaleDetail) และ qty (Checkout)
    const qty = Number(it.quantity || it.qty) || 0; 
    const price = Number(it.price) || 0;
    return sum + qty * price;
  }, 0);
  
  const vatAmount = (() => {
    if (!vatRate) return 0;
    // คำนวณ VAT ตามว่ารวม VAT แล้วหรือไม่
    const v = vatIncluded ? subTotalBeforeVat - subTotalBeforeVat / (1 + vatRate) : subTotalBeforeVat * vatRate;
    return Math.round(v * 100) / 100;
  })();
  
  const grandTotal = vatIncluded ? subTotalBeforeVat : subTotalBeforeVat + vatAmount;
  const subTotalForDisplay = grandTotal - vatAmount; // ยอดรวมสินค้าไม่รวม VAT
  
  // สำหรับหน้า Checkout ที่มีการรับเงินและทอนเงิน
  const cashReceived = sale.cash_received || sale.cash || 0;
  const changeAmount = Math.max(0, Number((cashReceived - grandTotal).toFixed(2)));
  
  // ข้อมูลพนักงานและเวลา
  const employeeName = sale.user?.name || sale.user?.username || sale.name || "-";
  const createdAt = sale.created_at || sale.timestamp;
  const timestamp = createdAt ? new Date(createdAt) : new Date();

  // จัดรูปแบบวันที่ตามตัวอย่าง (เช่น 29/09/2568)
  const formattedDate = timestamp.toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric' });
  // จัดรูปแบบเวลา (เช่น 00:41:12)
  const formattedTime = timestamp.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  
  const saleId = sale.sale_id || "N/A";
  const dateTimeFooter = `#${saleId} ${formattedDate} ${formattedTime}`;
  const dashedLine = "border-t border-dashed border-gray-700 pt-2";
  const containerClass = isPrinting ? 'block' : 'hidden print:block';

  // ---------- ใบเสร็จ (HTML Structure) ----------
  return (
    // ปรับขนาดให้แคบลงและใช้ text size เล็กตามใบเสร็จจริง
    <div className={`${containerClass} font-mono text-[11px] w-[250px] mx-auto p-2 leading-4`}> 
      
      {/* ส่วนหัวใบเสร็จ */}
      <div className="text-center mb-2">
        <h2 className="text-sm font-bold">{storeName}</h2>
        <p className="text-xs">POS#{saleId}</p>
        <div className="text-[10px] text-gray-600 mt-1">
          {taxId && `เลขประจำตัวผู้เสียภาษี: ${taxId}`}
          {vatCode && ` | รหัสสาขา: ${vatCode}`}
        </div>
      </div>

      {/* เส้นแบ่งหัวข้อ */}
      <div className="border-t border-dashed border-gray-700 my-1"></div>

      {/* รายการสินค้า */}
      <div className="text-left py-1">
        {items.map((it, index) => {
          const p = it.product || it; 
          const name = p.product_name || p.name || p.title || p.barcode || "-";
          const qty = Number(it.quantity || it.qty) || 0;
          const price = Number(it.price) || 0;
          const itemTotal = qty * price;

          return (
            <div key={index} className="mb-1">
              {/* ชื่อสินค้าและราคารวม */}
              <div className="flex justify-between items-start">
                <span className="w-4/5">{name}</span>
                <span className="w-1/5 text-right font-bold">{THB(itemTotal)}</span>
              </div>
              {/* รายละเอียดราคาต่อหน่วยและจำนวน */}
              <p className="text-[10px] text-gray-600 ml-1">
                {THB(price)} x {qty}
              </p>
            </div>
          );
        })}
      </div>
      
      {/* สรุปยอดเงิน */}
      <div className={`text-right ${dashedLine} mb-1`}>
        {/* ยอดรวม (Sub Total Before VAT) */}
        <div className="flex justify-between">
          <span>ยอดรวมสินค้า</span>
          <span className="font-bold">{THB(subTotalForDisplay)}</span>
        </div>
        
        {/* VAT */}
        <div className="flex justify-between">
          <span>VAT {vatPercentDisplay}%</span>
          <span className="font-bold">{THB(vatAmount)}</span>
        </div>
        
        {/* ยอดสุทธิ (Grand Total) */}
        <div className="flex justify-between mt-1 text-sm">
          <span className="font-bold">ยอดสุทธิ</span>
          <span className="font-extrabold">{THB(grandTotal)}</span>
        </div>
        
        {/* ชำระโดย */}
        <div className="flex justify-between mt-1">
          <span className="font-bold">ชำระโดย</span>
          <span className="font-bold">{sale.payment_method || sale.method || "-"}</span>
        </div>

        {/* เงินทอน (แสดงเมื่อมีเงินทอนเท่านั้น) */}
        {changeAmount > 0 && (
            <div className="flex justify-between">
                <span>เงินทอน</span>
                <span className="font-bold">{THB(changeAmount)}</span>
            </div>
        )}
      </div>

      {/* ส่วนท้าย - วันที่และพนักงาน */}
      <div className="text-center mt-3 pt-2 border-t border-dashed border-gray-700">
        <p className="text-xs font-bold">{dateTimeFooter}</p>
        <p className="text-xs mt-1">พนักงาน: {employeeName}</p>
        <p className="text-xs font-bold mt-2">{footerText}</p>
      </div>
    </div>
  );
}
