// src/pages/SalesHistory.jsx
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

const THB = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });

// แปลงวันที่จาก created_at → yyyy-mm-dd (เทียบกับ input[type=date] ได้)
const toDateInput = (v) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v).slice(0, 10);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  } catch {
    return String(v).slice(0, 10);
  }
};

export default function SalesHistory() {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [payment, setPayment] = useState("");
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  // โหลดข้อมูลประวัติการขายจาก backend
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // ✅ baseURL = /api แล้ว ใช้ path แค่ /sales
        const res = await api.get("/sales");
        setSales(res.data || []);
      } catch (err) {
        console.error("โหลดประวัติการขายล้มเหลว", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filter ข้อมูล
  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const saleId = String(s.sale_id || "");
      const createdAt = toDateInput(s.created_at); // yyyy-mm-dd
      const pm = s.payment_method || "";

      const matchQ = !q || saleId.toLowerCase().includes(q.toLowerCase());
      const matchDate = !date || createdAt === date;
      const matchPayment = !payment || pm === payment;

      return matchQ && matchDate && matchPayment;
    });
  }, [q, date, payment, sales]);

  const resetFilters = () => {
    setQ("");
    setDate("");
    setPayment("");
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-extrabold mb-4">ประวัติการขาย</h1>

      {/* ฟิลเตอร์ */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาเลขบิลหรือรหัส"
          className="h-11 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          className="h-11 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">วิธีชำระเงิน (ทั้งหมด)</option>
          <option value="เงินสด">เงินสด</option>
          <option value="โอนเงิน">โอนเงิน</option>
        </select>
        <button
          onClick={resetFilters}
          className="h-11 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
        >
          ล้างตัวกรอง
        </button>
      </div>

      {/* ตาราง */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#C80036] text-white">
            <tr>
              <th className="px-4 py-3 text-left">วันที่</th>
              <th className="px-4 py-3 text-left">เลขบิล</th>
              <th className="px-4 py-3 text-right">ยอดรวม</th>
              <th className="px-4 py-3 text-center">วิธีชำระเงิน</th>
              <th className="px-4 py-3 text-center">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.sale_id}
                  className="odd:bg-white even:bg-gray-50 hover:bg-gray-100"
                >
                  <td className="px-4 py-3">{toDateInput(s.created_at)}</td>
                  <td className="px-4 py-3">{s.sale_id}</td>
                  <td className="px-4 py-3 text-right">{THB(s.grand_total)}</td>
                  <td className="px-4 py-3 text-center">
                    {s.payment_method || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/dashboard/saleshistory/${s.sale_id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      ดู
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
