import Sidebar from "./Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AUTH_KEY, getCurrentUser, setAuth, clearAuth, saveCurrentUser } from "../lib/auth";

const RAW = (import.meta.env.VITE_API_BASE ?? "http://localhost:4000").trim();
const API_BASE = RAW.replace(/\/+$/, "");

function resolveUrl(u) {
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

// ฟังก์ชันสำหรับรวมข้อมูลผู้ใช้และบันทึกใน Local Storage
function mergeSetAuthUser(nextUser) {
  const cur = getCurrentUser() || {};
  const mergedUser = { ...cur, ...(nextUser || {}) }; 
  // ใช้ saveCurrentUser ที่ถูกแก้ไขใน lib/auth.js แล้ว
  saveCurrentUser(mergedUser);
}

export default function Layout() {
  const [user, setUser] = useState(() => getCurrentUser());
  const navigate = useNavigate();
  // ⭐️ เพิ่ม State สำหรับ Cache Buster: ใช้เพื่อเปลี่ยน URL รูปภาพทุกครั้งที่อัปเดต
  const [cacheBuster, setCacheBuster] = useState(Date.now()); 

  // ⭐️ ฟังก์ชันใหม่: ใช้สำหรับอัปเดต State ผู้ใช้ใน Layout และ Sidebar
  const handleUserUpdate = () => {
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
      setCacheBuster(Date.now()); // ⭐️ อัปเดต cache buster เมื่อมีข้อมูลใหม่
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/auth/me", { validateStatus: s => s >= 200 && s < 500 });
        if (!alive) return;

        const me = r.data?.user || null;
        if (!me) {
          clearAuth();
          if (window.location.pathname !== "/login") navigate("/login", { replace: true });
          return;
        }

        // 1. บันทึกข้อมูลผู้ใช้หลักที่ได้จาก /auth/me
        mergeSetAuthUser(me);
        setUser(me);

        // เติม image_url ถ้ายังไม่มี (โค้ดนี้ใช้ได้)
        if (me.user_id && !me.image_url) {
          try {
            const uRes = await api.get(`/users/${encodeURIComponent(me.user_id)}`, {
              validateStatus: s => s >= 200 && s < 500,
            });
            if (!alive) return;
            if (uRes.status === 200 && uRes.data) {
              const withImg = { ...me, image_url: uRes.data.image_url || null };
              mergeSetAuthUser(withImg);
              setUser(withImg);
              setCacheBuster(Date.now()); // อัปเดตเมื่อได้รูปมา
            }
          } catch {}
        }
      } catch {
        clearAuth();
        if (window.location.pathname !== "/login") navigate("/login", { replace: true });
      }
    })();
    return () => { alive = false; };
  }, [navigate]);

  // Sync กับ Local Storage (เมื่อมีแท็บอื่นอัปเดต)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === AUTH_KEY) handleUserUpdate(); // ⭐️ ใช้ handleUserUpdate เพื่ออัปเดต State
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ⭐️ ลบ: โค้ดที่ฟัง window.addEventListener("auth:user-updated") ออก
  // เนื่องจากเราเปลี่ยนไปใช้ Outlet Context และ Local Storage 'storage' event แล้ว

  const name = user?.name || user?.username || "ผู้ใช้";
  const rawImage = user?.image_url || "";
  // ⭐️ แก้ไข: เพิ่ม cache buster (timestamp) เข้าไปใน URL
  const profileImage = rawImage ? `${resolveUrl(rawImage)}?v=${cacheBuster}` : "";

  return (
    <div className="h-screen flex flex-col font-sans">
      <header className="bg-[#C80036] shadow p-4 flex items-center justify-between">
        <div className="mb-4 px-2">
          <div className="text-white font-bold text-lg">ร้านระฆังทอง</div>
          <div className="text-white/80 text-xs">GROCERY STORE</div>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-green-600 bg-white border border-green-200 rounded-[25px] px-3 py-1">
            🟢 ใช้งาน
          </p>
          <button
            onClick={() => navigate("/dashboard/profile/edit")}
            className="p-2 rounded-full hover:bg-white/20 transition"
            title="แก้ไขโปรไฟล์ของฉัน"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.39.956 2.5 2.5a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.956 3.39-2.5 2.5a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.39-.956-2.5-2.5a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.89-1.543.956-3.39 2.5-2.5.996.573 2.146.15 2.573-1.066z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {profileImage ? (
            <img
              // ⭐️ ใช้ profileImage (ที่มี cache buster) เป็น key เพื่อบังคับให้ re-render
              key={profileImage} 
              src={profileImage}
              alt={name}
              className="w-10 h-10 rounded-full border border-blue-400 object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }} // hide the image if it fails to load
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center text-white font-bold border border-blue-400">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* ⭐️ ส่ง user state ไป Sidebar */}
        <Sidebar user={user} /> 
        
        <main className="flex-1 bg-[#FFF5E1] p-8 overflow-y-auto">
          {/* ⭐️ ส่งฟังก์ชันอัปเดตผ่าน Outlet context ให้ UserForm.jsx ใช้ */}
          <Outlet context={{ onUserUpdate: handleUserUpdate }} /> 
        </main>
      </div>
    </div>
  );
}
