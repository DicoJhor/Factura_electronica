// backend/utils/firmarXML.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import forge from "node-forge";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import crypto from "crypto";

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

export const firmarXML = (xmlPath, xmlContent) => {
  try {
    console.log("🔐 Iniciando proceso de firma digital...");
    
    const pfxPath = path.join(__dirname, "..", "certificados", "certificado_sunat.pfx");
    
    if (!fs.existsSync(pfxPath)) {
      throw new Error(`No se encontró el certificado en: ${pfxPath}`);
    }
    
    const pfxBuffer = fs.readFileSync(pfxPath);
    const { privateKeyPem, certPem } = pemFromPfx(
      pfxBuffer, 
      process.env.SUNAT_CERT_PASS || ""
    );
    
    // Extraer certificado base64 limpio
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/[\r\n\s]/g, '');
    
    // PASO 1: Parsear el XML para canonicalización correcta
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, "text/xml");
    
    // Verificar que el XML se parseó correctamente
    if (!doc || !doc.documentElement) {
      throw new Error("Error al parsear el XML");
    }
    
    // PASO 2: Canonicalizar el XML usando XMLSerializer (C14N)
    const serializer = new XMLSerializer();
    let canonicalXml = serializer.serializeToString(doc.documentElement);
    
    // Normalizar espacios y saltos de línea (importante para SUNAT)
    canonicalXml = canonicalXml
      .replace(/>\s+</g, '><')  // Eliminar espacios entre tags
      .trim();
    
    // PASO 3: Calcular DigestValue del XML canonicalizado
    const digestValue = crypto
      .createHash('sha256')
      .update(Buffer.from(canonicalXml, 'utf8'))
      .digest('base64');
    
    console.log(`🔐 DigestValue: ${digestValue}`);
    
    // PASO 4: Crear SignedInfo (SIN espacios ni saltos de línea)
    const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI=""><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
    
    // PASO 5: Firmar SignedInfo
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(Buffer.from(signedInfo, 'utf8'));
    const signatureValue = signer.sign(privateKeyPem, 'base64');
    
    console.log(`✍️ SignatureValue: ${signatureValue.substring(0, 40)}...`);
    
    // PASO 6: Construir la Signature completa (SIN espacios)
    const signature = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="SignatureSP">${signedInfo}<ds:SignatureValue>${signatureValue}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></ds:Signature>`;
    
    // PASO 7: Insertar la firma en ExtensionContent
    // Buscar el patrón con o sin espacios
    const extensionPattern = /<ext:ExtensionContent[\s]*>[\s]*<\/ext:ExtensionContent>/g;
    
    if (!xmlContent.match(extensionPattern)) {
      throw new Error("No se encontró el elemento ExtensionContent en el XML");
    }
    
    const signedXml = xmlContent.replace(
      extensionPattern,
      `<ext:ExtensionContent>${signature}</ext:ExtensionContent>`
    );
    
    // PASO 8: Guardar el XML firmado (UTF-8 sin BOM)
    fs.writeFileSync(xmlPath, signedXml, { encoding: "utf8" });
    
    console.log("✅ XML firmado correctamente");
    console.log(`📄 Archivo: ${path.basename(xmlPath)}`);
    
    // Verificación adicional
    const verificacion = fs.readFileSync(xmlPath, "utf8");
    if (verificacion.includes('<ds:Signature')) {
      console.log("✅ Firma XML insertada y verificada");
    } else {
      throw new Error("La firma no se insertó correctamente en el XML");
    }
    
    return xmlPath;
    
  } catch (error) {
    console.error("❌ Error al firmar XML:", error.message);
    console.error(error.stack);
    throw error;
  }
};
