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

// ===== Auth middleware (ต้อง Import requireRole เข้ามาด้วย) =====
// ตรวจสอบว่า requireRole ถูก export มาจาก authMiddleware.js แล้ว
import { requireLogin, requireAdmin, requireRole } from "./middlewares/authMiddleware.js"; 

const app = express();

/** ---------- CORS ---------- */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(
	cors({
		origin: FRONTEND_ORIGIN,
		credentials: true, // ⭐️ ต้องเปิด เพื่อให้เบราว์เซอร์ส่ง cookie ข้ามพอร์ต/โดเมน
	})
);

/** ---------- Common middlewares ---------- */
app.use(express.json({ limit: "5mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());

/** ---------- Session ---------- */
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-super-secret";

// ใช้ Postgres เป็น session store (ถ้ามี DATABASE_URL)
const PgSession = connectPgSimple(session);
const usePgStore = !!process.env.DATABASE_URL;

const sessionOptions = {
	name: "sid", // ชื่อคุกกี้ของ session
	secret: SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production", // prod ใช้ https ค่อยเปิด
		sameSite: "lax", // dev: 'lax' พอ (localhost:5173 ↔ 4000 ยังถือว่า same-site)
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
		path: "/", // ให้ติดทุกเส้นทาง
	},
};

if (usePgStore) {
	sessionOptions.store = new PgSession({
		conString: process.env.DATABASE_URL,
		tableName: "session",
		createTableIfMissing: true,
	});
}

// ถ้าอยู่หลัง proxy/https (เช่น nginx) ควรเชื่อใจ proxy 1 ชั้น
app.set("trust proxy", 1);

app.use(session(sessionOptions));

/** ---------- Static & health ---------- */
// ⭐️ แก้ไข: เปลี่ยนจาก "/uploads" เป็น "/upload" ให้ตรงกับ Frontend
// ⭐️ บรรทัดนี้สำหรับรูปภาพเก่าที่เคยบันทึกไว้
app.use("/uploads", express.static("uploads")); 
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/** ---------- Public routes (ไม่ต้องล็อกอิน) ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes); 
// settings ที่เป็น public (เช่น basic info)
app.use("/api/settings", settingsPublic);
// ถ้าอยากให้ dashboard เปิดสาธารณะให้คงเส้นนี้ไว้ (ถ้าอยากให้ต้องล็อกอิน ให้ย้ายไป authed แทน)
app.use("/api/dashboard", dashboardRoutes);

/** ---------- Protected routes (ต้องล็อกอิน) ---------- */
const authed = express.Router();
// กันทุก endpoint ใต้ /api/* ด้วย requireLogin
authed.use(requireLogin);

authed.use("/users", usersRoutes);
authed.use("/products", productRoutes);
authed.use("/categories", categoryRoutes);
authed.use("/sales", saleRoutes);

// ************************************************************
// 🎯 การแก้ไข: อนุญาตให้ ADMIN และ USER เข้าถึงสต็อกได้
// ************************************************************
// เปลี่ยน requireAdmin เป็น requireRole("ADMIN", "USER")
authed.use("/stocks", requireRole("ADMIN", "USER"), stockRoutes);

authed.use("/expenses", expenseRoutes);

// ถ้าต้องการให้ dashboard ต้องล็อกอิน ให้ใช้เส้นนี้แทน public ด้านบน แล้วลบทิ้งบรรทัด public
// authed.use("/dashboard", dashboardRoutes);

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
