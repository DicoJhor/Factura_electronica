import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

import authRoutes from "./routes/authRoutes.js";
import empresaRoutes from "./routes/empresaRoutes.js";
import facturaRoutes from "./routes/facturaRoutes.js";
import productoRoutes from "./routes/productoRoutes.js";
import sunatRoutes from "./routes/sunatRoutes.js";

dotenv.config();

// Fix para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ CORS configurado correctamente para múltiples orígenes
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://factura-electronica-ten.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para origen:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Crear carpetas necesarias
const folders = [
  path.join(__dirname, "facturas"),
  path.join(__dirname, "cdr"),
  path.join(__dirname, "certificados")
];

folders.forEach((folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`📁 Carpeta creada: ${folderPath}`);
  }
});

// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/empresas", empresaRoutes);
app.use("/api/facturas", facturaRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/sunat", sunatRoutes);

// Archivos estáticos
app.use("/facturas", express.static(path.join(__dirname, "facturas")));

// Ruta de salud
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Facturador API v1.0",
    allowedOrigins: allowedOrigins,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "API funcionando correctamente",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    error: err.message || 'Algo salió mal!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path 
  });
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Host: ${HOST}:${PORT}`);
  console.log(`🔓 CORS habilitado para:`, allowedOrigins);
  console.log(`========================================\n`);
  
  console.log(`📋 Rutas API disponibles:`);
  console.log(`   🏠 GET  / - Info del servidor`);
  console.log(`   ❤️  GET  /api/health - Health check\n`);
  console.log(`   🔐 Autenticación:`);
  console.log(`      - POST /api/auth/registro`);
  console.log(`      - POST /api/auth/login`);
  console.log(`      - GET  /api/auth/verificar\n`);
  console.log(`   🏢 Empresas:`);
  console.log(`      - GET    /api/empresas`);
  console.log(`      - POST   /api/empresas`);
  console.log(`      - GET    /api/empresas/:id`);
  console.log(`      - PUT    /api/empresas/:id`);
  console.log(`      - PATCH  /api/empresas/:id/principal`);
  console.log(`      - DELETE /api/empresas/:id\n`);
  console.log(`   📦 Productos:`);
  console.log(`      - GET    /api/productos/:empresaId`);
  console.log(`      - POST   /api/productos/:empresaId`);
  console.log(`      - GET    /api/productos/:empresaId/:id`);
  console.log(`      - PUT    /api/productos/:empresaId/:id`);
  console.log(`      - DELETE /api/productos/:empresaId/:id\n`);
  console.log(`   📄 SUNAT:`);
  console.log(`      - POST /api/sunat/consultar-ruc`);
  console.log(`      - POST /api/sunat/reenviar\n`);
  console.log(`   📋 Facturas:`);
  console.log(`      - GET  /api/facturas`);
  console.log(`      - POST /api/facturas`);
  console.log(`========================================\n`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});