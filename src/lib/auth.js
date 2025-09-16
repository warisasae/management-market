// src/lib/auth.js
export const AUTH_KEY = "mm_auth";

export function roleFromBackend(en) {
  const k = String(en || "").toUpperCase();
  if (k === "ADMIN") return "แอดมิน";
  return "พนักงานขาย"; // USER/SALE → พนักงานขาย
}

export function roleToBackend(th) {
  if (String(th) === "แอดมิน") return "ADMIN";
  return "USER";
}

export function setAuth({ token, user }) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
  localStorage.setItem("isLoggedIn", "true");
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem("isLoggedIn");
}

export function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true" && !!getAuth()?.token;
}

export function isAdmin() {
  const a = getAuth();
  return a?.user?.role === "ADMIN";    // ✅
}

export function getToken() {
  return getAuth()?.token || "";
}
