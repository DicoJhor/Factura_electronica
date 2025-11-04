// backend/routes/productoRoutes.js
import express from "express";
import { obtenerProductos } from "../controllers/productoController.js";

const router = express.Router();

router.get("/", obtenerProductos);

export default router;
