// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setAuth } from "../lib/auth"; // ตรวจสอบว่าใช้งาน setAuth อย่างถูกต้อง

export default function Login() {
  const [identifier, setIdentifier] = useState(""); // username
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
  e.preventDefault();
  const username = identifier.trim();
  const pw = password.trim();
  if (!username || !pw || loading) return;

  setLoading(true);
  try {
    const res = await api.post(
      "/auth/login",
      { username, password: pw },
      { validateStatus: (s) => s >= 200 && s < 500 }
    );

    if (res.status === 200 && res.data?.user) {
      let user = res.data.user; // { user_id, username, name, role, image_url? }

      // ❌ ไม่ต้องยุ่งกับ token (เราใช้ session cookie แล้ว)
      // ลบโค้ดเกี่ยวกับ token ทั้งหมด

      // (ออปชัน) เติม image_url ถ้ายังไม่มี (endpoint นี้ต้องอนุญาตด้วย session)
      try {
        if ((!user.image_url || user.image_url === "") && user.user_id) {
          const uRes = await api.get(`/users/${encodeURIComponent(user.user_id)}`, {
            validateStatus: (s) => s >= 200 && s < 500,
          });
          if (uRes.status === 200 && uRes.data) {
            user = { ...user, image_url: uRes.data.image_url || null };
          }
        }
      } catch {
        // เงียบไว้ ใช้ข้อมูลเท่าที่มี
      }

      // ✅ เก็บสถานะฝั่ง client (สำหรับ UI state เท่านั้น)
      setAuth({ user });
      localStorage.setItem("isLoggedIn", "true");

      // ✅ นำทางตาม role
      const roleUpper = String(user.role || "").toUpperCase(); // ADMIN | USER
      const target = roleUpper === "ADMIN" ? "/dashboard" : "/dashboard/pos";
      navigate(target, { replace: true });
      return;
    }

    if (res.status === 401) {
      alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    alert(res.data?.error || "เข้าสู่ระบบไม่สำเร็จ");
  } catch {
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT: form */}
      <div className="bg-[#FFF3E3] flex items-center justify-center px-6 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-lg">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0b1b3b] mb-8">
            ลงชื่อเข้าใช้ระบบ
          </h1>

          {/* Username */}
          <div className="relative mb-5">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0b1b3b]/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21a8 8 0 0 0-16 0"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username"
              className="w-full pl-12 pr-4 py-4 rounded-full border border-[#0b1b3b]/15 bg-white/90 text-[#0b1b3b] placeholder-[#0b1b3b]/60 focus:outline-none focus:ring-2 focus:ring-[#0b1b3b]"
              required
            />
          </div>

          {/* Password */}
          <div className="relative mb-8">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0b1b3b]/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-12 pr-4 py-4 rounded-full border border-[#0b1b3b]/15 bg-white/90 text-[#0b1b3b] placeholder-[#0b1b3b]/60 focus:outline-none focus:ring-2 focus:ring-[#0b1b3b]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-full text-white text-xl font-semibold transition ${loading ? "bg-gray-400" : "bg-[#0b1b3b] hover:brightness-110"}`}
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "ลงชื่อเข้าใช้"}
          </button>
        </form>
      </div>

      {/* RIGHT: branding */}
      <div className="bg-[#F56E74] flex items-center justify-center px-6 py-10">
        <div className="text-center">
          <img src="/path/to/logo.png" alt="Logo" className="mx-auto w-72 mb-6" />
          <div className="font-extrabold tracking-wider text-[56px] md:text-[72px] text-[#D9C44A] mb-4">
            ระฆังทอง
          </div>
        </div>
      </div>
    </div>
  );
}
