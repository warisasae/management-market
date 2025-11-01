// src/pages/ProductForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Trash2, AlertTriangle } from "lucide-react";

const UNITS = [
    "ชิ้น", "ขวด", "ซอง", "ถุง", "กล่อง", "แพ็ค", "ลัง", "โหล",
    "แผง", "ห่อ", "มัด", "ฟอง", "กิโลกรัม", "กรัม", "ขีด", "ถัง","กระป๋อง","ก้อน", "หลอด","กระปุก"
];

/** แปลง ISO / Date string -> ค่าที่ <input type="date"> ต้องการ (YYYY-MM-DD) */
function isoToInputDate(value) {
    if (!value) return "";
    // ถ้าได้มาเป็น "YYYY-MM-DD" อยู่แล้ว ให้คืนทันที
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const d = new Date(value);
    if (isNaN(d.getTime())) return "";

    // ใช้ UTC ป้องกันเหลื่อมวัน
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** แปลงค่าจาก <input type="date"> (YYYY-MM-DD) -> ISO string ที่ไม่เหลื่อมวันง่าย */
function inputDateToISO(dateStr) {
    if (!dateStr) return null;
    // ใช้เวลาเที่ยงวัน UTC ลดโอกาสเหลื่อมวันเมื่อตีความ timezone
    return new Date(`${dateStr}T12:00:00Z`).toISOString();
}

export default function ProductForm() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const editId = params.get("edit");

    const [form, setForm] = useState({
        product_name: "",
        barcode: "",
        category_id: "",
        stock_qty: "",
        unit: "",
        cost_price: "",
        sell_price: "",
        status: "AVAILABLE",
        note: "",
        expiry_date: "", // เก็บเป็น YYYY-MM-DD สำหรับ input
    });

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showOK, setShowOK] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const onChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

    // โหลดหมวดหมู่ + โหลดข้อมูลสินค้าเมื่อแก้ไข
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);

                const catRes = await api.get("/categories");
                setCategories(catRes.data || []);

                if (editId) {
                    const p = (await api.get(`/products/${editId}`)).data;
                    setForm({
                        product_name: p.product_name || "",
                        barcode: p.barcode || "",
                        category_id: p.category_id || "",
                        stock_qty: String(p.stock_qty ?? ""),
                        unit: p.unit || "",
                        cost_price: String(p.cost_price ?? ""),
                        sell_price: String(p.sell_price ?? ""),
                        status: p.status || "AVAILABLE",
                        note: "",
                        // ✅ สำคัญ: ใส่ค่า expiry_date กลับเข้า form
                        expiry_date: isoToInputDate(p.expiry_date),
                    });
                } else {
                    setForm((s) => ({ ...s, status: "AVAILABLE" }));
                }
            } catch (err) {
                console.error(err);
                setError("โหลดข้อมูลไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        })();
    }, [editId]);

    // ตรวจความถูกต้องฟอร์มขั้นต่ำ
    const isValid = useMemo(() => {
        const priceOk =
            form.sell_price !== "" && !Number.isNaN(Number(form.sell_price));
        return (
            form.product_name.trim() &&
            form.category_id &&
            form.unit &&
            priceOk
        );
    }, [form]);

    // บันทึก (สร้าง/แก้ไข)
    const save = async () => {
        try {
            setSaving(true);
            setError("");

            // ⭐️ แก้ไข: ใช้ Destructuring เพื่อแยก 'note' ออกไป 
            const { note, expiry_date, ...restForm } = form;

            const payload = {
                product_name: restForm.product_name.trim(),
                category_id: restForm.category_id || null,
                barcode: restForm.barcode.trim() || null,
                // แปลงค่าตัวเลขให้เป็น Number และใช้ค่า 0 เป็น Default
                cost_price: Number(restForm.cost_price || 0),
                sell_price: Number(restForm.sell_price || 0),
                stock_qty: Number(restForm.stock_qty || 0),
                // ฟิลด์อื่น ๆ
                unit: restForm.unit || null,
                status: restForm.status || "AVAILABLE",
                // แปลงวันหมดอายุให้ปลอดภัย
                expiry_date: inputDateToISO(expiry_date), 
            };
            
            // ตรวจสอบความถูกต้องของราคาขาย (อีกครั้ง)
            if (Number.isNaN(payload.sell_price)) {
                setError("ราคาขายไม่ถูกต้อง");
                return;
            }

            if (editId) {
                await api.put(`/products/${editId}`, payload);
            } else {
                // โหมดสร้างใหม่: Backend จะสร้าง product_id
                await api.post("/products", payload);
            }

            // แจ้งเตือนสำเร็จ
            setShowOK(true);
            setTimeout(() => {
                navigate(`/dashboard/products?refresh=${Date.now()}`);
            }, 600);
        } catch (err) {
            console.error("Save Error:", err);
            setError(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "บันทึกไม่สำเร็จ (Internal Server Error / Backend Error)"
            );
        } finally {
            setSaving(false);
        }
    };

    // ลบสินค้า (เฉพาะโหมดแก้ไข)
    const confirmDelete = async () => {
        if (!editId) return;
        try {
            await api.delete(`/products/${editId}`);
            setShowDelete(false);
            // กลับไปหน้ารายการ พร้อมสั่งให้รีเฟรช
            navigate(`/dashboard/products?refresh=${Date.now()}`);
        } catch (err) {
            console.error(err);
            alert("ลบไม่สำเร็จ");
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white hover:bg-green-700"
                        title="กลับ"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                            <path d="M15 18l-6-6 6-6v12Z" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-extrabold">
                        {editId ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}
                    </h1>

                    {/* ปุ่มลบเฉพาะโหมดแก้ไข */}
                    {editId && (
                        <button
                            onClick={() => setShowDelete(true)}
                            className="ml-auto flex items-center gap-1 px-3 h-10 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        >
                            <Trash2 size={18} />
                            ลบสินค้า
                        </button>
                    )}
                </div>

                <div className="bg-white/95 rounded-2xl border border-black/10 p-6">
                    {loading ? (
                        <div className="text-center text-gray-500 py-10">กำลังโหลด...</div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="font-semibold">ชื่อสินค้า</label>
                                    <input
                                        value={form.product_name}
                                        onChange={(e) => onChange("product_name", e.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border px-3"
                                        placeholder="เช่น น้ำดื่ม 600 ml"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold">รหัสบาร์โค้ด</label>
                                    <input
                                        value={form.barcode}
                                        onChange={(e) => onChange("barcode", e.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border px-3"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold">หมวดหมู่</label>
                                    <select
                                        value={form.category_id}
                                        onChange={(e) => onChange("category_id", e.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border px-3"
                                    >
                                        <option value="">— เลือก —</option>
                                        {categories.map((c) => (
                                            <option key={c.category_id} value={c.category_id}>
                                                {c.category_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold">จำนวนเริ่มต้น</label>
                                        <input
                                            type="number"
                                            value={form.stock_qty}
                                            onChange={(e) => onChange("stock_qty", e.target.value)}
                                            className="mt-2 h-11 w-full rounded-lg border px-3"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold">หน่วย</label>
                                        <select
                                            value={form.unit}
                                            onChange={(e) => onChange("unit", e.target.value)}
                                            className="mt-2 h-11 w-full rounded-lg border px-3"
                                        >
                                            <option value="">— เลือก —</option>
                                            {UNITS.map((u) => (
                                                <option key={u} value={u}>
                                                    {u}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-semibold">ราคาต้นทุน</label>
                                    <input
                                        type="number"
                                        value={form.cost_price}
                                        onChange={(e) => onChange("cost_price", e.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border px-3"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold">ราคาขาย</label>
                                    <input
                                        type="number"
                                        value={form.sell_price}
                                        onChange={(e) => onChange("sell_price", e.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border px-3"
                                    />
                                </div>

                                <div>
                                    <label className="font-semibold">วันหมดอายุ</label>
                                    <input
                                        type="date"
                                        value={form.expiry_date}
                                        onChange={(e) => onChange("expiry_date", e.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border px-3"
                                    />
                                </div>

                                {/* สถานะสินค้า — โหมดเพิ่มจะไม่เห็น "เลิกขาย" */}
                                <div>
                                    <label className="font-semibold">สถานะสินค้า</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => onChange("status", e.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border px-3"
                                    >
                                        <option value="AVAILABLE">มีจำหน่าย</option>
                                        <option value="OUT_OF_STOCK">สินค้าหมด</option>
                                        {editId && <option value="UNAVAILABLE">เลิกขาย</option>}
                                    </select>
                                </div>

                                {/* หมายเหตุ (client-only) */}
                                <div className="md:col-span-2">
                                    <label className="font-semibold">คำอธิบาย</label>
                                    <textarea
                                        rows={6}
                                        value={form.note}
                                        onChange={(e) => onChange("note", e.target.value)}
                                        className="mt-2 w-full rounded-lg border px-3 py-2 resize-y"
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            {/* ปุ่ม */}
                            <div className="mt-6 flex items-center justify-center gap-4">
                                <button
                                    onClick={save}
                                    disabled={!isValid || saving}
                                    className={`min-w-32 h-11 rounded-md text-white font-semibold ${
                                        !isValid || saving
                                            ? "bg-green-300 cursor-not-allowed"
                                            : "bg-green-600 hover:bg-green-700"
                                    }`}
                                >
                                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                                </button>
                                <button
                                    onClick={() => navigate("/dashboard/products")}
                                    className="min-w-32 h-11 rounded-md bg-gray-400 text-white font-semibold hover:bg-gray-500"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal: สำเร็จ */}
            {showOK && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
                    <div className="w-[min(480px,92vw)] bg-white rounded-2xl shadow-xl p-6 text-center">
                        <h3 className="text-xl font-extrabold mb-2">ผลการบันทึกข้อมูล</h3>
                        <div className="mx-auto my-3 w-10 h-10 rounded-full bg-green-100 grid place-items-center">
                            <div className="w-5 h-5 rounded-full bg-green-500" />
                        </div>
                        <p className="text-gray-700">
                            บันทึกข้อมูล{editId ? "แก้ไข" : "เพิ่มสินค้า"}สำเร็จ
                        </p>
                    </div>
                </div>
            )}

            {/* Modal: ยืนยันลบ */}
            {showDelete && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
                    <div className="w-[min(520px,92vw)] bg-white rounded-2xl shadow-xl p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-red-100 text-red-600">
                                <AlertTriangle size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-extrabold">ลบสินค้า?</h3>
                                <p className="text-gray-700 mt-1">
                                    การลบสินค้าไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่ว่าจะลบสินค้านี้
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowDelete(false)}
                                className="h-10 px-4 rounded-lg bg-gray-200 hover:bg-gray-300"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="h-10 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                                ลบสินค้า
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}