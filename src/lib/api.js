import axios from "axios";

const RAW = (import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/+$/, "");
const baseURL = RAW ? (RAW.endsWith("/api") ? RAW : `${RAW}/api`) : "http://localhost:4000/api";

export const api = axios.create({
  baseURL,
  withCredentials: true, // ให้คุกกี้ติดไป/กลับ
});

const LOGIN_PATH = import.meta.env.VITE_LOGIN_PATH || "/login";
const AUTO_REDIRECT = (import.meta.env.VITE_AUTO_LOGIN_REDIRECT ?? "true") !== "false";

// ✅ helper ใช้กับคำขอที่ “ไม่ให้รีไดเร็กต์อัตโนมัติ”
export const noRedirect = {
  headers: { "X-Skip-Redirect": "1" },
  validateStatus: (s) => s >= 200 && s < 500,
};

// --- ✅ REQUEST INTERCEPTOR: ใส่ Bearer token จากคุกกี้กลับมา ---
api.interceptors.request.use((cfg) => {
  // อ่าน token จากคุกกี้ชื่อ authToken
  const token = document.cookie.match(/(?:^|;\s*)authToken=([^;]+)/)?.[1];
  if (token && !cfg.headers?.Authorization) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${decodeURIComponent(token)}`;
  }
  return cfg;
});

// --- RESPONSE INTERCEPTOR: เด้งเฉพาะเมื่อไม่ได้ขอให้ข้าม ---
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const cfg = err?.config || {};
    const skip =
      cfg.headers?.["X-Skip-Redirect"] === "1" ||
      cfg.headers?.["x-skip-redirect"] === "1";

    if (AUTO_REDIRECT && !skip && (status === 401 || status === 403)) {
      try {
        // ⭐️ การแก้ไข: ล้างคีย์ Auth หลักทั้งหมด (mm_auth, user, isLoggedIn)
        // เพื่อให้แน่ใจว่าสถานะ Auth ถูกล้างอย่างสมบูรณ์ก่อน Redirect
        localStorage.removeItem("mm_auth"); // คีย์หลัก
        localStorage.removeItem("user"); // คีย์ Legacy
        localStorage.removeItem("isLoggedIn"); // Flag
        sessionStorage.clear();
      } catch {}
      const onLogin = window.location.pathname.startsWith(LOGIN_PATH);
      if (!onLogin) {
        const back = encodeURIComponent(window.location.href);
        window.location.replace(`${LOGIN_PATH}?next=${back}`);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
