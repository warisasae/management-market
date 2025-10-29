import { prisma } from "../config/prisma.js";

export async function getExpiring(req, res) {
  const days = Number(req.query.days ?? 7);
  const to = new Date(); to.setDate(to.getDate() + days);
  const items = await prisma.product.findMany({
    where: { expiry_date: { lte: to } },
    select: { product_id: true, product_name: true, expiry_date: true, stock_qty: true }
  });
  res.json(items);
}

export async function getLowStock(req, res) {
  const threshold = Number(req.query.threshold ?? 3);
  const items = await prisma.product.findMany({
    where: { stock_qty: { lte: threshold } },
    select: { product_id: true, product_name: true, stock_qty: true }
  });
  res.json(items);
}
