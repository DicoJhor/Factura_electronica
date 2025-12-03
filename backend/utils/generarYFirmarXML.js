// backend/utils/generarYFirmarXML.js
import { generarXML } from "./generarXML.js";
import { firmarXML } from "./firmarXML.js";

export const generarYFirmarXML = async (datos) => {
  // 1. Generar XML (con await porque es async)
  const { xmlPath, xmlContent } = await generarXML(datos);
  console.log("✅ XML generado:", xmlPath);
  
  // 2. Firmar XML
  const signedPath = firmarXML(xmlPath, xmlContent);
  console.log("✅ XML firmado:", signedPath);
  
  return signedPath;
};
