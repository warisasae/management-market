import ExcelJS from "exceljs";
import { prisma } from "../config/prisma.js";

export async function exportExcel(_req, res) {
  try {
    const [products, categories, users, sales, saleItems, settings] = await Promise.all([
      prisma.product.findMany(),
      prisma.category.findMany(),
      prisma.user.findMany(),
      prisma.sale.findMany(),
      prisma.saleItem.findMany(),
      prisma.setting.findMany(),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Grocery System";

    const addSheet = (name, columns, rows) => {
      const ws = wb.addWorksheet(name);
      ws.columns = columns;
      ws.addRows(rows);
      ws.getRow(1).font = { bold: true };
    };

    addSheet("Products", [
      { header: "product_id", key: "product_id", width: 20 },
      { header: "product_name", key: "product_name", width: 30 },
      { header: "category_id", key: "category_id", width: 16 },
      { header: "barcode", key: "barcode", width: 18 },
      { header: "cost_price", key: "cost_price", width: 12 },
      { header: "sell_price", key: "sell_price", width: 12 },
      { header: "unit", key: "unit", width: 10 },
      { header: "stock_qty", key: "stock_qty", width: 10 },
      { header: "status", key: "status", width: 14 },
      { header: "expiry_date", key: "expiry_date", width: 16 },
    ], products);

    addSheet("Categories", Object.keys(categories[0] ?? { category_id: "", category_name: "" })
      .map(k => ({ header: k, key: k })), categories);

    addSheet("Users", Object.keys(users[0] ?? { user_id:"", username:"", name:"", role:"" })
      .map(k => ({ header: k, key: k })), users);

    addSheet("Sales", Object.keys(sales[0] ?? { sale_id:"" }).map(k => ({ header: k, key: k })), sales);
    addSheet("SaleItems", Object.keys(saleItems[0] ?? { sale_item_id:"" }).map(k => ({ header: k, key: k })), saleItems);

    addSheet("Settings", [{ header: "key", key: "key" }, { header: "value", key: "value" }],
      settings.map(s => ({ key: s.key, value: JSON.stringify(s.value) })));

    const buf = await wb.xlsx.writeBuffer();
    const filename = `backup-${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to export Excel" });
  }
}
