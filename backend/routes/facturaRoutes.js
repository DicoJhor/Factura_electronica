// backend/routes/facturaRoutes.js
import express from "express";
import { emitirFactura, listar } from "../controllers/facturaController.js";

const router = express.Router();

// 📦 Emitir factura
router.post("/", emitirFactura);

// 📋 Listar facturas
router.get("/", listar);

export default router;
