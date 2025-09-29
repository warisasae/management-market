import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { AUTH_KEY, getCurrentUser, isAdmin as isAdminRole, clearAuth } from "../lib/auth";

/** -------- helpers -------- */
function resolveUrl(u) {
  const RAW = (import.meta.env.VITE_API_BASE ?? "http://localhost:4000").trim();
  const API_BASE = RAW.replace(/\/+$/, "");
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** -------- minimal icon set (inline SVG, modern-ish) -------- */
const Icon = {
  Dashboard: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h8v8H3v-8Zm10-3h8v11h-8V10Z" />
    </svg>
  ),
  POS: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M4 4h16v6H4V4Zm2 9h12a2 2 0 0 1 2 2v5H4v-5a2 2 0 0 1 2-2Zm1 2v3h3v-3H7Zm5 0v3h5v-3h-5Z" />
    </svg>
  ),
  Stock: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M3 5h4v14H3V5Zm7 4h4v10h-4V9Zm7-7h4v17h-4V2Z" />
    </svg>
  ),
  Category: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M4 4h8v8H4V4Zm0 10h8v6H4v-6Zm10-10h6v6h-6V4Zm0 8h6v8h-6v-8Z" />
    </svg>
  ),
  History: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M11 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2Zm1 4h-2v7h6v-2h-4V6Z" />
    </svg>
  ),
  Product: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M12 2 2 7l10 5 10-5-10-5Zm-8 9v6l10 5V16L4 11Zm18 0-10 5v6l10-5v-6Z" />
    </svg>
  ),
  Report: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M5 3h10l4 4v14H5V3Zm10 1.5V8h3.5L15 4.5ZM8 10h8v2H8v-2Zm0 4h8v2H8v-2Zm0-8h4v2H8V6Z" />
    </svg>
  ),
  Users: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5Z" />
    </svg>
  ),
  Settings: ({ className = "" }) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className}`} fill="currentColor">
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4a7.6 7.6 0 0 0-.1-1l2.1-1.6-2-3.5-2.6 1a8 8 0 0 0-1.7-1l-.4-2.8H9.7l-.4 2.8a8 8 0 0 0-1.7 1l-2.6-1-2 3.5L5 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.6-1a8 8 0 0 0 1.7 1l.4 2.8h4.6l.4-2.8a8 8 0 0 0 1.7-1l2.6 1 2-3.5L20.9 13a7.6 7.6 0 0 0 .1-1Z" />
    </svg>
  ),
};

/** -------- menu config (เพิ่ม icon ให้แต่ละหัวข้อ) -------- */
const RAW_MENU = [
  { label: "แดชบอร์ด", path: "/dashboard", adminOnly: true, icon: "Dashboard" },
  { label: "ระบบหน้าร้าน (POS)", path: "/dashboard/pos", icon: "POS" },
  { label: "จัดการสต็อกสินค้า", path: "/dashboard/stocks", icon: "Stock" },
  { label: "จัดหมวดหมู่สินค้า", path: "/dashboard/categories", adminOnly: true, icon: "Category" },
  { label: "ประวัติการขาย", path: "/dashboard/saleshistory", icon: "History" },
  { label: "การจัดการสินค้า", path: "/dashboard/products", icon: "Product" },
  { label: "รายงานระบบขาย", path: "/dashboard/reports", adminOnly: true, icon: "Report" },
  { label: "จัดการผู้ใช้", path: "/dashboard/users", adminOnly: true, icon: "Users" },
  { label: "ตั้งค่าระบบ", path: "/dashboard/settings", adminOnly: true, icon: "Settings" },
];

export default function Sidebar({ user: userProp }) {
  const location = useLocation();
  const navigate = useNavigate();

  // ⭐️ 1. ใช้ State เพื่อเก็บ user และเพิ่ม State สำหรับ Cache Buster
  const [user, setUser] = useState(() => userProp ?? getCurrentUser());
  const [imgError, setImgError] = useState(false);
  // ⭐️ เพิ่ม State สำหรับ Cache Buster: ใช้ Date.now() เป็นค่าเริ่มต้น
  const [cacheBuster, setCacheBuster] = useState(Date.now()); 

  // ⭐️ 2. อัปเดตเมื่อ Layout ส่ง user ใหม่เข้ามา (ซึ่งเกิดจากการเรียก onUserUpdate)
  useEffect(() => {
    if (userProp) {
      setUser(userProp);
      // เมื่อ user prop เปลี่ยน ให้รีเซ็ต imgError และอัปเดต cache buster
      setImgError(false);
      setCacheBuster(Date.now()); 
    }
  }, [userProp]);

  // 3. sync หลายแท็บ (ใช้ได้ แต่ไม่ค่อยจำเป็นเพราะ layout.jsx ก็จัดการแล้ว)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === AUTH_KEY) {
        setUser(getCurrentUser());
        setImgError(false);
        setCacheBuster(Date.now()); // อัปเดต cache buster ด้วย
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isAdmin = isAdminRole();
  const name = user?.name || user?.username || "ผู้ใช้งาน";
  const rawImage = user?.image_url || "";

  // ⭐️ 4. สร้าง imageUrl พร้อม Cache Buster
  // เราใช้ cacheBuster state เพื่อให้ URL เปลี่ยนทุกครั้งที่ State เปลี่ยน
  const imageUrl = rawImage ? `${resolveUrl(rawImage)}?v=${cacheBuster}` : "";

  // ⭐️ 5. ลบ imgKey ทิ้ง เพราะเราจะใช้ imageUrl เป็น key แทน
  // const imgKey = user?.image_url || 'default-key';

  const menu = useMemo(
    () => RAW_MENU.filter((item) => isAdmin || !item.adminOnly),
    [isAdmin]
  );

  const isActivePath = (itemPath) => {
    if (itemPath === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(itemPath);
  };

  const handleLogout = async () => {
    // ⭐️ ใช้ clearAuth ที่ import เข้ามา
    await clearAuth(); 
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-64 h-screen sticky top-0 overflow-y-auto bg-[#FF6969] text-white p-5 shadow-xl flex flex-col">
      {/* Brand */}
      {/* Menu */}
      <nav className="space-y-1">
        {menu.map((item) => {
          const active = isActivePath(item.path);
          const IconCmp = Icon[item.icon] || (() => null);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 px-4 py-2 rounded-xl transition
                 ${active
                  ? "bg-white/25 font-semibold shadow-inner"
                  : "hover:bg-white/15 hover:translate-x-0.5"
                }`}
            >
              {/* active bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 bg-white rounded-r-full" />
              )}

              {/* icon */}
              <span
                className={`grid place-items-center w-7 h-7 rounded-lg
                  ${active ? "bg-white/30 text-white" : "bg-white/10 text-white/90"}`}
              >
                <IconCmp />
              </span>

              {/* label */}
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / profile & logout */}
      <div className="mt-auto pt-6 border-t border-white/20">
        <div className="flex items-center gap-3 mb-3 px-1">
          {imageUrl ? (
            <img
              // ⭐️ ใช้ imageUrl (ที่มี cache buster) เป็น key เพื่อบังคับให้โหลดใหม่
              key={imageUrl} 
              src={imageUrl}
              alt={name}
              className="w-9 h-9 rounded-full object-cover border border-white/30"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center text-white/90 font-bold">
              {String(name).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="leading-tight font-semibold">{name}</div>
            <div className="text-xs text-white/80">
              <span className={`px-2 py-0.5 rounded-full ${isAdmin ? "bg-white/25" : "bg-white/10"}`}>
                {user?.role || "ผู้ใช้งาน"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full block px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition text-left"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}