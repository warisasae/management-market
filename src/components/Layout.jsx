// src/components/Layout.jsx
import Sidebar from "./Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem("mm_auth") || "null");
  } catch {
    return null;
  }
}

// helper ใช้ร่วมกัน
function resolveUrl(u) {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
  if (!u) return "";
  return u.startsWith("http") ? u : `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

const Layout = () => {
  const [auth, setAuth] = useState(() => readAuth());
  const navigate = useNavigate();

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "mm_auth") {
        setAuth(readAuth());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const me = auth?.user || auth || {};
  const name = me?.name || me?.username || "ผู้ใช้";
  const rawImage = me?.image_url || "";

  const profileImage = resolveUrl(rawImage);

  return (
    <div className="h-screen flex flex-col font-sans">
      {/* Topbar */}
      <header className="bg-[#C80036] shadow p-4 flex items-center justify-between">
        <div className="text-white font-bold text-lg">ร้านระฆังทอง</div>

        <div className="flex items-center space-x-4">
          {/* สถานะ */}
          <p className="text-sm text-green-600 bg-white border border-green-200 rounded-[25px] px-3 py-1">
            🟢 ใช้งาน
          </p>

          {/* ปุ่มตั้งค่า → ไปหน้าแก้ไขโปรไฟล์ */}
          <button
            onClick={() => navigate("/dashboard/profile/edit")}
            className="p-2 rounded-full hover:bg-white/20 transition"
            title="แก้ไขโปรไฟล์ของฉัน"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.39.956 2.5 2.5a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.956 3.39-2.5 2.5a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.39-.956-2.5-2.5a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.89-1.543.956-3.39 2.5-2.5.996.573 2.146.15 2.573-1.066z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* รูปโปรไฟล์ */}
          {profileImage ? (
            <img
              src={profileImage}
              alt={name}
              className="w-10 h-10 rounded-full border border-blue-400 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center text-white font-bold border border-blue-400">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* Sidebar + Main */}
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-[#FFF5E1] p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
