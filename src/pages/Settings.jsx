// src/pages/Settings.jsx
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

const LS_KEY = "mm_settings"; // fallback key

const DEFAULTS = {
  shopName: "",
  logo: "",      // dataURL ของโลโก้
  currency: "",
  vat: "",       // เก็บเป็น string ใน form แต่จะส่งเป็น number
  language: "",
};

// ---------------- helpers: normalize backend responses ----------------
function normalizeSettings(obj) {
  const o = obj || {};
  const map = {
    shopName: o.shopName ?? o.shop_name,
    logo: o.logo,
    currency: o.currency,
    vat: o.vat ?? o.vat_rate ?? "",
    language: o.language ?? o.lang,
  };
  const out = {};
  for (const [k, v] of Object.entries(map)) out[k] = v ?? "";
  return out;
}

async function fetchAllSettingsFromBackend() {
  try {
    const res = await api.get("/settings", { validateStatus: s => s >= 200 && s < 500 });
    if (res.status === 200 && res.data) {
      // รองรับได้ทั้ง 3 รูปแบบ
      // 1) { settings: { shopName, logo, ... } }
      if (res.data.settings && typeof res.data.settings === "object") {
        return normalizeSettings(res.data.settings);
      }
      // 2) [{ key: 'vat', value: '7' }, ...]
      if (Array.isArray(res.data)) {
        const obj = {};
        for (const it of res.data) obj[it.key] = it.value;
        return normalizeSettings(obj);
      }
      // 3) { shopName: "...", vat: "7", ... }
      if (typeof res.data === "object") {
        return normalizeSettings(res.data);
      }
    }
  } catch {}

  // fallback: โหลดทีละ key
  const keys = ["shopName", "logo", "currency", "vat", "language"];
  const out = {};
  await Promise.all(
    keys.map(async (k) => {
      try {
        const r = await api.get(`/settings/${encodeURIComponent(k)}`, {
          validateStatus: (s) => s >= 200 && s < 500,
        });
        if (r.status === 200 && r.data) {
          out[k] = (r.data.value ?? r.data[k] ?? r.data) ?? "";
        }
      } catch {}
    })
  );
  return out;
}

async function saveAllSettingsToBackend(map) {
  // ✅ แปลง vat เป็น number ก่อนส่ง (ถ้าเป็น "" จะไม่ส่ง)
  const payload = { ...map };
  if (payload.vat !== "" && !Number.isNaN(Number(payload.vat))) {
    payload.vat = Number(payload.vat);
  } else if (payload.vat === "") {
    // ถ้าเว้นว่าง อาจเลือกไม่อัปเดต vat (ลบออกไป)
    delete payload.vat;
  }

  // 1) พยายาม bulk ผ่าน PUT /api/settings (body: {settings: {...}})
  try {
    const res = await api.put(
      "/settings",
      { settings: payload },
      { validateStatus: (s) => s >= 200 && s < 500 }
    );
    if (res.status >= 200 && res.status < 300) return true;
  } catch {}

  // 2) เผื่อ backend ทำ bulk เป็น /settings/bulk (body: {...})
  try {
    const res = await api.put(
      "/settings/bulk",
      payload,
      { validateStatus: (s) => s >= 200 && s < 500 }
    );
    if (res.status >= 200 && res.status < 300) return true;
  } catch {}

  // 3) fallback: ทีละ key → PUT /api/settings/:key { value }
  try {
    const entries = Object.entries(payload);
    for (const [k, v] of entries) {
      await api.put(`/settings/${encodeURIComponent(k)}`, { value: v }, {
        validateStatus: (s) => s >= 200 && s < 500
      });
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------- component ----------------
export default function Settings() {
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [useBackend, setUseBackend] = useState(true); // เดาว่ามี backend ก่อน
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) ลองโหลดจาก backend
        const got = await fetchAllSettingsFromBackend();
        const merged = { ...DEFAULTS, ...normalizeSettings(got) };

        // ถ้า backend ไม่มีค่าอะไรเลย → ลอง localStorage ต่อ
        const isEmpty =
          Object.values(got || {}).filter((v) => v !== undefined && v !== "").length === 0;

        if (isEmpty) {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const next = { ...merged, ...parsed };
              setForm(next);
              setUseBackend(false);
              setLoading(false);
              return;
            } catch {}
          }
        }

        setForm(merged);
        setUseBackend(true);
      } catch {
        // 2) ถ้า backend ล้มเหลว → fallback localStorage
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const next = { ...DEFAULTS, ...parsed };
            setForm(next);
          } catch {
            setForm(DEFAULTS);
          }
        } else {
          setForm(DEFAULTS);
        }
        setUseBackend(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // --- Logo upload helpers (dataURL เก็บใน settings) ---
  const readAsDataURL = (file) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result || ""));
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files) => {
    const file = files?.[0];
    if (!file) return;
    const dataURL = await readAsDataURL(file);
    setField("logo", dataURL);
  };

  const onPickLogo = async (e) => {
    await handleFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    await handleFiles(e.dataTransfer?.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const removeLogo = () => setField("logo", "");

  const validate = () => {
    if (
      form.vat !== "" &&
      (isNaN(Number(form.vat)) || Number(form.vat) < 0 || Number(form.vat) > 100)
    ) {
      alert("VAT ต้องเป็นตัวเลขระหว่าง 0 ถึง 100");
      return false;
    }
    return true;
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    const payload = {
      shopName: form.shopName ?? "",
      logo: form.logo ?? "",
      currency: form.currency ?? "",
      vat: form.vat ?? "",
      language: form.language ?? "",
    };

    // เซฟ backend ถ้าใช้ได้ ไม่งั้นเก็บ LocalStorage
    let ok = false;
    if (useBackend) {
      ok = await saveAllSettingsToBackend(payload);
      if (!ok) {
        localStorage.setItem(LS_KEY, JSON.stringify(payload));
      }
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    }

    // ✅ อัปเดต VAT ให้ POS ใช้งานทันที (ทั้ง localStorage + broadcast)
    if (String(payload.vat ?? "") !== "") {
      const vatNum = Number(payload.vat);
      if (!Number.isNaN(vatNum)) {
        localStorage.setItem("VAT_RATE", String(vatNum));
        // แจ้งหน้าอื่น (เช่น POS) ที่อาจ subscribe storage event ให้รีเฟรชค่า
        try {
          window.dispatchEvent(new StorageEvent("storage", { key: "VAT_RATE", newValue: String(vatNum) }));
        } catch {}
      }
    } else {
      // ถ้าล้าง VAT → ลบค่า
      localStorage.removeItem("VAT_RATE");
      try {
        window.dispatchEvent(new StorageEvent("storage", { key: "VAT_RATE", newValue: null }));
      } catch {}
    }

    // เก็บ mm_settings ไว้ด้วยเพื่อ fallback ให้ POS
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: LS_KEY, newValue: JSON.stringify(payload) }));
    } catch {}

    setSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1200);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 grid place-items-center">
        <div className="text-gray-500">กำลังโหลดการตั้งค่า…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-4">ตั้งค่าระบบ</h1>

        <form onSubmit={onSave} className="bg-white rounded-2xl ring-1 ring-black/10 p-5">
          {/* ชื่อร้านค้า */}
          <FieldLabel>ชื่อร้านค้า</FieldLabel>
          <input
            value={form.shopName}
            onChange={(e) => setField("shopName", e.target.value)}
            placeholder="กรอกชื่อร้าน"
            className="w-full h-11 mb-4 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />

          {/* โลโก้ร้านค้า - อัปโหลด/ลากวาง + พรีวิว */}
          <FieldLabel>โลโก้ร้านค้า</FieldLabel>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`mb-4 rounded-xl border-2 border-dashed p-4 flex items-center gap-4 transition
              ${dragOver ? "border-indigo-500 bg-indigo-50/50" : "border-black/20"}
            `}
          >
            <div className="h-16 w-16 rounded-lg bg-white ring-1 ring-black/10 overflow-hidden grid place-items-center">
              {form.logo ? (
                <img src={form.logo} alt="logo preview" className="h-full w-full object-cover" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-gray-400" fill="currentColor">
                  <path d="M19 13v6H5v-6H3v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6h-2Zm-6-1 3.5 3.5-1.42 1.42L13 15.83l-2.09 2.09-1.41-1.42L13 12ZM12 3l4 4h-3v5h-2V7H8l4-4Z" />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <div className="text-sm text-gray-600">
                ลากรูปมาวางที่นี่ หรือกดปุ่มเพื่ออัปโหลด (PNG/JPG)
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3 h-10 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {form.logo ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}
                </button>
                {form.logo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="px-3 h-10 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    ลบโลโก้
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickLogo}
              />
            </div>
          </div>

          {/* สกุลเงิน */}
          <FieldLabel>สกุลเงิน</FieldLabel>
          <select
            value={form.currency}
            onChange={(e) => setField("currency", e.target.value)}
            className="w-full h-11 mb-4 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">เลือกสกุลเงิน</option>
            <option value="THB-บาท">THB-บาท</option>
          </select>

          {/* VAT (%) */}
          <FieldLabel>Vat(%)</FieldLabel>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.vat}
            onChange={(e) => setField("vat", e.target.value)}
            placeholder="กรอกภาษีรายปี"
            className="w-full h-11 mb-4 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />

          {/* ภาษา */}
          <FieldLabel>ภาษา</FieldLabel>
          <select
            value={form.language}
            onChange={(e) => setField("language", e.target.value)}
            className="w-full h-11 mb-4 px-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">เลือกภาษา</option>
            <option value="th">ไทย</option>
          </select>

          {/* ปุ่ม */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-11 px-5 rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </button>
          </div>
        </form>
      </div>

      {/* โมดัลบันทึกสำเร็จ */}
      {showSaved && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[min(420px,92vw)] text-center shadow-lg">
            <div className="text-lg font-extrabold mb-2">บันทึกสำเร็จ</div>
            <div className="mx-auto mb-3 flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600">
              ✓
            </div>
            <div>บันทึกการตั้งค่าเรียบร้อย</div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div className="text-sm font-semibold text-gray-800 mb-1">{children}</div>;
}
