import { Router } from 'express';
import {
  createUser, getAllUsers, getUser, updateUser,
  updateUsername, updatePassword, deleteUser, loginUser
} from '../controllers/userController.js';

const router = Router();

router.post('/login', loginUser); 

router.post('/', createUser);
router.get('/', getAllUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);                 // name/role/image_url
router.put('/:id/username', updateUsername);    // เปลี่ยน username
router.put('/:id/password', updatePassword);    // เปลี่ยนรหัสผ่าน
router.delete('/:id', deleteUser);

export default router;
