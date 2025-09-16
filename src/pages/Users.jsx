import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const LS_KEY = "mm_users_cache";

const roleLabel = (r) => {
  if (!r) return "-";
  const key = String(r).toUpperCase();
  if (key === "ADMIN") return "แอดมิน";
  if (key === "SALE" || key === "USER") return "พนักงานขาย";
  return r;
};

export default function Users() {
  const navigate = useNavigate();

  // 🔒 ADMIN only
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
      navigate("/", { replace: true });
      return;
    }
    let role = "";
    try {
      const auth = JSON.parse(localStorage.getItem("mm_auth") || "{}");
      role = auth?.user?.role || auth?.role || "";
    } catch {}
    if (String(role).toUpperCase() !== "ADMIN") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/users", { validateStatus: (s) => s >= 200 && s < 500 });
      if (res.status === 200 && Array.isArray(res.data)) {
        const mapped = res.data.map((u) => ({
          id: u.user_id,
          user_id: u.user_id,
          username: u.username,
          name: u.name,
          role: roleLabel(u.role),
          raw_role: u.role,
          image_url: u.image_url || null,
        }));
        setRows(mapped);
        localStorage.setItem(LS_KEY, JSON.stringify(mapped));
      } else {
        const cache = localStorage.getItem(LS_KEY);
        setRows(cache ? JSON.parse(cache) : []);
      }
    } catch {
      const cache = localStorage.getItem(LS_KEY);
      setRows(cache ? JSON.parse(cache) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((u) =>
      [u.name, u.username, u.role].some((v) => String(v || "").toLowerCase().includes(s))
    );
  }, [rows, q]);

  const byId = (id) => rows.find((r) => r.id === id);

  const onDelete = async (id) => {
    try {
      const res = await api.delete(`/users/${encodeURIComponent(id)}`, { validateStatus: (s) => s >= 200 && s < 500 });
      if (res.status >= 200 && res.status < 300) {
        const next = rows.filter((r) => r.id !== id);
        setRows(next);
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        setConfirmId(null);
      } else {
        alert("ลบไม่สำเร็จจากเซิร์ฟเวอร์");
      }
    } catch {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (ยกเลิกการลบ)");
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold">จัดการผู้ใช้งาน</h1>
        </div>

        {/* ค้นหา + เพิ่มผู้ใช้ */}
        <div className="flex items-center gap-3 mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อพนักงาน/ชื่อผู้ใช้/สิทธิ์"
            className="flex-1 h-11 px-4 rounded-lg border border-black/20 bg-white/80 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Link
            to="/dashboard/users/new"
            className="h-11 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center justify-center"
          >
            เพิ่มผู้ใช้งาน
          </Link>
        </div>

        {/* ตาราง */}
        <div className="rounded-2xl overflow-hidden ring-1 ring-black/10 bg-white/90">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#C80036] text-white">
                <th className="px-4 py-3 text-left">ผู้ใช้</th>
                <th className="px-4 py-3 text-left">ชื่อผู้ใช้</th>
                <th className="px-4 py-3 text-left">สิทธิ์การใช้งาน</th>
                <th className="px-4 py-3 text-left">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">กำลังโหลด...</td>
                </tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.username)}&background=EEE&color=555`}
                        alt={u.name || u.username}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                      />
                      <div className="font-medium">{u.name || "-"}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{u.username}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/dashboard/users/${u.id}/edit`)}  
                        className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-500 text-black font-semibold"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => setConfirmId(u.id)}
                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">ไม่พบผู้ใช้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal ยืนยันลบ */}
        {confirmId && (
          <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
            <div className="bg-white rounded-2xl w-[min(520px,92vw)] p-6 shadow-lg">
              <div className="text-center">
                <div className="text-lg font-extrabold">คุณต้องการลบข้อมูลผู้ใช้งาน</div>
                <div className="text-lg font-extrabold mt-1">
                  {byId(confirmId)?.username} ใช่หรือไม่
                </div>
                <div className="mt-5 flex justify-center gap-3">
                  <button onClick={() => onDelete(confirmId)} className="px-6 h-10 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold">ลบ</button>
                  <button onClick={() => setConfirmId(null)} className="px-6 h-10 rounded-lg bg-gray-300 text-black hover:bg-gray-400 font-semibold">ยกเลิก</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
