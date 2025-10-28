// ⬇️ === FIX: เพิ่ม Import นี้กลับเข้ามา === ⬇️
import { prisma } from "../lib/prisma.js"; // หรือ path ที่ถูกต้องของคุณ
// ⬆️ ==================================== ⬆️
import bcrypt from "bcrypt";

/**
 * @description ฟังก์ชันสำหรับการเข้าสู่ระบบ (login)
 */
export async function login(req, res, next) {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        // ✅ ตอนนี้ 'prisma' จะถูก Import มาจากข้างบนแล้ว
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            console.warn("[login] user not found:", username);
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.warn("[login] bad password for:", username);
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const sessionUser = {
            user_id: user.user_id,
            username: user.username,
            name: user.name,
            role: user.role,
            image_url: user.image_url ?? null,
        };
        req.session.user = sessionUser;
        console.log("[Login] Session created/updated:", req.session.user);

        const { password: _, ...userData } = user;
        return res.json({ ok: true, user: userData });

    } catch (e) {
        console.error("[Login Error]", e);
        next(e);
    }
    // ไม่ต้องมี finally { prisma.$disconnect() } แล้ว เพราะเราใช้ shared instance
}

// ----------------------------------------------------------------------
// โค้ดส่วน logout และ me (ไม่มีการแก้ไข)
// ----------------------------------------------------------------------

/**
 * @description ฟังก์ชันสำหรับการออกจากระบบ (logout)
 */
export async function logout(req, res, next) {
    try {
        req.session.destroy((err) => {
            if (err) {
                 console.error("[Logout Session Error]", err);
                 return next(new Error("Failed to destroy session"));
            }
            res.clearCookie("sid", { path: "/" });
            console.log("[Logout] Session destroyed and cookie cleared.");
            return res.json({ ok: true });
        });
    } catch (e) {
        console.error("[Logout General Error]", e);
        res.clearCookie("sid", { path: "/" });
        return res.json({ ok: true });
    }
}

/**
 * @description ฟังก์ชันเช็คว่า user อยู่ใน session หรือไม่
 */
export async function me(req, res) {
    const user = req.session?.user || null;
     console.log("[Me Check] Current session user:", user);
    return res.json({ user });
}