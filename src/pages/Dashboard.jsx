import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

const THB = (n) => `฿ ${Number(n || 0).toLocaleString()}`;


export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  const [loadingOOS, setLoadingOOS] = useState(true);
  const [outOfStocks, setOutOfStocks] = useState([]);

  const [loadingLow, setLoadingLow] = useState(true);
  const [lowStocks, setLowStocks] = useState([]);

  const [data, setData] = useState({
    totalSales: 0,
    netProfit: 0,
    totalProducts: 0,
    stockCount: 0,
    bestSellers: [],
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // สรุปหลัก
        const res = await api.get("/dashboard/summary");
        if (!alive) return;

        const summary = res?.data ?? {};

        setData((prev) => ({
          ...prev,
          totalSales: summary.totalSales ?? 0,
          netProfit: summary.netProfit ?? 0,
          totalProducts: summary.totalProducts ?? 0,
          stockCount: summary.stockCount ?? 0,
          bestSellers: Array.isArray(summary.bestSellers) ? summary.bestSellers : [],
          lowStockCount: summary.lowStockCount ?? 0,
          outOfStockCount:
            (Array.isArray(summary.outOfStocks)
              ? summary.outOfStocks.length
              : summary.outOfStockCount) ?? 0,
        }));

        // ----- Out of stock -----
        try {
          if (Array.isArray(summary.outOfStocks)) {
            setOutOfStocks(summary.outOfStocks);
          } else {
            const oosRes = await api.get("/api/products/out-of-stock");
            if (!alive) return;
            const list = Array.isArray(oosRes?.data) ? oosRes.data : [];
            setOutOfStocks(list);
            // อัปเดตการ์ดเผื่อ backend ไม่ส่ง count
            setData((prev) => ({ ...prev, outOfStockCount: list.length }));
          }
        } catch (e) {
          console.warn("Fetch /api/products/out-of-stock failed or missing.", e);
        } finally {
          if (alive) setLoadingOOS(false);
        }

        // ----- Low stock -----
        try {
          if (Array.isArray(summary.lowStocks)) {
            setLowStocks(summary.lowStocks);
          } else {
            const lowRes = await api.get("/api/products/low-stock");
            if (!alive) return;
            const list = Array.isArray(lowRes?.data) ? lowRes.data : [];
            setLowStocks(list);
          }
        } catch (e) {
          console.warn("Fetch /api/products/low-stock failed or missing.", e);
        } finally {
          if (alive) setLoadingLow(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen px-4 sm:px-6 pb-6 pt-2">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-1 md:pt-2">
        {/* Header */}
        <header className="mb-1 md:mb-2">
          <h2 className="text-3xl font-extrabold text-gray-900">แดชบอร์ด</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            ภาพรวมการขายและสินค้าของร้านระฆังทอง
          </p>
        </header>

        {/* Cards (4 ใบด้านบน) */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
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
            title="สินค้าหมดสต๊อก"
            value={`${data.outOfStockCount ?? 0} รายการ`}
            accent="from-rose-500 to-rose-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v6h-2V7h2zm0 8v2h-2v-2h2z" />
              </svg>
            }
          />
        </section>

        {/* Stock Summary */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          <StatCard
            title="ยอดสต๊อกรวม"
            value={`${Number(data.stockCount || 0).toLocaleString()} ชิ้น`}
            accent="from-teal-500 to-teal-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16V8a2 2 0 0 0-1.2-1.84l-6-2.67a2 2 0 0 0-1.6 0l-6 2.67A2 2 0 0 0 5 8v8a2 2 0 0 0 1.2 1.84l6 2.67a2 2 0 0 0 1.6 0l6-2.67A2 2 0 0 0 21 16z" />
              </svg>
            }
          />
          <StatCard
            title="จำนวนสินค้าในระบบ"
            value={`${data.totalProducts ?? 0} รายการ`}
            accent="from-slate-500 to-slate-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
              </svg>
            }
          />
        </section>

        {/* Best sellers */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            สินค้าขายดี (30 วันล่าสุด)
          </h3>
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6">
            {!loading && Array.isArray(data.bestSellers) && data.bestSellers.length > 0 ? (
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
              <EmptyState loading={loading} />
            )}
          </div>
        </section>

        {/* สินค้าใกล้หมด & หมดสต๊อก (ข้างกัน) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* ใกล้หมด */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">สินค้าใกล้หมด</h3>
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6">
              {!loadingLow && Array.isArray(lowStocks) && lowStocks.length > 0 ? (
                <ul className="divide-y">
                  {lowStocks.map((p, idx) => (
                    <li key={p.product_id || p.id || idx} className="py-3 md:py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-gray-900 font-medium truncate">
                            {p.product_name || p.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {p.barcode ? `บาร์โค้ด: ${p.barcode}` : null}
                            {(p.unit || p.stock_qty != null) ? (
                              <>
                                {p.barcode ? " • " : ""}
                                {p.stock_qty != null ? `คงเหลือ: ${p.stock_qty}` : null}
                                {p.unit ? ` ${p.unit}` : ""}
                              </>
                            ) : null}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {p.sell_price != null ? (
                            <p className="text-sm text-gray-700">ล่าสุด {THB(p.sell_price)}</p>
                          ) : null}
                          <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-medium">
                            ใกล้หมด
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState loading={loadingLow} />
              )}
            </div>
          </div>

          {/* หมดสต๊อก */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">สินค้าหมดสต๊อก</h3>
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6">
              {!loadingOOS && Array.isArray(outOfStocks) && outOfStocks.length > 0 ? (
                <ul className="divide-y">
                  {outOfStocks.map((p, idx) => (
                    <li key={p.product_id || p.id || idx} className="py-3 md:py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-gray-900 font-medium truncate">
                            {p.product_name || p.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {p.barcode ? `บาร์โค้ด: ${p.barcode}` : null}
                            {p.unit ? (p.barcode ? " • " : "") + `หน่วย: ${p.unit}` : null}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {p.sell_price != null || p.price != null ? (
                            <p className="text-sm text-gray-700">
                              ล่าสุด {THB(p.sell_price ?? p.price)}
                            </p>
                          ) : null}
                          <span className="inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs font-medium">
                            หมดสต๊อก
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState loading={loadingOOS} />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyState({ loading }) {
  return (
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
      {loading ? "กำลังโหลด..." : "ไม่มีข้อมูล"}
    </div>
  );
}

/** การ์ดสถิติ */
function StatCard({ title, value, icon, accent }) {
  return (
    <div className="relative bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
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
