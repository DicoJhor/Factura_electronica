// backend/utils/firmarXML.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SignedXml } from "xml-crypto";
import forge from "node-forge";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pemFromPfx = (pfxBuffer, pass) => {
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pass);
  const keyObj = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ][0].key;
  const privateKeyPem = forge.pki.privateKeyToPem(keyObj);
  const certObj = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0].cert;
  const certPem = forge.pki.certificateToPem(certObj);
  return { privateKeyPem, certPem };
};

export const firmarXML = (xmlPath, xmlContent) => {
  try {
    const pfxPath = path.join(__dirname, "..", "certificados", "certificado_sunat.pfx");
    const pfxBuffer = fs.readFileSync(pfxPath);
    const { privateKeyPem, certPem } = pemFromPfx(pfxBuffer, process.env.SUNAT_CERT_PASS || "");
    
    // Extraer el certificado sin headers
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '');
    
    // Crear firma XML usando xml-crypto
    const sig = new SignedXml();
    
    // Configurar la clave privada
    sig.signingKey = privateKeyPem;
    
    // Configurar algoritmos
    sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
    sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    
    // Agregar referencia al documento completo
    sig.addReference(
      "//*[local-name(.)='Invoice']", // XPath al nodo Invoice
      [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
      ],
      "http://www.w3.org/2001/04/xmlenc#sha256"
    );
    
    // Configurar KeyInfo con el certificado
    sig.keyInfoProvider = {
      getKeyInfo: () => {
        return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
      }
    };
    
    // Calcular la firma
    sig.computeSignature(xmlContent, {
      location: { reference: "//*[local-name(.)='ExtensionContent']", action: "append" }
    });
    
    // Obtener el XML firmado
    const signedXml = sig.getSignedXml();
    
    // Agregar el atributo Id="SignatureSP" a la firma
    const finalXml = signedXml.replace(
      /<Signature xmlns="http:\/\/www.w3.org\/2000\/09\/xmldsig#">/,
      '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#" Id="SignatureSP">'
    );
    
    // Guardar el XML firmado
    fs.writeFileSync(xmlPath, finalXml, "utf8");
    
    console.log(`🔐 XML firmado correctamente con xml-crypto`);
    
    return xmlPath;
  } catch (error) {
    console.error("❌ Error al firmar XML:", error);
    throw error;
  }
};
