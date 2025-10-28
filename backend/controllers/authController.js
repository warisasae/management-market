// controllers/authController.js
import { PrismaClient } from '@prisma/client'; // 👈 Import ตัว Client หลักมาแทน
import bcrypt from "bcrypt";

/**
 * @description ฟังก์ชันสำหรับการเข้าสู่ระบบ (login)
 */
export async function login(req, res, next) {
    const { username, password } = req.body || {};

    // 1. ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    let prisma; // ประกาศตัวแปร prisma ไว้ข้างนอก try/catch

    try {
        // ⬇️ === เพิ่มโค้ด Debug === ⬇️
        console.log('[DEBUG AUTH] DATABASE_URL before query:', process.env.DATABASE_URL);
        prisma = new PrismaClient(); // 👈 สร้าง Client ใหม่ทุกครั้งที่ Login
        // ⬆️ ===================== ⬆️

        // 2. ค้นหาผู้ใช้จากฐานข้อมูล
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            console.warn("[login] user not found:", username);
            // ⭐️ Correction: ใช้ข้อความ Error กลางๆ ตามที่คุณ Comment ไว้
            return res.status(401).json({ error: "Invalid username or password" }); 
        }

        // 3. 🔑 ตรวจสอบรหัสผ่าน (ใช้ bcrypt.compare) 🔑
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.warn("[login] bad password for:", username);
             // ⭐️ Correction: ใช้ข้อความ Error กลางๆ
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // 4. สร้าง Session และตอบกลับ
        const sessionUser = {
            user_id: user.user_id,
            username: user.username,
            name: user.name,
            role: user.role,
            image_url: user.image_url ?? null,
        };
        req.session.user = sessionUser;
        console.log("[Login] Session created/updated:", req.session.user); // Log เมื่อสร้าง Session

        const { password: _, ...userData } = user;
        return res.json({ ok: true, user: userData });

    } catch (e) {
        console.error("[Login Error]", e); // Log error ที่เกิดขึ้น
        // ส่งต่อไปยัง Error Handler กลาง (ใน app.js)
        next(e);
    } finally {
        // ⬇️ === เพิ่มโค้ด Debug === ⬇️
        // ปิดการเชื่อมต่อ Prisma เสมอ ไม่ว่าจะสำเร็จหรือล้มเหลว
        if (prisma) {
            await prisma.$disconnect();
            console.log("[DEBUG AUTH] Prisma disconnected.");
        }
        // ⬆️ ===================== ⬆️
    }
}

// ----------------------------------------------------------------------
// โค้ดส่วน logout และ me (ไม่มีการแก้ไข)
// ----------------------------------------------------------------------

/**
 * @description ฟังก์ชันสำหรับการออกจากระบบ (logout)
 */
export async function logout(req, res, next) { // เพิ่ม next สำหรับ error handling
    try {
        req.session.destroy((err) => {
            if (err) {
                 console.error("[Logout Session Error]", err);
                 // ส่งต่อไปยัง Error Handler กลาง แทนการตอบกลับเอง
                 return next(new Error("Failed to destroy session")); 
            }
            res.clearCookie("sid", { path: "/" }); // ลบ session cookie (ชื่อ sid ตามค่า default)
            // res.clearCookie("authToken", { path: "/" }); // ถ้าเคยใช้ authToken cookie
            console.log("[Logout] Session destroyed and cookie cleared.");
            return res.json({ ok: true });
        });
    } catch (e) {
        // Catch นี้อาจจะไม่ค่อยได้ใช้ เพราะ destroy เป็น callback
        console.error("[Logout General Error]", e);
        res.clearCookie("sid", { path: "/" });
        // ตอบกลับไปก่อน เพื่อไม่ให้ client ค้าง
        return res.json({ ok: true }); 
    }
}

/**
 * @description ฟังก์ชันเช็คว่า user อยู่ใน session หรือไม่
 */
export async function me(req, res) {
    const user = req.session?.user || null;
     console.log("[Me Check] Current session user:", user); // Log เพื่อดู session
    return res.json({ user });
}
