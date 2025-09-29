// src/lib/auth.js
import { api } from "./api";

export const AUTH_KEY = "mm_auth";

// คีย์เก่าที่เคยใช้ (เผื่อ migrate)
const LEGACY_USER_KEY = "user";
const LEGACY_USERS_KEY = "mm_users";
const LEGACY_USERS_CACHE_KEY = "mm_users_cache";
const LEGACY_TOKEN_KEY = "token";

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// แปลง user รูปแบบต่าง ๆ ให้เป็นมาตรฐานเดียว
function normalizeUser(u) {
  if (!u) return null;

  // เผื่อเจอเป็น array จาก legacy (เช่น mm_users)
  if (Array.isArray(u)) {
    // เลือกตัวแรกที่มีฟิลด์เพียงพอ
    const first = u.find(Boolean);
    if (!first) return null;
    u = first;
  }

  const user_id =
    u.user_id ?? u.id ?? u.empId ?? u.empCode ?? u.emp_id ?? u.uid ?? null;
  const username = u.username ?? u.empCode ?? u.login ?? u.email ?? "";
  const name = u.name ?? u.empName ?? u.displayName ?? "";
  const roleRaw = u.role ?? u.role_name ?? u.roleCode;
  const role = roleRaw ? String(roleRaw).toUpperCase() : undefined;
  
  // ⭐️ แก้ไข: เพิ่มการดึง image_url
  const image_url = u.image_url ?? u.imageUrl ?? null;

  if (!user_id) return null;
  return { 
    user_id: String(user_id), 
    username, 
    name, 
    role, 
    image_url // ⭐️ เพิ่ม image_url เข้ามาในออบเจกต์ผู้ใช้มาตรฐาน
  };
}

/** role (EN -> TH) */
export function roleFromBackend(en) {
  const k = String(en || "").toUpperCase();
  return k === "ADMIN" ? "แอดมิน" : "พนักงานขาย";
}

/** role (TH -> EN) */
export function roleToBackend(th) {
  return String(th) === "แอดมิน" ? "ADMIN" : "USER";
}

/**
 * อ่านสถานะ auth ปัจจุบันจาก localStorage
 * (ไม่เรียก server ในฟังก์ชันนี้)
 */
export function getAuth() {
  const current = safeParse(localStorage.getItem(AUTH_KEY));
  if (current?.user) return current;

  // ===== migrate จากคีย์เก่า ๆ (ครั้งแรกหลัง refresh) =====
  const legacyUserDirect = safeParse(localStorage.getItem(LEGACY_USER_KEY));
  const legacyUsers = safeParse(localStorage.getItem(LEGACY_USERS_KEY));
  const merged = normalizeUser(legacyUserDirect || legacyUsers);

  if (merged) {
    const payload = { user: merged };
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    // เขียนคีย์เก่าไว้ด้วยเพื่อความเข้ากันได้
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(merged));
    localStorage.setItem("isLoggedIn", "true");
    return payload;
  }

  return null;
}

/** ผู้ใช้ปัจจุบันจาก localStorage เท่านั้น */
export function getCurrentUser() {
  return getAuth()?.user || null;
}

// ⭐️ ฟังก์ชันใหม่: ใช้สำหรับอัปเดตข้อมูลผู้ใช้ (เช่น image_url)
/**
 * บันทึกข้อมูลผู้ใช้ที่อัปเดตลงใน Local Storage โดยอัตโนมัติ
 * (ใช้สำหรับหน้าตั้งค่าอัปเดตโปรไฟล์)
 * @param {object} updatedUser - ข้อมูลผู้ใช้ที่อัปเดตแล้ว (ต้องมี user_id)
 */
export function saveCurrentUser(updatedUser) {
  const normalized = normalizeUser(updatedUser);
  if (!normalized) return; // ไม่บันทึกถ้าไม่มีข้อมูล

  const payload = { user: normalized };
  localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(normalized)); // เขียนคีย์เก่า
  localStorage.setItem("isLoggedIn", "true"); // sync flag
}

/** ตั้งค่าหลังล็อกอิน (Session Cookie โหมด: เก็บเฉพาะ user ฝั่ง client) */
export function setAuth({ user } = {}) {
  const normalized = normalizeUser(user);
  if (normalized) {
    // ⭐️ เรียกใช้ saveCurrentUser สำหรับการบันทึกข้อมูล
    saveCurrentUser(normalized);
  } else {
    // ถ้าไม่มี user คือการพยายามล็อกเอาท์หรือไม่มีข้อมูล
    const payload = { user: null };
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    localStorage.removeItem(LEGACY_USER_KEY);
    localStorage.setItem("isLoggedIn", "false");
  }
}

/** ล้างสถานะการล็อกอิน (client side) */
export function clearAuth() {
  [
    AUTH_KEY,
    LEGACY_USER_KEY,
    LEGACY_USERS_KEY,
    LEGACY_USERS_CACHE_KEY,
    LEGACY_TOKEN_KEY,
    "isLoggedIn",
  ].forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
}

/**
 * ซิงก์สถานะจาก Server:
 * - เคส refresh แล้ว local ยังว่าง แต่คุกกี้ session ยัง valid
 * - ถ้าสำเร็จจะ setAuth({ user }) ให้เอง
 * - ถ้า 401 จะ clearAuth()
 */
export async function ensureAuthFromServer() {
  try {
    // ให้ backend คืน { ok: true, user: {...} } จาก /auth/me
    const res = await api.get("/auth/me", { validateStatus: () => true });
    if (res.status === 200 && res.data?.user) {
      setAuth({ user: res.data.user });
      return res.data.user;
    }
    // ไม่ใช่ 200 = ถือว่าไม่ได้ล็อกอิน
    clearAuth();
    return null;
  } catch {
    clearAuth();
    return null;
  }
}

/** true เมื่อ local ยังเห็นว่ามี user */
export function isLoggedIn() {
  const ok = !!getCurrentUser();
  const saved = localStorage.getItem("isLoggedIn");
  const should = ok ? "true" : "false";
  if (saved !== should) localStorage.setItem("isLoggedIn", should);
  return ok;
}

/** เป็นแอดมินหรือไม่ (รองรับทั้ง ADMIN และ "แอดมิน") */
export function isAdmin() {
  const role = getCurrentUser()?.role;
  if (!role) return false;
  const r = String(role).toUpperCase();
  return r === "ADMIN" || r === "แอดมิน".toUpperCase();
}

/** (คงไว้เพื่อความเข้ากันได้กับโค้ดเดิมที่ import ไป แต่จะคืนค่าว่างเสมอ) */
export function getToken() {
  return "";
}

/**
 * ออกจากระบบให้ถูกต้อง:
 * - ขอให้ server ล้างคุกกี้ session
 * - แล้วค่อย clearAuth() ฝั่ง client
 */
export async function logout() {
  try {
    await api.post("/auth/logout"); // ให้ backend เคลียร์ cookie
  } catch (_) {
    // เงียบไว้ก็ได้
  } finally {
    clearAuth();
  }
}