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
  if (rows.length === 0) return 1;
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
  // 🔧 Mapear estados a valores que probablemente existan en el ENUM
  const estadosPermitidos = {
    'PENDIENTE': 'PENDIENTE',
    'GENERADA': 'EMITIDO',      // Cambiado
    'ACEPTADA': 'ACEPTADO',      // Cambiado
    'RECHAZADA': 'ANULADO',      // Cambiado (porque RECHAZADA no existe)
    'ANULADA': 'ANULADO'
  };

  const estadoFinal = estadosPermitidos[estado] || 'PENDIENTE';
  
  // 🔧 Truncar mensaje a máximo 255 caracteres
  const mensajeTruncado = mensaje ? mensaje.substring(0, 255) : null;

  try {
    await pool.query(
      `UPDATE comprobantes SET estado = ?, mensaje_sunat = ? WHERE id = ?`,
      [estadoFinal, mensajeTruncado, comprobanteId]
    );
  } catch (error) {
    // Si falla, intentar solo con PENDIENTE
    console.error('Error actualizando estado, usando PENDIENTE:', error.message);
    await pool.query(
      `UPDATE comprobantes SET estado = 'PENDIENTE', mensaje_sunat = ? WHERE id = ?`,
      [mensajeTruncado, comprobanteId]
    );
  }
};

/*
 * 5️⃣ Listar comprobantes con JOIN a detalles
 * 🔧 CORREGIDO: Ahora filtra por empresa_id
 */
export const listarFacturas = async (empresaId) => {
  // Validar que empresaId existe
  if (!empresaId) {
    throw new Error('El parámetro empresaId es requerido');
  }

  console.log(`📋 Listando facturas para empresa ID: ${empresaId}`);

  const [rows] = await pool.query(`
    SELECT 
      c.id,
      c.empresa_id,
      c.serie,
      c.numero,
      c.tipo,
      c.total,
      c.estado,
      c.fecha_emision,
      c.mensaje_sunat,
      c.xml_firmado,
      c.cdr_sunat,
      cl.nombre AS cliente_nombre,
      cl.numero_doc AS cliente_documento,
      cl.tipo_doc AS cliente_tipo_doc,
      GROUP_CONCAT(CONCAT(d.descripcion, ' x', d.cantidad) SEPARATOR ', ') AS detalles
    FROM comprobantes c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN detalle_comprobante d ON d.comprobante_id = c.id
    WHERE c.empresa_id = ?
    GROUP BY c.id
    ORDER BY c.id DESC
  `, [empresaId]);

  console.log(`✅ Se encontraron ${rows.length} facturas para la empresa ${empresaId}`);

  return rows;
};

/*
 * 6️⃣ Obtener una factura específica por ID
 */
export const obtenerFacturaPorId = async (id, empresaId) => {
  const query = empresaId
    ? `SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.numero_doc as cliente_documento,
        cl.tipo_doc as cliente_tipo_doc,
        cl.direccion as cliente_direccion
      FROM comprobantes c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ? AND c.empresa_id = ?`
    : `SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.numero_doc as cliente_documento,
        cl.tipo_doc as cliente_tipo_doc,
        cl.direccion as cliente_direccion
      FROM comprobantes c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ?`;

  const params = empresaId ? [id, empresaId] : [id];

  const [rows] = await pool.query(query, params);

  return rows[0] || null;
};

/*
 * 7️⃣ Obtener los detalles de una factura
 */
export const obtenerDetallesFactura = async (comprobanteId) => {
  const [rows] = await pool.query(
    `SELECT 
      cd.*,
      p.codigo as producto_codigo,
      p.nombre as producto_nombre
    FROM detalle_comprobante cd
    LEFT JOIN productos p ON cd.producto_id = p.id
    WHERE cd.comprobante_id = ?
    ORDER BY cd.id`,
    [comprobanteId]
  );

  return rows;
};

/*
 * 8️⃣ Actualizar las rutas de archivos generados (XML, CDR)
 */
export const actualizarArchivos = async (comprobanteId, archivos) => {
  const updates = [];
  const params = [];

  if (archivos.xml_firmado) {
    updates.push('xml_firmado = ?');
    params.push(archivos.xml_firmado);
  }

  if (archivos.cdr_sunat) {
    updates.push('cdr_sunat = ?');
    params.push(archivos.cdr_sunat);
  }

  if (updates.length === 0) {
    return;
  }

  params.push(comprobanteId);

  const query = `UPDATE comprobantes SET ${updates.join(', ')} WHERE id = ?`;

  await pool.query(query, params);
};

/*
 * 9️⃣ Eliminar una factura (soft delete)
 */
export const eliminarFactura = async (id, empresaId) => {
  await pool.query(
    `UPDATE comprobantes 
     SET estado = 'ANULADO', actualizado_en = NOW() 
     WHERE id = ? AND empresa_id = ?`,
    [id, empresaId]
  );
};

/*
 * 🔟 Obtener estadísticas de facturas por empresa
 */
export const obtenerEstadisticas = async (empresaId) => {
  const [rows] = await pool.query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN estado = 'ACEPTADO' THEN 1 ELSE 0 END) as aceptadas,
      SUM(CASE WHEN estado = 'ANULADO' THEN 1 ELSE 0 END) as rechazadas,
      SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN estado = 'EMITIDO' THEN 1 ELSE 0 END) as generadas,
      SUM(total) as total_monto
    FROM comprobantes
    WHERE empresa_id = ?`,
    [empresaId]
  );

  return rows[0];
};
