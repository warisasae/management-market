// src/pages/Reports.jsx
import { useMemo, useState, useEffect } from "react";
import { api } from "../lib/api";

/** แปลงตัวเลขเป็นเงินบาท */
const THB = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });

/** คืนค่าวันที่ (YYYY-MM-DD) ตามโซนเวลาไทย จากค่า Date/ISO/String */
function toBkkDateStr(dateLike) {
  if (!dateLike) return "";
  const d = new Date(dateLike);
  const bkk = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = bkk.getFullYear();
  const m = String(bkk.getMonth() + 1).padStart(2, "0");
  const dd = String(bkk.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function Reports() {
  const [start, setStart] = useState(""); // YYYY-MM-DD
  const [end, setEnd] = useState("");     // YYYY-MM-DD
  const [cat, setCat] = useState("ทั้งหมด");

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // โหลด products + sales(with items)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrMsg("");

        // 🧪 debug: ดูว่า baseURL ตอนนี้เป็นอะไร (ช่วยเวลา 404)
        console.log("[Reports] api.baseURL =", api.defaults.baseURL);

        const [prodRes, saleRes] = await Promise.all([
          api.get("/products"),          // ➜ ไป /api/products ผ่าน Vite proxy
          api.get("/sales/with-items"),  // ➜ ไป /api/sales/with-items
        ]);

        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setSales(Array.isArray(saleRes.data) ? saleRes.data : []);
      } catch (err) {
        console.error("โหลดข้อมูลรายงานล้มเหลว", err);
        // แสดงข้อความสั้น ๆ บน UI เพื่อให้รู้ว่าไปไม่ถึง API
        setErrMsg(err?.response?.data?.message || err?.message || "โหลดข้อมูลล้มเหลว");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // รายการหมวดหมู่ (ดึงจาก products ก่อน ถ้าไม่มีค่อย fallback จาก sales)
  const categories = useMemo(() => {
    const fromProducts = new Set(
      products.map((p) => p?.category?.category_name).filter(Boolean)
    );
    if (fromProducts.size > 0) return ["ทั้งหมด", ...Array.from(fromProducts)];

    const fromSales = new Set(
      (sales || [])
        .flatMap((s) => s?.items || [])
        .map((it) => it?.product?.category?.category_name)
        .filter(Boolean)
    );
    return ["ทั้งหมด", ...Array.from(fromSales)];
  }, [products, sales]);

  // รวมยอดขายรายสินค้า (กรองช่วงวันที่ + หมวดหมู่)
  const rows = useMemo(() => {
    const inRange = (createdAt) => {
      const d = toBkkDateStr(createdAt); // วันที่ตามเวลาไทย
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    };

    const qtyByProduct = new Map();
    for (const sale of sales || []) {
      if (!inRange(sale?.created_at)) continue;
      for (const it of sale?.items || []) {
        const prod = it?.product;
        if (!prod) continue;

        const catName = prod?.category?.category_name;
        if (cat !== "ทั้งหมด" && catName !== cat) continue;

        const q = Number(it?.qty ?? it?.quantity ?? 0); // รองรับทั้ง qty/quantity
        qtyByProduct.set(prod.product_id, (qtyByProduct.get(prod.product_id) || 0) + q);
      }
    }

    return Array.from(qtyByProduct.entries())
      .map(([pid, qty]) => {
        // หา product object (จาก sales ก่อน ถ้าไม่เจอค่อยดูใน products)
        const prodFromSales =
          (sales || [])
            .flatMap((s) => s?.items || [])
            .map((it) => it?.product)
            .find((p) => p?.product_id === pid) || null;

        const prod = prodFromSales || products.find((p) => p?.product_id === pid);
        if (!prod) return null;

        const total = qty * Number(prod?.sell_price || 0);
        const cost = qty * Number(prod?.cost_price || 0);
        const profit = total - cost;

        return {
          id: pid,
          name: prod?.product_name,
          category: prod?.category?.category_name || "-",
          qty,
          total,
          cost,
          profit,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [start, end, cat, sales, products]);

  // สรุปผลรวม
  const summary = useMemo(() => {
    const totalSales = rows.reduce((s, r) => s + r.total, 0);
    const totalProfit = rows.reduce((s, r) => s + r.profit, 0);

    const orderCount = (sales || []).filter((o) => {
      const d = toBkkDateStr(o?.created_at);
      const okDate = (!start || d >= start) && (!end || d <= end);
      if (!okDate) return false;
      if (cat === "ทั้งหมด") return true;
      return (o?.items || []).some((it) => it?.product?.category?.category_name === cat);
    }).length;

    return { totalSales, orderCount, totalProfit };
  }, [rows, start, end, cat, sales]);

  const resetFilters = () => {
    setStart("");
    setEnd("");
    setCat("ทั้งหมด");
  };

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-extrabold mb-4">รายงานระบบขายหน้าร้าน</h1>
        {/* ฟิลเตอร์ */}
        <div className="bg-white rounded-2xl ring-1 ring-black/10 p-4">
          <h2 className="font-bold mb-3">ตัวกรองรายงาน</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-gray-600">วันที่เริ่มต้น</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full h-11 mt-1 px-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">วันที่สิ้นสุด</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full h-11 mt-1 px-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">ประเภทสินค้า</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full h-11 mt-1 px-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="h-11 w-full rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          {/* แจ้ง error ชัด ๆ ถ้าโหลดไม่สำเร็จ */}
          {errMsg && (
            <div className="mt-3 text-sm text-red-600">
              เกิดข้อผิดพลาดในการโหลดข้อมูล: {errMsg}
            </div>
          )}
        </div>

        {/* ตารางรายงานสต็อก */}
        <div className="bg-white rounded-2xl ring-1 ring-black/10 overflow-hidden">
          <div className="px-4 pt-4 pb-2 font-bold">รายงานสต็อก</div>
          <div className="px-4 pb-4">
            <div className="rounded-xl overflow-hidden border border-black/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#C80036] text-white">
                    <th className="px-4 py-3 text-left">รหัสสินค้า</th>
                    <th className="px-4 py-3 text-left">ชื่อสินค้า</th>
                    <th className="px-4 py-3 text-right">จำนวนที่ขาย</th>
                    <th className="px-4 py-3 text-right">ยอดรวม (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        กำลังโหลด…
                      </td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((r) => (
                      <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                        <td className="px-4 py-3">{r.id}</td>
                        <td className="px-4 py-3">{r.name}</td>
                        <td className="px-4 py-3 text-right">{r.qty}</td>
                        <td className="px-4 py-3 text-right">{THB(r.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        ไม่พบข้อมูลในช่วงที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* การ์ดสรุป */}
        <div className="bg-white rounded-2xl ring-1 ring-black/10 p-4">
          <div className="font-bold mb-3">รายงานรายได้</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="ยอดขายรวม" value={THB(summary.totalSales)} bg="bg-emerald-100" />
            <StatCard label="จำนวนออร์เดอร์" value={`${summary.orderCount} รายการ`} bg="bg-sky-100" />
            <StatCard label="กำไรสุทธิ" value={THB(summary.totalProfit)} bg="bg-pink-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, bg }) {
  return (
    <div className={`rounded-xl ${bg} p-4 ring-1 ring-black/10`}>
      <div className="text-gray-700">{label}</div>
      <div className="text-xl font-extrabold mt-1">{value}</div>
    </div>
  );
}
