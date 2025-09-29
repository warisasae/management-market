// แยก router: public (basic) และ protected (เผื่ออนาคต)
import { Router } from "express";
import { getSettings, updateSettings, getVatSettings } from "../controllers/settingController.js";

// ✅ public: ให้ React/Postman ใช้ได้ทันทีโดยไม่ต้องล็อกอิน
export const settingsPublic = Router();
settingsPublic.get("/basic", getSettings);
settingsPublic.put("/basic", updateSettings);
settingsPublic.get("/vat", getVatSettings); 

// 🔒 protected: ถ้าจะมี endpoint ตั้งค่าแบบ advance ค่อยมาใส่ตรงนี้
const settingsProtected = Router();
// settingsProtected.get("/advanced", someHandler)
// settingsProtected.post("/...", someHandler)

export default settingsProtected;
