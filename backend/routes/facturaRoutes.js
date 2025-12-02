import express from 'express';
import { emitirFactura, listar } from '../controllers/facturaController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Crear/emitir factura
router.post('/', authMiddleware, emitirFactura);

// Listar facturas
router.get('/', authMiddleware, listar);

export default router;

