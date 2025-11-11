// backend/routes/sunatRoutes.js
import express from "express";
import { reenviarASunat, consultarRUC } from "../controllers/sunatController.js";

const router = express.Router();

// Ruta existente para reenviar factura
router.post("/reenviar", reenviarASunat);

// Nueva ruta para consultar RUC/DNI
router.post("/consultar-ruc", consultarRUC);

export default router;