import express from 'express';
import multer from 'multer';
import { 
  listar, 
  obtenerPorId, 
  crear, 
  actualizar, 
  establecerPrincipal, 
  eliminar 
} from '../controllers/empresaController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authMiddleware);

router.get('/', listar);
router.get('/:id', obtenerPorId);
router.post('/', upload.fields([
  { name: 'certificado', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), crear);
router.put('/:id', upload.fields([
  { name: 'certificado', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), actualizar);
router.patch('/:id/principal', establecerPrincipal);
router.delete('/:id', eliminar);

export default router;