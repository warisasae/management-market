// backend/scripts/setPassword.js
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

async function main() {
  const username = process.argv[2];          // เช่น: admin
  const plain = process.argv[3];             // เช่น: 123456
  if (!username || !plain) {
    console.error("Usage: node scripts/setPassword.js <username> <newPassword>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(plain, 10);

  // ถ้ามี user นี้อยู่แล้ว -> อัปเดตรหัสผ่าน, ถ้าไม่มี -> สร้างใหม่ (role เป็น USER/ADMIN ตามต้องการ)
  const user = await prisma.user.upsert({
    where: { username },
    update: { password: hash },
    create: {
      username,
      password: hash,
      name: "Admin",
      role: "ADMIN",     // เปลี่ยนได้ตาม schema ของคุณ
      // เติมคอลัมน์ที่เป็น required อื่น ๆ ให้ครบ
    },
  });

  console.log("Done. User:", user.username);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
