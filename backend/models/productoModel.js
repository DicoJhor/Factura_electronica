// backend/models/productoModel.js
import { pool } from "../config/db.js";

export const getProductos = async () => {
  const [rows] = await pool.query("SELECT * FROM productos WHERE estado = 'ACTIVO'");
  return rows;
};
