import { Router } from 'express';
import {
  getAllSettings,
  getSettingByKey,
  putSettingByKey,
  putSettingsBulk,
  getVat
} from '../controllers/settingController.js';

const router = Router();

router.get('/', getAllSettings);
router.get('/vat', getVat);            // ให้ POS เรียก
router.get('/:key', getSettingByKey);
router.put('/bulk', putSettingsBulk);  // FE Settings.jsx ใช้อันนี้
router.put('/:key', putSettingByKey);

export default router;
