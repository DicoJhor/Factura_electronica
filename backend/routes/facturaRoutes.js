import express from 'express';
import { emitirFactura, listar } from '../controllers/facturaController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/facturas - Listar facturas (opcionalmente filtradas por empresaId)
router.get('/', authMiddleware, listar);

// POST /api/facturas - Emitir nueva factura
router.post('/', authMiddleware, emitirFactura);

export default router;
