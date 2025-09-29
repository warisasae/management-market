// prisma/seed.js

import { PrismaClient } from '@prisma/client';
import { genId } from '../utils/id.js'; // สมมติว่าไฟล์ genId อยู่ที่นี่
import bcrypt from 'bcrypt'; // ใช้ถ้าคุณต้องการเข้ารหัสรหัสผ่าน

const prisma = new PrismaClient();

async function main() {
    console.log(`Start seeding ...`);

    // ตรวจสอบว่ามี Admin อยู่แล้วหรือไม่
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) {
        console.log('Admin user already exists. Skipping seed.');
        return;
    }

    // ******* สร้าง Admin User ใหม่ *******
    const user_id = await genId({ model: 'user', field: 'user_id', prefix: 'US', pad: 3 });
    // เนื่องจากโค้ดของคุณไม่ได้เข้ารหัส, เราจะบันทึกเป็นข้อความธรรมดาตามที่คุณทำ
    const hashedPassword = '123456'; // รหัสผ่านง่ายๆ สำหรับการล็อกอิน

    const adminUser = await prisma.user.create({
        data: {
            user_id: user_id,
            username: 'admin',
            password: hashedPassword, 
            name: 'System Admin',
            role: 'ADMIN',
        },
    });

    console.log(`Created admin user with ID: ${adminUser.user_id}`);
    // **********************************

    console.log(`Seeding finished.`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });