import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'facturador_multiempresa',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log('✓ Conectado a MySQL - Base de datos:', process.env.DB_NAME || 'facturador_multiempresa');
    connection.release();
  })
  .catch(err => {
    console.error('✗ Error al conectar a MySQL:', err);
  });