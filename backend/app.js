import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";

// ===== Routes =====
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
import {
  requireLogin,
  requireAdmin,
  requireRole,
} from "./middlewares/authMiddleware.js";

const app = express();

/** ---------- CORS ---------- */
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// ⬇️ === โค้ดใหม่สำหรับ DEBUG (Debug Code) === ⬇️
// เราจะใช้ฟังก์ชันนี้แทน app.use(cors(...)) แบบเดิม
const whitelist = [FRONTEND_ORIGIN]; // ใช้ตัวแปรจากข้างบน
const corsOptions = {
  credentials: true, // ⭐️ ต้องเปิด
  origin: function (origin, callback) {
    // พิมพ์ Log บอกเราว่า Origin ที่เข้ามาคืออะไร
    console.log(`[CORS DEBUG] Request Origin: ${origin}`);

    if (whitelist.indexOf(origin) !== -1 || !origin) {
      // ถ้า Origin อยู่ใน whitelist (หรือเป็น "undefined" เช่นตอนเทส)
      console.log("[CORS DEBUG] Access Granted.");
      callback(null, true);
    } else {
      // ถ้า Origin ไม่อยู่ใน whitelist (เช่น พิมพ์ผิด, มีช่องว่าง)
      console.log("[CORS DEBUG] Access Denied.");
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));
// ⬆️ =================================== ⬆️

/** ---------- Common middlewares ---------- */
app.use(express.json({ limit: "5mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());

/** ---------- Session ---------- */
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-super-secret";

// ใช้ Postgres เป็น session store (ถ้ามี DATABASE_URL)
const PgSession = connectPgSimple(session);
// ⭐️ การแก้ไข: เราต้องตรวจสอบ DATABASE_URL หรือ PGHOST
// เพื่อดูว่าควรใช้ PgSession หรือไม่
const usePgStore =
  !!process.env.DATABASE_URL || !!process.env.PGHOST;

const sessionOptions = {
  name: "sid", // ชื่อคุกกี้ของ session
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // prod ใช้ https ค่อยเปิด
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
    path: "/", // ให้ติดทุกเส้นทาง
  },
};

if (usePgStore) {
  console.log("Using PostgreSQL for session storage."); // เพิ่ม Log
  const connectionConfig = process.env.DATABASE_URL
    ? { conString: process.env.DATABASE_URL }
    : {
        // ใช้ตัวแปรแยกส่วน ถ้า DATABASE_URL ไม่มี
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      };

  sessionOptions.store = new PgSession({
    ...connectionConfig,
    tableName: "session",
    createTableIfMissing: true,
  });
} else {
  // นี่คือคำเตือนที่คุณเห็นใน Log สีเหลือง
  console.warn(
    "Warning: Using MemoryStore for session. Not for production."
  );
}

// ถ้าอยู่หลัง proxy/https (เช่น nginx) ควรเชื่อใจ proxy 1 ชั้น
app.set("trust proxy", 1);

app.use(session(sessionOptions));

/** ---------- Static & health ---------- */

// Route สำหรับ Health Check ของ Render
app.get("/", (_req, res) => {
  res.status(200).send("OK: Management Market API is alive!");
});

// 🚨 คำเตือนเกี่ยวกับไฟล์อัปโหลด
// app.use("/uploads", express.static("uploads")); // ไม่ทำงานบน Render

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/** ---------- Public routes (ไม่ต้องล็อกอิน) ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/settings", settingsPublic);
app.use("/api/dashboard", dashboardRoutes);

/** ---------- Protected routes (ต้องล็อกอิน) ---------- */
const authed = express.Router();
authed.use(requireLogin);

authed.use("/users", usersRoutes);
authed.use("/products", productRoutes);
authed.use("/categories", categoryRoutes);
authed.use("/sales", saleRoutes);
autShed.use("/stocks", requireRole("ADMIN", "USER"), stockRoutes);
authed.use("/expenses", expenseRoutes);
authed.use("/uploads", uploadRoutes);
authed.use("/settings", settingsProtected);
authed.use("/backup", backupRoutes);
authed.use("/inventory", inventoryExtraRoutes);

// mount under /api
app.use("/api", authed);

/** ---------- 404 handler (หลังจาก mount routes) ---------- */
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  return next();
});

/** ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error(err); // พิมพ์ Error จริงๆ ออกมาใน Log ของ Render
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

export default app;

