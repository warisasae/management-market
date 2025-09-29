import jwt from "jsonwebtoken";

/** แปลงชื่อ role ให้เป็นมาตรฐานเดียวกัน */
function normRole(r) {
    if (!r) return "";
    const k = String(r).trim().toUpperCase();
    if (k === "แอดมิน".toUpperCase()) return "ADMIN";
    if (k === "พนักงานขาย".toUpperCase()) return "USER";
    return k; // ADMIN / USER / etc.
}

/** ดึง token จาก Cookie หรือ Authorization header */
function getTokenFromRequest(req) {
    // คุกกี้ชื่อ authToken (ควรตั้งตอน login)
    const tokenFromCookie = req.cookies?.authToken;
    // Authorization: Bearer <token>
    const auth = req.headers?.authorization || "";
    const tokenFromHeader = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    return tokenFromCookie || tokenFromHeader || null;
}

/** แปลง payload -> user object มาตรฐาน พร้อม normal role */
function mapPayloadToUser(payload = {}) {
    return {
        user_id: String(payload.user_id ?? payload.id ?? ""),
        username: payload.username ?? payload.name ?? "",
        role: normRole(payload.role),
        // เพิ่ม field อื่น ๆ ที่ฝังไว้ใน token ได้ตามต้องการ
    };
}

/** อ่าน user จาก session หรือ JWT (cookie/header) */
function resolveUser(req) {
    // 1) ลองจาก session ก่อน
    const u = req.session?.user;
    if (u?.user_id) {
        return {
            ...u,
            user_id: String(u.user_id),
            role: normRole(u.role),
        };
    }

    // 2) ถ้าไม่มี session ลองจาก JWT
    const token = getTokenFromRequest(req);
    if (!token) return null; // ไม่มี Token ก็คืนค่า null

    try {
        // ตรวจสอบความถูกต้องของ Token ด้วย JWT_SECRET
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // แปลงข้อมูล payload เป็น user object มาตรฐาน
        return mapPayloadToUser(payload);
    } catch (e) {
        // Token ไม่ถูกต้อง, หมดอายุ, หรือมีปัญหาในการตรวจสอบ
        // console.warn("[resolveUser] JWT verification failed:", e.message); // สามารถเปิดใช้งานเพื่อ Debug ได้
        return null;
    }
}

// -------------------------------------------------------------
// Middleware Functions
// -------------------------------------------------------------

/** ต้องล็อกอิน */
export function requireLogin(req, res, next) {
    if (req.method === "OPTIONS") return next(); // อย่าบล็อก preflight

    // ✅ แก้ไข: ใช้ resolveUser เพื่อตรวจสอบทั้ง Session และ JWT
    const u = resolveUser(req);

    if (!u || !u.user_id) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // ตั้งค่า req.user จากข้อมูลที่ resolve ได้
    req.user = { ...u, user_id: String(u.user_id), role: normRole(u.role) };
    next();
}

/** ล็อกอินก็ได้ ไม่ล็อกอินก็ได้ */
export function optionalLogin(req, _res, next) {
    // ✅ แก้ไข: ใช้ resolveUser เพื่อดึงข้อมูลจาก Session หรือ JWT
    const u = resolveUser(req);

    if (u && u.user_id) {
        // ตั้งค่า req.user จากข้อมูลที่ resolve ได้
        req.user = { ...u, user_id: String(u.user_id), role: normRole(u.role) };
    }
    // ถ้าไม่มีข้อมูลผู้ใช้ (u เป็น null) ก็แค่ข้ามไป next()
    next();
}


/** ต้องมีบทบาทตามที่กำหนด */
export function requireRole(...roles) {
    const allow = roles.map(normRole);
    return (req, res, next) => {
        if (req.method === "OPTIONS") return next();

        // ✅ แก้ไข: ใช้ resolveUser เพื่อตรวจสอบ Role จาก Session/JWT ที่เชื่อถือได้
        const u = resolveUser(req);
        const userRole = normRole(u?.role);

        if (!userRole || !allow.includes(userRole)) {
            // ไม่ล็อกอิน หรือ Role ไม่ถูกต้อง
            return res.status(403).json({ error: "Forbidden" });
        }
        
        // ตั้งค่า req.user จากข้อมูลที่ resolve ได้
        req.user = { ...u, user_id: String(u.user_id), role: userRole };
        next();
    };
}

export const requireAdmin = requireRole("ADMIN", "แอดมิน");