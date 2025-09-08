import React, { useState } from "react";

const THB = (n) => `฿ ${Number(n || 0).toLocaleString()}`;

export default function Dashboard() {
  const [data] = useState({
    totalSales: 0,
    netProfit: 0,
    totalProducts: 0,
    stockCount: 0,
    bestSellers: [],
    lowStockCount: 0,
  });

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        {/* Header */}
        <header className="mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">แดชบอร์ด</h2>
          <p className="text-sm text-gray-500 mt-1">
            ภาพรวมการขายและสินค้าของร้านระฆังทอง
          </p>
        </header>

        {/* Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="ยอดขายวันนี้"
            value={THB(data.totalSales)}
            accent="from-blue-500 to-blue-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h2v18H3zM8 11h2v10H8zM13 6h2v15h-2zM18 14h2v7h-2z" />
              </svg>
            }
          />
          <StatCard
            title="กำไรสุทธิวันนี้"
            value={THB(data.netProfit)}
            accent="from-emerald-500 to-emerald-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l4 7h-3v7h-2v-7H8l4-7z" />
              </svg>
            }
          />
          <StatCard
            title="สินค้าใกล้หมด"
            value={`${data.lowStockCount ?? 0} รายการ`}
            accent="from-orange-500 to-orange-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l9 4-9 4-9-4 9-4zm9 7v7l-9 4-9-4V9l9 4 9-4z" />
              </svg>
            }
          />
          <StatCard
            title="จำนวนสินค้าในระบบ"
            value={`${data.totalProducts} รายการ`}
            accent="from-slate-500 to-slate-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
              </svg>
            }
          />
        </section>

        {/* Best sellers */}
        <section>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            สินค้าขายดี
          </h3>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6">
            {Array.isArray(data.bestSellers) && data.bestSellers.length > 0 ? (
              <ul className="divide-y">
                {data.bestSellers.map((item, idx) => (
                  <li key={idx} className="py-3 md:py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900">{item.name}</span>
                      <span className="text-gray-900 font-semibold">
                        ขายแล้ว {item.sold} {item.unit || "ชิ้น"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500">
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-gray-100">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 3h2l.4 2M7 13h10l3-8H6.4" />
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="17" cy="20" r="1.5" />
                  </svg>
                </div>
                ไม่มีข้อมูล
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** การ์ดสถิติ */
function StatCard({ title, value, icon, accent }) {
  return (
    <div className="relative bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 overflow-hidden">
      {/* เส้นไฮไลท์ด้านบน */}
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`}
      />
      <div className="flex items-center gap-4">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gray-100 text-gray-700">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-600">{title}</h4>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
