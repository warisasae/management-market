// src/pages/SalesHistory.jsx
import { useMemo, useState } from "react";

const mockData = [
  {
    id: 1,
    date: "2025-07-17",
    invoice: "#INV-00123",
    total: 75,
    payment: "เงินสด",
  },
  {
    id: 2,
    date: "2025-07-17",
    invoice: "#INV-00122",
    total: 350,
    payment: "พร้อมเพย์",
  },
];

export default function SalesHistory() {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [payment, setPayment] = useState("");
  const [sales] = useState(mockData);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const matchQ =
        !q ||
        s.invoice.toLowerCase().includes(q.toLowerCase()) ||
        String(s.id).includes(q);
      const matchDate = !date || s.date === date;
      const matchPayment = !payment || s.payment === payment;
      return matchQ && matchDate && matchPayment;
    });
  }, [q, date, payment, sales]);

  const th = "px-4 py-3 font-semibold";
  const td = "px-4 py-3";

  return (
    <div className="min-h-screen bg-[#FAF1E6] p-6">
      <h1 className="text-2xl font-extrabold mb-4">ประวัติการขาย</h1>

      {/* Search Filters */}
      <div>
  <input
    value={q}
    onChange={(e) => setQ(e.target.value)}
    placeholder="ค้นหาชื่อหมายเลขใบเสร็จ"
    className="h-11 px-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
  />

  <input
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="h-11 px-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
  />

  <select
    value={payment}
    onChange={(e) => setPayment(e.target.value)}
    className="h-11 px-3 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
  >
    <option value="">ชำระเงิน</option>
    <option value="เงินสด">เงินสด</option>
    <option value="พร้อมเพย์">พร้อมเพย์</option>
  </select>

  <button className="h-11 px-5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">
    ค้นหา
  </button>
</div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#C80036] text-white">
              <th className={`${th} text-left`}>ลำดับ</th>
              <th className={`${th} text-left`}>วันที่</th>
              <th className={`${th} text-left`}>เลขที่ใบเสร็จ</th>
              <th className={`${th} text-right`}>ยอดรวม</th>
              <th className={`${th} text-left`}>ช่องทางชำระ</th>
              <th className={`${th} text-left`}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr
                key={s.id}
                className="odd:bg-white even:bg-gray-50 hover:bg-gray-100/70 transition-colors"
              >
                <td className={td}>{i + 1}</td>
                <td className={td}>{s.date}</td>
                <td className={td}>{s.invoice}</td>
                <td className={`${td} text-right`}>{s.total}</td>
                <td className={td}>{s.payment}</td>
                <td className={td}>
                  <button className="px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700">
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
