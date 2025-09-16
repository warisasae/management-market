// src/pages/CategoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api"; // baseURL = "/api" (ผ่าน Vite proxy)

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");

  // modal (add/edit)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add"); // "add" | "edit"
  const [form, setForm] = useState({ id: "", name: "", total: "" });
  const [error, setError] = useState({ name: "", total: "" });

  // confirm delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const [loading, setLoading] = useState(false);

  // ---------- Load ----------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // ❗️ลบ /api ออก ใช้ path ต่อท้าย baseURL เท่านั้น
        const res = await api.get("/categories");
        const rows = (res.data || []).map((c) => ({
          id: c.category_id,
          name: c.category_name,
          total: c._count?.products ?? 0,
        }));
        setCategories(rows);
      } catch (err) {
        console.error("โหลดหมวดหมู่ล้มเหลว", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return categories;
    return categories.filter(
      (c) => c.id.toLowerCase().includes(kw) || c.name.toLowerCase().includes(kw)
    );
  }, [q, categories]);

  // ---------- UI helpers ----------
  const openAdd = () => {
    setMode("add");
    setForm({ id: "", name: "", total: "" });
    setError({ name: "", total: "" });
    setOpen(true);
  };

  const openEdit = (cat) => {
    setMode("edit");
    setForm({ id: cat.id, name: cat.name, total: String(cat.total) });
    setError({ name: "", total: "" });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setError({ name: "", total: "" });
  };

  // ---------- Validate ----------
  const validate = () => {
    const err = { name: "", total: "" };
    const name = form.name.trim();

    if (!name) {
      err.name = "กรุณากรอกชื่อหมวดหมู่";
    } else {
      const dup = categories.some(
        (c) =>
          c.name.trim().toLowerCase() === name.toLowerCase() &&
          (mode === "add" || c.id !== form.id)
      );
      if (dup) err.name = "ชื่อหมวดหมู่นี้มีอยู่แล้ว";
    }
    setError(err);
    return !err.name && !err.total;
  };

  // ---------- Save (Create/Update) ----------
  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      if (mode === "add") {
        // backend จะ gen id เอง (CATxxxxx)
        const res = await api.post("/categories", {
          category_name: form.name.trim(),
        });
        const created = {
          id: res.data.category_id,
          name: res.data.category_name,
          total: 0,
        };
        setCategories((s) => [...s, created]);
      } else {
        await api.put(`/categories/${form.id}`, {
          category_name: form.name.trim(),
        });
        setCategories((s) =>
          s.map((x) => (x.id === form.id ? { ...x, name: form.name.trim() } : x))
        );
      }
      closeModal();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || "บันทึกไม่สำเร็จ";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Delete ----------
  const askDelete = (cat) => {
    setToDelete(cat);
    setConfirmOpen(true);
  };
  const cancelDelete = () => {
    setConfirmOpen(false);
    setToDelete(null);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setLoading(true);
      await api.delete(`/categories/${toDelete.id}`); // ❗️ไม่มี /api
      setCategories((s) => s.filter((x) => x.id !== toDelete.id));
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.status === 409
          ? e.response.data?.error || "ลบไม่ได้: หมวดหมู่ถูกใช้งานอยู่"
          : e?.response?.data?.error || "ลบไม่สำเร็จ";
      alert(msg);
    } finally {
      cancelDelete();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-extrabold mb-4">หมวดหมู่สินค้า</h1>

      {/* Search + Add */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <label className="block text-base font-semibold mb-1">ค้นหาหมวดหมู่สินค้า</label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="กรอกชื่อหมวดหมู่หรือรหัส (CATxxxxx)"
              className="flex-1 h-11 px-3 border-2 border-blue-600 rounded-lg outline-none focus:border-blue-800"
            />
            <button
              type="button"
              className="h-11 px-5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              ค้นหา
            </button>
            <button
              onClick={openAdd}
              className="h-11 px-5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
            >
              เพิ่มหมวดหมู่
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="bg-[#C80036] text-white">
              <th className="px-5 py-3 font-semibold text-left">รหัส</th>
              <th className="px-5 py-3 font-semibold text-left">ชื่อหมวดหมู่</th>
              <th className="px-5 py-3 font-semibold text-right pr-8">จำนวนสินค้า</th>
              <th className="px-5 py-3 font-semibold text-right pr-8">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="odd:bg-white even:bg-gray-50 hover:bg-gray-100/70 transition-colors"
              >
                <td className="px-5 py-3 text-gray-800 border-b border-gray-200">{c.id}</td>
                <td className="px-5 py-3 text-gray-900 font-medium border-b border-gray-200">
                  {c.name}
                </td>
                <td className="px-5 py-3 text-gray-900 text-right pr-8 border-b border-gray-200">
                  {c.total}
                </td>
                <td className="px-5 py-3 text-right pr-8 border-b border-gray-200">
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => openEdit(c)}
                      className="text-indigo-600 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => askDelete(c)}
                      className="text-red-600 hover:underline"
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                  {loading ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-black/5">
            <div className="px-5 py-4 border-b">
              <h3 className="text-lg font-bold">
                {mode === "add" ? "เพิ่มหมวดหมู่" : "แก้ไขหมวดหมู่"}
              </h3>
            </div>

            <form onSubmit={save} className="p-5 space-y-4">
              {mode === "edit" && (
                <div>
                  <label className="block text-sm font-semibold mb-1">รหัสหมวดหมู่</label>
                  <input
                    value={form.id}
                    readOnly
                    className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">ชื่อหมวดหมู่</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={`w-full h-11 px-3 rounded-lg border ${
                    error.name ? "border-red-500" : "border-gray-300"
                  } outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {error.name && <p className="text-red-600 text-sm mt-1">{error.name}</p>}
              </div>

              {/* แสดงจำนวนใน modal edit (อ่านอย่างเดียว) */}
              {mode === "edit" && (
                <div>
                  <label className="block text-sm font-semibold mb-1">จำนวนสินค้า</label>
                  <input
                    value={form.total}
                    readOnly
                    className="w-full h-11 px-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-600"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-11 px-5 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-black/5">
            <div className="px-5 py-4 border-b">
              <h3 className="text-lg font-bold">ยืนยันการลบข้อมูลหมวดหมู่</h3>
            </div>
            <div className="p-5 text-sm text-gray-700">
              {toDelete ? (
                <p>
                  ต้องการลบหมวดหมู่ <span className="font-semibold">{toDelete.name}</span> ({toDelete.id}) ใช่หรือไม่?
                </p>
              ) : (
                <p>ต้องการลบรายการนี้ใช่หรือไม่?</p>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="h-11 px-5 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-11 px-5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
