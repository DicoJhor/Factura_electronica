import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import authRoutes from "./routes/authRoutes.js";
import empresaRoutes from "./routes/empresaRoutes.js";
import facturaRoutes from "./routes/facturaRoutes.js";
import productoRoutes from "./routes/productoRoutes.js";
import sunatRoutes from "./routes/sunatRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/empresas", empresaRoutes);
app.use("/api/facturas", facturaRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/sunat", sunatRoutes);

// Archivos estáticos
app.use("/facturas", express.static(path.resolve("./backend/facturas")));

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "API funcionando correctamente" });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Algo salió mal!' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend corriendo en puerto ${PORT}`);
  console.log(`📋 Rutas disponibles:`);
  console.log(`   🔐 Autenticación:`);
  console.log(`      - POST /api/auth/registro`);
  console.log(`      - POST /api/auth/login`);
  console.log(`      - GET  /api/auth/verificar`);
  console.log(`   🏢 Empresas:`);
  console.log(`      - GET  /api/empresas`);
  console.log(`      - POST /api/empresas`);
  console.log(`      - PUT  /api/empresas/:id`);
  console.log(`      - DELETE /api/empresas/:id`);
  console.log(`   📦 Productos:`);
  console.log(`      - GET  /api/productos/:empresaId`);
  console.log(`      - POST /api/productos/:empresaId`);
  console.log(`   📄 SUNAT:`);
  console.log(`      - POST /api/sunat/consultar-ruc`);
  console.log(`      - POST /api/sunat/reenviar`);
  console.log(`   📋 Facturas:`);
  console.log(`      - /api/facturas`);
});