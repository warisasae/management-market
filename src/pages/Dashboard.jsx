import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLocation, useNavigate } from "react-router-dom";

const THB = (n) => `฿ ${Number(n || 0).toLocaleString()}`;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ทำให้เป็นตัวเลข + fallback */
function toInt(v, def = 0) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

/** ดึงค่าจาก settings ที่อาจใช้ชื่อคีย์ต่างกัน */
function readThresholdsFromSettings(s = {}) {
  // รองรับหลายชื่อคีย์ที่พบบ่อย
  const low =
    s.lowStockThreshold ??
    s.low_stock_threshold ??
    s.stock_low_threshold ??
    s.low_stock ??
    s.stockLow ??
    s.low ??
    null;

  const exp =
    s.expiryAlertDays ??
    s.expiry_alert_days ??
    s.expiryDays ??
    s.expiry ??
    null;

  return {
    lowStock: toInt(low, 3),
    expiryDays: toInt(exp, 7),
  };
}

/** คำนวณ diff วันแบบ “รวมวันหมดอายุทั้งวัน” ลดปัญหา timezone */
function daysUntilExpiry(expiryDateString) {
  if (!expiryDateString) return Infinity;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const expiry = new Date(expiryDateString);
  // จับให้ถึงสิ้นวันของวันหมดอายุ
  const expiryEnd = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate(), 23, 59, 59, 999);
  const diff = Math.ceil((expiryEnd - start) / MS_PER_DAY);
  return diff;
}

/** กรองสินค้าใกล้หมดอายุด้วยเกณฑ์วัน */
function filterNearExpiry(products, maxDays) {
  if (!Array.isArray(products)) return [];
  return products.filter((p) => {
    const d = daysUntilExpiry(p?.expiry_date);
    return d > 0 && d <= maxDays; // 1..maxDays เท่านั้น
  });
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  const [loadingOOS, setLoadingOOS] = useState(true);
  const [outOfStocks, setOutOfStocks] = useState([]);

  const [loadingLow, setLoadingLow] = useState(true);
  const [lowStocks, setLowStocks] = useState([]);

  const [loadingNearExpiry, setLoadingNearExpiry] = useState(true);
  const [nearExpiryProducts, setNearExpiryProducts] = useState([]);

  const [data, setData] = useState({
    totalSales: 0,
    netProfit: 0,
    totalProducts: 0,
    stockCount: 0,
    bestSellers: [],
    lowStockCount: 0,
    outOfStockCount: 0,
    nearExpiryCount: 0,
  });

  // ------ ค่าจาก URL (fallback)
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const urlLow = toInt(query.get("lowStockThreshold"), 3);
  const urlExp = toInt(query.get("expiryAlertDays"), 7);

  // ------ เก็บค่า threshold ที่ “ใช้จริง”
  const [lowStockThreshold, setLowStockThreshold] = useState(urlLow);
  const [expiryAlertDays, setExpiryAlertDays] = useState(urlExp);

 useEffect(() => {
  let alive = true;

  (async () => {
    try {
      // ------ โหลด settings (ถ้ามี) เพื่อได้ค่า threshold ที่ใช้จริง ------
      let effectiveLow = urlLow;
      let effectiveExp = urlExp;

      try {
        const setRes = await api.get("/settings/basic", {
          validateStatus: (s) => s >= 200 && s < 500,
        });

        if (setRes.status === 200 && setRes.data) {
          const s = setRes.data || {};
          const low =
            s.lowStockThreshold ?? s.low_stock_threshold ?? s.stock_low_threshold ?? s.low ?? null;
          const exp =
            s.expiryAlertDays ?? s.expiry_alert_days ?? s.expiry ?? null;

          if (Number.isFinite(+low))  effectiveLow = +low;
          if (Number.isFinite(+exp))  effectiveExp = +exp;
        } else if (setRes.status === 404) {
          // ไม่มี endpoint ก็ข้ามไป ใช้ค่าจาก URL/default
          console.info("settings/basic not found, using defaults");
        }
      } catch (e) {
        console.warn("load settings failed:", e);
      }

      setLowStockThreshold(effectiveLow);
      setExpiryAlertDays(effectiveExp);

      // ------ สรุปแดชบอร์ด ------
      const sum = await api.get("/dashboard/summary", {
        validateStatus: (s) => s >= 200 && s < 500,
      });

      if (!alive) return;

      if (sum.status === 401 || sum.status === 403) {
        navigate("/login", { replace: true });
        return;
      }

      const summary = sum.data ?? {};
      const bestSellers = Array.isArray(summary.bestSellers) ? summary.bestSellers : [];

      setData((prev) => ({
        ...prev,
        totalSales: Number(summary.totalSales ?? 0),
        netProfit: Number(summary.netProfit ?? 0),
        totalProducts: Number(summary.totalProducts ?? 0),
        stockCount: Number(summary.stockCount ?? 0),
        bestSellers,
      }));

      // ------ ลิสต์สินค้าแต่ละกลุ่ม ------
      const [lowRes, oosRes, nearRes] = await Promise.all([
        api.get("/products/low-stock", {
          params: { threshold: effectiveLow },
          validateStatus: (s) => s >= 200 && s < 500,
        }),
        api.get("/products/out-of-stock", {
          validateStatus: (s) => s >= 200 && s < 500,
        }),
        api.get("/products/near-expiry", {
          params: { days: effectiveExp },
          validateStatus: (s) => s >= 200 && s < 500,
        }),
      ]);

      if (!alive) return;

      // low stock
      const lowList =
        lowRes.status === 200 && Array.isArray(lowRes.data)
          ? lowRes.data
          : Array.isArray(summary.lowStocks)
          ? summary.lowStocks
          : [];
      setLowStocks(lowList);
      setData((prev) => ({ ...prev, lowStockCount: lowList.length }));
      setLoadingLow(false);

      // out of stock
      const oosList =
        oosRes.status === 200 && Array.isArray(oosRes.data)
          ? oosRes.data
          : Array.isArray(summary.outOfStocks)
          ? summary.outOfStocks
          : [];
      setOutOfStocks(oosList);
      setData((prev) => ({ ...prev, outOfStockCount: oosList.length }));
      setLoadingOOS(false);

      // near-expiry (กรองซ้ำตาม days ปัจจุบันให้ชัวร์)
      const serverNear =
        nearRes.status === 200 && Array.isArray(nearRes.data)
          ? nearRes.data
          : [];
      const nearFiltered =
        serverNear.length > 0
          ? filterNearExpiry(serverNear, effectiveExp)
          : filterNearExpiry(lowList, effectiveExp);

      setNearExpiryProducts(nearFiltered);
      setData((prev) => ({ ...prev, nearExpiryCount: nearFiltered.length }));
      setLoadingNearExpiry(false);
    } catch (e) {
      console.error("load dashboard failed:", e);
    } finally {
      if (alive) setLoading(false);
    }
  })();

  return () => {
    alive = false;
  };
  // ✅ ผูกกับ query string (รวมถึง ?refresh=xxx) และค่าธรresholdจาก URL
}, [location.search, urlLow, urlExp]); // reload เมื่อรีหน้า/เส้นทางเปลี่ยน

  return (
    <div className="min-h-screen px-4 sm:px-6 pb-6 pt-2">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-1 md:pt-2">
        <header className="mb-1 md:mb-2">
          <h2 className="text-3xl font-extrabold text-gray-900">แดชบอร์ด</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            ภาพรวมการขายและสินค้าของร้านระฆังทอง
          </p>
        </header>

        {/* Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard title="ยอดขายวันนี้" value={THB(data.totalSales)} accent="from-blue-500 to-blue-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h2v18H3zM8 11h2v10H8zM13 6h2v15h-2zM18 14h2v7h-2z" /></svg>} />
          <StatCard title="กำไรสุทธิวันนี้" value={THB(data.netProfit)} accent="from-emerald-500 to-emerald-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l4 7h-3v7h-2v-7H8l4-7z" /></svg>} />
          <StatCard title="สินค้าใกล้หมด" value={`${data.lowStockCount ?? 0} รายการ`} accent="from-orange-500 to-orange-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l9 4-9 4-9-4 9-4zm9 7v7l-9 4-9-4V9l9 4 9-4z" /></svg>} />
          <StatCard title="สินค้าหมดสต๊อก" value={`${data.outOfStockCount ?? 0} รายการ`} accent="from-rose-500 to-rose-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v6h-2V7h2zm0 8v2h-2v-2h2z" /></svg>} />
        </section>

        {/* Stock Summary */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
          <StatCard title="ยอดสต๊อกรวม"
            value={`${Number(data.stockCount || 0).toLocaleString()} ชิ้น`}
            accent="from-teal-500 to-teal-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V8a2 2 0 0 0-1.2-1.84l-6-2.67a2 2 0 0 0-1.6 0l-6 2.67A2 2 0 0 0 5 8v8a2 2 0 0 0 1.2 1.84l6 2.67a2 2 0 0 0 1.6 0l6-2.67A2 2 0 0 0 21 16z" /></svg>} />
          <StatCard title="จำนวนสินค้าในระบบ" value={`${data.totalProducts ?? 0} รายการ`}
            accent="from-slate-500 to-slate-600"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>} />
        </section>

        {/* Best sellers */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">สินค้าขายดี (30 วันล่าสุด)</h3>
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6">
            {!loading && Array.isArray(data.bestSellers) && data.bestSellers.length > 0 ? (
              <ul className="divide-y">
                {data.bestSellers.map((item, idx) => (
                  <li key={idx} className="py-3 md:py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900">{item.name || item.product_name || "-"}</span>
                      <span className="text-gray-900 font-semibold">
                        ขายแล้ว {Number(item.sold ?? item.quantity ?? 0)} {item.unit || "ชิ้น"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState loading={loading} />}
          </div>
        </section>

        {/* Low & OOS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <StockList title="สินค้าใกล้หมด" list={lowStocks} loading={loadingLow} badge="ใกล้หมด" badgeClass="bg-orange-100 text-orange-700" />
          <StockList title="สินค้าหมดสต๊อก" list={outOfStocks} loading={loadingOOS} badge="หมดสต๊อก" badgeClass="bg-rose-100 text-rose-700" />
        </section>

        {/* Near expiry */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">สินค้าใกล้หมดอายุ</h3>
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6">
            {!loadingNearExpiry && nearExpiryProducts.length > 0 ? (
              <ul className="divide-y">
                {nearExpiryProducts.map((p, idx) => {
                  const d = daysUntilExpiry(p.expiry_date);
                  let expiryText = "ปกติ";
                  let badgeColor = "bg-green-100 text-green-700";
                  if (d <= 0) { expiryText = "หมดอายุแล้ว"; badgeColor = "bg-red-100 text-red-700"; }
                  else if (d <= expiryAlertDays) { expiryText = `ใกล้หมดอายุ (${d} วัน)`; badgeColor = "bg-yellow-100 text-yellow-700"; }

                  return (
                    <li key={p.product_id || idx} className="py-3 md:py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-gray-900 font-medium truncate">{p.product_name || p.name}</p>
                          <p className="text-sm text-gray-500">
                            {p.barcode ? `บาร์โค้ด: ${p.barcode}` : null}
                            {p.unit ? (p.barcode ? " • " : "") + `หน่วย: ${p.unit}` : null}
                            {p.stock_qty != null ? ` • คงเหลือ: ${p.stock_qty}` : null}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {p.sell_price != null && <p className="text-sm text-gray-700">ล่าสุด {THB(p.sell_price)}</p>}
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>
                            {expiryText}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <EmptyState loading={loadingNearExpiry} />}
          </div>
        </section>
      </div>
    </div>
  );
}

function StockList({ title, list, loading, badge, badgeClass }) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 md:p-6">
        {!loading && Array.isArray(list) && list.length > 0 ? (
          <ul className="divide-y">
            {list.map((p, idx) => (
              <li key={p.product_id || p.id || idx} className="py-3 md:py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-gray-900 font-medium truncate">{p.product_name || p.name}</p>
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
                    {p.sell_price != null || p.price != null ? (
                      <p className="text-sm text-gray-700">ล่าสุด {THB(p.sell_price ?? p.price)}</p>
                    ) : null}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                      {badge}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState loading={loading} />}
      </div>
    </div>
  );
}

function EmptyState({ loading }) {
  return (
    <div className="text-center text-gray-500">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-gray-100">
        <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3h2l.4 2M7 13h10l3-8H6.4" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="17" cy="20" r="1.5" />
        </svg>
      </div>
      {loading ? "กำลังโหลด..." : "ไม่มีข้อมูล"}
    </div>
  );
}

function StatCard({ title, value, icon, accent }) {
  return (
    <div className="relative bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-center gap-4">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-gray-100 text-gray-700">{icon}</div>
        <div>
          <h4 className="text-sm font-semibold text-gray-600">{title}</h4>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
