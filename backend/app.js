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
const PgSession = connectPgSimple(session);

// ⬇️ === FIX: เปลี่ยนไปเช็กตัวแปรใหม่ === ⬇️
const usePgStore = !!process.env.SESSION_DATABASE_URL;

const sessionOptions = {
  name: "sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  },
};

if (usePgStore) {
  console.log("Using PostgreSQL for session storage.");
  // ⬇️ === FIX: เปลี่ยนไปใช้ตัวแปรใหม่ === ⬇️
  sessionOptions.store = new PgSession({
    conString: process.env.SESSION_DATABASE_URL, // 👈 ใช้ตัวแปรใหม่
    tableName: "session",
    createTableIfMissing: true,
  });
} else {
  console.warn(
    "Warning: Using MemoryStore for session. Not for production."
  );
}

app.set("trust proxy", 1);
app.use(session(sessionOptions));

/** ---------- Static & health ---------- */

app.get("/", (_req, res) => {
  res.status(200).send("OK: Management Market API is alive!");
});

// app.use("/uploads", express.static("uploads"));
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
authed.use("/stocks", requireRole("ADMIN", "USER"), stockRoutes);
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
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal error" });
});

export default app;