// routes/index.js
import { Router } from "express";
import users from "./userRoutes.js";
import categories from "./categoryRoutes.js";
import products from "./productRoutes.js";
import stock from "./stockRoutes.js";
import sales from "./saleRoutes.js";
import expenses from "./expenseRoutes.js";
import saleItems from "./saleItemRoutes.js";

const router = Router();

router.use("/api/users", users);
//router.use("/api/categories", categories);
//router.use("/api/products", products);
//router.use("/api/stock", stock);
//router.use("/api/sales", sales);
//router.use("/api/expenses", expenses);
//router.use("/api/sale-items", saleItems);

export default router;
