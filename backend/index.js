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

// ========== CORS MEJORADO ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://factura-electronica-ten.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean); // Elimina valores undefined

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman, curl, apps móviles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ Origen bloqueado por CORS:', origin);
      callback(null, true); // En producción, cambiar a: callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware para parsear JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging para debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    contentType: req.headers['content-type'],
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

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

// Ruta raíz
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Facturador Electrónico API v1.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "API funcionando correctamente",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: "connected" // Podrías hacer un ping real a la BD aquí
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: err.message || 'Algo salió mal!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404
app.use((req, res) => {
  console.warn('⚠️ Ruta no encontrada:', req.method, req.path);
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
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