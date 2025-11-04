// backend/controllers/productoController.js
import { getProductos } from "../models/productoModel.js";

export const obtenerProductos = async (req, res) => {
  try {
    const productos = await getProductos();
    res.json(productos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};
