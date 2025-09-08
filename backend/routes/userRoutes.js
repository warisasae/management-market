import { Router } from 'express';
import { createUser, getAllUsers, getUser, updateUser, updatePassword } from '../controllers/userController.js';

const router = Router();
router.post('/', createUser);
router.get('/', getAllUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.put('/:id/password', updatePassword);

export default router;
