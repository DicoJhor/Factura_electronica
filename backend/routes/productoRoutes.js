import express from "express";
import multer from "multer";
import { 
  obtenerProductos,
  crearProducto,
  obtenerProductoPorId,
  actualizarProducto,
  eliminarProducto
} from "../controllers/productoController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(authMiddleware);

router.get("/:empresaId", obtenerProductos);
router.get("/:empresaId/:id", obtenerProductoPorId);
router.post("/:empresaId", upload.single('imagen'), crearProducto);
router.put("/:empresaId/:id", upload.single('imagen'), actualizarProducto);
router.delete("/:empresaId/:id", eliminarProducto);

export default router;