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
const folders = [
  "./backend/facturas",     
  "./backend/cdr",
  "./backend/certificados"
];
folders.forEach((f) => {
  const folderPath = path.resolve(f);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Carpeta creada: ${folderPath}`);
  }
});

app.use("/api/facturas", facturaRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/sunat", sunatRoutes);
app.use("/facturas", express.static(path.resolve("./backend/facturas")));
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
  console.log(`PDFs accesibles en http://localhost:${PORT}/facturas/F001-000001.pdf`);
});
