// src/pages/POS.jsx
import { useEffect, useMemo, useRef, useState } from "react";  
import { useNavigate, useLocation } from "react-router-dom"; 
import { api } from "../lib/api";
import { Search } from "lucide-react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function POS() {
  const location = useLocation();
  const navigate = useNavigate();

  // รับค่าจาก location (ถ้ามี)
  const { payCash: locPayCash, payPromptPay: locPayPromptPay, promptpayNumber: locPrompt } = location.state || {};  

  // ============== state ==============
  const [payCash, setPayCash] = useState(locPayCash ?? true);
  const [payPromptPay, setPayPromptPay] = useState(locPayPromptPay ?? true);
  const [promptpayNumber, setPromptpayNumber] = useState(locPrompt || "");

  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [vatRate, setVatRate] = useState(0);
  const [actor, setActor] = useState(null);
  const inputRef = useRef(null);

  // ============== โหลดค่าตั้งค่าระบบและฟังการอัปเดต ==============
  useEffect(() => {
    const applySettings = (settings) => {
      setVatRate(settings.vatRate ?? 0);
      setPayCash(settings.payCash ?? true);
      setPayPromptPay(settings.payPromptPay ?? true);
      setPromptpayNumber(settings.promptpayNumber ?? "");
    };

    // โหลดจาก localStorage ตอนแรก
    const cached = localStorage.getItem("settings_basic");
    if (cached) {
      try { applySettings(JSON.parse(cached)); } catch {}
    }

    // ฟังการอัปเดตจาก SystemSettingsBasic
    const listener = (e) => applySettings(e.detail);
    window.addEventListener("settings:updated", listener);

    return () => window.removeEventListener("settings:updated", listener);
  }, []);

  // โหลดผู้ใช้
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u?.user_id) setActor(u);
      } catch {}
    }
  }, []);

  // ============== derive ==============
  const total = useMemo(() => items.reduce((s, it) => s + Number(it.sell_price) * it.qty, 0), [items]);

  // โฟกัสช่องสแกน
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ============== helper: แยก qty*barcode ==============
  const parseQtyAndCode = (input) => {
    const s = String(input || "").trim();
    if (!s) return { qty: 1, code: "" };
    let m = s.match(/^(\d+)\s*[*xX]\s*(.+)$/);
    if (m) return { qty: Math.max(1, parseInt(m[1], 10)), code: m[2].trim() };
    m = s.match(/^(.+)\s*[*xX]\s*(\d+)$/);
    if (m) return { qty: Math.max(1, parseInt(m[2], 10)), code: m[1].trim() };
    return { qty: 1, code: s };
  };

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
      return [...cur, { ...prod, qty }];
    });
  };

  const removeItem = (product_id) =>
    setItems((cur) => cur.filter((x) => x.product_id !== product_id));

  const changeQty = (product_id, delta) =>
    setItems((cur) =>
      cur
        .map((x) => (x.product_id === product_id ? { ...x, qty: Math.max(1, x.qty + delta) } : x))
        .filter((x) => x.qty > 0)
    );

  // ============== search by barcode ==============
  const addByQuery = async (raw) => {
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
      } else setHint("ไม่พบสินค้าในระบบ");
    } catch (e) { console.error(e); setHint("เกิดข้อผิดพลาด"); }
    finally { setLoading(false); setQuery(""); inputRef.current?.focus(); }
  };

  const onClickSearch = () => addByQuery(query);
  const onKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); addByQuery(query); } };

  // ============== go to checkout ==============
  const goCheckout = () => {
    if (!items.length) return;
    if (!actor?.user_id) { setHint("กรุณาเข้าสู่ระบบใหม่"); return; }

    const payload = {
      vatRate,
      user_id: actor.user_id,
      username: actor.username,
      name: actor.name,
      items: items.map((it) => ({
        id: it.product_id,
        name: it.product_name,
        qty: it.qty,
        price: Number(it.sell_price),
      })),
      payCash,
      payPromptPay,
      promptpayNumber,
    };

    sessionStorage.setItem("mm_checkout", JSON.stringify(payload));
    navigate("/dashboard/pos/checkout");
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
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
  <Search className="w-5 h-5 text-gray-600" />
</button>
      </div>

      {/* Hint */}
      {hint && <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">{hint}</div>}

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
                <li key={it.product_id} className="grid grid-cols-[1fr_110px_110px_130px_80px] px-4 py-3 text-sm odd:bg-white even:bg-gray-50">
                  <div className="text-gray-900">{it.product_name}</div>
                  <div className="text-center flex items-center justify-center gap-2">
                    <button onClick={() => changeQty(it.product_id, -1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">-</button>
                    <span className="w-8 text-center">{it.qty}</span>
                    <button onClick={() => changeQty(it.product_id, +1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">+</button>
                  </div>
                  <div className="text-center">฿ {Number(it.sell_price).toLocaleString()}</div>
                  <div className="text-center font-semibold">฿ {(Number(it.sell_price) * it.qty).toLocaleString()}</div>
                  <div className="text-center">
                    <button onClick={() => removeItem(it.product_id)} className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">ลบ</button>
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
            <button onClick={() => setItems([])} disabled={items.length === 0} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold shadow-sm hover:bg-gray-300 disabled:opacity-50">
              เริ่มต้นใหม่
            </button>
            <button onClick={goCheckout} disabled={items.length === 0} className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50">
              ชำระเงิน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
