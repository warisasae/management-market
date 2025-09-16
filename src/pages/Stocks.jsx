// src/pages/Stocks.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";

export default function Stocks() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ barcode: "", type: "", qty: "", note: "" });

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("ทั้งหมด");
  const [filterUser, setFilterUser] = useState("ทั้งหมด");

  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");

  const barcodeRef = useRef(null);
  const typeRef = useRef(null);
  const qtyRef = useRef(null);

  // utils
  const isBarcode = (s) => /^\d{6,}$/.test(String(s).trim());

  /** โหลดประวัติ stock จาก backend */
  async function loadStockHistory() {
    try {
      // ❗️baseURL เป็น /api แล้ว จึงใช้ path สั้น ๆ
      const res = await api.get("/stocks");
      const rows = (res.data || []).map((r) => ({
        id: r.stock_id,
        date: new Date(r.timestamp).toISOString().slice(0, 10),
        code: r.product?.barcode || "",
        name: r.product?.product_name || "(ไม่พบชื่อสินค้า)",
        type: r.change_type === "IN" ? "รับเข้า" : r.change_type === "OUT" ? "เบิกออก" : "ปรับยอด",
        qty: Math.abs(Number(r.quantity || 0)),
        rawQty: Number(r.quantity || 0),
        user: r.user?.username || r.user?.name || "—",
      }));
      setEntries(rows);
    } catch (e) {
      console.error(e);
      setHint("โหลดประวัติไม่สำเร็จ");
    }
  }

  useEffect(() => {
    barcodeRef.current?.focus();
    loadStockHistory();
  }, []);

  // รายชื่อผู้ใช้สำหรับ filter dropdown
  const userOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.user).filter(Boolean));
    return ["ทั้งหมด", ...Array.from(set)];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchText =
        !q ||
        (e.name || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.code || "").toLowerCase().includes(q.toLowerCase());
      const matchType = filterType === "ทั้งหมด" ? true : e.type === filterType;
      const matchUser = filterUser === "ทั้งหมด" ? true : (e.user || "") === filterUser;
      return matchText && matchType && matchUser;
    });
  }, [entries, q, filterType, filterUser]);

  /** ค้นหาสินค้าด้วย barcode */
  async function fetchProductByBarcode(barcode) {
    const res = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    if (res.status === 404) return null;
    return res.data;
  }

  /** submit ฟอร์ม → สร้าง stock transaction */
  const saveEntry = async (e) => {
    e.preventDefault();
    const barcode = String(form.barcode || "").trim();
    const qty = Number(form.qty);

    if (!barcode || !form.type || !qty) return;

    if (!isBarcode(barcode)) {
      setHint("กรุณาสแกน/กรอกบาร์โค้ดเท่านั้น");
      barcodeRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      // 1) หา product จาก barcode
      const product = await fetchProductByBarcode(barcode);
      if (!product) {
        setHint("ไม่พบสินค้านี้ในฐานข้อมูล");
        setLoading(false);
        return;
      }

      // 2) map ประเภท
      const change_type = form.type === "รับเข้า" ? "IN" : form.type === "เบิกออก" ? "OUT" : "ADJUST";

      // 2.1 user_id จาก localStorage
      const rawUser = localStorage.getItem("user");
      const actor = rawUser ? JSON.parse(rawUser) : null;
      const user_id = actor?.user_id || null;

      const payload = {
        product_id: product.product_id,
        change_type,
        quantity: change_type === "OUT" ? Math.abs(qty) : qty, // ตัว controller จะใส่ +/- เอง
        note: form.note || null,
        user_id,
      };

      // 3) ยิง create
      const res = await api.post("/stocks", payload);
      const createdTx = res.data?.transaction || res.data;

      // 4) อัปเดตตารางหน้า UI
      setEntries((prev) => [
        {
          id: createdTx.stock_id,
          date: new Date(createdTx.timestamp || Date.now()).toISOString().slice(0, 10),
          code: product.barcode || barcode,
          name: product.product_name,
          type: form.type,
          qty: Math.abs(qty),
          rawQty:
            Number(createdTx.quantity ?? (change_type === "OUT" ? -Math.abs(qty) : Math.abs(qty))),
          user: createdTx.user?.username || createdTx.user?.name || actor?.username || "—",
        },
        ...prev,
      ]);

      setHint(`บันทึก ${form.type} "${product.product_name}" จำนวน ${qty} สำเร็จ`);
      setForm({ barcode: "", type: "", qty: "", note: "" });
      barcodeRef.current?.focus();
    } catch (err) {
      console.error(err);
      setHint(err?.response?.data?.error || "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // Enter ที่ช่องบาร์โค้ด → ถ้าข้อมูลครบให้บันทึกเลย
  const onBarcodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!form.type) return typeRef.current?.focus();
      if (!form.qty) return qtyRef.current?.focus();
      saveEntry(e);
    }
  };

  const ctrl =
    "h-12 bg-white rounded-lg border border-gray-300 shadow-sm px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500";
  const btn =
    "h-12 rounded-lg font-semibold shadow-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimary = "bg-green-600 hover:bg-green-700 text-white";

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* ฟอร์มบันทึก */}
      <section className="mb-6">
        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-3">
          บันทึกการรับเข้า / เบิกออกสินค้า
        </h2>

        <form
          onSubmit={saveEntry}
          className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 rounded-xl p-3"
        >
          <input
            ref={barcodeRef}
            placeholder="สแกนบาร์โค้ด (กด Enter)"
            value={form.barcode}
            onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            onKeyDown={onBarcodeKeyDown}
            disabled={loading}
            className={ctrl}
          />

          <select
            ref={typeRef}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            disabled={loading}
            className={ctrl}
          >
            <option value="">เลือกประเภท</option>
            <option value="รับเข้า">รับเข้า</option>
            <option value="เบิกออก">เบิกออก</option>
          </select>

          <input
            ref={qtyRef}
            type="number"
            min="1"
            placeholder="จำนวน"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (form.barcode.trim() && form.type && form.qty) saveEntry(e);
              }
            }}
            disabled={loading}
            className={ctrl}
          />

          <button
            type="submit"
            disabled={!form.barcode.trim() || !form.type || !form.qty || loading}
            className={`${btn} ${btnPrimary}`}
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>

        <div className="mt-2">
          <input
            placeholder="หมายเหตุ (ไม่บังคับ)"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            disabled={loading}
            className={ctrl + " w-full"}
          />
        </div>

        {hint && (
          <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
            {hint}
          </div>
        )}
      </section>

      {/* ค้นหาและกรอง */}
      <section className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">ค้นหาและกรองประวัติ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_200px] gap-3">
          <input
            className={ctrl}
            placeholder="ค้นหาชื่อ/บาร์โค้ด"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className={ctrl} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option>ทั้งหมด</option>
            <option>รับเข้า</option>
            <option>เบิกออก</option>
          </select>

          <select className={ctrl} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
            {userOptions.map((u) => (
              <option key={u} value={u}>
                ผู้บันทึก: {u}
              </option>
            ))}
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
                    {e.code && <div className="text-xs text-gray-500">บาร์โค้ด: {e.code}</div>}
                  </td>
                  <td className="px-4 py-2">
                    {e.type === "เบิกออก" ? (
                      <span className="text-red-600 font-semibold">เบิกออก</span>
                    ) : e.type === "รับเข้า" ? (
                      <span className="text-gray-800">รับเข้า</span>
                    ) : (
                      <span className="text-gray-800">ปรับยอด</span>
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
