// controllers/authController.js
import { prisma } from "../config/prisma.js";
// import jwt from "jsonwebtoken"; // ถ้าอยากใช้จริง

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    // หา user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        user_id: true,
        username: true,
        name: true,
        role: true,
        password: true, // ใช้ตรวจสอบรหัสผ่าน
        image_url: true, // ✅ ดึงรูปมาด้วย
      },
    });

    // NOTE: prod ควรใช้ bcrypt.compare(password, user.passwordHash)
    if (!user || user.password !== password) {
      return res
        .status(401)
        .json({ error: "Invalid username or password" });
    }

    // TODO (production):
    // const token = jwt.sign({ sub: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return res.json({
      message: "Login success",
      user: {
        user_id: user.user_id,
        username: user.username,
        name: user.name,
        role: user.role,
        image_url: user.image_url || null, // ✅ ส่งกลับ image_url ด้วย
      },
      token: "dummy-token", // mock ไว้ก่อนสำหรับ FE
    });
  } catch (e) {
    next(e);
  }
}
