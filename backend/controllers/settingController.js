// controllers/settingController.js
import { getSettings, saveSetting } from '../services/settingService.js';

/**
 * GET /api/settings
 * ส่งค่าการตั้งค่าทั้งหมดเป็น { settings: { key: value, ... } }
 */
export async function getAllSettings(req, res, next) {
  try {
    const settings = await getSettings();
    // FE Settings.jsx รองรับทั้ง .settings และ plain object
    // เราส่งแบบ {settings} จะชัวร์สุด
    res.json({ settings });
  } catch (e) { next(e); }
}

/**
 * GET /api/settings/:key
 * ส่ง { value }
 */
export async function getSettingByKey(req, res, next) {
  try {
    const key = req.params.key;
    const settings = await getSettings();
    if (!(key in settings)) {
      return res.status(404).json({ error: `setting '${key}' not found` });
    }
    res.json({ value: settings[key] });
  } catch (e) { next(e); }
}

/**
 * PUT /api/settings/:key
 * body: { value: string|number }
 */
export async function putSettingByKey(req, res, next) {
  try {
    const key = req.params.key;
    // รองรับทั้ง string/number แปลงเป็น string ก่อนเก็บ
    const { value } = req.body ?? {};
    const row = await saveSetting(key, String(value ?? ''));
    res.json({ key: row.key, value: row.value });
  } catch (e) { next(e); }
}

/**
 * PUT /api/settings/bulk
 * body: { shopName, logo, currency, vat, language, ... }
 * ส่งกลับ { settings: {...} }
 */
export async function putSettingsBulk(req, res, next) {
  try {
    const payload = req.body || {};
    const keys = Object.keys(payload);
    const results = {};
    for (const k of keys) {
      const row = await saveSetting(k, String(payload[k] ?? ''));
      results[row.key] = row.value;
    }
    res.json({ settings: results });
  } catch (e) { next(e); }
}

/**
 * (ทางเลือก) GET /api/settings/vat
 * ให้ POS เรียกง่าย ๆ
 */
export async function getVat(req, res, next) {
  try {
    const settings = await getSettings();
    res.json({ value: settings.vat ?? '0' });
  } catch (e) { next(e); }
}
