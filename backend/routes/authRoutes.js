// backend/routes/authRoutes.js
import { Router } from "express";
import { login, me, logout } from "../controllers/authController.js";
import { optionalLogin } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.get("/me", optionalLogin, me);
router.post("/logout", logout);


export default router;
