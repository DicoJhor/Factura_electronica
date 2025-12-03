// backend/utils/firmarXML.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import { DOMParser } from "@xmldom/xmldom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pemFromPfx = (pfxBuffer, pass) => {
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pass);
  
  const keyObj = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ][0].key;
  const privateKeyPem = forge.pki.privateKeyToPem(keyObj);
  
  const certObj = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ][0].cert;
  const certPem = forge.pki.certificateToPem(certObj);
  
  return { privateKeyPem, certPem };
};

// Clase personalizada para KeyInfo con el certificado X509
class FileKeyInfo {
  constructor(certPem) {
    this.certPem = certPem;
  }
  
  getKeyInfo() {
    const certBase64 = this.certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/[\r\n]/g, '');
    
    return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
  }
  
  getKey() {
    return null;
  }
}

export const firmarXML = (xmlPath, xmlContent) => {
  try {
    console.log("🔐 Iniciando firma digital con xml-crypto...");
    
    const pfxPath = path.join(__dirname, "..", "certificados", "certificado_sunat.pfx");
    
    if (!fs.existsSync(pfxPath)) {
      throw new Error(`No se encontró el certificado en: ${pfxPath}`);
    }
    
    const pfxBuffer = fs.readFileSync(pfxPath);
    const { privateKeyPem, certPem } = pemFromPfx(
      pfxBuffer, 
      process.env.SUNAT_CERT_PASS || ""
    );
    
    console.log("✅ Certificado PFX cargado correctamente");
    
    // Parsear el XML
    const doc = new DOMParser().parseFromString(xmlContent, "text/xml");
    
    // Configurar SignedXml
    const sig = new SignedXml();
    sig.signingKey = privateKeyPem;
    
    // Configurar algoritmos específicos para SUNAT
    sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
    sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    
    // Agregar KeyInfo con el certificado
    sig.keyInfoProvider = new FileKeyInfo(certPem);
    
    // Agregar referencia con transformaciones específicas para SUNAT
    sig.addReference(
      "//*[local-name(.)='Invoice']",
      [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature"
      ],
      "http://www.w3.org/2001/04/xmlenc#sha256"
    );
    
    // CRÍTICO: Computar la firma con opciones específicas
    sig.computeSignature(xmlContent, {
      location: { 
        reference: "//*[local-name(.)='ExtensionContent']",
        action: "append" 
      },
      prefix: "ds",
      attrs: { Id: "SignatureSP" }
    });
    
    // Obtener el XML firmado
    const signedXml = sig.getSignedXml();
    
    console.log("✅ Firma digital generada");
    
    // Guardar el XML firmado con UTF-8
    fs.writeFileSync(xmlPath, signedXml, { encoding: "utf8" });
    
    console.log(`✅ XML firmado guardado: ${path.basename(xmlPath)}`);
    
    // Verificación
    const verificacion = fs.readFileSync(xmlPath, "utf8");
    if (!verificacion.includes('<ds:Signature')) {
      throw new Error("La firma no se insertó correctamente");
    }
    
    if (!verificacion.includes('<ds:DigestValue>')) {
      throw new Error("DigestValue no encontrado en la firma");
    }
    
    console.log("✅ Verificación de firma: OK");
    
    return xmlPath;
    
  } catch (error) {
    console.error("❌ Error al firmar XML:", error.message);
    console.error(error.stack);
    throw error;
  }
};
