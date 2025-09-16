import { prisma as defaultClient } from '../config/prisma.js';

/**
 * genId: สร้างรหัส prefix + running number (เช่น US001)
 * ถ้ามีอยู่แล้วจะหาตัวถัดไปเรื่อย ๆ จนกว่าจะไม่ซ้ำ
 */
export async function genId({ client = defaultClient, model, field, prefix, pad = 3 }) {
  const repo = client[model];
  if (!repo) throw new Error(`Unknown prisma model: ${model}`);

  // หาเลขล่าสุดที่ขึ้นต้นด้วย prefix
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

  // ตรวจสอบว่า id นี้ซ้ำหรือยัง ถ้าซ้ำให้ +1 ไปเรื่อย ๆ
  let newId;
  let exists = true;
  while (exists) {
    newId = `${prefix}${String(nextNum).padStart(pad, '0')}`;
    const found = await repo.findUnique({ where: { [field]: newId } });
    if (!found) {
      exists = false; // ใช้ตัวนี้ได้
    } else {
      nextNum++;
    }
  }

  console.log(`Generated ID for ${model}: ${newId}`);
  return newId;
}
