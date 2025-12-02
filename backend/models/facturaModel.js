// backend/models/facturaModel.js
import { pool } from "../config/db.js";

/*
 * 1️⃣ Generar siguiente número de comprobante según la serie
 */
export const generarSiguienteNumero = async (serie = "C001") => {
  const [rows] = await pool.query(
    `SELECT numero FROM comprobantes 
     WHERE serie = ? 
     ORDER BY id DESC 
     LIMIT 1`,
    [serie]
  );

  if (rows.length === 0) return 1; // Si no hay comprobantes todavía -> empieza desde 1

  return rows[0].numero + 1;
};

/*
 * 2️⃣ Crear comprobante principal (comprobantes)
 */
export const crearFactura = async (data) => {
  const {
    empresa_id,
    cliente_id,
    usuario_id,
    tipo,
    serie,
    numero,
    fecha_emision,
    fecha_vencimiento,
    moneda,
    tipo_cambio,
    forma_pago,
    subtotal,
    igv,
    total,
    descuento,
    observaciones,
    estado
  } = data;

  const [result] = await pool.query(
    `INSERT INTO comprobantes (
      empresa_id, cliente_id, usuario_id, tipo, serie, numero,
      fecha_emision, fecha_vencimiento, moneda, tipo_cambio, forma_pago,
      subtotal, igv, total, descuento, observaciones, estado, creado_en
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      empresa_id,
      cliente_id,
      usuario_id,
      tipo,
      serie,
      numero,
      fecha_emision,
      fecha_vencimiento,
      moneda,
      tipo_cambio,
      forma_pago,
      subtotal,
      igv,
      total,
      descuento,
      observaciones,
      estado || "PENDIENTE"
    ]
  );

  return result.insertId;
};

/*
 * 3️⃣ Agregar detalle (detalle_comprobante)
 */
export const agregarDetalle = async (comprobanteId, detalle) => {
  await pool.query(
    `INSERT INTO detalle_comprobante (
      comprobante_id, producto_id, cantidad, unidad_medida, descripcion,
      precio_unitario, descuento, afecto_igv, igv, subtotal, total
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      comprobanteId,
      detalle.producto_id,
      detalle.cantidad,
      detalle.unidad_medida,
      detalle.descripcion,
      detalle.precio_unitario,
      detalle.descuento,
      detalle.afecto_igv,
      detalle.igv,
      detalle.subtotal,
      detalle.total
    ]
  );
};

/*
 * 4️⃣ Actualizar estado del comprobante (estado + mensaje SUNAT)
 */
export const actualizarEstado = async (comprobanteId, estado, mensaje = null) => {
  await pool.query(
    `UPDATE comprobantes SET estado = ?, mensaje_sunat = ? WHERE id = ?`,
    [estado, mensaje, comprobanteId]
  );
};

/*
 * 5️⃣ Listar comprobantes con JOIN a detalles
 */
export const listarFacturas = async () => {
  const [rows] = await pool.query(`
    SELECT 
      c.id,
      c.serie,
      c.numero,
      c.tipo,
      c.total,
      c.estado,
      c.fecha_emision,
      c.mensaje_sunat,
      cl.nombre AS cliente_nombre,
      cl.documento AS cliente_documento,
      GROUP_CONCAT(CONCAT(d.descripcion, ' x', d.cantidad) SEPARATOR ', ') AS detalles
    FROM comprobantes c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN detalle_comprobante d ON d.comprobante_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
  `);

  return rows;
};
