import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { getCurrentUser, isAdmin as isAdminRole, ensureAuthFromServer } from "../lib/auth";

export default function Stocks() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ barcode: "", type: "", qty: "", note: "" });

  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("ทั้งหมด");
  const [filterUser, setFilterUser] = useState("ทั้งหมด");

  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");

  const [actorOptions, setActorOptions] = useState(["ทั้งหมด"]);
  const [me, setMe] = useState(null);
  const [canEdit, setCanEdit] = useState(false);

  // ===== Pagination =====
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const barcodeRef = useRef(null);
  const typeRef = useRef(null);
  const qtyRef = useRef(null);

  // utils
  const isBarcode = (s) => /^\d{6,}$/.test(String(s).trim());

  // โหลด user/สิทธิ์ครั้งแรก (sync จาก server เพื่อกันกรณี local ว่างแต่คุกกี้ยัง valid)
  useEffect(() => {
    (async () => {
      const serverUser = await ensureAuthFromServer(); // จะ setAuth ให้ด้วยถ้า valid
      const u = serverUser || getCurrentUser();
      setMe(u || null);
      setCanEdit(!!u && isAdminRole());
    })();
  }, []);

  /** โหลดประวัติ stock จาก backend */
  async function loadStockHistory() {
    try {
      const res = await api.get("/stocks");
      const rows = (res.data || [])
        .map((r) => ({
          id: r.stock_id,
          date: new Date(r.timestamp).toISOString().slice(0, 10),
          code: r.product?.barcode || "",
          name: r.product?.product_name || "(ไม่พบชื่อสินค้า)",
          type: r.change_type === "IN" ? "รับเข้า" : r.change_type === "OUT" ? "เบิกออก" : "ปรับยอด",
          qty: Math.abs(Number(r.quantity ?? 0)),
          rawQty: Number(r.quantity ?? 0),
          user: r.user?.username || r.user?.name || "—",
          ts: new Date(r.timestamp).getTime() || 0,
        }))
        .sort((a, b) => b.ts - a.ts);
      setEntries(rows);
    } catch (e) {
      console.error(e);
      setHint(e?.response?.data?.error || "โหลดประวัติไม่สำเร็จ");
    }
  }

  // โหลดครั้งแรก
  useEffect(() => {
    loadStockHistory();
  }, []);

  // โฟกัสช่องบาร์โค้ดสำหรับแอดมินเท่านั้น
  useEffect(() => {
    if (canEdit) barcodeRef.current?.focus();
  }, [canEdit]);

  // โหลดรายชื่อผู้บันทึกทั้งหมดสำหรับ dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/stocks/actors");
        const names = (res.data || []).map((u) => u.username || u.name || "—");
        setActorOptions(["ทั้งหมด", ...Array.from(new Set(names))]);
      } catch (e) {
        console.error(e);
        setActorOptions(["ทั้งหมด"]);
      }
    })();
  }, []);

  // กรองรายการแสดง
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

  // รีเซ็ตหน้าเมื่อมีการค้นหา/เปลี่ยนตัวกรอง/จำนวนรายการเปลี่ยน
  useEffect(() => {
    setPage(1);
  }, [q, filterType, filterUser, entries.length]);

  // slice ตามหน้า
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const paginated = filtered.slice(start, start + PER_PAGE);

  /** ค้นหาสินค้าด้วย barcode */
  async function fetchProductByBarcode(barcode) {
    const res = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    if (res.status === 404) return null;
    return res.data;
  }

  /** submit ฟอร์ม → สร้าง stock transaction (เฉพาะแอดมิน) */
  const saveEntry = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      setHint("บัญชีของคุณไม่มีสิทธิ์ปรับสต็อก");
      return;
    }

    const barcode = form.barcode.trim();
    const qtyNum = Number(form.qty);

    if (!barcode || !form.type || !qtyNum || Number.isNaN(qtyNum) || qtyNum <= 0) {
      setHint("กรุณากรอกข้อมูลให้ครบ (จำนวนต้องมากกว่า 0)");
      return;
    }

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

      // 3) Payload — ไม่ส่ง user_id ให้ server ดึงจาก session เอง
      const qtyForServer =
        change_type === "OUT" ? Math.abs(qtyNum) : qtyNum; // ถ้า server ต้องการติดลบ ให้ใช้: (change_type === "OUT" ? -Math.abs(qtyNum) : Math.abs(qtyNum))
      const payload = {
        product_id: product.product_id,
        change_type,
        quantity: qtyForServer,
        note: form.note || null,
      };

      // 4) ยิง create
      const res = await api.post("/stocks", payload);
      const createdTx = res.data?.transaction || res.data;

      // ข้อมูลตอบกลับจำเป็นขั้นต่ำ
      if (!createdTx || !createdTx.stock_id) {
        throw new Error(res.data?.error || "เซิร์ฟเวอร์ไม่ส่งข้อมูลธุรกรรมกลับมา");
      }

      const currentUser = me || getCurrentUser();

      // 5) อัปเดต UI (optimistic หลังสำเร็จจริง)
      setEntries((prev) => [
        {
          id: createdTx.stock_id,
          date: new Date(createdTx.timestamp || Date.now()).toISOString().slice(0, 10),
          code: product.barcode || barcode,
          name: product.product_name || "(ไม่พบชื่อสินค้า)",
          type: form.type,
          qty: Math.abs(qtyNum),
          rawQty: Number(createdTx.quantity ?? qtyForServer),
          user: createdTx.user?.username || currentUser?.username || "—",
          ts: new Date(createdTx.timestamp || Date.now()).getTime(),
        },
        ...prev,
      ]);

      setHint(`บันทึก ${form.type} "${product.product_name}" จำนวน ${qtyNum} สำเร็จ`);
      setForm({ barcode: "", type: "", qty: "", note: "" });
      barcodeRef.current?.focus();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "บันทึกไม่สำเร็จ";
      setHint(msg);
    } finally {
      setLoading(false);
    }
  };

  // Enter ที่ช่องบาร์โค้ด → ถ้าข้อมูลครบให้บันทึกเลย (เฉพาะแอดมิน)
  const onBarcodeKeyDown = (e) => {
    if (!canEdit) return;
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
      {/* ฟอร์มบันทึก (แสดงเฉพาะแอดมิน) */}
      {canEdit && (
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
                if (!canEdit) return;
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
      )}

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
          <select
            className={ctrl}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option>ทั้งหมด</option>
            <option>รับเข้า</option>
            <option>เบิกออก</option>
          </select>

          {/* ใช้ actorOptions + filterUser */}
          <select
            className={ctrl}
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            {actorOptions.map((u) => (
              <option key={u} value={u}>
                ผู้บันทึก: {u}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ตารางประวัติ */}
      
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
              {paginated.map((e) => (
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
                  <td className="px-4 py-2 font-semibold">{e.qty}</td>
                  <td className="px-4 py-2 text-gray-800">{e.user}</td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-black/10 bg-white disabled:opacity-50"
              aria-label="Previous"
              title="ก่อนหน้า"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const n = i + 1;
              const active = n === currentPage;
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-xl border ${
                    active ? "bg-violet-600 text-white border-violet-600" : "bg-white border-black/10"
                  }`}
                >
                  {n}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-black/10 bg-white disabled:opacity-50"
              aria-label="Next"
              title="ถัดไป"
            >
              ›
            </button>
          </div>
        )}
      </div>
  );
}
