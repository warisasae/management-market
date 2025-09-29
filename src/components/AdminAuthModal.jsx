// src/components/AdminAuthModal.jsx
import { useState } from "react";
import { api } from "../lib/api";

// ต้องสมมติว่ามี Path สำหรับตรวจสอบสิทธิ์แอดมิน
// ใน Backend (เช่น /auth/admin-login)
export default function AdminAuthModal({
  onClose, // ฟังก์ชันสำหรับปิด Modal
  onSuccess, // ฟังก์ชันที่จะทำงานเมื่อยืนยันแอดมินสำเร็จ (ส่งข้อมูลแอดมินที่ login สำเร็จกลับไปได้)
  title = "ยืนยันสิทธิ์แอดมิน",
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
        
        const res = await api.post("/users/login", { 
            username,
            password,
        });

      // 🆕 ปรับ Logic การตรวจสอบ
      const user = res.data?.user;
      const userRole = user?.role?.toUpperCase(); // ทำให้เป็นตัวพิมพ์ใหญ่เพื่อเปรียบเทียบ

      // 💡 ตรวจสอบว่ามี user object และ Role เป็น 'แอดมิน' (ไม่ว่าจะบันทึกเป็นภาษาไทยหรือ ADMIN)
      if (user && (userRole === "แอดมิน".toUpperCase() || userRole === "ADMIN")) {
        onSuccess(user);
        onClose();
      } else if (user) {
        // ล็อกอินสำเร็จ แต่ไม่ใช่ Role แอดมิน
        setError("ผู้ใช้งานนี้ไม่ใช่สิทธิ์แอดมิน");
      } else {
        // ล็อกอินไม่สำเร็จ (ควรจะถูกจับโดย catch block แต่เพิ่มไว้เพื่อความปลอดภัย)
        setError("ไม่พบผู้ใช้งานแอดมิน หรือรหัสผ่านไม่ถูกต้อง");
      }
      
    } catch (err) {
      console.error("Admin Auth Error:", err);
      // 💡 ปรับข้อความ Error เมื่อ Backend ตอบกลับมา 401/403
      setError(err?.response?.data?.error || "Username หรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  // Minimal Modal/Popup Structure (ใช้ Tailwind CSS ตามสไตล์โค้ดเดิม)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()} // ป้องกันคลิกใน Modal แล้ว Modal ปิด
      >
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Username แอดมิน</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">รหัสผ่านแอดมิน</label>
            <input
              type="password"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-slate-900 text-white hover:opacity-90 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "กำลังยืนยัน..." : "ยืนยัน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}