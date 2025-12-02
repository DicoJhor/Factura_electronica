// backend/services/sunatService.js
import fs from "fs";
import path from "path";
import soap from "soap";
import https from "https";
import { sunatConfig } from "../config/sunat.js";

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
  let archivosTemporales = [];

  try {
    console.log("Iniciando envío a SUNAT...");
    console.log("Archivo:", zipName);
    console.log("Modo:", sunatConfig.mode);

    if (!fs.existsSync(zipPath)) {
      throw new Error(`Archivo ZIP no encontrado: ${zipPath}`);
    }

    const zipBuffer = fs.readFileSync(zipPath);
    const zipContent = zipBuffer.toString("base64");
    console.log("Tamaño ZIP:", zipBuffer.length, "bytes");

    const baseURL =
      sunatConfig.mode === "beta"
        ? "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"
        : "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService";

    const wsdlURL = `${baseURL}?wsdl`;

    console.log("WSDL Base:", wsdlURL);

    const username = `${sunatConfig.ruc}${sunatConfig.user}`;
    const password = sunatConfig.pass;

    console.log("🔐 Usuario:", username);
    console.log("🔐 Contraseña:", password.substring(0, 3) + "***");

    const tempFolder = path.resolve("./temp");
    if (!fs.existsSync(tempFolder)) {
      fs.mkdirSync(tempFolder, { recursive: true });
    }

    // Descargar WSDL principal
    console.log("Descargando WSDL principal...");
    let wsdlContent = await descargarConAuth(wsdlURL, username, password);
    console.log("WSDL principal descargado");

    // 🆕 Buscar y descargar todos los archivos importados
    const importRegex = /(import|include)\s+.*?location="([^"]+)"/g;
    let match;
    const archivosADescargar = [];

    while ((match = importRegex.exec(wsdlContent)) !== null) {
      const archivoImportado = match[2];
      if (!archivoImportado.startsWith('http')) {
        archivosADescargar.push(archivoImportado);
      }
    }

    console.log(`📦 Archivos a descargar: ${archivosADescargar.length}`);

    // Descargar todos los archivos importados
    for (const archivo of archivosADescargar) {
      try {
        const urlCompleta = `${baseURL}?${archivo}`;
        console.log(`Descargando: ${archivo}...`);
        
        const contenido = await descargarConAuth(urlCompleta, username, password);
        
        // 🔧 Limpiar nombre de archivo
        const nombreArchivoLimpio = archivo
          .replace(/\?/g, '_')
          .replace(/[<>:"|*]/g, '_')
          .split('/')
          .pop();
        
        const rutaLocal = path.join(tempFolder, nombreArchivoLimpio);
        fs.writeFileSync(rutaLocal, contenido);
        archivosTemporales.push(rutaLocal);
        
        console.log(`✅ Descargado: ${nombreArchivoLimpio}`);
        
        // 🔧 Reemplazar con SOLO el nombre del archivo (sin ruta, sin file://)
        wsdlContent = wsdlContent.replace(
          `location="${archivo}"`,
          `location="${nombreArchivoLimpio}"`
        );
      } catch (err) {
        console.warn(`⚠️ No se pudo descargar ${archivo}:`, err.message);
      }
    }

    // Guardar WSDL modificado
    const wsdlTempPath = path.join(tempFolder, "billService.wsdl");
    fs.writeFileSync(wsdlTempPath, wsdlContent);
    archivosTemporales.push(wsdlTempPath);
    console.log("WSDL guardado temporalmente en:", wsdlTempPath);

    // 🆕 Intentar también procesar el archivo ns1.wsdl si existe
    const ns1Path = path.join(tempFolder, "billService_ns1.wsdl");
    if (fs.existsSync(ns1Path)) {
      let ns1Content = fs.readFileSync(ns1Path, 'utf8');
      
      // Procesar imports/includes dentro del ns1.wsdl
      const ns1ImportRegex = /(import|include)\s+.*?schemaLocation="([^"]+)"/g;
      let ns1Match;
      
      while ((ns1Match = ns1ImportRegex.exec(ns1Content)) !== null) {
        const schemaFile = ns1Match[2];
        if (!schemaFile.startsWith('http') && !schemaFile.startsWith('file:')) {
          try {
            const schemaUrl = `${baseURL}?${schemaFile}`;
            console.log(`Descargando schema: ${schemaFile}...`);
            
            const schemaContent = await descargarConAuth(schemaUrl, username, password);
            
            const nombreSchemaLimpio = schemaFile
              .replace(/\?/g, '_')
              .replace(/[<>:"|*]/g, '_')
              .split('/')
              .pop();
            
            const rutaSchemaLocal = path.join(tempFolder, nombreSchemaLimpio);
            fs.writeFileSync(rutaSchemaLocal, schemaContent);
            archivosTemporales.push(rutaSchemaLocal);
            
            console.log(`✅ Descargado schema: ${nombreSchemaLimpio}`);
            
            // 🔧 Reemplazar con SOLO el nombre del archivo
            ns1Content = ns1Content.replace(
              `schemaLocation="${schemaFile}"`,
              `schemaLocation="${nombreSchemaLimpio}"`
            );
          } catch (err) {
            console.warn(`⚠️ No se pudo descargar schema ${schemaFile}:`, err.message);
          }
        }
      }
      
      // Guardar ns1.wsdl modificado
      fs.writeFileSync(ns1Path, ns1Content);
      console.log("✅ ns1.wsdl actualizado con nombres de archivo locales");
    }

    // Crear cliente SOAP desde el directorio temporal
    const client = await soap.createClientAsync(wsdlTempPath, {
      endpoint: baseURL,
      wsdl_options: {
        timeout: 60000,
        strict: false,
        // 🔧 Especificar el directorio base para imports relativos
        wsdl_headers: {},
      },
      request_timeout: 60000,
      disableCache: true,
    });

    console.log("Cliente SOAP creado");

    const basicAuth = new soap.BasicAuthSecurity(username, password);
    client.setSecurity(basicAuth);

    console.log("Seguridad BasicAuth configurada");

    const args = {
      fileName: zipName,
      contentFile: zipContent,
    };

    console.log("Enviando solicitud a SUNAT...");

    const result = await Promise.race([
      client.sendBillAsync(args),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout: SUNAT no respondió en 60 segundos")),
          60000
        )
      ),
    ]);

    console.log("Respuesta recibida de SUNAT");

    const [response] = Array.isArray(result) ? result : [result];

    console.log("Analizando respuesta...");

    if (!response) {
      console.error("Respuesta vacía de SUNAT");
      return {
        success: false,
        message: "SUNAT devolvió una respuesta vacía",
      };
    }

    if (sunatConfig.mode === "beta") {
      console.log("Respuesta completa:", JSON.stringify(response, null, 2));
    }

    if (response.applicationResponse) {
      console.log("✅ SUNAT aceptó el comprobante");

      const cdrData = Buffer.from(response.applicationResponse, "base64");

      const cdrFolder = path.resolve("./facturas/cdr");
      if (!fs.existsSync(cdrFolder)) {
        fs.mkdirSync(cdrFolder, { recursive: true });
      }

      const cdrFileName = `R-${zipName}`;
      const cdrPath = path.join(cdrFolder, cdrFileName);
      fs.writeFileSync(cdrPath, cdrData);

      console.log("CDR guardado en:", cdrPath);

      return {
        success: true,
        cdrPath,
        message: "Comprobante aceptado por SUNAT",
      };
    }

    if (response.faultcode || response.faultstring) {
      const errorCode = response.faultcode || "UNKNOWN";
      const errorMessage = response.faultstring || "Error desconocido";

      console.error("Error SOAP:", errorCode, "-", errorMessage);

      return {
        success: false,
        message: `${errorCode}: ${errorMessage}`,
      };
    }

    console.error("Respuesta inesperada de SUNAT:", response);
    return {
      success: false,
      message: "Respuesta inesperada de SUNAT. Revisa los logs.",
    };

  } catch (err) {
    console.error("Error en enviarFacturaASunat:", err);

    let errorMessage = "Error al comunicarse con SUNAT";

    if (err.message) {
      errorMessage = err.message;
    }

    if (err.message?.includes("401")) {
      errorMessage = "Error 401: Credenciales incorrectas. Verifica RUC, usuario y contraseña";
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
    // Limpiar TODOS los archivos temporales
    try {
      for (const archivo of archivosTemporales) {
        if (fs.existsSync(archivo)) {
          fs.unlinkSync(archivo);
          console.log(`🗑️ Eliminado: ${path.basename(archivo)}`);
        }
      }
    } catch (cleanupErr) {
      console.warn("No se pudieron eliminar archivos temporales:", cleanupErr.message);
    }
  }
};
