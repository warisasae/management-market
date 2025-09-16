// services/settingService.js
import { prisma } from '../config/prisma.js';

export async function getSettings() {
  const rows = await prisma.setting.findMany({
    select: { key: true, value: true },
    orderBy: { key: 'asc' }
  });
  const map = {};
  for (const r of rows) map[r.key] = r.value ?? '';
  return map;
}

export async function saveSetting(key, value) {
  return prisma.setting.upsert({
    where: { key },
    create: { key, value: String(value ?? '') },
    update: { value: String(value ?? '') },
    select: { key: true, value: true }
  });
}

// (ทางเลือก) call ใน startup เพื่อตั้ง default ถ้ายังไม่มี
export async function ensureDefaultSettings() {
  await saveSetting('vat', '0'); // มีค่านี้เสมอ
}
