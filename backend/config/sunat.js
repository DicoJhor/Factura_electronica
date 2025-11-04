// backend/config/sunat.js
import dotenv from "dotenv";
dotenv.config();

export const sunatConfig = {
  mode: process.env.SUNAT_MODE || "beta",
  ruc: process.env.SUNAT_RUC || "20000000001",
  user: process.env.SUNAT_USER || "MODDATOS",
  pass: process.env.SUNAT_PASS || "moddatos",
  certPath: process.env.SUNAT_CERT_PATH || "./certificados/certificado.pfx",
  certPass: process.env.SUNAT_CERT_PASS || "123456",
  
  // URLs WSDL
  wsdlBeta: "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl",
  wsdlProduccion: "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl",
};

// Validar configuración
console.log("🔧 Configuración SUNAT cargada:");
console.log("  - Modo:", sunatConfig.mode);
console.log("  - RUC:", sunatConfig.ruc);
console.log("  - Usuario:", sunatConfig.user);
console.log("  - WSDL:", sunatConfig.mode === "beta" ? sunatConfig.wsdlBeta : sunatConfig.wsdlProduccion);