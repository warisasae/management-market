// controllers/userController.js
import { prisma } from '../config/prisma.js';
import { genId } from '../utils/id.js';
import bcrypt from 'bcrypt';

// ฟังก์ชันช่วย: map error Prisma เป็นสถานะ/ข้อความอ่านง่าย
function handlePrismaError(e, res, next) {
    if (e?.code === 'P2002') {
        // unique constraint (เช่น username ซ้ำ)
        return res.status(409).json({ error: 'unique constraint violated', code: 'P2002', fields: e.meta?.target });
    }
    if (e?.code === 'P2025') {
        // not found
        return res.status(404).json({ error: 'record not found', code: 'P2025' });
    }
    next(e);
}

// POST /api/users
export async function createUser(req, res, next) {
    try {
        const { username, password, name, role = 'USER', image_url } = req.body;
        if (!username || !password || !name)
            return res.status(400).json({ error: 'username, password, name are required' });

        // 🔑 การแก้ไขที่สำคัญ: HASH รหัสผ่านก่อนบันทึก
        const hashedPassword = await bcrypt.hash(password, 10); // 10 คือ Salt Rounds ที่แนะนำ
        
        const user_id = await genId({ model: 'user', field: 'user_id', prefix: 'US', pad: 3 });

        const created = await prisma.user.create({
            data: { 
                user_id, 
                username, 
                password: hashedPassword, // ใช้รหัสผ่านที่ Hash แล้ว
                name, 
                role, 
                image_url: image_url || null 
            },
            select: { user_id: true, username: true, name: true, role: true, image_url: true }
        });

        res.status(201).json(created);
    } catch (e) { handlePrismaError(e, res, next); }
}

// GET /api/users
export async function getAllUsers(req, res, next) {
    try {
        const rows = await prisma.user.findMany({
            orderBy: { username: 'asc' },
            select: { user_id: true, username: true, name: true, role: true, image_url: true }
        });
        res.json(rows);
    } catch (e) { next(e); }
}

// GET /api/users/:id
export async function getUser(req, res, next) {
    try {
        const row = await prisma.user.findUnique({
            where: { user_id: req.params.id },
            select: { user_id: true, username: true, name: true, role: true, image_url: true }
        });
        if (!row) return res.status(404).json({ error: 'user not found' });
        res.json(row);
    } catch (e) { next(e); }
}

/**
 * PUT /api/users/:id
 * แก้ไขข้อมูลโปรไฟล์ทั่วไป (name, role, image_url)
 */
// 👇 วางฟังก์ชัน updateUser ที่แก้ไขแล้วนี้ทับของเดิม
export async function updateUser(req, res, next) {
    try {
        // 1. รับข้อมูลทั้งหมดจาก body
        const { name, role, image_url, username, password } = req.body;

        // 2. สร้าง object data ที่จะอัปเดตแบบ Dynamic
        const dataToUpdate = {};

        if (name !== undefined) dataToUpdate.name = name;
        if (role !== undefined) dataToUpdate.role = role;
        if (image_url !== undefined) dataToUpdate.image_url = image_url;
        
        // 3. จัดการ username (ตรวจสอบว่าซ้ำหรือไม่)
        if (username) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    username: username,
                    NOT: { user_id: req.params.id },
                },
            });
            if (existingUser) {
                return res.status(409).json({ error: 'This username is already in use' });
            }
            dataToUpdate.username = username;
        }

        // 4. จัดการ password (Hash ก่อนบันทึก)
        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        // 5. อัปเดตข้อมูลลงฐานข้อมูล
        const updated = await prisma.user.update({
            where: { user_id: req.params.id },
            data: dataToUpdate,
            select: { user_id: true, username: true, name: true, role: true, image_url: true }
        });

        res.json(updated);
    } catch (e) { handlePrismaError(e, res, next); }
}
// DELETE /api/users/:id
export async function deleteUser(req, res, next) {
    try {
        const deleted = await prisma.user.delete({
            where: { user_id: req.params.id },
            select: { user_id: true, username: true, name: true, role: true, image_url: true }
        });
        res.json(deleted);
    } catch (e) { handlePrismaError(e, res, next); }
}
// 🆕 POST /api/users/login
export async function loginUser(req, res, next) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // 1. ค้นหาผู้ใช้จาก username
        const user = await prisma.user.findUnique({
            where: { username },
            // ⚠️ ต้องเลือก password ด้วย เพื่อนำมาเปรียบเทียบ Hash
            select: { 
                user_id: true, 
                username: true, 
                name: true, 
                role: true,
                password: true // ต้องดึง Hash มา
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Username or password incorrect' });
        }

        // 2. เปรียบเทียบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Username or password incorrect' });
        }

        // 3. (Optional แต่แนะนำ) สร้าง JWT Token สำหรับการล็อกอินปกติ
        // 💡 ถ้าคุณใช้ session, ให้จัดการ req.session.user ตรงนี้
        // 💡 ถ้าคุณใช้ JWT, ให้สร้าง token ตรงนี้และส่งกลับไป

        // ลบ password hash ออกก่อนส่งกลับไป
        const { password: _, ...userWithoutPassword } = user; 
        
        // 4. ส่งข้อมูลผู้ใช้กลับ
        // (Frontend จะรับ user object นี้ และตรวจสอบ role = 'แอดมิน')
        res.json({ 
            message: 'Login successful', 
            user: userWithoutPassword 
            // 💡 ถ้าใช้ JWT, อาจส่งเป็น { token: generatedToken, user: userWithoutPassword }
        });

    } catch (e) {
        console.error('Login error:', e);
        next(e);
    }
}