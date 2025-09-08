// src/pages/CartPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/** ตัวอย่างคลังสินค้า (คุณแก้ไข/ดึงจาก API ภายหลังได้)
 *  ใช้ key "barcode" เพื่อตรวจจับจาก input/เครื่องสแกน
 */
const PRODUCTS = [
  { id: "p001", barcode: "8850001112223", name: "ผัดซีอิ๊วเส้นใหญ่", price: 50 },
  { id: "p002", barcode: "8850001112224", name: "ชาไทยเย็น", price: 35 },
  { id: "p003", barcode: "8850001112225", name: "โค้กกระป๋อง", price: 20 },
  { id: "p004", barcode: "8850001112226", name: "ข้าวกะเพราไข่ดาว", price: 65 },
];

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");       // เก็บค่าที่พิมพ์/สแกน (barcode หรือชื่อ)
  const [hint, setHint] = useState("");         // แสดงข้อความแจ้งเตือนสั้นๆ
  const inputRef = useRef(null);

  const total = useMemo(
    () => items.reduce((s, it) => s + it.price * it.qty, 0),
    [items]
  );

  // โฟกัสช่องค้นหาให้พร้อมสแกนเสมอ
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resetCart = () => setItems([]);

  const checkout = () => {
    if (items.length === 0) return;
    alert("ไปหน้าชำระเงิน");
  };

  /** เพิ่มสินค้าจาก object สินค้า 1 ชิ้น (รวมจำนวนถ้ามีอยู่แล้ว) */
  const addItem = (prod, qty = 1) => {
    setItems((cur) => {
      const idx = cur.findIndex((x) => x.id === prod.id);
      if (idx !== -1) {
        const copy = [...cur];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [...cur, { ...prod, qty }];
    });
  };

  /** ลบสินค้าออกทั้งแถว */
  const removeItem = (id) => {
    setItems((cur) => cur.filter((x) => x.id !== id));
  };

  /** เปลี่ยนจำนวนแบบ +/- */
  const changeQty = (id, delta) => {
    setItems((cur) =>
      cur
        .map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty + delta) } : x))
        .filter((x) => x.qty > 0)
    );
  };

  /** ค้นหาและเพิ่มด้วย barcode (หรือชื่อก็ได้) */
  const addByQuery = (raw) => {
    const q = raw.trim();
    if (!q) return;

    // 1) ลองหาด้วย barcode ตรงๆ ก่อน
    let prod = PRODUCTS.find((p) => p.barcode === q);

    // 2) ถ้าไม่เจอ ลองหาแบบชื่อ (เช่นพิมพ์ "โค้ก")
    if (!prod) {
      const lower = q.toLowerCase();
      prod = PRODUCTS.find((p) => p.name.toLowerCase().includes(lower));
    }

    if (prod) {
      addItem(prod, 1);
      setHint(`เพิ่ม "${prod.name}" แล้ว`);
    } else {
      setHint("ไม่พบสินค้า");
    }

    setQuery("");
    inputRef.current?.focus();
  };

  /** เมื่อกดปุ่มไอคอนค้นหา */
  const onClickSearch = () => addByQuery(query);

  /** รองรับเครื่องสแกนบาร์โค้ดที่กดยิงแล้วลงท้ายด้วย Enter */
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addByQuery(query);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50">
      {/* Search bar */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 px-4 py-3 flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-gray-100" aria-label="menu">
          <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 6h18v2H3M3 11h18v2H3M3 16h18v2H3" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ค้นหาสินค้าด้วยคิวอาร์โค้ด….."
          className="flex-1 text-sm outline-none placeholder:text-gray-400"
        />

        <button
          onClick={onClickSearch}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="search"
        >
          <svg
            className="w-5 h-5 text-indigo-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>

      {/* hint/แจ้งเตือนสั้นๆ */}
      {hint && (
        <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          {hint}
        </div>
      )}

      {/* กล่องตะกร้า */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 sm:p-6">
        <h3 className="font-extrabold text-lg sm:text-xl text-gray-900 mb-3">ตะกร้าสินค้า</h3>

        {/* หัวตาราง */}
        <div className="rounded-lg overflow-hidden ring-1 ring-[#C80036]/20">
          <div className="bg-[#C80036] text-white grid grid-cols-[1fr_110px_110px_130px_80px] px-4 py-2 text-sm font-semibold">
            <div>สินค้า</div>
            <div className="text-center">จำนวน</div>
            <div className="text-center">ราคา</div>
            <div className="text-center">รวม</div>
            <div className="text-center">ลบ</div>
          </div>

          {/* รายการ */}
          {items.length === 0 ? (
            <div className="h-28 grid place-items-center text-gray-400 bg-white">
              ไม่มีข้อมูล
            </div>
          ) : (
            <ul className="bg-white">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="grid grid-cols-[1fr_110px_110px_130px_80px] px-4 py-3 text-sm odd:bg-white even:bg-gray-50"
                >
                  <div className="text-gray-900">{it.name}</div>

                  <div className="text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => changeQty(it.id, -1)}
                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{it.qty}</span>
                    <button
                      onClick={() => changeQty(it.id, +1)}
                      className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-center">฿ {it.price.toLocaleString()}</div>
                  <div className="text-center font-semibold">
                    ฿ {(it.price * it.qty).toLocaleString()}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => removeItem(it.id)}
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

        {/* สรุป + ปุ่ม */}
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-lg sm:text-xl font-extrabold text-gray-900">
            รวมทั้งหมด : <span>฿ {total.toLocaleString()}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetCart}
              disabled={items.length === 0}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold shadow-sm hover:bg-gray-300 disabled:opacity-50"
            >
              เริ่มต้นใหม่
            </button>
            <button
              onClick={checkout}
              disabled={items.length === 0}
              className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              ชำระเงิน
            </button>
          </div>
        </div>
      </div>

      {/* ตัวอย่างรายการด่วน: คลิกเพื่อทดสอบเร็ว (ไม่จำเป็นต้องมีในโปรดักชัน) */}
      <div className="mt-4 text-sm text-gray-600">
        <div className="mb-2 font-semibold">ทดสอบเร็ว:</div>
        <div className="flex flex-wrap gap-2">
          {PRODUCTS.map((p) => (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              title={`barcode: ${p.barcode}`}
            >
              + {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
