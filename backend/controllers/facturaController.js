// backend/controllers/facturaController.js
import { generarYFirmarXML } from "../utils/generarYFirmarXML.js";
import { enviarFacturaASunat } from "../services/sunatService.js";
import { generarPDF } from "../utils/generarPDF.js";
import {
  crearFactura,
  agregarDetalle,
  actualizarEstado,
  generarSiguienteNumero,
  listarFacturas,
} from "../models/facturaModel.js";
import AdmZip from "adm-zip";
import path from "path";

export const emitirFactura = async (req, res) => {
  try {
    const body = req.body;

    if (!body.cliente) {
      return res.status(400).json({ 
        success: false, 
        message: "El campo 'cliente' es requerido" 
      });
    }

    if (!body.detalles || !Array.isArray(body.detalles) || body.detalles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Debe incluir al menos un item en 'detalles'" 
      });
    }

    // 1) Generar siguiente número de factura
    const numeroFactura = await generarSiguienteNumero();

    // 2) Crear factura en DB
    const facturaObj = {
      numero: numeroFactura,
      cliente: body.cliente,
      fecha_emision: body.fecha || new Date(),
      total: Number(body.total || 0),
      estado: "PENDIENTE",
    };
    const facturaId = await crearFactura(facturaObj);

    // 3) Guardar detalles
    for (const p of body.detalles) {
      const detalle = {
        producto: p.producto || "Item",
        cantidad: Number(p.cantidad || 1),
        precio_unitario: Number(p.precio_unitario || 0),
        subtotal: Number(p.subtotal || 0),
      };
      await agregarDetalle(facturaId, detalle);
    }

    // 4) Generar PDF local
    const pdfPath = await generarPDF(
      {
        numero: facturaObj.numero,
        cliente_nombre: facturaObj.cliente?.nombre || "—",
        cliente_documento: facturaObj.cliente?.ruc || facturaObj.cliente?.documento || "—",
        fecha_emision: facturaObj.fecha_emision,
        total: facturaObj.total,
      },
      body.detalles
    );

    // 5) Generar y firmar XML
    const signedPath = await generarYFirmarXML({
      numero: facturaObj.numero,
      cliente: facturaObj.cliente,
      total: facturaObj.total,
      productos: body.detalles,
    });

    // 6) Crear ZIP con XML firmado
    const nombreBase = path.basename(signedPath).replace("_signed.xml", "");
    const zipPath = path.resolve(`./facturas/${nombreBase}.zip`);
    const zip = new AdmZip();
    zip.addLocalFile(signedPath);
    zip.writeZip(zipPath);

    // 7) Enviar a SUNAT (solo si no estamos en modo desarrollo)
    const modoDesarrollo = process.env.MODO_DESARROLLO === "true";
    
    if (modoDesarrollo) {
      console.log("Modo desarrollo: Factura generada sin enviar a SUNAT");
      await actualizarEstado(facturaId, "GENERADA", null);
      
      res.json({
        success: true,
        status: "GENERADA",
        pdf: `/facturas/${path.basename(pdfPath)}`,
        id: facturaId,
        numero: numeroFactura,
        total: facturaObj.total,
      });
    } else {
      const resultado = await enviarFacturaASunat(zipPath, `${nombreBase}.zip`);

      if (resultado.success) {
        await actualizarEstado(facturaId, "ACEPTADA", resultado.cdrPath || null);
        res.json({
          success: true,
          status: "ACEPTADA",
          pdf: `/facturas/${path.basename(pdfPath)}`,
          cdr: resultado.cdrPath,
          id: facturaId,
          numero: numeroFactura,
          total: facturaObj.total,
        });
      } else {
        await actualizarEstado(facturaId, "RECHAZADA", resultado.message);
        res.status(200).json({
          success: false,
          status: "RECHAZADA",
          error: resultado.message,
          pdf: `/facturas/${path.basename(pdfPath)}`,
        });
      }
    }
  } catch (err) {
    console.error("emitirFactura err:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ FUNCIÓN CORREGIDA CON JOIN A LAS TABLAS
export const listar = async (req, res) => {
  try {
    const { empresaId } = req.query;
    const usuarioId = req.usuario?.id; // Obtener el ID del usuario autenticado
    
    console.log('📋 Listando facturas para empresaId:', empresaId);
    console.log('👤 Usuario ID:', usuarioId);
    
    // Llamar al modelo con los filtros necesarios
    const facturas = await listarFacturas(empresaId, usuarioId);
    
    console.log(`✅ Se encontraron ${facturas.length} facturas`);
    
    res.json(facturas);
  } catch (err) {
    console.error("❌ Error al listar facturas:", err);
    res.status(500).json({ 
      success: false,
      message: "Error al listar facturas",
      error: err.message 
    });
  }
};
