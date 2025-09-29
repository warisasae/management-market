import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt";

/**
 * @description ฟังก์ชันสำหรับการเข้าสู่ระบบ (login)
 */
export async function login(req, res, next) {
    try {
        const { username, password } = req.body || {};
        
        // 1. ตรวจสอบข้อมูลที่จำเป็น
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // 2. ค้นหาผู้ใช้จากฐานข้อมูล
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            console.warn("[login] user not found:", username);
            // เพื่อความปลอดภัย ไม่ควรบอกว่าไม่พบ username หรือรหัสผ่านผิด ให้ตอบรวมๆ ไป
            return res.status(401).json({ error: "Invalid username or password" }); 
        }

        // 3. 🔑 ตรวจสอบรหัสผ่านที่ถูกต้องและปลอดภัย (ใช้ bcrypt.compare) 🔑
        // นำรหัสผ่านที่ผู้ใช้ป้อน (plain text) มาเทียบกับรหัส Hash ในฐานข้อมูล
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.warn("[login] bad password for:", username);
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // 4. สร้าง Session/Token และตอบกลับ
        
        // สร้าง sessionUser
        const sessionUser = {
            user_id: user.user_id,
            username: user.username,
            name: user.name,
            role: user.role,
            image_url: user.image_url ?? null,
        };
        req.session.user = sessionUser;

        // เซ็ต token ลงใน cookie
        const token = "your_generated_token_here"; // ควรใช้ JWT หรือ Library อื่นๆ ในการสร้าง Token จริง
        res.cookie("authToken", token, {
            httpOnly: true, // ป้องกันการเข้าถึงจาก JS
            secure: process.env.NODE_ENV === "production", // ใช้ secure ถ้าใช้ HTTPS
            sameSite: "lax", // ป้องกัน CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // ระยะเวลา 7 วัน
        });

        return res.json({ ok: true, user: sessionUser });
    } catch (e) {
        next(e);
    }
}

// ----------------------------------------------------------------------
// โค้ดส่วนอื่นๆ ที่คุณให้มา (ไม่มีการแก้ไข)
// ----------------------------------------------------------------------

/**
 * @description ฟังก์ชันสำหรับการออกจากระบบ (logout)
 */
export async function logout(req, res) {
    try {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ error: "Failed to destroy session" });
            // ลบ token ใน client
            res.clearCookie("authToken", { path: "/" }); // ลบจาก cookie
            // localStorage.removeItem('authToken'); // หากใช้ LocalStorage ควรลบด้วย
            return res.json({ ok: true });
        });
    } catch (e) {
        console.error(e);
        res.clearCookie("authToken", { path: "/" });
        return res.json({ ok: true });
    }
}

/**
 * @description ฟังก์ชันเช็คว่า user อยู่ใน session หรือไม่
 */
export async function me(req, res) {
    // ตรวจสอบ session เพื่อให้แน่ใจว่าผู้ใช้ล็อกอินอยู่
    const user = req.session?.user || null;
    return res.json({ user });
}