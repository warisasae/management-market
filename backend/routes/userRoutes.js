import { Router } from 'express';
import {
  createUser, getAllUsers, getUser, updateUser, deleteUser, loginUser
} from '../controllers/userController.js';

const router = Router();

router.post('/login', loginUser); 

router.post('/', createUser);
router.get('/', getAllUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);                
router.delete('/:id', deleteUser);

export default router;
