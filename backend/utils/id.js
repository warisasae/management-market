import { prisma as defaultClient } from '../config/prisma.js';

/**
 * genId: สร้างรหัส 2 ตัวอักษร + เลขรัน (padding เริ่มต้น 6)
 * รองรับใช้งานใน transaction โดยส่ง client เข้ามา
 */
export async function genId({ client = defaultClient, model, field, prefix, pad = 6 }) {
  const repo = client[model];
  if (!repo) throw new Error(`Unknown prisma model: ${model}`);

  const last = await repo.findFirst({
    where: { [field]: { startsWith: prefix } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true }
  });

  let nextNum = 1;
  if (last?.[field]) nextNum = parseInt(String(last[field]).slice(prefix.length), 10) + 1;

  return `${prefix}${String(nextNum).padStart(pad, '0')}`;
}
