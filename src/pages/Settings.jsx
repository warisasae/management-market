import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Upload,
  Download,
  Store,
  ReceiptText,
  Boxes,
  MonitorCog,
  ShieldCheck
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

// แปลงเป็นค่าเงินไทย
const THB = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  });


export default function SystemSettingsBasic() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    storeName: "My Grocery Store",
    phone: "",
    address: "",
    openTime: "07:00",
    closeTime: "21:00",

    payCash: true,
    payPromptPay: true,
    promptpayNumber: "",

    printCopies: 1,
    vatIncluded: true,
    vatRate: 0,
    receiptFooter: "** ขอบคุณที่ใช้บริการ **",
    taxId: "0107542000011",
    vatCode: "00639",
    posNo: "SL00028",
    cashierName: "warisa",
    paymentMethodPreview: "โอนเงิน",

    lowStockThreshold: 3,
    expiryAlertDays: 7,
    requireOpenShift: true,
    shiftFloat: 500,
  });

  function update(p) {
    setForm((f) => ({ ...f, ...p }));
  }

  useEffect(() => {
    const cached = localStorage.getItem("settings_basic");
    if (cached) {
      try {
        setForm((f) => ({ ...f, ...JSON.parse(cached) }));
      } catch {}
    }
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/basic`);
        if (!res.ok) throw new Error(`Load failed: ${res.status}`);
        const data = await res.json();
        if (!ignore && data && typeof data === "object") {
          setForm((f) => ({ ...f, ...data }));
          localStorage.setItem("settings_basic", JSON.stringify(data));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);


  const handleSave = async () => {
  try {
    setSaving(true);
    const res = await fetch(`${API_URL}/api/settings/basic`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    const data = await res.json();
    if (data?.settings) {
      setForm((f) => ({ ...f, ...data.settings }));
      localStorage.setItem("settings_basic", JSON.stringify(data.settings));

      // ส่งการตั้งค่าผ่าน query parameters ไปที่ Dashboard
      const { lowStockThreshold, expiryAlertDays } = data.settings;
      navigate(`/dashboard?lowStockThreshold=${lowStockThreshold}&expiryAlertDays=${expiryAlertDays}`);
    }
    alert("บันทึกการตั้งค่าเรียบร้อย ✅");
  } catch (e) {
    console.error(e);
    alert("บันทึกไม่สำเร็จ");
  } finally {
    setSaving(false);
  }
};


  return (
    <div>
      <header>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#C80036] text-white">
              <Store size={16} />
            </div>
            <h1 className="text-[15px] font-semibold">
              ตั้งค่าระบบร้านขายของชำ
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
          </div>
        </div>

    <nav className="mx-auto max-w-6xl px-4 pb-3">
  <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
    <Tab k="general" cur={tab} set={setTab} icon={<Store size={16} />} label="ทั่วไป" />
    <Tab k="payments" cur={tab} set={setTab} icon={<ReceiptText size={16} />} label="ชำระเงิน" />
    <Tab k="receipt" cur={tab} set={setTab} icon={<ReceiptText size={16} />} label="ใบเสร็จ" />
    <Tab k="inventory" cur={tab} set={setTab} icon={<Boxes size={16} />} label="สต็อก" />
  </div>
</nav>


      </header>

      <main className="mx-auto max-w-6xl p-4">
        {loading ? (
          <div className="text-sm text-slate-500">กำลังโหลดการตั้งค่า…</div>
        ) : (
          <>
            {tab === "general" && <General form={form} update={update} />}
            {tab === "payments" && <Payments form={form} update={update} />}
            {tab === "receipt" && <Receipt form={form} update={update} />}
            {tab === "inventory" && <Inventory form={form} update={update} />}
          </>
        )}
      </main>
    </div>
  );
}
/* --------------------------- Components --------------------------- */
function Tab({ k, cur, set, icon, label }) {
  const active = cur === k;
  return (
    <button
      onClick={() => set(k)}
      className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
      aria-pressed={active}
    >
      {icon}{label}
    </button>
  );
}

function Card({ title, children }) {
  return (
    <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-indigo-500" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <div className="mb-1 font-medium text-slate-700">{label}</div>
        {children}
    </label>
  );
}

function FieldRow({ children }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`mb-2 inline-flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 ${checked ? "border-slate-300" : "border-slate-200"}`}
      aria-pressed={checked}
    >
      <span>{label}</span>
      <span className={`h-6 w-10 rounded-full p-0.5 transition ${checked ? "bg-slate-900" : "bg-slate-300"}`}>
        <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function Checkbox({ checked, onChange }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />;
}
/* ------------------------------- Tabs -------------------------------- */
function General({ form, update }) {
  return (
    <Card title="ข้อมูลร้าน">
      {/* ชื่อร้าน */}
      <Field
        label="ชื่อร้าน"
        hint="ฟิลด์นี้ถูกล็อก หากต้องการเปลี่ยนโปรดติดต่อผู้ดูแลระบบ"
        labelClassName="font-medium text-slate-700"
      >
        <input
          className="w-full rounded-md border border-gray-200 bg-slate-100 px-3 py-2 text-slate-600 cursor-not-allowed shadow-sm"
          value={form.storeName}
          readOnly
          disabled
        />
      </Field>

      {/* เบอร์โทร */}
      <FieldRow>
        <Field
          label="โทร"
          labelClassName="font-medium text-slate-700"
        >
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-slate-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition"
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value })}
            placeholder="08x-xxx-xxxx"
          />
        </Field>
      </FieldRow>

      {/* ที่อยู่ */}
      <Field
        label="ที่อยู่"
        labelClassName="font-medium text-slate-700"
      >
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-slate-800 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition min-h-[88px]"
          value={form.address}
          onChange={(e) => update({ address: e.target.value })}
          placeholder="เลขที่/ถนน/ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์"
        />
      </Field>

      {/* เวลาเปิด - ปิด */}
      <Field
        label="เวลาเปิด - ปิด"
        labelClassName="font-medium text-slate-700"
      >
        <div className="flex items-center gap-2">
          <input
            type="time"
            className="rounded-md border border-gray-300 px-2 py-1 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition"
            value={form.openTime}
            onChange={(e) => update({ openTime: e.target.value })}
          />
          <span className="text-sm text-slate-500">ถึง</span>
          <input
            type="time"
            className="rounded-md border border-gray-300 px-2 py-1 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition"
            value={form.closeTime}
            onChange={(e) => update({ closeTime: e.target.value })}
          />
        </div>
      </Field>
    </Card>
  );
}


// Inventory Tab ที่แจ้งเตือนหน้าอื่น
function Inventory({ form, update }) {
  const handleChange = (key, value) => {
    update({ [key]: value });
    // แจ้ง component อื่น
    window.dispatchEvent(new CustomEvent("stock:updated", { detail: { key, value } }));
  };

  return (
    <Card title="สต็อก (ตั้งค่าน้อย ใช้งานง่าย)">
  <FieldRow>
    {/* เตือนเมื่อสต็อกต่ำกว่า */}
    <Field label="เตือนเมื่อสต็อกต่ำกว่า (ชิ้น)">
      <div className="inline-flex items-stretch rounded-md border border-gray-300 shadow-sm overflow-hidden bg-white">
        <button
          type="button"
          className="px-3 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          onClick={() =>
            handleChange(
              "lowStockThreshold",
              Math.max(0, (form.lowStockThreshold || 0) - 1)
            )
          }
          aria-label="ลดค่าเตือนสต็อกต่ำ"
        >
          –
        </button>
        <input
          type="number"
          min={0}
          className="w-20 px-3 py-2 text-center outline-none"
          value={form.lowStockThreshold}
          onChange={(e) =>
            handleChange("lowStockThreshold", Math.max(0, +e.target.value || 0))
          }
        />
        <button
          type="button"
          className="px-3 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          onClick={() =>
            handleChange(
              "lowStockThreshold",
              (form.lowStockThreshold || 0) + 1
            )
          }
          aria-label="เพิ่มค่าเตือนสต็อกต่ำ"
        >
          +
        </button>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        กำหนดขั้นต่ำที่ต้องการให้เตือน
      </div>
    </Field>

    {/* เตือนของใกล้หมดอายุ */}
    <Field label="เตือนของใกล้หมดอายุ (วัน)">
      <div className="inline-flex items-stretch rounded-md border border-gray-300 shadow-sm overflow-hidden bg-white">
        <button
          type="button"
          className="px-3 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          onClick={() =>
            handleChange(
              "expiryAlertDays",
              Math.max(0, (form.expiryAlertDays || 0) - 1)
            )
          }
          aria-label="ลดวันเตือนหมดอายุ"
        >
          –
        </button>
        <input
          type="number"
          min={0}
          className="w-20 px-3 py-2 text-center outline-none"
          value={form.expiryAlertDays}
          onChange={(e) =>
            handleChange("expiryAlertDays", Math.max(0, +e.target.value || 0))
          }
        />
        <button
          type="button"
          className="px-3 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          onClick={() =>
            handleChange("expiryAlertDays", (form.expiryAlertDays || 0) + 1)
          }
          aria-label="เพิ่มวันเตือนหมดอายุ"
        >
          +
        </button>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        เช่น กำหนด 7 วัน = เตือนสินค้าที่ใกล้หมดอายุภายใน 7 วัน
      </div>
    </Field>
  </FieldRow>
</Card>

  );
}


function Payments({ form, update }) {
  return (
    <Card title="ช่องทางชำระเงิน">
      <Toggle
        label="เงินสด"
        checked={form.payCash}
        onChange={(v) => update({ payCash: v })}
      />
      <Toggle
        label="PromptPay (สแกน QR)"
        checked={form.payPromptPay}
        onChange={(v) => update({ payPromptPay: v })}
      />
    </Card>
  );
}

function Receipt({ form, update }) {
  // ------- ตัวอย่างรายการ -------
  const items = [{ name: "Potato", qty: 5, unitPrice: 8 }]; // 5 * 8 = 40
  const sub = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const vatRate = Number(form.vatRate || 0);
  const vat = form.vatIncluded
    ? Math.round((sub * vatRate) / (100 + vatRate) * 100) / 100
    : Math.round((sub * vatRate) / 100 * 100) / 100;
  const grand = form.vatIncluded ? sub : sub + vat;

  // เวลาแสดงในไทย
  const timeStr = new Date().toLocaleString("th-TH", {
    hour12: false,
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card title="ตั้งค่าใบเสร็จ">
  {/* แถวบน: จำนวนสำเนา + รวม VAT */}
  <FieldRow>
    <Field label="จำนวนสำเนาที่พิมพ์">
      <div className="inline-flex items-stretch rounded-md border border-gray-300 shadow-sm overflow-hidden bg-white">
        <button
          type="button"
          className="px-3 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          onClick={() => update({ printCopies: Math.max(0, (form.printCopies || 0) - 1) })}
          aria-label="ลดจำนวนสำเนา"
        >
          –
        </button>
        <input
          type="number"
          min={0}
          max={3}
          inputMode="numeric"
          className="w-20 px-3 py-2 text-center outline-none"
          value={form.printCopies}
          onChange={(e) => {
            const v = Math.max(0, Math.min(3, Number(e.target.value) || 0));
            update({ printCopies: v });
          }}
        />
        <button
          type="button"
          className="px-3 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          onClick={() => update({ printCopies: Math.min(3, (form.printCopies || 0) + 1) })}
          aria-label="เพิ่มจำนวนสำเนา"
        >
          +
        </button>
      </div>
      <div className="mt-1 text-xs text-slate-500">กำหนดได้ 0–3 สำเนา</div>
    </Field>

    <Field label="ราคารวม VAT แล้ว">
      <label className="inline-flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 shadow-sm bg-white cursor-pointer select-none">
        <Checkbox
          checked={form.vatIncluded}
          onChange={(v) => update({ vatIncluded: v })}
        />
        <span className="text-slate-700">คิด VAT รวมในราคา</span>
      </label>
    </Field>
  </FieldRow>

  {/* อัตรา VAT */}
  <Field label="อัตรา VAT (%)">
    <div className="relative inline-flex items-center">
      <input
        type="number"
        min={0}
        max={20}
        step={0.01}
        className="w-32 rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
        value={form.vatRate}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          const v = Number.isFinite(raw) ? Math.max(0, Math.min(20, raw)) : 0;
          update({ vatRate: v });
        }}
        placeholder="7.00"
      />
      <span className="pointer-events-none absolute right-2 text-slate-500">%</span>
    </div>
    <div className="mt-1 text-xs text-slate-500">รองรับทศนิยม เช่น 7 หรือ 7.00</div>
  </Field>

  {/* ข้อความท้ายใบเสร็จ */}
  <Field label="ข้อความท้ายใบเสร็จ">
    <input
      className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
      value={form.receiptFooter}
      onChange={(e) => update({ receiptFooter: e.target.value })}
      placeholder="** ขอบคุณที่ใช้บริการ **"
    />
  </Field>
</Card>


      {/* ========= ตัวอย่างใบเสร็จ ========= */}
      <Card title="ตัวอย่างใบเสร็จ">
        {/* พื้นหลังโทนครีมอ่อน */}
        <div className="rounded-lg">
          {/* กล่องใบเสร็จสีขาวขอบเทา */}
          <div className="mx-auto w-full max-w-[560px] rounded-md border border-slate-300 bg-white p-4 text-sm font-sans shadow-sm">
            {/* หัวบิล */}
            <div className="text-center">
              <div className="font-semibold"> {form.storeName} </div>
              <div className="text-[12px] text-slate-700">
                POS#{form.posNo || "SL00028"}
              </div>
            </div>

            {/* เส้นคั่น */}
            <div className="my-3 border-t border-dashed border-slate-300" />

            {/* รายการ */}
            <div className="space-y-1">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {it.name} x{it.qty}
                  </span>
                  <span className="font-medium">
                    {THB(it.qty * it.unitPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* เส้นคั่น */}
            <div className="my-3 border-t border-dashed border-slate-300" />

            {/* สรุป */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>ยอดรวม</span>
                <span>{THB(sub)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT {vatRate}%</span>
                <span>{form.vatIncluded ? THB(0) : THB(vat)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>ยอดสุทธิ</span>
                <span>{THB(grand)}</span>
              </div>
              <div className="flex justify-between">
                <span>ชำระโดย</span>
                <span>{form.paymentMethodPreview || "เงินสด"}</span>
              </div>
            </div>

            {/* เส้นคั่น */}
            <div className="my-3 border-t border-dashed border-slate-300" />

            {/* ฟุตเตอร์ */}
            <div className="text-center text-[12px] text-slate-700 leading-5">
              <div>
                #{form.posNo || "SL00028"} {timeStr}
              </div>
              <div>พนักงาน: {form.cashierName || "-"}</div>
              <div className="mt-1">{form.receiptFooter}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}



