import { Link, useLocation, useNavigate } from "react-router-dom";

/** ไอคอนแบบ SVG (ไม่ต้องลงไลบรารีเพิ่ม) */
const Icon = {
  Home: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Pos: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M9 16v4M15 16v4"/>
    </svg>
  ),
  Stock: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/>
    </svg>
  ),
  Tag: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.5 13.5 12 22l-8-8V4h10l8.5 9.5z"/><circle cx="7.5" cy="7.5" r="1.5"/>
    </svg>
  ),
  History: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l4 2"/>
    </svg>
  ),
  Report: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h18v18H3z"/><path d="M7 17V9M12 17V7M17 17v-4"/>
    </svg>
  ),
  Users: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3"/><path d="M15 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM2 21a7 7 0 0 1 14 0M17 21a5 5 0 0 1 5-5"/>
    </svg>
  ),
  Logout: (p) => (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${p.className||""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>
    </svg>
  ),
};

const menu = [
  { label: "แดชบอร์ด", path: "/dashboard", icon: Icon.Home },
  { label: "ระบบหน้าร้าน (POS)", path: "/dashboard/pos", icon: Icon.Pos },
  { label: "จัดการสต็อกสินค้า", path: "/dashboard/stocks", icon: Icon.Stock },
  { label: "จัดหมวดหมู่สินค้า", path: "/dashboard/categories", icon: Icon.Tag },
  { label: "ประวัติการขาย", path: "/dashboard/saleshistory", icon: Icon.History },
  { label: "รายงาน", path: "/dashboard/reports", icon: Icon.Report },
  { label: "บัญชีผู้ใช้", path: "/dashboard/users", icon: Icon.Users },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    // ล้างสถานะ/โทเคนที่เคยเก็บไว้
    localStorage.removeItem("isLoggedIn");
    // ถ้ามี token อื่น ๆ:
    // localStorage.removeItem("accessToken");

    navigate("/"); // กลับไปหน้า Login
  };

  return (
    <aside className="w-64 h-screen sticky top-0 overflow-y-auto bg-[#FF6969] text-white p-5 shadow-xl">
      {/* Nav */}
      <nav className="space-y-1">
        {menu.map((item) => {
          const isActive =
            item.path === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.path);

          const ItemIcon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition
                ${isActive ? "bg-white/25 font-semibold shadow-inner" : "hover:bg-white/15 hover:translate-x-0.5"}
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 bg-white rounded-r-full" />
              )}
              <ItemIcon className="text-white" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="mt-auto pt-6 border-t border-white/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition"
        >
          <Icon.Logout />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}


