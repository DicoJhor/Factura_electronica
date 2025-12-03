// backend/utils/generarYFirmarXML.js
import { generarXML } from "./generarXML.js";
import { firmarXML } from "./firmarXML.js";

export const generarYFirmarXML = async (datos) => {
  try {
    console.log("\n📄 ========== GENERAR Y FIRMAR XML ==========");
    
    // 1. Generar XML
    const { xmlPath, xmlContent } = await generarXML(datos);
    console.log(`✅ XML generado: ${xmlPath}`);
    console.log(`📊 Tamaño XML: ${xmlContent.length} bytes`);
    
    // IMPORTANTE: Verificar que el XML es válido antes de firmar
    if (!xmlContent.includes('<Invoice')) {
      throw new Error("XML generado no contiene elemento Invoice");
    }
    
    if (!xmlContent.includes('<ext:ExtensionContent>')) {
      throw new Error("XML generado no contiene ExtensionContent");
    }
    
    // 2. Firmar XML (usa el contenido que acabamos de generar)
    const signedPath = firmarXML(xmlPath, xmlContent);
    console.log(`✅ XML firmado: ${signedPath}`);
    
    // 3. Verificar el archivo firmado
    const fs = await import('fs');
    const signedContent = fs.readFileSync(signedPath, 'utf8');
    
    if (!signedContent.includes('<ds:Signature')) {
      throw new Error("El XML firmado no contiene la firma digital");
    }
    
    console.log("✅ Verificación final: XML firmado correctamente");
    console.log("============================================\n");
    
    return signedPath;
    
  } catch (error) {
    console.error("❌ Error en generarYFirmarXML:", error.message);
    throw error;
  }
};
