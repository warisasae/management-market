import { useEffect, useMemo, useRef, useState } from "react";

export default function Stocks() {
  // ==== (ออปชัน) แคตตาล็อกตัวอย่างไว้ map จาก barcode -> ชื่อสินค้า ====
  const PRODUCTS = [
    { barcode: "8850001112223", name: "ผัดซีอิ๊วเส้นใหญ่" },
    { barcode: "8850001112224", name: "ชาไทยเย็น" },
    { barcode: "8850001112225", name: "โค้กกระป๋อง" },
    { barcode: "8850001112226", name: "ข้าวกะเพราไข่ดาว" },
  ];

  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ keyword: "", type: "", qty: "" });

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("ทั้งหมด");

  const keywordRef = useRef(null);
  const typeRef = useRef(null);
  const qtyRef = useRef(null);

  // โฟกัสช่องสแกนตอนเริ่มต้น และหลังบันทึก
  useEffect(() => {
    keywordRef.current?.focus();
  }, []);

  const isBarcode = (s) => /^\d{6,}$/.test(String(s).trim()); // เดาแบบง่าย: ตัวเลขล้วน ≥ 6 หลัก
  const resolveName = (kw) => {
    const k = String(kw).trim();
    if (isBarcode(k)) {
      const hit = PRODUCTS.find((p) => p.barcode === k);
      if (hit) return hit.name; // ถ้าเจอตามบาร์โค้ด → ใช้ชื่อมาตรฐาน
    }
    return k; // ถ้าไม่ใช่บาร์โค้ดหรือไม่พบ → ใช้ค่าที่พิมพ์มาเลย
  };

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchText =
        !q ||
        (e.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.code || "").toLowerCase().includes(q.toLowerCase());
      const matchType = filterType === "ทั้งหมด" ? true : e.type === filterType;
      return matchText && matchType;
    });
  }, [entries, q, filterType]);

  const saveEntry = (e) => {
    e.preventDefault();
    if (!form.keyword.trim() || !form.type || !form.qty) return;

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const next = {
      id: Date.now().toString(),
      date: dateStr,
      // เก็บทั้ง "code" (เผื่อเป็นบาร์โค้ด) และ "name" (ชื่อที่แสดง)
      code: form.keyword.trim(),
      name: resolveName(form.keyword),
      type: form.type, // "รับเข้า" | "เบิกออก"
      qty: Number(form.qty),
      user: "admin",
    };

    setEntries((prev) => [next, ...prev]);
    setForm({ keyword: "", type: "", qty: "" });

    // โฟกัสกลับไปที่ช่องสแกน
    keywordRef.current?.focus();
  };

  // Enter ที่ช่องสแกน: ถ้าประเภทและจำนวนครบ -> บันทึกเลย
  const onKeywordKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!form.type) {
        typeRef.current?.focus();
        return;
      }
      if (!form.qty) {
        qtyRef.current?.focus();
        return;
      }
      // ครบแล้ว → submit
      saveEntry(e);
    }
  };

  const ctrl =
    "h-11 bg-white rounded-lg border border-gray-300 shadow-sm px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500";
  const btn =
    "h-11 rounded-lg font-semibold shadow-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimary = "bg-green-600 hover:bg-green-700 text-white";

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* บันทึกการรับเข้า/เบิกออก */}
      <section className="mb-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-3">
          บันทึกการรับเข้า / เบิกออกสินค้า
        </h2>

        <form
          onSubmit={saveEntry}
          className="grid grid-cols-1 sm:grid-cols-[1fr_180px_140px_160px] gap-3 rounded-xl p-3"
        >
          <input
            ref={keywordRef}
            className={ctrl}
            placeholder="สแกนบาร์โค้ด หรือพิมพ์ชื่อ/โค้ดสินค้า (กด Enter)"
            value={form.keyword}
            onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
            onKeyDown={onKeywordKeyDown}
          />

          <select
            ref={typeRef}
            className={ctrl}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">เลือกประเภท</option>
            <option value="รับเข้า">รับเข้า</option>
            <option value="เบิกออก">เบิกออก</option>
          </select>

          <input
            ref={qtyRef}
            type="number"
            min="1"
            className={ctrl}
            placeholder="จำนวน"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (form.keyword.trim() && form.type && form.qty) {
                  saveEntry(e);
                }
              }
            }}
          />

          <button
            type="submit"
            className={`${btn} ${btnPrimary}`}
            disabled={!form.keyword.trim() || !form.type || !form.qty}
          >
            บันทึก
          </button>
        </form>
      </section>

      {/* ค้นหาและกรองประวัติ */}
      <section className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          ค้นหาและกรองประวัติ
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
          <input
            className={ctrl}
            placeholder="ค้นหาชื่อ/โค้ดสินค้า หรือสแกนบาร์โค้ด"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            // ถ้าใช้ scanner ใส่ Enter จะกรองทันทีอยู่แล้ว เพราะ state q เปลี่ยน
          />
          <select
            className={ctrl}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option>ทั้งหมด</option>
            <option>รับเข้า</option>
            <option>เบิกออก</option>
          </select>
        </div>
      </section>

      {/* ตารางประวัติ */}
      <div className="bg-white rounded-2xl shadow-sm p-3">
        <div className="overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#C80036] text-white">
                <th className="text-left px-4 py-2 font-semibold">วันที่</th>
                <th className="text-left px-4 py-2 font-semibold">ชื่อสินค้า</th>
                <th className="text-left px-4 py-2 font-semibold">ประเภท</th>
                <th className="text-left px-4 py-2 font-semibold">จำนวน</th>
                <th className="text-left px-4 py-2 font-semibold">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((e) => (
                <tr key={e.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{e.date}</td>
                  <td className="px-4 py-2 text-gray-800">
                    <div className="font-semibold">{e.name}</div>
                    {e.code && (
                      <div className="text-xs text-gray-500">โค้ด/บาร์โค้ด: {e.code}</div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {e.type === "เบิกออก" ? (
                      <span className="text-red-600 font-semibold">เบิกออก</span>
                    ) : (
                      <span className="text-gray-800">รับเข้า</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-semibold">
                    {e.type === "เบิกออก" ? `-${e.qty}` : `+${e.qty}`}
                  </td>
                  <td className="px-4 py-2 text-gray-800">{e.user}</td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
