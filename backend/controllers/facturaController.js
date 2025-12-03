// backend/controllers/facturaController.js

import { generarYFirmarXML } from "../utils/generarYFirmarXML.js";
import { enviarFacturaASunat } from "../services/sunatService.js";
import { generarPDF } from "../utils/generarPDF.js";
import { pool } from "../config/db.js";

import {
  crearFactura,
  agregarDetalle,
  actualizarEstado,
  generarSiguienteNumero,
  listarFacturas
} from "../models/facturaModel.js";

import AdmZip from "adm-zip";
import path from "path";

export const emitirFactura = async (req, res) => {
  try {
    const body = req.body;

    // Validación: ahora aceptamos "cliente" en lugar de "cliente_id"
    if (!body.cliente && !body.cliente_id) {
      return res.status(400).json({
        success: false,
        message: "Debe incluir los datos del cliente"
      });
    }

    if (!body.empresa_id) {
      return res.status(400).json({
        success: false,
        message: "El campo empresa_id es requerido"
      });
    }

    if (!body.detalles || body.detalles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Debe incluir al menos un item en 'detalles'"
      });
    }

    // 🆕 1️⃣ BUSCAR O CREAR CLIENTE
    let clienteId;

    if (body.cliente_id) {
      // Si viene cliente_id directamente, lo usamos
      clienteId = body.cliente_id;
    } else if (body.cliente) {
      // Si vienen los datos del cliente, buscamos o creamos
      const { tipoDoc, numeroDoc, nombre, direccion } = body.cliente;

      // Buscar si el cliente ya existe
      const [clientesExistentes] = await pool.query(
        'SELECT id FROM clientes WHERE numero_doc = ? AND empresa_id = ?',
        [numeroDoc, body.empresa_id]
      );

      if (clientesExistentes.length > 0) {
        // Cliente ya existe
        clienteId = clientesExistentes[0].id;
        console.log(`✅ Cliente existente encontrado: ID ${clienteId}`);
      } else {
        // Crear nuevo cliente
        const [resultCliente] = await pool.query(
          `INSERT INTO clientes (empresa_id, tipo_doc, numero_doc, nombre, direccion, activo, creado_en) 
           VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [body.empresa_id, tipoDoc, numeroDoc, nombre, direccion || null]
        );
        clienteId = resultCliente.insertId;
        console.log(`✅ Nuevo cliente creado: ID ${clienteId}`);
      }
    }

    // 2️⃣ Obtener siguiente número
    const numero = await generarSiguienteNumero(body.serie || "C001");

    // 3️⃣ Armar comprobante
    const comprobanteData = {
      empresa_id: body.empresa_id,
      cliente_id: clienteId,
      usuario_id: req.user?.id || 1,
      tipo: body.tipo || "01",
      serie: body.serie || "C001",
      numero,
      fecha_emision: body.fecha_emision || new Date(),
      fecha_vencimiento: body.fecha_vencimiento || null,
      moneda: body.moneda || "PEN",
      tipo_cambio: body.tipo_cambio || 1,
      forma_pago: body.forma_pago || "CONTADO",
      subtotal: body.subtotal,
      igv: body.igv,
      total: body.total,
      descuento: body.descuento || 0,
      observaciones: body.observaciones || null,
      estado: "PENDIENTE"
    };

    const comprobanteId = await crearFactura(comprobanteData);

    // 4️⃣ Guardar detalles
    for (const item of body.detalles) {
      const subtotalItem = item.subtotal || (item.cantidad * item.precio_unitario);
      const igvItem = item.igv || (subtotalItem * 0.18);
      const totalItem = item.total || (subtotalItem + igvItem);

      // 🔧 Si no hay producto_id, intentamos buscar o crear uno genérico
      let productoId = item.producto_id;
      
      if (!productoId) {
        // Buscar si existe un producto genérico
        const [productosGenericos] = await pool.query(
          'SELECT id FROM productos WHERE empresa_id = ? LIMIT 1',
          [body.empresa_id]
        );

        if (productosGenericos.length > 0) {
          productoId = productosGenericos[0].id;
        } else {
          // 🔧 Crear un producto genérico con las columnas correctas
          const [resultProducto] = await pool.query(
            `INSERT INTO productos (
              empresa_id, codigo, nombre, descripcion, precio, 
              stock, stock_minimo, unidad_medida, afecto_igv, estado, creado_en
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              body.empresa_id, 
              'GEN-001', 
              'PRODUCTO GENÉRICO', 
              'Producto genérico para comprobantes', 
              0, 
              0, 
              0, 
              'NIU', 
              1, 
              'activo'
            ]
          );
          productoId = resultProducto.insertId;
          console.log(`✅ Producto genérico creado: ID ${productoId}`);
        }
      }

      await agregarDetalle(comprobanteId, {
        producto_id: productoId,
        cantidad: item.cantidad,
        unidad_medida: item.unidad_medida || 'NIU',
        descripcion: item.descripcion,
        precio_unitario: item.precio_unitario,
        descuento: item.descuento || 0,
        afecto_igv: item.afecto_igv !== undefined ? item.afecto_igv : 1,
        igv: igvItem,
        subtotal: subtotalItem,
        total: totalItem
      });
    }

    // 5️⃣ Generar PDF
    const pdfPath = await generarPDF(
      { 
        serie: comprobanteData.serie,
        numero: comprobanteData.numero,
        total: comprobanteData.total,
        fecha_emision: comprobanteData.fecha_emision
      },
      body.detalles
    );

    // 6️⃣ Generar XML
    const xmlPath = await generarYFirmarXML({
      serie: comprobanteData.serie,
      numero: comprobanteData.numero,
      total: comprobanteData.total,
      cliente_id: clienteId,
      productos: body.detalles
    });

    // 7️⃣ Crear ZIP con nombre correcto para SUNAT
    // Obtener el RUC de la empresa
    const [empresaData] = await pool.query(
      'SELECT ruc FROM empresas WHERE id = ?',
      [body.empresa_id]
    );

    if (!empresaData || empresaData.length === 0) {
      throw new Error('No se encontró la empresa');
    }

    const ruc = empresaData[0].ruc;

    // Determinar el código de tipo de comprobante según catálogo SUNAT
    const tipoCpe = comprobanteData.tipo === '01' ? '01' : '03'; // 01=Factura, 03=Boleta

    // Formato correcto: RUC-TIPO_CPE-SERIE-NUMERO
    const nombreBase = `${ruc}-${tipoCpe}-${comprobanteData.serie}-${String(numero).padStart(6, "0")}`;

    console.log(`📦 Nombre del archivo ZIP: ${nombreBase}.zip`);

    const zipPath = path.resolve(`./facturas/${nombreBase}.zip`);

    const zip = new AdmZip();
    zip.addLocalFile(xmlPath);
    zip.writeZip(zipPath);

    // 8️⃣ Enviar a SUNAT (si no está en modo desarrollo)
    const modoDesarrollo = process.env.MODO_DESARROLLO === "true";

    if (modoDesarrollo) {
      await actualizarEstado(comprobanteId, "GENERADA", null);

      return res.json({
        success: true,
        status: "GENERADA",
        id: comprobanteId,
        serie: comprobanteData.serie,
        numero,
        pdf: `/facturas/${path.basename(pdfPath)}`
      });
    }

    const resultado = await enviarFacturaASunat(zipPath, nombreBase);

    if (resultado.success) {
      await actualizarEstado(comprobanteId, "ACEPTADA", resultado.cdrPath || null);

      return res.json({
        success: true,
        status: "ACEPTADA",
        id: comprobanteId,
        pdf: `/facturas/${path.basename(pdfPath)}`,
        cdr: resultado.cdrPath
      });
    } else {
      await actualizarEstado(comprobanteId, "RECHAZADA", resultado.message);

      return res.json({
        success: false,
        status: "RECHAZADA",
        error: resultado.message,
        pdf: `/facturas/${path.basename(pdfPath)}`
      });
    }

  } catch (err) {
    console.error("❌ emitirFactura err:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// En tu facturaController.js, actualiza el método listar:

export const listar = async (req, res) => {
  try {
    // 🔧 CORREGIDO: Obtener empresaId de los params o query
    const empresaId = req.params.empresaId || req.query.empresaId;
    
    console.log('📋 Solicitud de listado de facturas para empresa:', empresaId);

    if (!empresaId) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro empresaId es requerido'
      });
    }

    console.log('📋 Listando facturas para empresa ID:', empresaId);

    const facturas = await listarFacturas(empresaId);

    console.log(`✅ Se encontraron ${facturas.length} facturas para la empresa ${empresaId}`);

    res.json({
      success: true,
      data: facturas,
      total: facturas.length
    });
  } catch (err) {
    console.error("❌ Error al listar facturas:", err);
    res.status(500).json({
      success: false,
      message: "Error al listar facturas",
      error: err.message
    });
  }
};
