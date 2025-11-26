import express from 'express';
import { registrar, login, verificarToken } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/registro', registrar);
router.post('/login', login);
router.get('/verificar', authMiddleware, verificarToken);

export default router;