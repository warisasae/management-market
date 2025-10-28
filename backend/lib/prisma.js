import { PrismaClient } from '@prisma/client';

// ⬇️ === Add this line for debugging === ⬇️
console.log('[DEBUG] DATABASE_URL seen by Prisma:', process.env.DATABASE_URL);
// ⬆️ =============================== ⬆️

export const prisma = new PrismaClient();