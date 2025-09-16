// src/lib/api.js
import axios from "axios";
import { getToken, clearAuth } from "./auth";

const rawBase = import.meta.env.VITE_API_BASE || "http://localhost:4000"; // fallback -> 4000
const base = rawBase.replace(/\/+$/, ""); // ตัด / ท้าย

export const api = axios.create({
  baseURL: `${base}/api`, // จะได้ http://localhost:4000/api
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      clearAuth?.();
      window.location.href = "/"; // กลับไปล็อกอิน
    }
    return Promise.reject(err);
  }
);
