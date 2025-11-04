// backend/services/sunatService.js
import fs from "fs";
import path from "path";
import soap from "soap";
import https from "https";
import { sunatConfig } from "../config/sunat.js";

/**
 * Descarga un archivo con autenticación HTTP Basic
 */
const descargarConAuth = (url, username, password) => {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    
    const options = {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      rejectUnauthorized: false,
    };

    https.get(url, options, (res) => {
      if (res.statusCode === 401) {
        reject(new Error("Error 401: Credenciales incorrectas"));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Error HTTP ${res.statusCode}`));
        return;
      }

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve(data);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
};

export const enviarFacturaASunat = async (zipPath, zipName) => {
  let wsdlTempPath = null;
  let wsdlImportPath = null;

  try {
    console.log("📤 Iniciando envío a SUNAT...");
    console.log("📦 Archivo:", zipName);
    console.log("🔧 Modo:", sunatConfig.mode);

    // Validar que el archivo existe
    if (!fs.existsSync(zipPath)) {
      throw new Error(`Archivo ZIP no encontrado: ${zipPath}`);
    }

    // Leer ZIP en base64
    const zipBuffer = fs.readFileSync(zipPath);
    const zipContent = zipBuffer.toString("base64");
    console.log("📏 Tamaño ZIP:", zipBuffer.length, "bytes");

    // URLs del servicio
    const baseURL =
      sunatConfig.mode === "beta"
        ? "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"
        : "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService";

    const wsdlURL = `${baseURL}?wsdl`;
    const wsdlImportURL = `${baseURL}?ns1.wsdl`;

    console.log("🌐 WSDL Base:", wsdlURL);

    // Preparar credenciales
    const username = `${sunatConfig.ruc}${sunatConfig.user}`;
    const password = sunatConfig.pass;

    console.log("🔐 Usuario:", username);
    console.log("🔐 Contraseña:", password.substring(0, 3) + "***");

    // Crear carpeta temporal para WSDL
    const tempFolder = path.resolve("./temp");
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder, { recursive: true });
    }

    // ✅ Descargar WSDL principal
    console.log("📥 Descargando WSDL principal...");
    let wsdlContent = await descargarConAuth(wsdlURL, username, password);
    console.log("✅ WSDL principal descargado");

    // ✅ Descargar WSDL importado (ns1.wsdl)
    console.log("📥 Descargando WSDL importado (ns1.wsdl)...");
    const wsdlImportContent = await descargarConAuth(wsdlImportURL, username, password);
    console.log("✅ WSDL importado descargado");

    // Guardar WSDL importado
    wsdlImportPath = path.join(tempFolder, "billService_ns1.wsdl");
    fs.writeFileSync(wsdlImportPath, wsdlImportContent);

    // Modificar el WSDL principal para que apunte al archivo local
    wsdlContent = wsdlContent.replace(
      'location="billService?ns1.wsdl"',
      `location="file:///${wsdlImportPath.replace(/\\/g, "/")}"`
    );

    // Guardar WSDL principal modificado
    wsdlTempPath = path.join(tempFolder, "billService.wsdl");
    fs.writeFileSync(wsdlTempPath, wsdlContent);
    console.log("💾 WSDL guardado temporalmente en:", wsdlTempPath);

    // Crear cliente SOAP desde archivo local
    const client = await soap.createClientAsync(wsdlTempPath, {
      endpoint: baseURL,
      wsdl_options: {
        timeout: 60000,
      },
      request_timeout: 60000,
    });

    console.log("✅ Cliente SOAP creado");

    // Configurar autenticación HTTP Basic
    const basicAuth = new soap.BasicAuthSecurity(username, password);
    client.setSecurity(basicAuth);

    console.log("🔒 Seguridad BasicAuth configurada");

    // Preparar argumentos para sendBill
    const args = {
      fileName: zipName,
      contentFile: zipContent,
    };

    console.log("📤 Enviando solicitud a SUNAT...");

    // Ejecutar método sendBill
    const result = await Promise.race([
      client.sendBillAsync(args),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout: SUNAT no respondió en 60 segundos")),
          60000
        )
      ),
    ]);

    console.log("📥 Respuesta recibida de SUNAT");

    // Extraer resultado
    const [response] = Array.isArray(result) ? result : [result];

    console.log("🔍 Analizando respuesta...");

    // Verificar si hay respuesta
    if (!response) {
      console.error("❌ Respuesta vacía de SUNAT");
      return {
        success: false,
        message: "SUNAT devolvió una respuesta vacía",
      };
    }

    // Log completo en modo beta
    if (sunatConfig.mode === "beta") {
      console.log("📋 Respuesta completa:", JSON.stringify(response, null, 2));
    }

    // Verificar si SUNAT aceptó la factura
    if (response.applicationResponse) {
      console.log("✅ SUNAT aceptó el comprobante");

      // Decodificar CDR (Constancia de Recepción)
      const cdrData = Buffer.from(response.applicationResponse, "base64");

      // Crear carpeta CDR si no existe
      const cdrFolder = path.resolve("./facturas/cdr");
      if (!fs.existsSync(cdrFolder)) {
        fs.mkdirSync(cdrFolder, { recursive: true });
      }

      // Guardar CDR
      const cdrFileName = `R-${zipName}`;
      const cdrPath = path.join(cdrFolder, cdrFileName);
      fs.writeFileSync(cdrPath, cdrData);

      console.log("💾 CDR guardado en:", cdrPath);

      return {
        success: true,
        cdrPath,
        message: "Comprobante aceptado por SUNAT",
      };
    }

    // Verificar errores SOAP
    if (response.faultcode || response.faultstring) {
      const errorCode = response.faultcode || "UNKNOWN";
      const errorMessage = response.faultstring || "Error desconocido";

      console.error("❌ Error SOAP:", errorCode, "-", errorMessage);

      return {
        success: false,
        message: `${errorCode}: ${errorMessage}`,
      };
    }

    // Respuesta inesperada
    console.error("⚠️ Respuesta inesperada de SUNAT:", response);
    return {
      success: false,
      message: "Respuesta inesperada de SUNAT. Revisa los logs.",
    };

  } catch (err) {
    console.error("❌ Error en enviarFacturaASunat:", err);

    let errorMessage = "Error al comunicarse con SUNAT";

    if (err.message) {
      errorMessage = err.message;
    }

    if (err.message?.includes("401")) {
      errorMessage = "❌ Error 401: Credenciales incorrectas. Verifica RUC, usuario y contraseña";
    }

    if (err.root?.Envelope?.Body?.Fault) {
      const fault = err.root.Envelope.Body.Fault;
      errorMessage = fault.faultstring || fault.faultcode || errorMessage;
    }

    if (err.code === "ECONNREFUSED") {
      errorMessage = "No se pudo conectar con SUNAT (ECONNREFUSED)";
    } else if (err.code === "ETIMEDOUT") {
      errorMessage = "Timeout al conectar con SUNAT";
    } else if (err.code === "ENOTFOUND") {
      errorMessage = "No se pudo resolver el dominio de SUNAT";
    }

    return {
      success: false,
      message: errorMessage,
      errorCode: err.code || "UNKNOWN",
    };

  } finally {
    // Limpiar archivos temporales
    try {
      if (wsdlTempPath && fs.existsSync(wsdlTempPath)) {
        fs.unlinkSync(wsdlTempPath);
        console.log("🗑️  WSDL temporal eliminado");
      }
      if (wsdlImportPath && fs.existsSync(wsdlImportPath)) {
        fs.unlinkSync(wsdlImportPath);
        console.log("🗑️  WSDL importado eliminado");
      }
    } catch (cleanupErr) {
      console.warn("⚠️  No se pudieron eliminar archivos temporales:", cleanupErr.message);
    }
  }
};