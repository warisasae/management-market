import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// สร้างโฟลเดอร์ถ้ายังไม่มี
const UPLOAD_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// เก็บไฟล์เป็นชื่อไม่ซ้ำ
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const name = `${base}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// POST /api/uploads  (field name: "file")
// routes/uploadRoutes.js
router.post("/", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  const path = `/uploads/${file.filename}`;          // เสิร์ฟ static ตรงนี้
  const url = `${base}${path}`;                      // absolute URL
  res.status(201).json({ url, path });               // ส่งทั้งคู่ เผื่อใช้
});

export default router;
