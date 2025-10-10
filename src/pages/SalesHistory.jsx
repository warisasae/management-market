import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

const THB = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });

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
  // 👇 *** เพิ่ม: state สำหรับกรองตามสถานะ ***
  const [status, setStatus] = useState("");
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/sales");
        setSales(res.data || []);
      } catch (err) {
        console.error("โหลดประวัติการขายล้มเหลว", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const saleId = String(s.sale_id || "");
      const createdAt = toDateInput(s.created_at);
      const pm = s.payment_method || "";
      // 👇 *** เพิ่ม: ดึงข้อมูล status จาก object (ถ้าไม่มีให้เป็น 'PAID') ***
      const saleStatus = s.status || "PAID"; 

      const matchQ = !q || saleId.toLowerCase().includes(q.toLowerCase());
      const matchDate = !date || createdAt === date;
      const matchPayment = !payment || pm === payment;
      // 👇 *** เพิ่ม: เงื่อนไขการกรองด้วย status ***
      const matchStatus = !status || saleStatus === status;

      return matchQ && matchDate && matchPayment && matchStatus;
    });
    // 👇 *** เพิ่ม: ใส่ status ใน dependency array ***
  }, [q, date, payment, status, sales]);

  useEffect(() => {
    setPage(1);
    // 👇 *** เพิ่ม: ใส่ status ใน dependency array ***
  }, [q, date, payment, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const paginated = filtered.slice(start, end);

  const resetFilters = () => {
    setQ("");
    setDate("");
    setPayment("");
    // 👇 *** เพิ่ม: รีเซ็ตค่า status ด้วย ***
    setStatus("");
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-extrabold mb-4">ประวัติการขาย</h1>

      {/* ฟิลเตอร์ */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
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
          <option value="PromptPay">PromptPay</option>
        </select>

        {/* 👇 *** เพิ่ม: Dropdown สำหรับกรองสถานะ *** */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">สถานะ (ทั้งหมด)</option>
          <option value="PAID">ชำระแล้ว</option>
          <option value="REFUNDED">คืนเงิน</option>
          <option value="VOID">ยกเลิก</option>
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
              {/* 👇 *** เพิ่ม: หัวตาราง "สถานะ" *** */}
              <th className="px-4 py-3 text-center">สถานะ</th>
              <th className="px-4 py-3 text-center">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                {/* 👇 *** แก้ไข: colSpan เป็น 6 *** */}
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                {/* 👇 *** แก้ไข: colSpan เป็น 6 *** */}
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              paginated.map((s) => {
                // 👇 *** เพิ่ม: Logic การกำหนดสี Badge ตามสถานะ ***
                const currentStatus = s.status || "PAID";
                const statusStyle =
                  currentStatus === "VOID"
                    ? "bg-red-100 text-red-700"
                    : currentStatus === "REFUNDED"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-emerald-100 text-emerald-700";

                return (
                <tr
                  key={s.sale_id}
                  className="odd:bg-white even:bg-gray-50 hover:bg-gray-100"
                >
                  <td className="px-4 py-3">{toDateInput(s.created_at)}</td>
                  <td className="px-4 py-3">{s.sale_id}</td>
                  <td className="px-4 py-3 text-right">{THB(s.grand_total)}</td>
                  <td className="px-4 py-3 text-center">{s.payment_method || "-"}</td>
                    {/* 👇 *** เพิ่ม: แสดงผลสถานะเป็น Badge *** */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyle}`}>
                        {currentStatus}
                      </span>
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
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/30 bg-white/70 disabled:opacity-50"
            aria-label="ก่อนหน้า"
          >
            ‹
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded-lg border ${
                currentPage === i + 1
                  ? "bg-indigo-600 text-white"
                  : "bg-white/70 border-black/30"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/30 bg-white/70 disabled:opacity-50"
            aria-label="ถัดไป"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
