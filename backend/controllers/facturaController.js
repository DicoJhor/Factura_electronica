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

// Detectar si está en modo demo
const MODO_DEMO = process.env.MODO_DEMO === 'true' || process.env.SUNAT_AMBIENTE === 'demo';

export const emitirFactura = async (req, res) => {
  try {
    const body = req.body;

    // Validaciones básicas
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

    console.log("\n🎬 ========== INICIANDO EMISIÓN DE COMPROBANTE ==========");
    if (MODO_DEMO) {
      console.log("🎭 MODO DEMOSTRACIÓN ACTIVADO - Todo saldrá exitoso");
    }

    // 1️⃣ BUSCAR O CREAR CLIENTE
    let clienteId;
    let clienteData;

    if (body.cliente_id) {
      clienteId = body.cliente_id;
      const [clienteRows] = await pool.query(
        'SELECT * FROM clientes WHERE id = ? AND empresa_id = ?',
        [clienteId, body.empresa_id]
      );
      
      if (clienteRows.length === 0) {
        throw new Error('Cliente no encontrado');
      }
      
      clienteData = clienteRows[0];
      console.log(`✅ Cliente encontrado: ${clienteData.nombre}`);
      
    } else if (body.cliente) {
      const { tipoDoc, numeroDoc, nombre, direccion } = body.cliente;

      const [clientesExistentes] = await pool.query(
        'SELECT * FROM clientes WHERE numero_doc = ? AND empresa_id = ?',
        [numeroDoc, body.empresa_id]
      );

      if (clientesExistentes.length > 0) {
        clienteData = clientesExistentes[0];
        clienteId = clienteData.id;
        console.log(`✅ Cliente existente: ID ${clienteId}`);
      } else {
        const [resultCliente] = await pool.query(
          `INSERT INTO clientes (empresa_id, tipo_doc, numero_doc, nombre, direccion, activo, creado_en) 
           VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [body.empresa_id, tipoDoc, numeroDoc, nombre, direccion || null]
        );
        clienteId = resultCliente.insertId;
        
        const [nuevoCliente] = await pool.query(
          'SELECT * FROM clientes WHERE id = ?',
          [clienteId]
        );
        clienteData = nuevoCliente[0];
        
        console.log(`✅ Nuevo cliente creado: ID ${clienteId}`);
      }
    }

    // 2️⃣ Obtener siguiente número
    const numero = await generarSiguienteNumero(body.serie || "B001");
    console.log(`📝 Número asignado: ${body.serie || "B001"}-${numero}`);

    // 3️⃣ Armar comprobante
    const comprobanteData = {
      empresa_id: body.empresa_id,
      cliente_id: clienteId,
      usuario_id: req.user?.id || 1,
      tipo: body.tipo || "03",
      serie: body.serie || "B001",
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
    console.log(`✅ Comprobante creado en BD: ID ${comprobanteId}`);

    // 4️⃣ Guardar detalles
    for (const item of body.detalles) {
      const subtotalItem = item.subtotal || (item.cantidad * item.precio_unitario);
      const igvItem = item.igv || (subtotalItem * 0.18);
      const totalItem = item.total || (subtotalItem + igvItem);

      let productoId = item.producto_id;
      
      if (!productoId) {
        const [productosGenericos] = await pool.query(
          'SELECT id FROM productos WHERE empresa_id = ? LIMIT 1',
          [body.empresa_id]
        );

        if (productosGenericos.length > 0) {
          productoId = productosGenericos[0].id;
        } else {
          const [resultProducto] = await pool.query(
            `INSERT INTO productos (
              empresa_id, codigo, nombre, descripcion, precio, 
              stock, stock_minimo, unidad_medida, afecto_igv, estado, creado_en
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              body.empresa_id, 'GEN-001', 'PRODUCTO GENÉRICO', 
              'Producto genérico para comprobantes', 0, 0, 0, 'NIU', 1, 'activo'
            ]
          );
          productoId = resultProducto.insertId;
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

    console.log(`✅ Detalles guardados: ${body.detalles.length} items`);

    // 5️⃣ Calcular nombre base del archivo
    const [empresaData] = await pool.query(
      'SELECT ruc FROM empresas WHERE id = ?',
      [body.empresa_id]
    );

    if (!empresaData || empresaData.length === 0) {
      throw new Error('No se encontró la empresa');
    }

    const ruc = empresaData[0].ruc;
    const tipoCpe = comprobanteData.tipo === '01' ? '01' : '03';
    const nombreBase = `${ruc}-${tipoCpe}-${comprobanteData.serie}-${String(numero).padStart(8, "0")}`;

    console.log(`📦 Nombre comprobante: ${nombreBase}`);

    // 6️⃣ Generar PDF
    const pdfPath = await generarPDF(
      { 
        serie: comprobanteData.serie,
        numero: comprobanteData.numero,
        total: comprobanteData.total,
        fecha_emision: comprobanteData.fecha_emision
      },
      body.detalles
    );

    console.log(`✅ PDF generado: ${path.basename(pdfPath)}`);

    // 7️⃣ Generar y firmar XML
    const xmlPath = await generarYFirmarXML({
      serie: comprobanteData.serie,
      numero: comprobanteData.numero,
      total: comprobanteData.total,
      cliente_id: clienteId,
      empresa_id: body.empresa_id,
      cliente: {
        ruc: clienteData.numero_doc,
        documento: clienteData.numero_doc,
        nombre: clienteData.nombre,
        direccion: clienteData.direccion,
        tipoDoc: clienteData.tipo_doc === 'RUC' ? '6' : '1'
      },
      productos: body.detalles,
      nombreArchivo: nombreBase
    });

    console.log(`✅ XML firmado: ${path.basename(xmlPath)}`);

    // 8️⃣ Crear ZIP
    const zipPath = path.resolve(`./facturas/${nombreBase}.zip`);
    const zip = new AdmZip();
    zip.addLocalFile(xmlPath);
    zip.writeZip(zipPath);

    console.log(`✅ ZIP creado: ${path.basename(zipPath)}`);

    // 9️⃣ Enviar a SUNAT (o simular en modo demo)
    const resultado = await enviarFacturaASunat(zipPath, nombreBase);

    if (resultado.success) {
      // ✅ ÉXITO - Actualizar estado a ACEPTADA
      await actualizarEstado(comprobanteId, "ACEPTADA", resultado.cdrPath || null);

      console.log("✅ ========== COMPROBANTE ACEPTADO ==========");
      if (resultado.demo) {
        console.log("🎭 MODO DEMO: Simulación exitosa");
      }
      console.log(`📄 Serie-Número: ${comprobanteData.serie}-${numero}`);
      console.log(`💰 Total: S/ ${comprobanteData.total}`);
      console.log("==============================================\n");

      return res.json({
        success: true,
        status: "ACEPTADA",
        message: resultado.demo 
          ? "🎭 Comprobante generado exitosamente (Modo Demostración)" 
          : "Comprobante aceptado por SUNAT",
        data: {
          id: comprobanteId,
          serie: comprobanteData.serie,
          numero: numero,
          tipo: comprobanteData.tipo === '01' ? 'FACTURA' : 'BOLETA',
          total: comprobanteData.total,
          cliente: clienteData.nombre,
          pdf: `/facturas/${path.basename(pdfPath)}`,
          xml: `/facturas/${nombreBase}.xml`,
          cdr: resultado.cdrPath ? `/facturas/${path.basename(resultado.cdrPath)}` : null,
          demo: resultado.demo || false
        }
      });
    } else {
      // ❌ ERROR - Actualizar estado a RECHAZADA
      await actualizarEstado(comprobanteId, "RECHAZADA", resultado.message);

      console.error("❌ ========== COMPROBANTE RECHAZADO ==========");
      console.error(`Error: ${resultado.message}`);
      console.error("==============================================\n");

      return res.json({
        success: false,
        status: "RECHAZADA",
        message: "Error al enviar a SUNAT",
        error: resultado.message,
        data: {
          id: comprobanteId,
          pdf: `/facturas/${path.basename(pdfPath)}`
        }
      });
    }

  } catch (err) {
    console.error("❌ Error general:", err.message);
    console.error(err.stack);
    res.status(500).json({ 
      success: false, 
      message: err.message,
      error: err.toString()
    });
  }
};

export const listar = async (req, res) => {
  try {
    const empresaId = req.params.empresaId || req.query.empresaId;
    
    if (!empresaId) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro empresaId es requerido'
      });
    }

    const facturas = await listarFacturas(empresaId);

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
