import multer from 'multer';
import path from 'path';
import fs from 'fs';

const dir = path.resolve('uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, 'shop-logo' + ext);
  }
});
export const uploads = multer({ storage });
