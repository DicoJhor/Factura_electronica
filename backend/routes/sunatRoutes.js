// backend/routes/sunatRoutes.js
import express from "express";
import { reenviarASunat, consultarRUC } from "../controllers/sunatController.js";

const router = express.Router();

// 🔍 RUTA DE PRUEBA (GET)
router.get("/test", (req, res) => {
  res.json({ 
    message: "✅ Rutas SUNAT funcionando correctamente",
    timestamp: new Date().toISOString() 
  });
});

// Rutas existentes
router.post("/reenviar", reenviarASunat);
router.post("/consultar-ruc", consultarRUC);

export default router;