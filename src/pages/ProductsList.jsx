// src/pages/ProductsList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";   // axios instance (baseURL = "/api")

// ไอคอนเล็ก (SVG inline)
const Icon = {
  Edit: (p) => (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${p.className || ""}`} fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08ZM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82Z" />
    </svg>
  ),
  Document: (p) => (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${p.className || ""}`} fill="currentColor">
      <path d="M6 2a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5z" />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${p.className || ""}`} fill="currentColor">
      <path d="M6 7h12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Zm3-5h6l1 2h4v2H2V4h4l1-2Z" />
    </svg>
  ),
  ChevronLeft: (p) => (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${p.className || ""}`} fill="currentColor">
      <path d="M15 6l-6 6 6 6V6Z" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${p.className || ""}`} fill="currentColor">
      <path d="M9 6l6 6-6 6V6Z" />
    </svg>
  ),
};

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const navigate = useNavigate();

  // โหลดข้อมูลสินค้า
  const fetchProducts = async (query = "") => {
    setLoading(true);
    try {
      // ✅ baseURL = "/api" แล้ว ใช้พาธสั้น ๆ
      const res = await api.get("/products", {
        params: query ? { q: query } : {},
      });
      setProducts(res.data || []);
    } catch (err) {
      console.error("โหลดสินค้าไม่สำเร็จ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // filter client-side
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) =>
      [p.product_id, p.product_name, p.category?.category_name, p.barcode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [q, products]);

  // slice ตาม pagination
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const onSearchChange = (value) => {
    setQ(value);
    setPage(1); // reset หน้าเมื่อค้นหา
  };

  const requestDelete = (id) => setConfirmId(id);
  const confirmDelete = async () => {
    if (!confirmId) return;
    try {
      // ✅ ตัด /api ออก
      await api.delete(`/products/${confirmId}`);
      setProducts((prev) => prev.filter((p) => p.product_id !== confirmId));
    } catch (err) {
      console.error("ลบสินค้าไม่สำเร็จ", err);
    } finally {
      setConfirmId(null);
    }
  };

  const onView = (p) => navigate(`/dashboard/products/${p.product_id}`);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-4">การจัดการสินค้า</h1>

        {/* ค้นหา + ปุ่มเพิ่ม */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <input
              value={q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า/สแกนบาร์โค้ด/รหัสบาร์โค้ด"
              className="w-full h-11 px-4 rounded-lg border border-black/20 bg-white/80 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Link
            to="/dashboard/products/new"
            className="h-11 px-6 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 flex items-center justify-center"
          >
            + เพิ่มสินค้า
          </Link>
        </div>

        {/* ตารางสินค้า */}
        <div className="rounded-2xl border border-black/20 bg-white/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#C80036] text-white">
              <tr className="text-left">
                <th className="px-4 py-3">รหัสสินค้า</th>
                <th className="px-4 py-3">ชื่อสินค้า</th>
                <th className="px-4 py-3">หมวดหมู่</th>
                <th className="px-4 py-3">บาร์โค้ด</th>
                <th className="px-4 py-3 text-right">ราคาขาย</th>
                <th className="px-4 py-3 text-right">คงเหลือ</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    ไม่พบสินค้า
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.product_id} className="border-t border-black/10">
                    <td className="px-4 py-3 font-medium">{p.product_id}</td>
                    <td className="px-4 py-3">{p.product_name}</td>
                    <td className="px-4 py-3">{p.category?.category_name || "-"}</td>
                    <td className="px-4 py-3">{p.barcode || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      {Number(p.sell_price || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">{p.stock_qty}</td>
                    <td className="px-4 py-3 text-center">
                      {p.status === "AVAILABLE" && (
                        <span className="text-green-600 font-semibold">มีจำหน่าย</span>
                      )}
                      {p.status === "OUT_OF_STOCK" && (
                        <span className="text-red-600 font-semibold">สินค้าหมด</span>
                      )}
                      {p.status === "UNAVAILABLE" && (
                        <span className="text-gray-500 font-semibold">เลิกขาย</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onView(p)}
                          className="p-1.5 rounded hover:bg-black/5"
                          title="ดูรายละเอียดสินค้า"
                        >
                          <Icon.Document />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/dashboard/products/new?edit=${p.product_id}`)
                          }
                          className="p-1.5 rounded hover:bg-black/5"
                          title="แก้ไข"
                        >
                          <Icon.Edit />
                        </button>
                        <button
                          onClick={() => requestDelete(p.product_id)}
                          className="p-1.5 rounded hover:bg-black/5 text-red-600"
                          title="ลบ"
                        >
                          <Icon.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/30 bg-white/70 disabled:opacity-50"
            >
              <Icon.ChevronLeft />
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
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/30 bg-white/70 disabled:opacity-50"
            >
              <Icon.ChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Modal ยืนยันการลบ */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl w-[min(520px,92vw)] p-6 shadow-lg">
            <div className="text-center">
              <div className="text-lg font-extrabold">ต้องการลบสินค้านี้หรือไม่?</div>
              <div className="mt-2 text-gray-700">
                {products.find((p) => p.product_id === confirmId)?.product_name}{" "}
                <span className="text-gray-500">({confirmId})</span>
              </div>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  onClick={confirmDelete}
                  className="px-6 h-10 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold"
                >
                  ลบ
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-6 h-10 rounded-lg bg-gray-300 text-black hover:bg-gray-400 font-semibold"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
