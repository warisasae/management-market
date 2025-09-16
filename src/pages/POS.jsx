import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function POS() {
  // ============== state ==============
  const [items, setItems] = useState([]); // [{ product_id, product_name, sell_price, qty }]
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [vatRate, setVatRate] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // ============== derive ==============
  const total = useMemo(
    () => items.reduce((s, it) => s + Number(it.sell_price) * it.qty, 0),
    [items]
  );

  // โฟกัสช่องสแกนเมื่อเข้าหน้า
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // โหลด VAT จาก backend (หรือ fallback localStorage)
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/settings/vat", { validateStatus: s => s >= 200 && s < 500 });
        if (r.status === 200 && r.data?.value != null) {
          setVatRate(Number(r.data.value) || 0);
          return;
        }
      } catch {}
      const raw = localStorage.getItem("VAT_RATE");
      setVatRate(Number(raw) || 0);
    })();
  }, []);

  // ============== cart ops ==============
  const addItem = (prod, qty = 1) => {
    qty = Math.max(1, Number(qty) || 1);
    setItems((cur) => {
      const idx = cur.findIndex((x) => x.product_id === prod.product_id);
      if (idx !== -1) {
        const copy = [...cur];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [
        ...cur,
        {
          product_id: prod.product_id,
          product_name: prod.product_name,
          sell_price: Number(prod.sell_price),
          qty,
        },
      ];
    });
  };

  const removeItem = (product_id) =>
    setItems((cur) => cur.filter((x) => x.product_id !== product_id));

  const changeQty = (product_id, delta) => {
    setItems((cur) =>
      cur
        .map((x) =>
          x.product_id === product_id
            ? { ...x, qty: Math.max(1, x.qty + delta) }
            : x
        )
        .filter((x) => x.qty > 0)
    );
  };

  // ---------- helper: แยกจำนวน*บาร์โค้ด ----------
  // รองรับรูปแบบ:
  //  - "5*CODE", "5xCODE"
  //  - "CODE*5", "CODEx5"
  // ไม่เจอรูปแบบ => ถือเป็น qty=1, code=input
  function parseQtyAndCode(input) {
    const s = String(input || "").trim();
    if (!s) return { qty: 1, code: "" };

    // qty ก่อน code
    let m = s.match(/^(\d+)\s*[*xX]\s*(.+)$/);
    if (m) return { qty: Math.max(1, parseInt(m[1], 10) || 1), code: m[2].trim() };

    // code ก่อน qty
    m = s.match(/^(.+)\s*[*xX]\s*(\d+)$/);
    if (m) return { qty: Math.max(1, parseInt(m[2], 10) || 1), code: m[1].trim() };

    return { qty: 1, code: s };
  }

  // ============== search by barcode ==============
  async function addByQuery(raw) {
    const { qty, code } = parseQtyAndCode(raw);
    if (!code) return;

    setLoading(true);
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(code)}`, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
      });

      if (res.status === 200 && res.data) {
        addItem(res.data, qty);
        setHint(`เพิ่ม "${res.data.product_name}" จำนวน ${qty} ชิ้นแล้ว`);
      } else {
        setHint("ไม่พบสินค้าในระบบ");
      }
    } catch (e) {
      console.error(e);
      setHint("เกิดข้อผิดพลาดในการค้นหา");
    } finally {
      setLoading(false);
      setQuery("");
      inputRef.current?.focus();
    }
  }

  const onClickSearch = () => addByQuery(query);
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addByQuery(query);
    }
  };

  // ============== go to checkout ==============
  function goCheckout() {
    if (!items.length) return;

    const payload = {
      vatRate,
      items: items.map((it) => ({
        id: it.product_id,
        name: it.product_name,
        qty: it.qty,
        price: Number(it.sell_price),
      })),
    };

    sessionStorage.setItem("mm_checkout", JSON.stringify(payload));
    navigate("/dashboard/pos/checkout");
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 ">
      <h1 className="text-2xl font-extrabold mb-4">ระบบหน้าร้าน (POS)</h1>

      {/* Search bar */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 px-4 py-3 flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            loading
              ? "กำลังค้นหา..."
              : "สแกนบาร์โค้ด / พิมพ์ชื่อสินค้า หรือพิมพ์ 5*บาร์โค้ด เพื่อเพิ่มทีละหลายชิ้น แล้วกด Enter"
          }
          className="flex-1 text-sm outline-none placeholder:text-gray-400"
          disabled={loading}
        />
        <button
          onClick={onClickSearch}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="search"
        >
          <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>

      {hint && (
        <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          {hint}
        </div>
      )}

      {/* Cart */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 sm:p-6">
        <h3 className="font-extrabold text-lg sm:text-xl text-gray-900 mb-3">ตะกร้าสินค้า</h3>

        <div className="rounded-lg overflow-hidden ring-1 ring-[#C80036]/20">
          <div className="bg-[#C80036] text-white grid grid-cols-[1fr_110px_110px_130px_80px] px-4 py-2 text-sm font-semibold">
            <div>สินค้า</div>
            <div className="text-center">จำนวน</div>
            <div className="text-center">ราคา</div>
            <div className="text-center">รวม</div>
            <div className="text-center">ลบ</div>
          </div>

          {items.length === 0 ? (
            <div className="h-28 grid place-items-center text-gray-400 bg-white">ไม่มีข้อมูล</div>
          ) : (
            <ul className="bg-white">
              {items.map((it) => (
                <li
                  key={it.product_id}
                  className="grid grid-cols-[1fr_110px_110px_130px_80px] px-4 py-3 text-sm odd:bg-white even:bg-gray-50"
                >
                  <div className="text-gray-900">{it.product_name}</div>

                  <div className="text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => changeQty(it.product_id, -1)}
                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{it.qty}</span>
                    <button
                      onClick={() => changeQty(it.product_id, +1)}
                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-center">฿ {Number(it.sell_price).toLocaleString()}</div>
                  <div className="text-center font-semibold">
                    ฿ {(Number(it.sell_price) * it.qty).toLocaleString()}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => removeItem(it.product_id)}
                      className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      ลบ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-lg sm:text-xl font-extrabold text-gray-900">
            รวมทั้งหมด : <span>฿ {total.toLocaleString()}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setItems([])}
              disabled={items.length === 0}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold shadow-sm hover:bg-gray-300 disabled:opacity-50"
            >
              เริ่มต้นใหม่
            </button>
            <button
              onClick={goCheckout}
              disabled={items.length === 0}
              className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              ชำระเงิน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
