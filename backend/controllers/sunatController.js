// backend/controllers/sunatController.js
import { enviarFacturaASunat } from "../services/sunatService.js";

export const reenviarASunat = async (req, res) => {
  const { zipPath, nombreArchivo } = req.body;
  try {
    const resultado = await enviarFacturaASunat(zipPath, nombreArchivo);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
