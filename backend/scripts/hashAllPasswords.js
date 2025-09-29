// backend/scripts/hashAllPasswords.js  (ESM)
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

async function main() {
  const users = await prisma.user.findMany({
    select: { user_id: true, username: true, password: true },
  });

  let updated = 0;
  for (const u of users) {
    const pwd = u.password || "";
    const isHashed = typeof pwd === "string" && pwd.startsWith("$2");
    if (!isHashed) {
      const hash = await bcrypt.hash(pwd, 10);
      await prisma.user.update({
        where: { user_id: u.user_id },
        data: { password: hash },
      });
      updated++;
      console.log(`hashed: ${u.username}`);
    }
  }
  console.log(`Done. Updated ${updated} user(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
