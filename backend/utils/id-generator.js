// src/utils/id-generator.js
import { prisma as defaultClient } from '../config/prisma.js'; // ⭐️ ตรวจสอบ Path ให้ถูกต้อง

/**
 * genId: สร้างรหัส prefix + running number (เช่น P001, F102)
 * ถ้ามีอยู่แล้วจะหาตัวถัดไปเรื่อย ๆ จนกว่าจะไม่ซ้ำ
 */
export async function genId({ client = defaultClient, model, field, prefix, pad = 3 }) {
    try {
        const repo = client[model];
        if (!repo) {
             console.error(`Error in genId: Unknown prisma model: ${model}`);
             return undefined; // คืนค่า undefined เมื่อ Model ไม่ถูกต้อง
        }

        // 1. หาเลขล่าสุดที่ขึ้นต้นด้วย prefix
        const last = await repo.findFirst({
            where: { [field]: { startsWith: prefix } },
            orderBy: { [field]: 'desc' },
            select: { [field]: true }
        });

        let nextNum = 1;
        if (last?.[field]) {
            const raw = String(last[field]).slice(prefix.length);
            const parsed = parseInt(raw, 10);
            if (!isNaN(parsed)) nextNum = parsed + 1;
        }

        // 2. ตรวจสอบว่า id นี้ซ้ำหรือยัง ถ้าซ้ำให้ +1 ไปเรื่อย ๆ
        let newId;
        let exists = true;
        while (exists) {
            newId = `${prefix}${String(nextNum).padStart(pad, '0')}`;
            // ใช้ findUnique เนื่องจาก product_id เป็น @id หรือ @unique
            const found = await repo.findUnique({ where: { [field]: newId } }); 
            
            if (!found) {
                exists = false; // ใช้ตัวนี้ได้
            } else {
                nextNum++;
                // ป้องกัน Loop ไม่รู้จบ (ID มากเกินไป)
                if (nextNum > 99999) throw new Error("ID generation loop limit reached.");
            }
        }

        console.log(`Generated ID for ${model}: ${newId}`);
        return newId;

    } catch (error) {
        // ⭐️ จัดการ Error ที่เกิดจากการดึงข้อมูล/คำนวณ (เช่น ปัญหา DB, Path)
        console.error('CRITICAL ERROR in genId:', error);
        // คืนค่า undefined ให้ Controller จัดการ
        return undefined; 
    }
}