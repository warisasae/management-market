import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import session from "express-session"; // 👈 ยังคงใช้ session
// import connectPgSimple from "connect-pg-simple"; // 🗑️ ลบ import นี้ออก
import cookieParser from "cookie-parser";

// ===== Routes =====
// ... (เหมือนเดิม) ...
import usersRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import inventoryExtraRoutes from "./routes/inventoryRoutes.js";
import settingsProtected, { settingsPublic } from "./routes/settingRoutes.js";

// ===== Auth middleware =====
// ... (เหมือนเดิม) ...
import {
  requireLogin,
  requireAdmin,
  requireRole,
} from "./middlewares/authMiddleware.js";

const app = express();

/** ---------- CORS ---------- */
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

/** ---------- Common middlewares ---------- */
app.use(express.json({ limit: "5mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());

/** ---------- Session ---------- */
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-super-secret";

// 🗑️ ลบโค้ด PgSession ทั้งหมดออก 🗑️
// const PgSession = connectPgSimple(session);
// const usePgStore = !!process.env.DATABASE_URL; // ไม่ต้องเช็กแล้ว

const sessionOptions = {
  name: "sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // สำคัญ: ตั้งเป็น false เมื่อไม่มี store ที่เชื่อถือได้
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
    path: "/",
  },
  // 🗑️ ไม่ต้องกำหนด store แล้ว express-session จะใช้ MemoryStore อัตโนมัติ 🗑️
  // store: undefined
};

// 🗑️ ลบ if (usePgStore) {...} ออก 🗑️

console.warn(
  "Using default MemoryStore for session. Not suitable for production!"
); // เพิ่มคำเตือน

app.set("trust proxy", 1);
app.use(session(sessionOptions)); // ใช้ options เดิม แต่ไม่มี store

/** ---------- Static & health ---------- */
// ... (เหมือนเดิม) ...
app.get("/", (_req, res) => {
  res.status(200).send("OK: Management Market API is alive!");
});
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));


/** ---------- Public routes (ไม่ต้องล็อกอิน) ---------- */
// ... (เหมือนเดิม) ...
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/settings", settingsPublic);
app.use("/api/dashboard", dashboardRoutes);


/** ---------- Protected routes (ต้องล็อกอิน) ---------- */
// ... (เหมือนเดิม) ...
const authed = express.Router();
authed.use(requireLogin); // Middleware นี้จะเช็ก Session ก่อน
authed.use("/users", usersRoutes);
authed.use("/products", productRoutes);
authed.use("/categories", categoryRoutes);
authed.use("/sales", saleRoutes);
authed.use("/stocks", requireRole("ADMIN", "USER"), stockRoutes);
authed.use("/expenses", expenseRoutes);
authed.use("/uploads", uploadRoutes);
authed.use("/settings", settingsProtected);
authed.use("/backup", backupRoutes);
authed.use("/inventory", inventoryExtraRoutes);
app.use("/api", authed);


/** ---------- 404 handler (หลังจาก mount routes) ---------- */
// ... (เหมือนเดิม) ...
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  return next();
});


/** ---------- Error handler ---------- */
// ... (เหมือนเดิม) ...
app.use((err, _req, res, _next) => {
  console.error("Global Error Handler:", err);
  const status = err.status || 500;
  if (!res.headersSent) {
    res.status(status).json({ error: err.message || "Internal Server Error" });
  }
});

export default app;

