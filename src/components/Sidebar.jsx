// src/components/Sidebar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

// helper ใช้ร่วมกัน
function resolveUrl(u) {
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
  if (!u) return "";
  return u.startsWith("http") ? u : `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}


const RAW_MENU = [
  { label: "แดชบอร์ด", path: "/dashboard" },
  { label: "ระบบหน้าร้าน (POS)", path: "/dashboard/pos" },
  { label: "จัดการสต็อกสินค้า", path: "/dashboard/stocks" },
  { label: "จัดหมวดหมู่สินค้า", path: "/dashboard/categories" },
  { label: "ประวัติการขาย", path: "/dashboard/saleshistory" },
  { label: "การจัดการสินค้า", path: "/dashboard/products" },
  { label: "รายงานระบบขายหน้าร้าน", path: "/dashboard/reports" },
  { label: "จัดการผู้ใช้", path: "/dashboard/users", adminOnly: true },
  { label: "ตั้งค่าระบบ", path: "/dashboard/settings", adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const auth = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("mm_auth") || "null"); }
    catch { return null; }
  }, []);
  const me = auth?.user || auth || null;
  const role = me?.role || "";
  const name = me?.name || me?.username || "ผู้ใช้งาน";
  const rawImage = me?.image_url || null;
  const isAdmin = String(role).toUpperCase() === "ADMIN";

  const imageUrl = resolveUrl(rawImage);

  const menu = useMemo(
    () => RAW_MENU.filter(item => isAdmin || !item.adminOnly),
    [isAdmin]
  );

  const isActivePath = (itemPath) => {
    if (itemPath === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(itemPath);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("mm_auth");
    navigate("/", { replace: true });
  };

  return (
    <aside className="w-64 h-screen sticky top-0 overflow-y-auto bg-[#FF6969] text-white p-5 shadow-xl flex flex-col">
      <div className="mb-4 px-2">
        <div className="text-xl font-extrabold tracking-wide">ระฆังทอง</div>
        <div className="text-white/80 text-xs">GROCERY STORE</div>
      </div>

      <nav className="space-y-1">
        {menu.map((item) => {
          const active = isActivePath(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative block px-4 py-2 rounded-xl transition
                ${active ? "bg-white/25 font-semibold shadow-inner" : "hover:bg-white/15 hover:translate-x-0.5"}
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 bg-white rounded-r-full" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/20">
        <div className="flex items-center gap-3 mb-3 px-1">
          {imageUrl ? (
            <img
              src={
                imageUrl
                  ? (imageUrl.startsWith("http") ? imageUrl : `${API_BASE}${imageUrl}`)
                  : DEFAULT_AVATAR_SRC
              }
              alt={name}
              className="w-9 h-9 rounded-full object-cover border border-white/30"
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR_SRC; }}
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
                {role || "ผู้ใช้งาน"}
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
