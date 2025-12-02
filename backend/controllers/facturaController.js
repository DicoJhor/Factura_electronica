// backend/controllers/facturaController.js

import { generarYFirmarXML } from "../utils/generarYFirmarXML.js";
import { enviarFacturaASunat } from "../services/sunatService.js";
import { generarPDF } from "../utils/generarPDF.js";

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

    if (!body.cliente_id) {
      return res.status(400).json({
        success: false,
        message: "El campo cliente_id es requerido"
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

    // 1️⃣ Obtener siguiente número
    const numero = await generarSiguienteNumero(body.serie || "C001");

    // 2️⃣ Armar comprobante
    const comprobanteData = {
      empresa_id: body.empresa_id,
      cliente_id: body.cliente_id,
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

    // 3️⃣ Guardar detalles
    for (const item of body.detalles) {
      await agregarDetalle(comprobanteId, {
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        unidad_medida: item.unidad_medida,
        descripcion: item.descripcion,
        precio_unitario: item.precio_unitario,
        descuento: item.descuento,
        afecto_igv: item.afecto_igv,
        igv: item.igv,
        subtotal: item.subtotal,
        total: item.total
      });
    }

    // 4️⃣ Generar PDF
    const pdfPath = await generarPDF(
      { 
        serie: comprobanteData.serie,
        numero: comprobanteData.numero,
        total: comprobanteData.total,
        fecha_emision: comprobanteData.fecha_emision
      },
      body.detalles
    );

    // 5️⃣ Generar XML
    const xmlPath = await generarYFirmarXML({
      serie: comprobanteData.serie,
      numero: comprobanteData.numero,
      total: comprobanteData.total,
      cliente_id: comprobanteData.cliente_id,
      productos: body.detalles
    });

    // 6️⃣ Crear ZIP
    const nombreBase = `${comprobanteData.serie}-${String(numero).padStart(6, "0")}`;
    const zipPath = path.resolve(`./facturas/${nombreBase}.zip`);

    const zip = new AdmZip();
    zip.addLocalFile(xmlPath);
    zip.writeZip(zipPath);

    // 7️⃣ Enviar a SUNAT (si no está en modo desarrollo)
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

    const resultado = await enviarFacturaASunat(zipPath, `${nombreBase}.zip`);

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
    console.error("emitirFactura err:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listar = async (req, res) => {
  try {
    const { empresaId } = req.query;
    const facturas = await listarFacturas(empresaId);

    res.json({
      success: true,
      data: facturas
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
