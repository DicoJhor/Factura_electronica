// backend/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import facturaRoutes from "./routes/facturaRoutes.js";
import productoRoutes from "./routes/productoRoutes.js";
import sunatRoutes from "./routes/sunatRoutes.js";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Asegurar que existan las carpetas necesarias
const folders = [
  "./backend/facturas",       // donde se guardan los PDFs
  "./backend/cdr",
  "./backend/certificados"
];
folders.forEach((f) => {
  const folderPath = path.resolve(f);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`📁 Carpeta creada: ${folderPath}`);
  }
});

// ✅ Rutas de la API
app.use("/api/facturas", facturaRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/sunat", sunatRoutes);

// ✅ Servir los PDFs generados como archivos públicos
app.use("/facturas", express.static(path.resolve("./backend/facturas")));

// ✅ Puerto del servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
  console.log(`📄 PDFs accesibles en http://localhost:${PORT}/facturas/F001-000001.pdf`);
});
