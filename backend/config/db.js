// backend/config/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "admin", // 👈 coloca aquí tu contraseña si tienes una
  database: process.env.DB_NAME || "facturador_db",
  port: process.env.DB_PORT || 3306,
});
